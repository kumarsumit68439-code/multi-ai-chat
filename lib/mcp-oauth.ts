/**
 * MCP OAuth 2.1 helpers — discovery, PKCE, authorization URL, token exchange.
 * Follows the Model Context Protocol Authorization specification.
 */

import { createHash, randomBytes } from "crypto";

export interface PKCE {
  codeVerifier: string;
  codeChallenge: string;
}

export function generatePKCE(): PKCE {
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  return { codeVerifier, codeChallenge };
}

export function generateState(): string {
  return randomBytes(24).toString("base64url");
}

export interface ProtectedResourceMetadata {
  resource?: string;
  authorization_servers?: string[];
  scopes_supported?: string[];
  bearer_methods_supported?: string[];
}

export interface AuthorizationServerMetadata {
  issuer?: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint?: string;
  response_types_supported?: string[];
  grant_types_supported?: string[];
  code_challenge_methods_supported?: string[];
  token_endpoint_auth_methods_supported?: string[];
  scopes_supported?: string[];
}

/**
 * Discover OAuth metadata for an MCP server URL.
 * 1. Try protected resource metadata (RFC 9728)
 * 2. Fall back to well-known paths
 * 3. Probe the MCP endpoint for 401 + WWW-Authenticate
 */
export async function discoverAuthServer(
  mcpUrl: string
): Promise<{
  resource: string;
  asMetadata: AuthorizationServerMetadata;
  scopes: string[];
}> {
  const url = new URL(mcpUrl);
  const origin = url.origin;
  const resource = mcpUrl.replace(/\/$/, "");

  // 1. Protected Resource Metadata (preferred)
  const prmCandidates = [
    `${origin}/.well-known/oauth-protected-resource${url.pathname === "/" ? "" : url.pathname}`,
    `${origin}/.well-known/oauth-protected-resource`,
  ];

  let prm: ProtectedResourceMetadata | null = null;
  for (const candidate of prmCandidates) {
    try {
      const res = await fetch(candidate, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        prm = (await res.json()) as ProtectedResourceMetadata;
        break;
      }
    } catch {
      /* continue */
    }
  }

  // 2. Probe the MCP endpoint itself for 401 + WWW-Authenticate
  if (!prm?.authorization_servers?.length) {
    try {
      const probe = await fetch(mcpUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-03-26",
            capabilities: {},
            clientInfo: { name: "multi-ai-chat", version: "1.0.0" },
          },
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (probe.status === 401) {
        const www = probe.headers.get("www-authenticate") || "";
        const metaMatch = www.match(/resource_metadata="([^"]+)"/i);
        if (metaMatch?.[1]) {
          const metaRes = await fetch(metaMatch[1], {
            headers: { Accept: "application/json" },
            signal: AbortSignal.timeout(8000),
          });
          if (metaRes.ok) {
            prm = (await metaRes.json()) as ProtectedResourceMetadata;
          }
        }
      }
    } catch {
      /* ignore probe errors */
    }
  }

  // 3. Authorization Server Metadata
  const asCandidates: string[] = [];
  if (prm?.authorization_servers?.length) {
    for (const as of prm.authorization_servers) {
      asCandidates.push(
        `${as.replace(/\/$/, "")}/.well-known/oauth-authorization-server`
      );
      asCandidates.push(
        `${as.replace(/\/$/, "")}/.well-known/openid-configuration`
      );
    }
  }
  // Fallbacks on same origin
  asCandidates.push(`${origin}/.well-known/oauth-authorization-server`);
  asCandidates.push(`${origin}/.well-known/openid-configuration`);

  let asMetadata: AuthorizationServerMetadata | null = null;
  for (const candidate of asCandidates) {
    try {
      const res = await fetch(candidate, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = (await res.json()) as AuthorizationServerMetadata;
        if (data.authorization_endpoint && data.token_endpoint) {
          asMetadata = data;
          break;
        }
      }
    } catch {
      /* continue */
    }
  }

  if (!asMetadata) {
    throw new Error(
      "This MCP server does not expose OAuth 2.1 metadata. " +
        "It may not require auth, or it uses a non-standard auth method. " +
        "Only servers that follow the MCP Authorization spec are supported."
    );
  }

  // Prefer S256
  const methods = asMetadata.code_challenge_methods_supported || [];
  if (methods.length > 0 && !methods.includes("S256")) {
    throw new Error(
      "Authorization server does not support PKCE S256 (required by MCP)."
    );
  }

  const scopes = prm?.scopes_supported || asMetadata.scopes_supported || [];

  return {
    resource,
    asMetadata,
    scopes,
  };
}

/**
 * Attempt Dynamic Client Registration (RFC 7591) when the AS supports it.
 */
export async function registerClient(
  registrationEndpoint: string,
  redirectUri: string,
  clientName: string
): Promise<{ client_id: string; client_secret?: string }> {
  const body = {
    client_name: clientName,
    redirect_uris: [redirectUri],
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
    application_type: "web",
  };

  const res = await fetch(registrationEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Dynamic client registration failed (${res.status}): ${text.slice(0, 200)}`
    );
  }

  const data = (await res.json()) as {
    client_id: string;
    client_secret?: string;
  };
  if (!data.client_id) {
    throw new Error("Registration response missing client_id");
  }
  return data;
}

export function buildAuthorizationUrl(opts: {
  authorizationEndpoint: string;
  clientId: string;
  redirectUri: string;
  scope?: string;
  state: string;
  codeChallenge: string;
  resource: string;
}): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: opts.clientId,
    redirect_uri: opts.redirectUri,
    state: opts.state,
    code_challenge: opts.codeChallenge,
    code_challenge_method: "S256",
    resource: opts.resource, // RFC 8707 resource indicator
  });
  if (opts.scope) params.set("scope", opts.scope);

  const url = new URL(opts.authorizationEndpoint);
  url.search = params.toString();
  return url.toString();
}

export async function exchangeCode(opts: {
  tokenEndpoint: string;
  code: string;
  redirectUri: string;
  clientId: string;
  codeVerifier: string;
  resource: string;
  clientSecret?: string;
}): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: opts.code,
    redirect_uri: opts.redirectUri,
    client_id: opts.clientId,
    code_verifier: opts.codeVerifier,
    resource: opts.resource,
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  };

  if (opts.clientSecret) {
    const basic = Buffer.from(
      `${opts.clientId}:${opts.clientSecret}`
    ).toString("base64");
    headers.Authorization = `Basic ${basic}`;
  }

  const res = await fetch(opts.tokenEndpoint, {
    method: "POST",
    headers,
    body: body.toString(),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Token exchange failed (${res.status}): ${text.slice(0, 300)}`
    );
  }

  return (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
  };
}
