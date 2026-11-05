import { fetchT } from "./http";
import type { McpTool, ToolProvider } from "./types";

/**
 * Built-in tool providers for Google services. They expose the same shape as an MCP
 * server (name / description / JSON-schema input) but call the real Google REST APIs
 * with the user's OAuth access token.
 */

interface GTool {
  def: McpTool;
  run: (args: any, token: string) => Promise<any>;
}

const enc = new TextEncoder();

function bytesToB64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function b64url(str: string): string {
  return bytesToB64(enc.encode(str))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromB64url(s: string): string {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function clip(s: string, n = 20000): string {
  return s.length > n ? s.slice(0, n) + `\n...[truncated ${s.length - n} characters]` : s;
}

async function gtext(token: string, url: string, init: RequestInit = {}): Promise<string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...((init.headers as Record<string, string>) || {}),
  };
  const res = await fetchT(url, { ...init, headers }, 30000);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Google API ${res.status}: ${text.slice(0, 500)}`);
  }
  return text;
}

async function gjson(token: string, url: string, init: RequestInit = {}): Promise<any> {
  const text = await gtext(token, url, init);
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function jsonInit(method: string, body?: any): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}

function str(description: string) {
  return { type: "string", description };
}

function tool(
  name: string,
  description: string,
  properties: Record<string, any>,
  required: string[],
  run: (args: any, token: string) => Promise<any>
): GTool {
  return {
    def: {
      name,
      description,
      inputSchema: { type: "object", properties, required },
    },
    run,
  };
}

/* ----------------------------- Drive / Docs / Sheets ----------------------------- */

const DRIVE = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3";
const FOLDER = "application/vnd.google-apps.folder";

function docText(doc: any): string {
  const out: string[] = [];
  ((doc.body && doc.body.content) || []).forEach((el: any) => {
    ((el.paragraph && el.paragraph.elements) || []).forEach((e: any) => {
      if (e.textRun && e.textRun.content) out.push(e.textRun.content);
    });
    if (el.table) {
      (el.table.tableRows || []).forEach((row: any) => {
        const cells = (row.tableCells || []).map((c: any) =>
          (c.content || [])
            .map((p: any) =>
              ((p.paragraph && p.paragraph.elements) || [])
                .map((e: any) => (e.textRun && e.textRun.content) || "")
                .join("")
            )
            .join("")
            .trim()
        );
        out.push(cells.join(" | ") + "\n");
      });
    }
  });
  return out.join("");
}

const driveTools: GTool[] = [
  tool(
    "drive_search",
    "Search Google Drive. 'query' is either plain text (full-text search) or a Drive query such as \"name contains 'report' and mimeType = 'application/pdf'\". Empty query lists recent files.",
    {
      query: str("Plain text or Drive query"),
      pageSize: { type: "number", description: "Max results (default 20, max 100)" },
    },
    [],
    async (a, token) => {
      const raw = String(a.query || "").trim();
      const isQuery = /\b(contains|in parents|mimeType|trashed|modifiedTime|starred|sharedWithMe)\b|[=<>]/.test(raw);
      const q = raw
        ? isQuery
          ? raw
          : `fullText contains '${raw.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}' and trashed = false`
        : "trashed = false";
      const url = new URL(`${DRIVE}/files`);
      url.searchParams.set("q", q);
      url.searchParams.set("pageSize", String(Math.min(Number(a.pageSize) || 20, 100)));
      url.searchParams.set("orderBy", "modifiedTime desc");
      url.searchParams.set("supportsAllDrives", "true");
      url.searchParams.set("includeItemsFromAllDrives", "true");
      url.searchParams.set(
        "fields",
        "files(id,name,mimeType,modifiedTime,size,webViewLink,parents)"
      );
      return gjson(token, url.toString());
    }
  ),
  tool(
    "drive_get_file",
    "Get metadata (name, type, owners, links) for a Drive file or folder.",
    { fileId: str("Drive file id") },
    ["fileId"],
    (a, token) =>
      gjson(
        token,
        `${DRIVE}/files/${encodeURIComponent(a.fileId)}?supportsAllDrives=true&fields=id,name,mimeType,size,createdTime,modifiedTime,owners(displayName,emailAddress),webViewLink,parents`
      )
  ),
  tool(
    "drive_read_file",
    "Read the text content of a Drive file. Google Docs/Slides are exported as text, Sheets as CSV, text-like files are downloaded.",
    { fileId: str("Drive file id") },
    ["fileId"],
    async (a, token) => {
      const id = encodeURIComponent(a.fileId);
      const meta = await gjson(
        token,
        `${DRIVE}/files/${id}?supportsAllDrives=true&fields=id,name,mimeType,size,webViewLink`
      );
      const mt: string = meta.mimeType || "";
      let exportType = "";
      if (mt === "application/vnd.google-apps.document") exportType = "text/plain";
      else if (mt === "application/vnd.google-apps.presentation") exportType = "text/plain";
      else if (mt === "application/vnd.google-apps.spreadsheet") exportType = "text/csv";
      if (exportType) {
        const text = await gtext(
          token,
          `${DRIVE}/files/${id}/export?mimeType=${encodeURIComponent(exportType)}`
        );
        return `# ${meta.name}\n\n${clip(text)}`;
      }
      if (mt.indexOf("text/") === 0 || /json|xml|csv|javascript|markdown|yaml/.test(mt)) {
        const text = await gtext(token, `${DRIVE}/files/${id}?alt=media&supportsAllDrives=true`);
        return `# ${meta.name}\n\n${clip(text)}`;
      }
      return {
        note: "This file type cannot be read as text.",
        name: meta.name,
        mimeType: mt,
        webViewLink: meta.webViewLink,
      };
    }
  ),
  tool(
    "drive_create_file",
    "Create a new file in Drive with text content.",
    {
      name: str("File name including extension"),
      content: str("Text content"),
      mimeType: str("Content type, default text/plain"),
      parentId: str("Optional parent folder id"),
    },
    ["name", "content"],
    (a, token) => {
      const boundary = "mac" + Math.random().toString(36).slice(2);
      const meta: any = { name: a.name };
      if (a.parentId) meta.parents = [a.parentId];
      const type = a.mimeType || "text/plain";
      const body =
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n` +
        `--${boundary}\r\nContent-Type: ${type}; charset=UTF-8\r\n\r\n${a.content}\r\n--${boundary}--`;
      return gjson(
        token,
        `${DRIVE_UPLOAD}/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,mimeType,webViewLink`,
        {
          method: "POST",
          headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
          body,
        }
      );
    }
  ),
  tool(
    "drive_create_folder",
    "Create a folder in Drive.",
    { name: str("Folder name"), parentId: str("Optional parent folder id") },
    ["name"],
    (a, token) =>
      gjson(
        token,
        `${DRIVE}/files?supportsAllDrives=true&fields=id,name,webViewLink`,
        jsonInit("POST", {
          name: a.name,
          mimeType: FOLDER,
          parents: a.parentId ? [a.parentId] : undefined,
        })
      )
  ),
  tool(
    "drive_update_file",
    "Rename a Drive file and/or replace its text content.",
    {
      fileId: str("Drive file id"),
      name: str("New name (optional)"),
      content: str("New full text content (optional)"),
    },
    ["fileId"],
    async (a, token) => {
      const id = encodeURIComponent(a.fileId);
      let result: any = {};
      if (a.content !== undefined) {
        result = await gjson(
          token,
          `${DRIVE_UPLOAD}/files/${id}?uploadType=media&supportsAllDrives=true&fields=id,name,modifiedTime`,
          {
            method: "PATCH",
            headers: { "Content-Type": "text/plain; charset=UTF-8" },
            body: String(a.content),
          }
        );
      }
      if (a.name) {
        result = await gjson(
          token,
          `${DRIVE}/files/${id}?supportsAllDrives=true&fields=id,name,modifiedTime`,
          jsonInit("PATCH", { name: a.name })
        );
      }
      return result;
    }
  ),
  tool(
    "drive_trash_file",
    "Move a Drive file or folder to the trash (recoverable).",
    { fileId: str("Drive file id") },
    ["fileId"],
    (a, token) =>
      gjson(
        token,
        `${DRIVE}/files/${encodeURIComponent(a.fileId)}?supportsAllDrives=true&fields=id,name,trashed`,
        jsonInit("PATCH", { trashed: true })
      )
  ),
  tool(
    "docs_create",
    "Create a new Google Doc, optionally with initial text.",
    { title: str("Document title"), content: str("Initial text (optional)") },
    ["title"],
    async (a, token) => {
      const doc = await gjson(
        token,
        "https://docs.googleapis.com/v1/documents",
        jsonInit("POST", { title: a.title })
      );
      if (a.content) {
        await gjson(
          token,
          `https://docs.googleapis.com/v1/documents/${doc.documentId}:batchUpdate`,
          jsonInit("POST", {
            requests: [{ insertText: { location: { index: 1 }, text: String(a.content) } }],
          })
        );
      }
      return {
        documentId: doc.documentId,
        title: doc.title,
        url: `https://docs.google.com/document/d/${doc.documentId}/edit`,
      };
    }
  ),
  tool(
    "docs_read",
    "Read the text of a Google Doc.",
    { documentId: str("Document id") },
    ["documentId"],
    async (a, token) => {
      const doc = await gjson(
        token,
        `https://docs.googleapis.com/v1/documents/${encodeURIComponent(a.documentId)}`
      );
      return `# ${doc.title}\n\n${clip(docText(doc))}`;
    }
  ),
  tool(
    "docs_append_text",
    "Append text to the end of a Google Doc.",
    { documentId: str("Document id"), text: str("Text to append") },
    ["documentId", "text"],
    async (a, token) => {
      const id = encodeURIComponent(a.documentId);
      const doc = await gjson(token, `https://docs.googleapis.com/v1/documents/${id}`);
      const content = (doc.body && doc.body.content) || [];
      const end = content.length ? content[content.length - 1].endIndex : 2;
      return gjson(
        token,
        `https://docs.googleapis.com/v1/documents/${id}:batchUpdate`,
        jsonInit("POST", {
          requests: [
            { insertText: { location: { index: Math.max(1, end - 1) }, text: String(a.text) } },
          ],
        })
      );
    }
  ),
  tool(
    "sheets_info",
    "Get the title and sheet (tab) names of a Google Sheets spreadsheet.",
    { spreadsheetId: str("Spreadsheet id") },
    ["spreadsheetId"],
    (a, token) =>
      gjson(
        token,
        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(a.spreadsheetId)}?fields=properties.title,sheets.properties`
      )
  ),
  tool(
    "sheets_read",
    "Read cell values from a range in A1 notation, e.g. Sheet1!A1:D20.",
    { spreadsheetId: str("Spreadsheet id"), range: str("A1 range") },
    ["spreadsheetId", "range"],
    (a, token) =>
      gjson(
        token,
        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(a.spreadsheetId)}/values/${encodeURIComponent(a.range)}`
      )
  ),
  tool(
    "sheets_write",
    "Write a 2D array of values (or formulas) into a range.",
    {
      spreadsheetId: str("Spreadsheet id"),
      range: str("A1 range"),
      values: { type: "array", items: { type: "array", items: {} }, description: "Rows of cell values" },
    },
    ["spreadsheetId", "range", "values"],
    (a, token) =>
      gjson(
        token,
        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(a.spreadsheetId)}/values/${encodeURIComponent(a.range)}?valueInputOption=USER_ENTERED`,
        jsonInit("PUT", { values: a.values })
      )
  ),
  tool(
    "sheets_append",
    "Append rows after the last row of a table in a sheet.",
    {
      spreadsheetId: str("Spreadsheet id"),
      range: str("Sheet or range, e.g. Sheet1"),
      values: { type: "array", items: { type: "array", items: {} }, description: "Rows to append" },
    },
    ["spreadsheetId", "range", "values"],
    (a, token) =>
      gjson(
        token,
        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(a.spreadsheetId)}/values/${encodeURIComponent(a.range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
        jsonInit("POST", { values: a.values })
      )
  ),
  tool(
    "sheets_create",
    "Create a new Google Sheets spreadsheet.",
    { title: str("Spreadsheet title") },
    ["title"],
    async (a, token) => {
      const s = await gjson(
        token,
        "https://sheets.googleapis.com/v4/spreadsheets",
        jsonInit("POST", { properties: { title: a.title } })
      );
      return { spreadsheetId: s.spreadsheetId, url: s.spreadsheetUrl };
    }
  ),
];

/* --------------------------------- Calendar --------------------------------- */

const CAL = "https://www.googleapis.com/calendar/v3";

function compactEvent(e: any) {
  return {
    id: e.id,
    summary: e.summary,
    start: e.start && (e.start.dateTime || e.start.date),
    end: e.end && (e.end.dateTime || e.end.date),
    location: e.location,
    description: e.description,
    attendees: (e.attendees || []).map((x: any) => x.email),
    status: e.status,
    link: e.htmlLink,
  };
}

function eventTime(value: string, timeZone?: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return { date: value };
  const hasOffset = /(Z|[+-]\d{2}:?\d{2})$/.test(value);
  return hasOffset ? { dateTime: value } : { dateTime: value, timeZone: timeZone || "UTC" };
}

const calendarTools: GTool[] = [
  tool(
    "calendar_list_calendars",
    "List the calendars the user can access.",
    {},
    [],
    async (_a, token) => {
      const r = await gjson(token, `${CAL}/users/me/calendarList`);
      return (r.items || []).map((c: any) => ({
        id: c.id,
        summary: c.summary,
        primary: !!c.primary,
        timeZone: c.timeZone,
        accessRole: c.accessRole,
      }));
    }
  ),
  tool(
    "calendar_list_events",
    "List events in a time range (defaults: primary calendar, from now, next 20 events). Times are ISO 8601.",
    {
      calendarId: str("Calendar id, default primary"),
      timeMin: str("Start of range, ISO 8601 with offset"),
      timeMax: str("End of range, ISO 8601 with offset"),
      q: str("Free-text filter"),
      maxResults: { type: "number", description: "Default 20, max 100" },
    },
    [],
    async (a, token) => {
      const url = new URL(`${CAL}/calendars/${encodeURIComponent(a.calendarId || "primary")}/events`);
      url.searchParams.set("singleEvents", "true");
      url.searchParams.set("orderBy", "startTime");
      url.searchParams.set("timeMin", a.timeMin || new Date().toISOString());
      if (a.timeMax) url.searchParams.set("timeMax", a.timeMax);
      if (a.q) url.searchParams.set("q", a.q);
      url.searchParams.set("maxResults", String(Math.min(Number(a.maxResults) || 20, 100)));
      const r = await gjson(token, url.toString());
      return (r.items || []).map(compactEvent);
    }
  ),
  tool(
    "calendar_create_event",
    "Create a calendar event. start/end are ISO 8601 (include the UTC offset, e.g. 2026-11-06T15:00:00+05:30, or pass timeZone). Use YYYY-MM-DD for all-day events.",
    {
      summary: str("Event title"),
      start: str("Start time"),
      end: str("End time"),
      timeZone: str("IANA time zone, used when start/end have no offset"),
      description: str("Description"),
      location: str("Location"),
      attendees: { type: "array", items: { type: "string" }, description: "Attendee email addresses" },
      calendarId: str("Calendar id, default primary"),
      sendUpdates: str("all, externalOnly or none (default none)"),
    },
    ["summary", "start", "end"],
    async (a, token) => {
      const body: any = {
        summary: a.summary,
        description: a.description,
        location: a.location,
        start: eventTime(a.start, a.timeZone),
        end: eventTime(a.end, a.timeZone),
      };
      if (Array.isArray(a.attendees) && a.attendees.length) {
        body.attendees = a.attendees.map((email: string) => ({ email }));
      }
      const e = await gjson(
        token,
        `${CAL}/calendars/${encodeURIComponent(a.calendarId || "primary")}/events?sendUpdates=${a.sendUpdates || "none"}`,
        jsonInit("POST", body)
      );
      return compactEvent(e);
    }
  ),
  tool(
    "calendar_update_event",
    "Update fields of an existing event. Only the fields you pass are changed.",
    {
      eventId: str("Event id"),
      calendarId: str("Calendar id, default primary"),
      summary: str("New title"),
      start: str("New start (ISO 8601)"),
      end: str("New end (ISO 8601)"),
      timeZone: str("IANA time zone, used when start/end have no offset"),
      description: str("New description"),
      location: str("New location"),
      attendees: { type: "array", items: { type: "string" }, description: "Replace attendee list" },
      sendUpdates: str("all, externalOnly or none (default none)"),
    },
    ["eventId"],
    async (a, token) => {
      const body: any = {};
      if (a.summary !== undefined) body.summary = a.summary;
      if (a.description !== undefined) body.description = a.description;
      if (a.location !== undefined) body.location = a.location;
      if (a.start) body.start = eventTime(a.start, a.timeZone);
      if (a.end) body.end = eventTime(a.end, a.timeZone);
      if (Array.isArray(a.attendees)) {
        body.attendees = a.attendees.map((email: string) => ({ email }));
      }
      const e = await gjson(
        token,
        `${CAL}/calendars/${encodeURIComponent(a.calendarId || "primary")}/events/${encodeURIComponent(a.eventId)}?sendUpdates=${a.sendUpdates || "none"}`,
        jsonInit("PATCH", body)
      );
      return compactEvent(e);
    }
  ),
  tool(
    "calendar_delete_event",
    "Delete a calendar event.",
    {
      eventId: str("Event id"),
      calendarId: str("Calendar id, default primary"),
    },
    ["eventId"],
    async (a, token) => {
      await gtext(
        token,
        `${CAL}/calendars/${encodeURIComponent(a.calendarId || "primary")}/events/${encodeURIComponent(a.eventId)}`,
        { method: "DELETE" }
      );
      return { deleted: true, eventId: a.eventId };
    }
  ),
];

/* ----------------------------------- Gmail ---------------------------------- */

const GMAIL = "https://gmail.googleapis.com/gmail/v1/users/me";

function header(msg: any, name: string): string {
  const hs: any[] = (msg.payload && msg.payload.headers) || [];
  for (const h of hs) {
    if (String(h.name).toLowerCase() === name.toLowerCase()) return h.value;
  }
  return "";
}

function walkPart(p: any, mime: string): string {
  if (p.mimeType === mime && p.body && p.body.data) return fromB64url(p.body.data);
  for (const part of p.parts || []) {
    const r = walkPart(part, mime);
    if (r) return r;
  }
  return "";
}

function messageBody(payload: any): string {
  if (!payload) return "";
  const plain = walkPart(payload, "text/plain");
  if (plain) return plain;
  return walkPart(payload, "text/html")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function encodeHeader(v: string): string {
  return /^[\x20-\x7e]*$/.test(v) ? v : `=?UTF-8?B?${bytesToB64(enc.encode(v))}?=`;
}

function buildRaw(a: any): string {
  const lines: string[] = [`To: ${a.to}`];
  if (a.cc) lines.push(`Cc: ${a.cc}`);
  if (a.bcc) lines.push(`Bcc: ${a.bcc}`);
  lines.push(
    `Subject: ${encodeHeader(String(a.subject || ""))}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    bytesToB64(enc.encode(String(a.body || ""))).replace(/.{1,76}/g, "$&\r\n")
  );
  return b64url(lines.join("\r\n"));
}

