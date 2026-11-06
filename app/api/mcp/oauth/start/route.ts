import { NextRequest, NextResponse } from "next/server";
import {
  discoverAuthServer,
  registerClient,
  generatePKCE,
  generateState,
  buildAuthorizationUrl,
} from "@/lib/mcp-oauth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const mcpUrl = String(body.mcpUrl || "").trim();

    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: "Name is required (min 2 characters)" },
        { status: 400 }
      );
    }
    if (!mcpUrl || !mcpUrl.startsWith("https://")) {
      return NextResponse.json(
        { error: "MCP URL must be a valid https:// URL" },
        { status: 400 }
      );
    }

    // Must be logged in
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      req.headers.get("origin") ||
      new URL(req.url).origin;

    const redirectUri = `${origin}/api/mcp/oauth/callback`;

    // Discover auth server
    const { resource, asMetadata, scopes } = await discoverAuthServer(mcpUrl);

    // Client ID: try dynamic registration, otherwise use a public client_id derived from our app
    let clientId = `${origin}/oauth/client-metadata.json`;
    let clientSecret: string | undefined;

    if (asMetadata.registration_endpoint) {
      try {
        const reg = await registerClient(
          asMetadata.registration_endpoint,
          redirectUri,
          `Multi AI Chat — ${name}`
        );
        clientId = reg.client_id;
        clientSecret = reg.client_secret;
      } catch (regErr) {
        // Fall back to public client_id (CIMD-style)
        console.warn("DCR failed, using public client_id:", regErr);
      }
    }

    const { codeVerifier, codeChallenge } = generatePKCE();
    const state = generateState();

    // Store pending OAuth data in an httpOnly cookie (short lived)
    const pending = {
      userId: user.id,
      name,
      mcpUrl: resource,
      clientId,
      clientSecret: clientSecret || null,
      codeVerifier,
      tokenEndpoint: asMetadata.token_endpoint,
      resource,
      scopes,
      createdAt: Date.now(),
    };

    const authUrl = buildAuthorizationUrl({
      authorizationEndpoint: asMetadata.authorization_endpoint,
      clientId,
      redirectUri,
      scope: scopes.length ? scopes.join(" ") : undefined,
      state,
      codeChallenge,
      resource,
    });

    const res = NextResponse.json({
      authorizationUrl: authUrl,
      state,
    });

    // Cookie holds the sensitive PKCE verifier + context (10 min)
    res.cookies.set(`mcp_oauth_${state}`, JSON.stringify(pending), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });

    return res;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "OAuth start failed";
    console.error("[mcp/oauth/start]", msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
