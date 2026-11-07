import { NextRequest, NextResponse } from "next/server";
import { getProviderById, shouldUseOpenRouter } from "@/lib/models";
import { createClient } from "@/lib/supabase/server";
import {
  mcpListTools,
  mcpCallTool,
  toOpenAITools,
  resolveToolCall,
  McpConnection,
  McpTool,
} from "@/lib/mcp-client";
import {
  googleToolsForConnectors,
  nativeToolsToOpenAI,
  executeGoogleTool,
  isGoogleToolName,
  GoogleConnector,
} from "@/lib/google-tools";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_TOOL_ROUNDS = 5;

async function loadUserMcpConnections(
  userId: string
): Promise<McpConnection[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_connectors")
    .select("connector_id, mcp_url, access_token, connected, provider")
    .eq("user_id", userId)
    .eq("connected", true);

  if (error || !data) return [];

  return data
    .filter(
      (r) =>
        r.mcp_url &&
        r.access_token &&
        (r.provider === "mcp" || String(r.connector_id).startsWith("custom:"))
    )
    .map((r) => ({
      connectorId: r.connector_id as string,
      mcpUrl: r.mcp_url as string,
      accessToken: r.access_token as string,
    }));
}

async function gatherTools(
  connections: McpConnection[]
): Promise<{ tools: McpTool[]; openAITools: ReturnType<typeof toOpenAITools> }> {
  const all: McpTool[] = [];
  for (const conn of connections) {
    try {
      const listed = await mcpListTools(conn);
      all.push(...listed);
    } catch (e) {
      console.warn(
        `[chat] tools/list failed for ${conn.connectorId}:`,
        e instanceof Error ? e.message : e
      );
    }
  }
  return { tools: all, openAITools: toOpenAITools(all) };
}

