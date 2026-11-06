/**
 * Minimal MCP JSON-RPC client over HTTP (streamable HTTP / simple POST).
 * Used to list and call tools on connected remote MCP servers.
 */

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  /** Which connector this tool belongs to */
  connectorId: string;
  mcpUrl: string;
}

export interface McpConnection {
  connectorId: string;
  mcpUrl: string;
  accessToken: string;
  name?: string;
}

let rpcId = 1;

async function mcpRpc(
  mcpUrl: string,
  accessToken: string,
  method: string,
  params?: Record<string, unknown>
): Promise<unknown> {
  const id = rpcId++;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(mcpUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id,
      method,
      params: params ?? {},
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `MCP ${method} failed (${res.status}): ${text.slice(0, 300)}`
    );
  }

  const contentType = res.headers.get("content-type") || "";

  // Some servers return SSE
  if (contentType.includes("text/event-stream")) {
    const text = await res.text();
    const lines = text.split("\n");
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.error) {
            throw new Error(
              data.error.message || JSON.stringify(data.error)
            );
          }
          if (data.result !== undefined) return data.result;
        } catch (e) {
          if (e instanceof Error && e.message.includes("MCP")) throw e;
        }
      }
    }
    throw new Error(`MCP ${method}: no result in SSE response`);
  }

  const data = (await res.json()) as {
    result?: unknown;
    error?: { message?: string; code?: number };
  };

  if (data.error) {
    throw new Error(
      data.error.message || `MCP error ${data.error.code ?? ""}`
    );
  }

  return data.result;
}

/** Initialize session (best-effort; some servers require it) */
export async function mcpInitialize(
  mcpUrl: string,
  accessToken: string
): Promise<void> {
  try {
    await mcpRpc(mcpUrl, accessToken, "initialize", {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "multi-ai-chat", version: "1.0.0" },
    });
    // notifications/initialized is optional for HTTP
    try {
      await mcpRpc(mcpUrl, accessToken, "notifications/initialized", {});
    } catch {
      /* ignore */
    }
  } catch {
    // Some servers don't need initialize or already have a session
  }
}

export async function mcpListTools(
  conn: McpConnection
): Promise<McpTool[]> {
  await mcpInitialize(conn.mcpUrl, conn.accessToken);

  const result = (await mcpRpc(conn.mcpUrl, conn.accessToken, "tools/list", {
    // cursor optional
  })) as {
    tools?: Array<{
      name: string;
      description?: string;
      inputSchema?: Record<string, unknown>;
    }>;
  };

  const tools = result?.tools || [];
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
    connectorId: conn.connectorId,
    mcpUrl: conn.mcpUrl,
  }));
}

export async function mcpCallTool(
  conn: McpConnection,
  toolName: string,
  args: Record<string, unknown>
): Promise<string> {
  await mcpInitialize(conn.mcpUrl, conn.accessToken);

  const result = (await mcpRpc(conn.mcpUrl, conn.accessToken, "tools/call", {
    name: toolName,
    arguments: args,
  })) as {
    content?: Array<{ type?: string; text?: string }>;
    isError?: boolean;
  };

  if (!result) return "(empty tool result)";

  const parts = result.content || [];
  const text = parts
    .map((p) => (p.type === "text" || !p.type ? p.text || "" : JSON.stringify(p)))
    .filter(Boolean)
    .join("\n");

  if (result.isError) {
    return `Tool error: ${text || "unknown error"}`;
  }
  return text || JSON.stringify(result);
}

/** Convert MCP tools to OpenAI-compatible tools array */
export function toOpenAITools(
  tools: McpTool[]
): Array<{
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}> {
  // Prefix tool names with connector slug to avoid collisions across servers
  return tools.map((t) => {
    const safeName = `${t.connectorId.replace(/[^a-zA-Z0-9_]/g, "_")}_${t.name}`
      .replace(/_+/g, "_")
      .slice(0, 64);

    return {
      type: "function" as const,
      function: {
        name: safeName,
        description:
          (t.description || t.name) +
          ` [connector: ${t.connectorId}]`,
        parameters: t.inputSchema || {
          type: "object",
          properties: {},
        },
      },
    };
  });
}

/** Map OpenAI tool name back to MCP tool + connection */
export function resolveToolCall(
  openAIName: string,
  tools: McpTool[],
  connections: McpConnection[]
): { tool: McpTool; conn: McpConnection } | null {
  for (const t of tools) {
    const safeName = `${t.connectorId.replace(/[^a-zA-Z0-9_]/g, "_")}_${t.name}`
      .replace(/_+/g, "_")
      .slice(0, 64);
    if (safeName === openAIName || t.name === openAIName) {
      const conn = connections.find((c) => c.connectorId === t.connectorId);
      if (conn) return { tool: t, conn };
    }
  }
  return null;
}
