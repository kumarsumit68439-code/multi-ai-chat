import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/mcp-oauth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDesc = searchParams.get("error_description");

  const failRedirect = (msg: string) => {
    const u = new URL("/", origin);
    u.searchParams.set("mcp_error", msg.slice(0, 200));
    return NextResponse.redirect(u.toString());
  };

  if (error) {
    return failRedirect(errorDesc || error);
  }

  if (!code || !state) {
    return failRedirect("Missing code or state");
  }

  const cookieName = `mcp_oauth_${state}`;
  const raw = req.cookies.get(cookieName)?.value;
  if (!raw) {
    return failRedirect("OAuth session expired. Please try connecting again.");
  }

  let pending: {
    userId: string;
    name: string;
    mcpUrl: string;
    clientId: string;
    clientSecret: string | null;
    codeVerifier: string;
    tokenEndpoint: string;
    resource: string;
    scopes: string[];
    createdAt: number;
  };

  try {
    pending = JSON.parse(raw);
  } catch {
    return failRedirect("Invalid OAuth session");
  }

  // 15 min max age
  if (Date.now() - pending.createdAt > 15 * 60 * 1000) {
    return failRedirect("OAuth session expired");
  }

  const redirectUri = `${origin}/api/mcp/oauth/callback`;

  try {
    const tokens = await exchangeCode({
      tokenEndpoint: pending.tokenEndpoint,
      code,
      redirectUri,
      clientId: pending.clientId,
      codeVerifier: pending.codeVerifier,
      resource: pending.resource,
      clientSecret: pending.clientSecret || undefined,
    });

    if (!tokens.access_token) {
      return failRedirect("No access_token in response");
    }

    const supabase = await createClient();

    // Verify the user still matches
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.id !== pending.userId) {
      return failRedirect("User session mismatch");
    }

    // connector_id for custom MCP: custom:<slug>
    const slug = pending.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);
    const connectorId = `custom:${slug}`;

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    // Upsert connection + tokens
    // Requires columns: mcp_url, access_token, refresh_token, token_expires_at, client_id
    // (see README SQL migration)
    const { error: dbError } = await supabase.from("user_connectors").upsert(
      {
        user_id: pending.userId,
        connector_id: connectorId,
        connected: true,
        provider: "mcp",
        scopes: pending.scopes?.length ? pending.scopes : null,
        mcp_url: pending.mcpUrl,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        token_expires_at: expiresAt,
        client_id: pending.clientId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,connector_id" }
    );

    if (dbError) {
      console.error("[mcp/oauth/callback] db error", dbError);
      // Still mark connected with basic fields if extended columns are missing
      await supabase.from("user_connectors").upsert(
        {
          user_id: pending.userId,
          connector_id: connectorId,
          connected: true,
          provider: "mcp",
          scopes: pending.scopes?.length ? pending.scopes : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,connector_id" }
      );
    }

    // Clear the pending cookie
    const res = NextResponse.redirect(
      `${origin}/?mcp_connected=${encodeURIComponent(pending.name)}`
    );
    res.cookies.set(cookieName, "", {
      httpOnly: true,
      path: "/",
      maxAge: 0,
    });
    return res;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Token exchange failed";
    console.error("[mcp/oauth/callback]", msg);
    return failRedirect(msg);
  }
}
