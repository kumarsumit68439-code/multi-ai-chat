import { fetchT } from "./http";

export interface OAuthEndpoints {
  authorizationEndpoint: string;
  tokenEndpoint: string;
  registrationEndpoint?: string;
  resource: string;
  scopes?: string[];
}

export interface TokenResult {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  scope?: string;
}

export function toBase64Url(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomString(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return toBase64Url(arr);
}

export async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier)
  );
  return toBase64Url(new Uint8Array(digest));
}

async function getJson(url: string): Promise<any | null> {
  try {
    const res = await fetchT(url, { headers: { Accept: "application/json" } }, 10000);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function authServerMetadata(issuer: string): Promise<any | null> {
  const i = new URL(issuer);
  const path = i.pathname.replace(/\/+$/, "");
  const candidates = [
    `${i.origin}/.well-known/oauth-authorization-server${path}`,
    `${i.origin}/.well-known/openid-configuration${path}`,
    `${issuer.replace(/\/+$/, "")}/.well-known/openid-configuration`,
  ];
  for (const c of candidates) {
    const m = await getJson(c);
    if (m && m.authorization_endpoint && m.token_endpoint) return m;
  }
  return null;
}

/**
 * MCP authorization discovery: protected-resource metadata -> authorization server metadata.
 * (RFC 9728 + RFC 8414, as required by the MCP authorization spec.)
 */
export async function discoverMcpOAuth(mcpUrl: string): Promise<OAuthEndpoints> {
  const u = new URL(mcpUrl);
  let metaUrl: string | null = null;

  try {
    const probe = await fetchT(
      mcpUrl,
      {
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
            protocolVersion: "2025-06-18",
            capabilities: {},
            clientInfo: { name: "multi-ai-chat", version: "1.0.0" },
          },
        }),
      },
      10000
    );
    const header = probe.headers.get("www-authenticate") || "";
    const m = header.match(/resource_metadata="?([^",\s]+)"?/);
    if (m) metaUrl = m[1];
  } catch {
    /* fall through to well-known */
  }

  let resourceMeta: any = metaUrl ? await getJson(metaUrl) : null;
  if (!resourceMeta) {
    const path = u.pathname.replace(/\/+$/, "");
    resourceMeta =
      (await getJson(`${u.origin}/.well-known/oauth-protected-resource${path}`)) ||
      (await getJson(`${u.origin}/.well-known/oauth-protected-resource`));
  }

  const issuer: string =
    (resourceMeta &&
      resourceMeta.authorization_servers &&
      resourceMeta.authorization_servers[0]) ||
    u.origin;

  const as = await authServerMetadata(issuer);
  if (!as) {
    throw new Error(
      "Could not find the OAuth endpoints for this server. It may not support OAuth sign-in; try an access token instead."
    );
  }

  return {
    authorizationEndpoint: as.authorization_endpoint,
    tokenEndpoint: as.token_endpoint,
    registrationEndpoint: as.registration_endpoint,
    resource: (resourceMeta && resourceMeta.resource) || mcpUrl,
    scopes: resourceMeta && resourceMeta.scopes_supported,
  };
}

/** RFC 7591 dynamic client registration (public client + PKCE). */
export async function registerClient(
  registrationEndpoint: string,
  redirectUri: string
): Promise<{ clientId: string; clientSecret?: string }> {
  const res = await fetchT(
    registrationEndpoint,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_name: "Multi AI Chat",
        redirect_uris: [redirectUri],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
      }),
    },
    15000
  );
  const text = await res.text();
  let json: any = {};
  try {
    json = JSON.parse(text);
  } catch {
    /* ignore */
  }
  if (!res.ok || !json.client_id) {
    throw new Error(
      `Client registration failed (${res.status}): ${
        json.error_description || json.error || text.slice(0, 200)
      }`
    );
  }
  return { clientId: json.client_id, clientSecret: json.client_secret };
}

export function buildAuthorizeUrl(opts: {
  endpoint: string;
  clientId: string;
  redirectUri: string;
  state: string;
  challenge?: string;
  scope?: string;
  resource?: string;
  extra?: Record<string, string>;
}): string {
  const url = new URL(opts.endpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", opts.clientId);
  url.searchParams.set("redirect_uri", opts.redirectUri);
  url.searchParams.set("state", opts.state);
  if (opts.challenge) {
    url.searchParams.set("code_challenge", opts.challenge);
    url.searchParams.set("code_challenge_method", "S256");
  }
  if (opts.scope) url.searchParams.set("scope", opts.scope);
  if (opts.resource) url.searchParams.set("resource", opts.resource);
  const extra = opts.extra || {};
  Object.keys(extra).forEach((k) => url.searchParams.set(k, extra[k]));
  return url.toString();
}

async function tokenRequest(
  tokenEndpoint: string,
  params: Record<string, string | undefined>
): Promise<TokenResult> {
  const body = new URLSearchParams();
  Object.keys(params).forEach((k) => {
    const v = params[k];
    if (v) body.set(k, v);
  });
  const res = await fetchT(
    tokenEndpoint,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
    },
    20000
  );
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    const o: Record<string, string> = {};
    new URLSearchParams(text).forEach((v, k) => {
      o[k] = v;
    });
    json = o;
  }
  if (!res.ok || json.error || !json.access_token) {
    throw new Error(
      json.error_description || json.error || `Token endpoint returned ${res.status}`
    );
  }
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: json.expires_in ? Date.now() + Number(json.expires_in) * 1000 : undefined,
    scope: json.scope,
  };
}

export function exchangeCode(opts: {
  tokenEndpoint: string;
  clientId: string;
  clientSecret?: string;
  code: string;
  redirectUri: string;
  codeVerifier?: string;
  resource?: string;
}): Promise<TokenResult> {
  return tokenRequest(opts.tokenEndpoint, {
    grant_type: "authorization_code",
    code: opts.code,
    redirect_uri: opts.redirectUri,
    client_id: opts.clientId,
    client_secret: opts.clientSecret,
    code_verifier: opts.codeVerifier,
    resource: opts.resource,
  });
}

export async function refreshAccessToken(opts: {
  tokenEndpoint: string;
  clientId: string;
  clientSecret?: string;
  refreshToken: string;
  resource?: string;
}): Promise<TokenResult> {
  const r = await tokenRequest(opts.tokenEndpoint, {
    grant_type: "refresh_token",
    refresh_token: opts.refreshToken,
    client_id: opts.clientId,
    client_secret: opts.clientSecret,
    resource: opts.resource,
  });
  // Some providers do not return a new refresh token; keep the old one.
  if (!r.refreshToken) r.refreshToken = opts.refreshToken;
  return r;
}
