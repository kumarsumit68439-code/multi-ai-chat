import { NextRequest, NextResponse } from "next/server";
import { getProviderById, shouldUseOpenRouter } from "@/lib/models";
import { hasConnected } from "@/lib/connectors/store";
import { runAgentStream } from "@/lib/connectors/agent";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, model, provider, stream = true, systemInstructions } = body;

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
        process.env.NEXT_PUBLIC_SITE_URL || "https://multi-ai-chat.vercel.app";
      headers["X-Title"] = "Multi AI Chat";
    }

    const formattedMessages: { role: string; content: string }[] = [];

    if (systemInstructions && String(systemInstructions).trim()) {
      formattedMessages.push({
        role: "system",
        content: String(systemInstructions).trim(),
      });
    }

    for (const m of messages) {
      if (m.role === "system") continue;
      formattedMessages.push({
        role: m.role,
        content: m.content,
      });
    }

    // Connectors: when the signed-in user has connected apps, run the tool-calling loop.
    let useConnectors = false;
    try {
      useConnectors = body.useConnectors !== false && (await hasConnected());
    } catch {
      useConnectors = false;
    }
    if (useConnectors) {
      return runAgentStream({
        baseUrl: providerConfig.baseUrl,
        headers,
        model,
        messages: formattedMessages,
      });
    }

    const payload: Record<string, unknown> = {
      model,
      messages: formattedMessages,
      stream,
      temperature: 0.7,
      max_tokens: 4096,
    };

    const response = await fetch(`${providerConfig.baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

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
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("Chat API error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
