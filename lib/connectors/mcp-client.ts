import { fetchT } from "./http";
import type { McpTool, ToolProvider } from "./types";

export type { McpTool, ToolProvider };

const PROTOCOL_VERSION = "2025-06-18";

/** Pull the JSON-RPC message with a given id out of an SSE body. */
function parseSse(text: string, id: number): any {
  const events = text.split(/\r?\n\r?\n/);
  let last: any = null;
  for (const ev of events) {
    const data = ev
      .split(/\r?\n/)
      .filter((l) => l.indexOf("data:") === 0)
      .map((l) => l.slice(5).replace(/^ /, ""))
      .join("\n");
    if (!data) continue;
    try {
      const msg = JSON.parse(data);
      if (msg && msg.id === id) return msg;
      last = msg;
    } catch {
      /* ignore */
    }
  }
  return last;
}

/**
 * Minimal MCP client over the Streamable HTTP transport (JSON-RPC 2.0 over POST).
 * Works with any remote MCP server that accepts a bearer token.
 */
export class McpHttpClient implements ToolProvider {
  private sessionId: string | null = null;
  private nextId = 1;
  private ready = false;

  constructor(private url: string, private token?: string) {}

  private headers(): Record<string, string> {
    const h: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "MCP-Protocol-Version": PROTOCOL_VERSION,
    };
    if (this.token) h.Authorization = `Bearer ${this.token}`;
    if (this.sessionId) h["Mcp-Session-Id"] = this.sessionId;
    return h;
  }

  private async rpc(method: string, params?: any, timeoutMs = 30000): Promise<any> {
    const id = this.nextId++;
    const res = await fetchT(
      this.url,
      {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ jsonrpc: "2.0", id, method, params: params || {} }),
      },
      timeoutMs
    );
    const sid = res.headers.get("mcp-session-id");
    if (sid) this.sessionId = sid;

    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `Authorization failed (${res.status}). Reconnect this connector in Settings.`
      );
    }
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`MCP server returned ${res.status}: ${text.slice(0, 300)}`);
    }
    const ct = res.headers.get("content-type") || "";
    let msg: any;
    if (ct.indexOf("text/event-stream") >= 0) {
      msg = parseSse(text, id);
    } else {
      try {
        msg = JSON.parse(text);
      } catch {
        throw new Error("MCP server returned an invalid response");
      }
    }
    if (!msg) throw new Error("MCP server returned an empty response");
    if (msg.error) {
      throw new Error(msg.error.message || JSON.stringify(msg.error));
    }
    return msg.result;
  }

  private async notify(method: string): Promise<void> {
    try {
      await fetchT(
        this.url,
        {
          method: "POST",
          headers: this.headers(),
          body: JSON.stringify({ jsonrpc: "2.0", method }),
        },
        10000
      );
    } catch {
      /* notifications are best effort */
    }
  }

  async init(): Promise<void> {
    if (this.ready) return;
    await this.rpc("initialize", {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: "multi-ai-chat", version: "1.0.0" },
    });
    await this.notify("notifications/initialized");
    this.ready = true;
  }

  async listTools(): Promise<McpTool[]> {
    await this.init();
    const tools: McpTool[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < 10; page++) {
      const result = await this.rpc("tools/list", cursor ? { cursor } : {});
      (result.tools || []).forEach((t: McpTool) => tools.push(t));
      cursor = result.nextCursor;
      if (!cursor) break;
    }
    return tools;
  }

  async callTool(name: string, args: any): Promise<string> {
    await this.init();
    const result = await this.rpc("tools/call", { name, arguments: args || {} }, 60000);
    const parts: string[] = [];
    (result.content || []).forEach((c: any) => {
      if (c.type === "text") parts.push(c.text);
      else if (c.type === "resource" && c.resource && c.resource.text) parts.push(c.resource.text);
      else if (c.type === "image") parts.push("[image]");
      else parts.push(JSON.stringify(c));
    });
    if (!parts.length && result.structuredContent) {
      parts.push(JSON.stringify(result.structuredContent));
    }
    const out = parts.join("\n");
    return result.isError ? `Tool error: ${out}` : out;
  }
}
