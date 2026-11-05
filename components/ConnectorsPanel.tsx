"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Key, Loader2, Plug, Plus, Trash2 } from "lucide-react";
import clsx from "clsx";

interface ConnectorItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  group: string;
  allowToken: boolean;
  tokenHelp?: string;
  missingEnv: string[];
  connected: boolean;
  pending: boolean;
}

interface CustomItem {
  id: string;
  label: string | null;
  url: string | null;
  connected: boolean;
}

interface ApiData {
  encryptionConfigured: boolean;
  connectors: ConnectorItem[];
  custom: CustomItem[];
}

const GROUP_ORDER = ["Developer", "Data", "Google", "Productivity"];

function countConnected(d: ApiData): number {
  return (
    d.connectors.filter((c) => c.connected).length +
    d.custom.filter((c) => c.connected).length
  );
}

export default function ConnectorsPanel() {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tokenFor, setTokenFor] = useState<string | null>(null);
  const [tokenValue, setTokenValue] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [customToken, setCustomToken] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (): Promise<ApiData | null> => {
    try {
      const res = await fetch("/api/connectors", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load connectors");
      setData(json);
      setError(null);
      return json as ApiData;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load connectors");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const onMessage = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.data === "connector-connected") {
        load();
      }
    };
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [load]);

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    setBusy(null);
  };

  const startPolling = (isDone: (d: ApiData) => boolean) => {
    if (pollRef.current) clearInterval(pollRef.current);
    const started = Date.now();
    pollRef.current = setInterval(async () => {
      const d = await load();
      if ((d && isDone(d)) || Date.now() - started > 120000) stopPolling();
    }, 2000);
  };

  const connect = async (
    id: string,
    opts: { token?: string; custom?: { name: string; url: string } } = {}
  ) => {
    setBusy(id);
    setError(null);
    setNotice(null);
    // Open the popup synchronously so browsers do not block it.
    const popup = opts.token ? null : window.open("", "_blank", "width=560,height=720");
    const before = data ? countConnected(data) : 0;
    let waiting = false;
    try {
      const res = await fetch("/api/connectors/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectorId: id, token: opts.token, custom: opts.custom }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not connect");

      if (json.authUrl) {
        if (popup) popup.location.href = json.authUrl;
        else window.location.href = json.authUrl;
        waiting = true;
        startPolling((d) => countConnected(d) > before);
        return;
      }

      setNotice(`Connected. ${json.toolCount} tools available.`);
      setTokenFor(null);
      setTokenValue("");
      setShowCustom(false);
      setCustomName("");
      setCustomUrl("");
      setCustomToken("");
      await load();
    } catch (e: unknown) {
      if (popup) popup.close();
      setError(e instanceof Error ? e.message : "Could not connect");
    } finally {
      if (!waiting) setBusy(null);
    }
  };

  const disconnect = async (id: string, name: string) => {
    if (!window.confirm(`Disconnect ${name}?`)) return;
    setBusy(id);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/connectors/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectorId: id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not disconnect");
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not disconnect");
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="animate-spin text-[var(--muted)]" size={24} />
      </div>
    );
  }

  const groups = GROUP_ORDER.map((g) => ({
    name: g,
    items: (data ? data.connectors : []).filter((c) => c.group === g),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--muted)]">
        Connect your apps so the AI can read and make changes in them from chat. Sign-in
        happens on the app own site (OAuth); tokens are stored encrypted. Tool calling
        needs a model that supports it, for example GPT-OSS on Groq.
      </p>

      {data && !data.encryptionConfigured && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-300">
          Setup needed: add <code>CONNECTOR_ENCRYPTION_KEY</code> in Vercel environment
          variables and redeploy.
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300 break-words">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-3 text-xs text-green-300">
          {notice}
        </div>
      )}

      {groups.map((g) => (
        <div key={g.name} className="space-y-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            {g.name}
          </h3>
          {g.items.map((c) => (
            <div key={c.id} className="rounded-xl border border-[var(--border)] p-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex gap-3">
                  <span className="text-xl leading-none mt-0.5">{c.icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-[11px] text-[var(--muted)]">{c.description}</p>
                  </div>
                </div>
                {c.connected ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 flex items-center gap-1">
                      <Check size={10} /> Connected
                    </span>
                    <button
                      onClick={() => disconnect(c.id, c.name)}
                      disabled={busy === c.id}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 disabled:opacity-50"
                      aria-label={`Disconnect ${c.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => connect(c.id)}
                    disabled={busy !== null || c.missingEnv.length > 0 || !data?.encryptionConfigured}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-xs font-medium disabled:opacity-40"
                  >
                    {busy === c.id ? <Loader2 size={12} className="animate-spin" /> : <Plug size={12} />}
                    Connect
                  </button>
                )}
              </div>

              {!c.connected && c.missingEnv.length > 0 && (
                <p className="text-[11px] text-amber-400">
                  Setup needed: add {c.missingEnv.join(", ")} in Vercel environment variables.
                </p>
              )}

              {!c.connected && c.allowToken && (
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setTokenFor(tokenFor === c.id ? null : c.id);
                      setTokenValue("");
                    }}
                    className="flex items-center gap-1 text-[11px] text-[var(--muted)] hover:text-white"
                  >
                    <Key size={11} /> Use an access token instead
                  </button>
                  {tokenFor === c.id && (
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={tokenValue}
                        onChange={(e) => setTokenValue(e.target.value)}
                        placeholder={c.tokenHelp || "Access token"}
                        className="flex-1 min-w-0 rounded-lg bg-black/30 border border-[var(--border)] px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                      />
                      <button
                        onClick={() => connect(c.id, { token: tokenValue })}
                        disabled={busy !== null || !tokenValue.trim() || !data?.encryptionConfigured}
                        className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs hover:bg-white/10 disabled:opacity-40"
                      >
                        Save
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}

      <div className="space-y-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
          Custom MCP servers
        </h3>
        {(data ? data.custom : []).map((c) => (
          <div
            key={c.id}
            className="rounded-xl border border-[var(--border)] p-3 flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{c.label || c.id}</p>
              <p className="text-[11px] text-[var(--muted)] truncate">{c.url}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {c.connected && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 flex items-center gap-1">
                  <Check size={10} /> Connected
                </span>
              )}
              <button
                onClick={() => disconnect(c.id, c.label || c.id)}
                disabled={busy === c.id}
                className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 disabled:opacity-50"
                aria-label="Remove server"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}

        {!showCustom ? (
          <button
            onClick={() => setShowCustom(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-[var(--border)] text-xs text-[var(--muted)] hover:text-white hover:bg-white/5 w-full justify-center"
          >
            <Plus size={14} /> Add a custom MCP server
          </button>
        ) : (
          <div className="rounded-xl border border-[var(--border)] p-3 space-y-2">
            <input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Name"
              className="w-full rounded-lg bg-black/30 border border-[var(--border)] px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
            <input
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://example.com/mcp"
              className="w-full rounded-lg bg-black/30 border border-[var(--border)] px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
            <input
              type="password"
              value={customToken}
              onChange={(e) => setCustomToken(e.target.value)}
              placeholder="Access token (leave empty to sign in with OAuth)"
              className="w-full rounded-lg bg-black/30 border border-[var(--border)] px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
            <div className="flex gap-2">
              <button
                onClick={() =>
                  connect("custom", {
                    token: customToken.trim() || undefined,
                    custom: { name: customName, url: customUrl },
                  })
                }
                disabled={
                  busy !== null ||
                  !customName.trim() ||
                  !customUrl.trim() ||
                  !data?.encryptionConfigured
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-xs font-medium disabled:opacity-40"
              >
                {busy === "custom" ? <Loader2 size={12} className="animate-spin" /> : <Plug size={12} />}
                Connect
              </button>
              <button
                onClick={() => setShowCustom(false)}
                className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs hover:bg-white/10"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <p className={clsx("text-[11px] text-[var(--muted)]")}>
        The AI can read and change data in the apps you connect. Only connect accounts you
        are comfortable giving it access to, and disconnect anytime.
      </p>
    </div>
  );
}
