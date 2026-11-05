import { buildToolRuntime } from "./runtime";
import { fetchT } from "./http";

const MAX_STEPS = 10;

const TOOL_GUIDE =
  "You are connected to the user's apps through tools (names look like connector__tool). " +
  "When the user asks you to read, search, create, change or deploy something in a connected app, call the tools instead of describing what you would do. " +
  "Never claim an action succeeded unless a tool result confirms it, and report tool errors honestly. " +
  "Before irreversible actions (deleting data, dropping tables, force pushes, sending email to new recipients) ask for confirmation unless the user already gave it explicitly. " +
  "Do not reveal access tokens or secrets.";

interface AgentOptions {
  baseUrl: string;
  headers: Record<string, string>;
  model: string;
  messages: any[];
}

async function errorText(res: Response): Promise<string> {
  const t = await res.text();
  try {
    const j = JSON.parse(t);
    return j.error?.message || j.message || t;
  } catch {
    return t || `Provider error: ${res.status}`;
  }
}

/**
 * Streams an OpenAI-compatible SSE response (same shape the chat UI already parses),
 * running a tool-calling loop against the user's connected apps behind the scenes.
 */
export function runAgentStream(opts: AgentOptions): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (text: string) => {
        for (let i = 0; i < text.length; i += 80) {
          const piece = text.slice(i, i + 80);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: piece } }] })}\n\n`)
          );
        }
      };

      try {
        const runtime = await buildToolRuntime();
        runtime.warnings.forEach((w) => send(`> \u26a0\ufe0f ${w}\n\n`));

        const messages: any[] = opts.messages.slice();
        if (runtime.tools.length > 0) {
          const guide = `${TOOL_GUIDE} Current date: ${new Date().toISOString().slice(0, 10)}.`;
          if (messages.length && messages[0].role === "system") {
            messages[0] = { ...messages[0], content: `${messages[0].content}\n\n${guide}` };
          } else {
            messages.unshift({ role: "system", content: guide });
          }
        }

        const callProvider = (withTools: boolean) => {
          const payload: Record<string, unknown> = {
            model: opts.model,
            messages,
            stream: false,
            temperature: 0.7,
            max_tokens: 4096,
          };
          if (withTools) {
            payload.tools = runtime.tools;
            payload.tool_choice = "auto";
          }
          return fetchT(
            `${opts.baseUrl}/chat/completions`,
            { method: "POST", headers: opts.headers, body: JSON.stringify(payload) },
            120000
          );
        };

        let useTools = runtime.tools.length > 0;
        let res = await callProvider(useTools);

        // Some models/providers reject the tools parameter; answer without connectors instead.
        if (!res.ok && useTools && [400, 404, 422].indexOf(res.status) >= 0) {
          useTools = false;
          res = await callProvider(false);
          if (res.ok) {
            send("> \u2139\ufe0f This model does not support tool calling, so your connected apps were not used. Pick another model (for example GPT-OSS on Groq) to use connectors.\n\n");
          }
        }

        for (let step = 0; step < MAX_STEPS; step++) {
          if (!res.ok) {
            send(`Error: ${await errorText(res)}`);
            break;
          }
          const data = await res.json();
          const msg = data.choices && data.choices[0] && data.choices[0].message;
          if (!msg) {
            send("No response received from the model.");
            break;
          }

          const calls: any[] = Array.isArray(msg.tool_calls) ? msg.tool_calls : [];
          if (!useTools || calls.length === 0) {
            send(msg.content || "");
            break;
          }

          messages.push({ role: "assistant", content: msg.content || "", tool_calls: calls });
          if (msg.content) send(`${msg.content}\n\n`);

          for (const c of calls) {
            const fn: string = (c.function && c.function.name) || "";
            let args: any = {};
            try {
              args = JSON.parse((c.function && c.function.arguments) || "{}");
            } catch {
              args = {};
            }
            send(`> \ud83d\udd27 ${runtime.label(fn)}\n\n`);
            let out: string;
            try {
              out = await runtime.execute(fn, args);
            } catch (e: unknown) {
              out = `Error: ${e instanceof Error ? e.message : "tool failed"}`;
            }
            messages.push({ role: "tool", tool_call_id: c.id, content: out });
          }

          if (step === MAX_STEPS - 1) {
            send("Stopped after too many tool steps. Ask me to continue if needed.");
            break;
          }
          res = await callProvider(true);
        }
      } catch (e: unknown) {
        send(`Error: ${e instanceof Error ? e.message : "Connector request failed"}`);
      } finally {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
