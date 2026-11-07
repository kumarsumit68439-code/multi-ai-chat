/**
 * Real Google API tools (Gmail, Drive, Calendar) using OAuth access tokens.
 * Used when user connects connectors via Supabase Google OAuth.
 */

export interface GoogleConnector {
  connectorId: string;
  accessToken: string;
  refreshToken?: string | null;
}

export interface NativeTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  connectorId: string;
}

export function googleToolsForConnectors(
  connectors: GoogleConnector[]
): NativeTool[] {
  const ids = new Set(connectors.map((c) => c.connectorId));
  const tools: NativeTool[] = [];

  if (ids.has("gmail")) {
    tools.push(
      {
        name: "gmail_search",
        description:
          "Search the user's Gmail inbox. Returns message id, subject, from, date, snippet.",
        connectorId: "gmail",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description:
                "Gmail search query (e.g. from:boss@x.com newer_than:7d is:unread)",
            },
            maxResults: {
              type: "number",
              description: "Max messages to return (default 10, max 20)",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "gmail_read",
        description: "Read a full Gmail message by message id (from gmail_search).",
        connectorId: "gmail",
        parameters: {
          type: "object",
          properties: {
            messageId: {
              type: "string",
              description: "Gmail message id",
            },
          },
          required: ["messageId"],
        },
      },
      {
        name: "gmail_send",
        description:
          "Send an email from the user's Gmail account. Use only when the user clearly asks to send.",
        connectorId: "gmail",
        parameters: {
          type: "object",
          properties: {
            to: { type: "string", description: "Recipient email" },
            subject: { type: "string", description: "Email subject" },
            body: { type: "string", description: "Plain text body" },
          },
          required: ["to", "subject", "body"],
        },
      }
    );
  }

  if (ids.has("google-drive") || ids.has("google_drive")) {
    tools.push(
      {
        name: "drive_search",
        description: "Search files in the user's Google Drive.",
        connectorId: "google-drive",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description:
                "Drive search (e.g. name contains 'report' or fullText contains 'budget')",
            },
            maxResults: {
              type: "number",
              description: "Max files (default 10)",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "drive_read",
        description:
          "Read metadata and export text content of a Google Drive file (Docs/Sheets as text when possible).",
        connectorId: "google-drive",
        parameters: {
          type: "object",
          properties: {
            fileId: { type: "string", description: "Drive file id" },
          },
          required: ["fileId"],
        },
      }
    );
  }

  if (ids.has("google-calendar") || ids.has("google_calendar")) {
    tools.push(
      {
        name: "calendar_list_events",
        description: "List upcoming events on the user's primary Google Calendar.",
        connectorId: "google-calendar",
        parameters: {
          type: "object",
          properties: {
            maxResults: {
              type: "number",
              description: "Max events (default 10)",
            },
            timeMin: {
              type: "string",
              description: "ISO start time (default now)",
            },
          },
        },
      },
      {
        name: "calendar_create_event",
        description: "Create a calendar event on the user's primary calendar.",
        connectorId: "google-calendar",
        parameters: {
          type: "object",
          properties: {
            summary: { type: "string", description: "Event title" },
            description: { type: "string", description: "Event details" },
            start: {
              type: "string",
              description: "Start datetime ISO (e.g. 2026-11-08T15:00:00+05:30)",
            },
            end: {
              type: "string",
              description: "End datetime ISO",
            },
            timeZone: {
              type: "string",
              description: "IANA timezone (default Asia/Kolkata)",
            },
          },
          required: ["summary", "start", "end"],
        },
      }
    );
  }

  return tools;
}

export function nativeToolsToOpenAI(tools: NativeTool[]) {
  return tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description + ` [connector: ${t.connectorId}]`,
      parameters: t.parameters,
    },
  }));
}

async function gfetch(
  url: string,
  accessToken: string,
  init?: RequestInit
): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers || {}),
    },
  });
}

function tokenFor(
  connectors: GoogleConnector[],
  connectorId: string
): string | null {
  const c =
    connectors.find((x) => x.connectorId === connectorId) ||
    connectors.find((x) => x.connectorId.replace(/_/g, "-") === connectorId);
  return c?.accessToken || null;
}