function sseData(obj: unknown): string {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, model, provider, stream = true, systemInstructions } =
      body;

    if (!messages || !model || !provider) {
      return NextResponse.json(
        { error: "Missing required fields: messages, model, provider" },
        { status: 400 }
      );
    }

    const useOpenRouter = shouldUseOpenRouter(provider, model);
    const effectiveProvider = useOpenRouter ? "openrouter" : provider;
    const providerConfig = getProviderById(effectiveProvider);

    if (!providerConfig) {
      return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
    }

    const apiKey = process.env[providerConfig.envKey];
    if (!apiKey) {
      return NextResponse.json(
        {
          error: `API key not configured. Please set ${providerConfig.envKey} in Vercel environment variables.`,
        },
        { status: 500 }
      );
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };

    if (effectiveProvider === "openrouter") {
      headers["HTTP-Referer"] =
        process.env.NEXT_PUBLIC_SITE_URL || "https://axiom-ai-sand.vercel.app";
      headers["X-Title"] = "Multi AI Chat";
    }

    // Load MCP + Google connector tools for logged-in user
    let mcpTools: McpTool[] = [];
    let openAITools: ReturnType<typeof toOpenAITools> = [];
    let connections: McpConnection[] = [];
    let googleConnectors: GoogleConnector[] = [];

    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (user) {
        connections = await loadUserMcpConnections(user.id);
        if (connections.length > 0) {
          const gathered = await gatherTools(connections);
          mcpTools = gathered.tools;
          openAITools = gathered.openAITools;
        }

        const { data: gRows } = await supabase
          .from("user_connectors")
          .select(
            "connector_id, access_token, refresh_token, connected, provider"
          )
          .eq("user_id", user.id)
          .eq("connected", true);

        const googleIds = new Set([
          "gmail",
          "google-drive",
          "google_drive",
          "google-calendar",
          "google_calendar",
        ]);

        if (gRows) {
          for (const r of gRows) {
            const id = String(r.connector_id || "");
            if (!googleIds.has(id)) continue;
            let token = (r.access_token as string) || "";
            if (!token && session?.provider_token) {
              token = session.provider_token;
            }
            if (token) {
              googleConnectors.push({
                connectorId:
                  id === "google_drive"
                    ? "google-drive"
                    : id === "google_calendar"
                      ? "google-calendar"
                      : id,
                accessToken: token,
                refreshToken:
                  (r.refresh_token as string) ||
                  session?.provider_refresh_token ||
                  null,
              });
            }
          }
        }

        if (
          session?.provider_token &&
          googleConnectors.length === 0 &&
          gRows?.some((r) => googleIds.has(String(r.connector_id)))
        ) {
          for (const r of gRows || []) {
            const id = String(r.connector_id || "");
            if (!googleIds.has(id)) continue;
            googleConnectors.push({
              connectorId:
                id === "google_drive"
                  ? "google-drive"
                  : id === "google_calendar"
                    ? "google-calendar"
                    : id,
              accessToken: session.provider_token,
              refreshToken: session.provider_refresh_token || null,
            });
          }
        }

        const gTools = googleToolsForConnectors(googleConnectors);
        if (gTools.length > 0) {
          openAITools = [...openAITools, ...nativeToolsToOpenAI(gTools)];
        }
      }
    } catch (e) {
      console.warn("[chat] connector load failed", e);
    }

    type ChatMsg = {
      role: string;
      content: string | null;
      tool_calls?: unknown;
      tool_call_id?: string;
      name?: string;
    };

    const formattedMessages: ChatMsg[] = [];

    let systemContent = "";
    if (systemInstructions && String(systemInstructions).trim()) {
      systemContent = String(systemInstructions).trim();
    }
    if (openAITools.length > 0) {
      systemContent +=
        (systemContent ? "\n\n" : "") +
        "You have access to real tools from the user's connected accounts (Gmail, Google Drive, Google Calendar, and/or MCP). " +
        "When the user asks about email, files, calendar, or connected services, CALL the appropriate tools. " +
        "Do not say you cannot access their account if tools are available. " +
        "After tool results, give a clear final answer.";
    }
    if (systemContent) {
      formattedMessages.push({ role: "system", content: systemContent });
    }

    for (const m of messages) {
      if (m.role === "system") continue;
      formattedMessages.push({
        role: m.role,
        content: m.content,
      });
    }

    const baseUrl = providerConfig.baseUrl;

    const callModel = async (
      msgs: ChatMsg[],
      withTools: boolean,
      doStream: boolean
    ): Promise<Response> => {
      const payload: Record<string, unknown> = {
        model,
        messages: msgs,
        stream: doStream,
        temperature: 0.7,
        max_tokens: 4096,
      };
      if (withTools && openAITools.length > 0) {
        payload.tools = openAITools;
        payload.tool_choice = "auto";
      }

      return fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
    };

    // No tools → original streaming path
    if (openAITools.length === 0) {
      const response = await callModel(formattedMessages, false, stream);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Provider error: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage =
            errorJson.error?.message || errorJson.message || errorText;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        return NextResponse.json(
          { error: errorMessage },
          { status: response.status }
        );
      }

      if (stream) {
        return new Response(response.body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      }

      const data = await response.json();
      return NextResponse.json(data);
    }

    // Tool-calling loop
    let workingMessages = [...formattedMessages];
    let finalContent = "";
    const toolTrace: string[] = [];

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await callModel(workingMessages, true, false);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Provider error: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage =
            errorJson.error?.message || errorJson.message || errorText;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        return NextResponse.json(
          { error: errorMessage },
          { status: response.status }
        );
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      const msg = choice?.message;

      if (!msg) {
        finalContent = "(empty model response)";
        break;
      }

      const toolCalls = msg.tool_calls as
        | {
            id: string;
            type?: string;
            function?: { name?: string; arguments?: string };
          }[]
        | undefined;

      if (!toolCalls || toolCalls.length === 0) {
        finalContent = msg.content || "";
        break;
      }

      workingMessages.push({
        role: "assistant",
        content: msg.content || null,
        tool_calls: toolCalls,
      });

      for (const tc of toolCalls) {
        const fname = tc.function?.name || "";
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function?.arguments || "{}");
        } catch {
          args = {};
        }

        let resultText: string;

        if (isGoogleToolName(fname)) {
          try {
            resultText = await executeGoogleTool(
              fname,
              args,
              googleConnectors
            );
            toolTrace.push(`✓ ${fname}`);
          } catch (e) {
            resultText =
              e instanceof Error ? e.message : "Google tool failed";
            toolTrace.push(`✗ ${fname}: ${resultText}`);
          }
        } else {
          const resolved = resolveToolCall(fname, mcpTools, connections);
          if (!resolved) {
            resultText = `Unknown tool: ${fname}`;
          } else {
            try {
              resultText = await mcpCallTool(
                resolved.conn,
                resolved.tool.name,
                args
              );
              toolTrace.push(`✓ ${resolved.tool.name}`);
            } catch (e) {
              resultText =
                e instanceof Error ? e.message : "Tool execution failed";
              toolTrace.push(`✗ ${resolved.tool.name}: ${resultText}`);
            }
          }
        }

        workingMessages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: resultText.slice(0, 50000),
        });
      }
    }

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      start(controller) {
        if (toolTrace.length > 0) {
          const note = `*Used tools: ${toolTrace.join(", ")}*\n\n`;
          controller.enqueue(
            encoder.encode(
              sseData({ choices: [{ delta: { content: note } }] })
            )
          );
        }

        const text = finalContent || "(no content after tool use)";
        const size = 80;
        for (let i = 0; i < text.length; i += size) {
          const piece = text.slice(i, i + size);
          controller.enqueue(
            encoder.encode(
              sseData({ choices: [{ delta: { content: piece } }] })
            )
          );
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("Chat API error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
