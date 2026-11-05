import { NextRequest, NextResponse } from "next/server";
import {
  clientEnvKeys,
  getConnectorDef,
  missingEnv,
  slugify,
} from "@/lib/connectors/registry";
import {
  buildAuthorizeUrl,
  discoverMcpOAuth,
  pkceChallenge,
  randomString,
  registerClient,
} from "@/lib/connectors/oauth";
import { McpHttpClient } from "@/lib/connectors/mcp-client";
import { saveConnected, savePending } from "@/lib/connectors/store";
import { isEncryptionConfigured } from "@/lib/connectors/crypto";
import type { ConnData } from "@/lib/connectors/types";

export const dynamic = "force-dynamic";

function getOrigin(req: NextRequest): string {
  const h = req.headers;
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || "https";
  return host ? `${proto}://${host}` : new URL(req.url).origin;
}

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: NextRequest) {
  try {
    if (!isEncryptionConfigured()) {
      return fail(
        "CONNECTOR_ENCRYPTION_KEY is not set. Add it in Vercel environment variables and redeploy.",
        500
      );
    }

    const body = await req.json();
    const redirectUri = `${getOrigin(req)}/api/connectors/callback`;
    const token = body.token ? String(body.token).trim() : "";
    let connectorId = String(body.connectorId || "");
    let serverUrl: string | undefined;
    let label: string | undefined;
    const def = getConnectorDef(connectorId);

    if (connectorId === "custom") {
      const c = body.custom || {};
      const name = String(c.name || "").trim();
      const url = String(c.url || "").trim();
      if (!name || !url) return fail("Name and server URL are required.");
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        return fail("Invalid server URL.");
      }
      if (parsed.protocol !== "https:") return fail("Server URL must start with https://");
      connectorId = `custom:${slugify(name)}`;
      serverUrl = parsed.toString();
      label = name;
    } else if (!def) {
      return fail("Unknown connector.", 404);
    } else {
      serverUrl = def.url;
    }

    // Access-token connection: validate by listing tools, then store.
    if (token) {
      if (def && def.auth === "google") {
        return fail("Google connectors use Sign in with Google.");
      }
      if (!serverUrl) return fail("No server URL for this connector.");
      const tools = await new McpHttpClient(serverUrl, token).listTools();
      await saveConnected(connectorId, { accessToken: token, staticToken: true }, { serverUrl, label });
      return NextResponse.json({ connected: true, toolCount: tools.length });
    }

    if (def) {
      const missing = missingEnv(def);
      if (missing.length) {
        return fail(`Missing environment variables: ${missing.join(", ")}`);
      }
    }

    const state = randomString(24);
    const verifier = randomString(48);
    const challenge = await pkceChallenge(verifier);
    const data: ConnData = { redirectUri, codeVerifier: verifier };
    let authUrl: string;

    if (def && (def.auth === "google" || def.auth === "github")) {
      // Pre-registered OAuth app (Google Cloud / GitHub OAuth App).
      const isGoogle = def.auth === "google";
      const keys = clientEnvKeys(def);
      const clientId = process.env[keys.id] as string;
      const clientSecret = process.env[keys.secret];
      const authorizationEndpoint = isGoogle
        ? "https://accounts.google.com/o/oauth2/v2/auth"
        : "https://github.com/login/oauth/authorize";
      const tokenEndpoint = isGoogle
        ? "https://oauth2.googleapis.com/token"
        : "https://github.com/login/oauth/access_token";
      data.clientId = clientId;
      data.clientSecret = clientSecret;
      data.tokenEndpoint = tokenEndpoint;
      data.authorizationEndpoint = authorizationEndpoint;
      authUrl = buildAuthorizeUrl({
        endpoint: authorizationEndpoint,
        clientId,
        redirectUri,
        state,
        challenge,
        scope: (def.scopes || []).join(" "),
        extra: isGoogle ? { access_type: "offline", prompt: "consent" } : {},
      });
    } else {
      // Remote MCP server: standard MCP OAuth (discovery + dynamic client registration + PKCE).
      if (!serverUrl) return fail("No server URL for this connector.");
      const disc = await discoverMcpOAuth(serverUrl);
      const keys = def ? clientEnvKeys(def) : null;
      let clientId = keys ? process.env[keys.id] : undefined;
      let clientSecret = keys ? process.env[keys.secret] : undefined;
      if (!clientId) {
        if (!disc.registrationEndpoint) {
          return fail(
            `${label || (def && def.name) || "This server"} does not allow automatic app registration. ` +
              (keys
                ? `Create an OAuth app there and add ${keys.id} and ${keys.secret} in Vercel, or connect with an access token.`
                : "Connect with an access token instead.")
          );
        }
        const reg = await registerClient(disc.registrationEndpoint, redirectUri);
        clientId = reg.clientId;
        clientSecret = reg.clientSecret;
      }
      data.clientId = clientId;
      data.clientSecret = clientSecret;
      data.tokenEndpoint = disc.tokenEndpoint;
      data.authorizationEndpoint = disc.authorizationEndpoint;
      data.resource = disc.resource;
      authUrl = buildAuthorizeUrl({
        endpoint: disc.authorizationEndpoint,
        clientId: clientId as string,
        redirectUri,
        state,
        challenge,
        scope: disc.scopes && disc.scopes.length ? disc.scopes.join(" ") : undefined,
        resource: disc.resource,
      });
    }

    await savePending(connectorId, state, data, { serverUrl, label });
    return NextResponse.json({ authUrl });
  } catch (e: unknown) {
    return fail(e instanceof Error ? e.message : "Could not start the connection", 400);
  }
}
