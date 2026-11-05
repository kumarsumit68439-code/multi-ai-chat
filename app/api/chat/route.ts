import { NextRequest, NextResponse } from "next/server";
import { getProviderById } from "@/lib/models";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, model, provider, stream = true } = body;

    if (!messages || !model || !provider) {
      return NextResponse.json(
        { error: "Missing required fields: messages, model, provider" },
        { status: 400 }
      );
    }

    const providerConfig = getProviderById(provider);
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

    // OpenRouter specific headers
    if (provider === "openrouter") {
      headers["HTTP-Referer"] = process.env.NEXT_PUBLIC_SITE_URL || "https://multi-ai-chat.vercel.app";
      headers["X-Title"] = "Multi AI Chat";
    }

    const payload: any = {
      model,
      messages: messages.map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
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
        errorMessage = errorJson.error?.message || errorJson.message || errorText;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      return NextResponse.json({ error: errorMessage }, { status: response.status });
    }

    if (stream) {
      // Return the stream directly
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
  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
