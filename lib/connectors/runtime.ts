import { McpHttpClient } from "./mcp-client";
import { createGoogleProvider } from "./google-tools";
import { getConnectorDef, slugify } from "./registry";
import { refreshAccessToken } from "./oauth";
import { listConnected, saveConnected, type ConnRow } from "./store";
import type { ToolProvider } from "./types";

export interface OpenAiTool {
  type: "function";
  function: { name: string; description: string; parameters: any };
}

export interface ToolRuntime {
  tools: OpenAiTool[];
  warnings: string[];
  execute(name: string, args: any): Promise<string>;
  label(name: string): string;
}

const MAX_TOOLS = 100;
const MAX_RESULT_CHARS = 12000;

async function accessTokenFor(row: ConnRow): Promise<string> {
  const d = row.data;
  if (!d.accessToken) throw new Error("Not authorized. Reconnect this connector in Settings.");
  const expiring = d.expiresAt && d.expiresAt - Date.now() < 60000;
  if (!expiring) return d.accessToken;

  if (!d.refreshToken || !d.tokenEndpoint || !d.clientId) {
    throw new Error("Session expired. Reconnect this connector in Settings.");
  }
  const fresh = await refreshAccessToken({
    tokenEndpoint: d.tokenEndpoint,
    clientId: d.clientId,
    clientSecret: d.clientSecret,
    refreshToken: d.refreshToken,
    resource: d.resource,
  });
  const next = {
    ...d,
    accessToken: fresh.accessToken,
    refreshToken: fresh.refreshToken || d.refreshToken,
    expiresAt: fresh.expiresAt,
    scope: fresh.scope || d.scope,
  };
  await saveConnected(row.connectorId, next, { serverUrl: row.serverUrl, label: row.label });
  return next.accessToken;
}

function cleanSchema(schema: any): any {
  if (!schema || typeof schema !== "object") return { type: "object", properties: {} };
  const s = { ...schema };
  delete s.$schema;
  if (!s.type) s.type = "object";
  if (s.type === "object" && !s.properties) s.properties = {};
  return s;
}

function safeName(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
}

/** Load tools from every connector the signed-in user has connected. */
export async function buildToolRuntime(): Promise<ToolRuntime> {
  const rows = await listConnected();
  const warnings: string[] = [];
  const routes: Record<string, { provider: ToolProvider; tool: string; label: string }> = {};
  const tools: OpenAiTool[] = [];

  const loaded = await Promise.all(
    rows.map(async (row) => {
      const def = getConnectorDef(row.connectorId);
      const name = (def && def.name) || row.label || row.connectorId;
      try {
        const token = await accessTokenFor(row);
        let provider: ToolProvider;
        if (def && def.auth === "google") {
          provider = createGoogleProvider(row.connectorId, token);
        } else {
          const url = (def && def.url) || row.serverUrl;
          if (!url) throw new Error("No server URL");
          provider = new McpHttpClient(url, token);
        }
        const list = await provider.listTools();
        const prefix = (def && def.toolPrefix) || slugify(row.label || row.connectorId);
        return { name, prefix, provider, list };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "failed to load";
        warnings.push(`${name} connector unavailable: ${msg}`);
        return null;
      }
    })
  );

  for (const item of loaded) {
    if (!item) continue;
    for (const t of item.list) {
      if (tools.length >= MAX_TOOLS) break;
      let fn = safeName(`${item.prefix}__${t.name}`);
      let n = 2;
      while (routes[fn]) fn = safeName(`${item.prefix}__${t.name}`).slice(0, 60) + "_" + n++;
      routes[fn] = { provider: item.provider, tool: t.name, label: `${item.name} \u00b7 ${t.name}` };
      tools.push({
        type: "function",
        function: {
          name: fn,
          description: `[${item.name}] ${(t.description || t.name).slice(0, 400)}`,
          parameters: cleanSchema(t.inputSchema),
        },
      });
    }
  }

  if (loaded.some((i) => i && i.list.length > 0) && tools.length >= MAX_TOOLS) {
    warnings.push(`Only the first ${MAX_TOOLS} tools are available per message. Disconnect connectors you do not need.`);
  }

  return {
    tools,
    warnings,
    label: (name: string) => (routes[name] ? routes[name].label : name),
    async execute(name: string, args: any) {
      const r = routes[name];
      if (!r) throw new Error(`Unknown tool: ${name}`);
      const out = await r.provider.callTool(r.tool, args || {});
      return out.length > MAX_RESULT_CHARS
        ? out.slice(0, MAX_RESULT_CHARS) + `\n...[truncated ${out.length - MAX_RESULT_CHARS} characters]`
        : out;
    },
  };
}
