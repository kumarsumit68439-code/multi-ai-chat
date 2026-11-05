import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/connectors/oauth";
import { getConnectorDef } from "@/lib/connectors/registry";
import {
  findPendingByState,
  removeConnection,
  saveConnected,
} from "@/lib/connectors/store";

export const dynamic = "force-dynamic";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function page(title: string, message: string, ok: boolean) {
  const script = ok
    ? "try{if(window.opener){window.opener.postMessage('connector-connected',window.location.origin)}}catch(e){}setTimeout(function(){window.close()},1200);"
    : "";
  const html =
    '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    `<title>${esc(title)}</title>` +
    "<style>body{font-family:system-ui,sans-serif;background:#0b0b0f;color:#eee;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}div{max-width:420px;padding:24px;text-align:center}h1{font-size:20px}p{color:#aaa;font-size:14px;line-height:1.5}a{color:#8ab4ff}</style>" +
    `</head><body><div><h1>${ok ? "\u2705" : "\u26a0\ufe0f"} ${esc(title)}</h1><p>${esc(message)}</p>` +
    '<p><a href="/">Back to chat</a></p></div>' +
    `<script>${script}</script></body></html>`;
  return new NextResponse(html, {
    status: ok ? 200 : 400,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const code = sp.get("code");
  const state = sp.get("state");
  const error = sp.get("error");

  try {
    if (!state) return page("Connection failed", "Missing state parameter.", false);

    const row = await findPendingByState(state);
    if (!row) {
      return page(
        "Connection failed",
        "This authorization request expired or was already used. Start again from Settings, Connectors.",
        false
      );
    }

    if (error || !code) {
      await removeConnection(row.connectorId);
      return page(
        "Connection failed",
        sp.get("error_description") || error || "No authorization code was returned.",
        false
      );
    }

    const d = row.data;
    if (!d.tokenEndpoint || !d.clientId || !d.redirectUri) {
      throw new Error("Incomplete authorization request. Please try again.");
    }

    const tokens = await exchangeCode({
      tokenEndpoint: d.tokenEndpoint,
      clientId: d.clientId,
      clientSecret: d.clientSecret,
      code,
      redirectUri: d.redirectUri,
      codeVerifier: d.codeVerifier,
      resource: d.resource,
    });

    await saveConnected(
      row.connectorId,
      {
        ...d,
        codeVerifier: undefined,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        scope: tokens.scope,
      },
      { serverUrl: row.serverUrl, label: row.label }
    );

    const def = getConnectorDef(row.connectorId);
    const name = (def && def.name) || row.label || "Connector";
    return page("Connected", `${name} is now connected. You can close this window.`, true);
  } catch (e: unknown) {
    return page(
      "Connection failed",
      e instanceof Error ? e.message : "Something went wrong.",
      false
    );
  }
}