export async function executeGoogleTool(
  name: string,
  args: Record<string, unknown>,
  connectors: GoogleConnector[]
): Promise<string> {
  try {
    if (name === "gmail_search") {
      const token = tokenFor(connectors, "gmail");
      if (!token)
        return "Gmail not connected or token missing. Reconnect Gmail in Settings → Connectors.";
      const q = String(args.query || "");
      const max = Math.min(Number(args.maxResults) || 10, 20);
      const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(q)}&maxResults=${max}`;
      const listRes = await gfetch(url, token);
      if (!listRes.ok) {
        const t = await listRes.text();
        return `Gmail search failed (${listRes.status}): ${t.slice(0, 400)}`;
      }
      const list = (await listRes.json()) as {
        messages?: { id: string }[];
      };
      if (!list.messages?.length) return "No messages found.";

      const out: string[] = [];
      for (const m of list.messages.slice(0, max)) {
        const mr = await gfetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
          token
        );
        if (!mr.ok) continue;
        const msg = (await mr.json()) as {
          id: string;
          snippet?: string;
          payload?: { headers?: { name: string; value: string }[] };
        };
        const headers = msg.payload?.headers || [];
        const get = (n: string) =>
          headers.find((h) => h.name.toLowerCase() === n.toLowerCase())?.value ||
          "";
        out.push(
          `id=${msg.id}\nFrom: ${get("From")}\nSubject: ${get("Subject")}\nDate: ${get("Date")}\nSnippet: ${msg.snippet || ""}`
        );
      }
      return out.join("\n\n---\n\n") || "No message details.";
    }

    if (name === "gmail_read") {
      const token = tokenFor(connectors, "gmail");
      if (!token) return "Gmail not connected.";
      const id = String(args.messageId || "");
      const res = await gfetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}?format=full`,
        token
      );
      if (!res.ok) {
        const t = await res.text();
        return `Gmail read failed (${res.status}): ${t.slice(0, 400)}`;
      }
      const msg = (await res.json()) as {
        snippet?: string;
        payload?: {
          headers?: { name: string; value: string }[];
          body?: { data?: string };
          parts?: Array<{ mimeType?: string; body?: { data?: string } }>;
        };
      };
      const headers = msg.payload?.headers || [];
      const get = (n: string) =>
        headers.find((h) => h.name.toLowerCase() === n.toLowerCase())?.value ||
        "";

      const decode = (b64?: string) => {
        if (!b64) return "";
        try {
          return Buffer.from(
            b64.replace(/-/g, "+").replace(/_/g, "/"),
            "base64"
          ).toString("utf8");
        } catch {
          return "";
        }
      };

      let body = decode(msg.payload?.body?.data);
      if (!body && msg.payload?.parts) {
        for (const p of msg.payload.parts) {
          if (p.mimeType === "text/plain" && p.body?.data) {
            body = decode(p.body.data);
            break;
          }
        }
      }
      return `From: ${get("From")}\nTo: ${get("To")}\nSubject: ${get("Subject")}\nDate: ${get("Date")}\n\n${body || msg.snippet || "(no body)"}`;
    }

    if (name === "gmail_send") {
      const token = tokenFor(connectors, "gmail");
      if (!token) return "Gmail not connected.";
      const to = String(args.to || "");
      const subject = String(args.subject || "");
      const body = String(args.body || "");
      const raw = [
        `To: ${to}`,
        `Subject: ${subject}`,
        "Content-Type: text/plain; charset=utf-8",
        "",
        body,
      ].join("\r\n");
      const encoded = Buffer.from(raw)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
      const res = await gfetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
        token,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ raw: encoded }),
        }
      );
      if (!res.ok) {
        const t = await res.text();
        return `Gmail send failed (${res.status}): ${t.slice(0, 400)}`;
      }
      const data = (await res.json()) as { id?: string };
      return `Email sent successfully. messageId=${data.id || "ok"}`;
    }

    if (name === "drive_search") {
      const token =
        tokenFor(connectors, "google-drive") ||
        tokenFor(connectors, "google_drive");
      if (!token) return "Google Drive not connected.";
      const q = String(args.query || "");
      const max = Math.min(Number(args.maxResults) || 10, 20);
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&pageSize=${max}&fields=files(id,name,mimeType,modifiedTime,webViewLink)`;
      const res = await gfetch(url, token);
      if (!res.ok) {
        const t = await res.text();
        return `Drive search failed (${res.status}): ${t.slice(0, 400)}`;
      }
      const data = (await res.json()) as {
        files?: Array<{
          id: string;
          name: string;
          mimeType?: string;
          modifiedTime?: string;
          webViewLink?: string;
        }>;
      };
      if (!data.files?.length) return "No files found.";
      return data.files
        .map(
          (f) =>
            `id=${f.id}\nname=${f.name}\ntype=${f.mimeType}\nmodified=${f.modifiedTime}\nlink=${f.webViewLink || ""}`
        )
        .join("\n\n---\n\n");
    }

    if (name === "drive_read") {
      const token =
        tokenFor(connectors, "google-drive") ||
        tokenFor(connectors, "google_drive");
      if (!token) return "Google Drive not connected.";
      const fileId = String(args.fileId || "");
      const metaRes = await gfetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType`,
        token
      );
      if (!metaRes.ok) {
        const t = await metaRes.text();
        return `Drive meta failed (${metaRes.status}): ${t.slice(0, 400)}`;
      }
      const meta = (await metaRes.json()) as {
        id: string;
        name: string;
        mimeType?: string;
      };

      if (meta.mimeType === "application/vnd.google-apps.document") {
        const exp = await gfetch(
          `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=text/plain`,
          token
        );
        if (exp.ok) {
          const text = await exp.text();
          return `File: ${meta.name}\n\n${text.slice(0, 30000)}`;
        }
      }

      const media = await gfetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
        token
      );
      if (media.ok) {
        const text = await media.text();
        return `File: ${meta.name} (${meta.mimeType})\n\n${text.slice(0, 30000)}`;
      }
      return `File: ${meta.name} (${meta.mimeType}) — content not readable as text.`;
    }

    if (name === "calendar_list_events") {
      const token =
        tokenFor(connectors, "google-calendar") ||
        tokenFor(connectors, "google_calendar");
      if (!token) return "Google Calendar not connected.";
      const max = Math.min(Number(args.maxResults) || 10, 20);
      const timeMin = String(args.timeMin || new Date().toISOString());
      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=${max}&singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(timeMin)}`;
      const res = await gfetch(url, token);
      if (!res.ok) {
        const t = await res.text();
        return `Calendar list failed (${res.status}): ${t.slice(0, 400)}`;
      }
      const data = (await res.json()) as {
        items?: Array<{
          id?: string;
          summary?: string;
          start?: { dateTime?: string; date?: string };
          end?: { dateTime?: string; date?: string };
          location?: string;
        }>;
      };
      if (!data.items?.length) return "No upcoming events.";
      return data.items
        .map(
          (e) =>
            `id=${e.id}\n${e.summary || "(no title)"}\nstart=${e.start?.dateTime || e.start?.date}\nend=${e.end?.dateTime || e.end?.date}\nlocation=${e.location || ""}`
        )
        .join("\n\n---\n\n");
    }

    if (name === "calendar_create_event") {
      const token =
        tokenFor(connectors, "google-calendar") ||
        tokenFor(connectors, "google_calendar");
      if (!token) return "Google Calendar not connected.";
      const timeZone = String(args.timeZone || "Asia/Kolkata");
      const body = {
        summary: String(args.summary || ""),
        description: args.description ? String(args.description) : undefined,
        start: { dateTime: String(args.start), timeZone },
        end: { dateTime: String(args.end), timeZone },
      };
      const res = await gfetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        token,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        const t = await res.text();
        return `Calendar create failed (${res.status}): ${t.slice(0, 400)}`;
      }
      const data = (await res.json()) as { id?: string; htmlLink?: string };
      return `Event created. id=${data.id} link=${data.htmlLink || ""}`;
    }

    return `Unknown Google tool: ${name}`;
  } catch (e) {
    return e instanceof Error ? e.message : "Google tool failed";
  }
}

export function isGoogleToolName(name: string): boolean {
  return (
    name.startsWith("gmail_") ||
    name.startsWith("drive_") ||
    name.startsWith("calendar_")
  );
}