const gmailTools: GTool[] = [
  tool(
    "gmail_search",
    "Search Gmail using Gmail search syntax (e.g. 'from:alice is:unread newer_than:7d'). Returns sender, subject, date and snippet.",
    { query: str("Gmail search query"), maxResults: { type: "number", description: "Default 10, max 25" } },
    [],
    async (a, token) => {
      const url = new URL(`${GMAIL}/messages`);
      if (a.query) url.searchParams.set("q", a.query);
      url.searchParams.set("maxResults", String(Math.min(Number(a.maxResults) || 10, 25)));
      const list = await gjson(token, url.toString());
      const ids: any[] = list.messages || [];
      return Promise.all(
        ids.map(async (m: any) => {
          const msg = await gjson(
            token,
            `${GMAIL}/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`
          );
          return {
            id: msg.id,
            threadId: msg.threadId,
            from: header(msg, "From"),
            to: header(msg, "To"),
            subject: header(msg, "Subject"),
            date: header(msg, "Date"),
            snippet: msg.snippet,
            labels: msg.labelIds,
          };
        })
      );
    }
  ),
  tool(
    "gmail_read",
    "Read a Gmail message (headers and text body) by id.",
    { messageId: str("Message id from gmail_search") },
    ["messageId"],
    async (a, token) => {
      const msg = await gjson(
        token,
        `${GMAIL}/messages/${encodeURIComponent(a.messageId)}?format=full`
      );
      return {
        id: msg.id,
        threadId: msg.threadId,
        from: header(msg, "From"),
        to: header(msg, "To"),
        cc: header(msg, "Cc"),
        subject: header(msg, "Subject"),
        date: header(msg, "Date"),
        labels: msg.labelIds,
        body: clip(messageBody(msg.payload), 15000),
      };
    }
  ),
  tool(
    "gmail_send",
    "Send a plain-text email from the user's Gmail account.",
    {
      to: str("Recipient(s), comma separated"),
      subject: str("Subject"),
      body: str("Plain text body"),
      cc: str("Cc (optional)"),
      bcc: str("Bcc (optional)"),
      threadId: str("Thread id to reply within (optional)"),
    },
    ["to", "subject", "body"],
    async (a, token) => {
      const r = await gjson(
        token,
        `${GMAIL}/messages/send`,
        jsonInit("POST", { raw: buildRaw(a), threadId: a.threadId || undefined })
      );
      return { sent: true, id: r.id, threadId: r.threadId };
    }
  ),
  tool(
    "gmail_create_draft",
    "Create a draft email without sending it.",
    {
      to: str("Recipient(s), comma separated"),
      subject: str("Subject"),
      body: str("Plain text body"),
      cc: str("Cc (optional)"),
      bcc: str("Bcc (optional)"),
    },
    ["to", "subject", "body"],
    async (a, token) => {
      const r = await gjson(
        token,
        `${GMAIL}/drafts`,
        jsonInit("POST", { message: { raw: buildRaw(a) } })
      );
      return { draftId: r.id, messageId: r.message && r.message.id };
    }
  ),
  tool(
    "gmail_list_labels",
    "List Gmail labels.",
    {},
    [],
    async (_a, token) => {
      const r = await gjson(token, `${GMAIL}/labels`);
      return (r.labels || []).map((l: any) => ({ id: l.id, name: l.name, type: l.type }));
    }
  ),
  tool(
    "gmail_modify_labels",
    "Add or remove labels on a message (e.g. remove UNREAD to mark as read, add STARRED).",
    {
      messageId: str("Message id"),
      addLabelIds: { type: "array", items: { type: "string" }, description: "Label ids to add" },
      removeLabelIds: { type: "array", items: { type: "string" }, description: "Label ids to remove" },
    },
    ["messageId"],
    async (a, token) => {
      const r = await gjson(
        token,
        `${GMAIL}/messages/${encodeURIComponent(a.messageId)}/modify`,
        jsonInit("POST", {
          addLabelIds: a.addLabelIds || [],
          removeLabelIds: a.removeLabelIds || [],
        })
      );
      return { id: r.id, labels: r.labelIds };
    }
  ),
  tool(
    "gmail_trash",
    "Move a message to the trash (recoverable for 30 days).",
    { messageId: str("Message id") },
    ["messageId"],
    async (a, token) => {
      const r = await gjson(
        token,
        `${GMAIL}/messages/${encodeURIComponent(a.messageId)}/trash`,
        jsonInit("POST")
      );
      return { id: r.id, trashed: true };
    }
  ),
];

/* --------------------------------- Provider --------------------------------- */

export function createGoogleProvider(connectorId: string, token: string): ToolProvider {
  const set =
    connectorId === "google-calendar"
      ? calendarTools
      : connectorId === "gmail"
      ? gmailTools
      : driveTools;
  return {
    async listTools() {
      return set.map((t) => t.def);
    },
    async callTool(name: string, args: any) {
      const t = set.find((x) => x.def.name === name);
      if (!t) throw new Error(`Unknown tool: ${name}`);
      const out = await t.run(args || {}, token);
      return clip(typeof out === "string" ? out : JSON.stringify(out, null, 2));
    },
  };
}
