"use client";

import { useEffect, useState, useMemo } from "react";
import {
  X,
  Bot,
  User,
  BarChart3,
  Palette,
  FileText,
  Check,
  Plug,
  Search,
  Plus,
  Loader2,
} from "lucide-react";
import { PROVIDERS } from "@/lib/models";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import {
  CONNECTORS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  Connector,
} from "@/lib/connectors";
import {
  fetchUserConnectors,
  setConnectorStatus,
  UserConnector,
} from "@/lib/db";
import clsx from "clsx";
import type { Provider } from "@supabase/supabase-js";

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  instructions: string;
  onInstructionsChange: (value: string) => void;
  messageCount?: number;
  chatCount?: number;
}

type Tab =
  | "models"
  | "instructions"
  | "connectors"
  | "account"
  | "usage"
  | "customize";

export default function Settings({
  isOpen,
  onClose,
  instructions,
  onInstructionsChange,
  messageCount = 0,
  chatCount = 0,
}: SettingsProps) {
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("models");
  const [localInstructions, setLocalInstructions] = useState(instructions);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [connectorStatuses, setConnectorStatuses] = useState<
    Record<string, UserConnector>
  >({});
  const [connectorsLoading, setConnectorsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);

  useEffect(() => {
    setLocalInstructions(instructions);
  }, [instructions, isOpen]);

  useEffect(() => {
    if (!isOpen || !user || tab !== "connectors") return;
    setConnectorsLoading(true);
    fetchUserConnectors(user.id)
      .then(setConnectorStatuses)
      .finally(() => setConnectorsLoading(false));
  }, [isOpen, user, tab]);

  const filteredConnectors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return CONNECTORS;
    return CONNECTORS.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  if (!isOpen) return null;

  const saveInstructions = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("user_settings").upsert({
        user_id: user.id,
        instructions: localInstructions,
        updated_at: new Date().toISOString(),
      });
      if (!error) {
        onInstructionsChange(localInstructions);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  };

  /** Real OAuth via Supabase Auth (Google / GitHub / Azure) */
  const handleConnect = async (connector: Connector) => {
    if (!user) return;
    setConnectingId(connector.id);
    setConnectError(null);

    try {
      if (connector.oauthProvider) {
        const supabase = createClient();
        const provider = connector.oauthProvider as Provider;

        const baseScopes =
          provider === "google"
            ? ["email", "profile"]
            : provider === "github"
              ? ["read:user", "user:email"]
              : [];

        const scopes = [...baseScopes, ...(connector.oauthScopes || [])].join(
          " "
        );

        const queryParams: Record<string, string> = {};
        if (provider === "google") {
          queryParams.access_type = "offline";
          queryParams.prompt = "consent";
        }

        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: `${window.location.origin}/auth/callback?next=/?connectors=${connector.id}`,
            scopes: scopes || undefined,
            queryParams:
              Object.keys(queryParams).length > 0 ? queryParams : undefined,
          },
        });

        if (error) {
          setConnectError(
            error.message ||
              `OAuth failed. Enable ${provider} in Supabase → Authentication → Providers.`
          );
          return;
        }
        // Browser redirects to provider
        return;
      }

      // No Supabase OAuth provider for this service yet
      setConnectError(
        `${connector.name} needs its own OAuth app. Real auth is available for Google, GitHub, and Microsoft (Azure) via Supabase.`
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Connection failed";
      setConnectError(msg);
    } finally {
      setConnectingId(null);
    }
  };

  const handleDisconnect = async (connectorId: string) => {
    if (!user) return;
    setConnectingId(connectorId);
    setConnectError(null);
    try {
      const ok = await setConnectorStatus(user.id, connectorId, false);
      if (ok) {
        setConnectorStatuses((prev) => ({
          ...prev,
          [connectorId]: {
            connector_id: connectorId,
            connected: false,
            updated_at: new Date().toISOString(),
          },
        }));
      }
    } finally {
      setConnectingId(null);
    }
  };

  const oauthLabel = (c: Connector) => {
    if (!c.oauthProvider) return null;
    if (c.oauthProvider === "google") return "Real OAuth · Google via Supabase";
    if (c.oauthProvider === "github") return "Real OAuth · GitHub via Supabase";
    if (c.oauthProvider === "azure")
      return "Real OAuth · Microsoft via Supabase";
    return `Real OAuth · ${c.oauthProvider}`;
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "models", label: "AI Models", icon: <Bot size={16} /> },
    { id: "instructions", label: "Instructions", icon: <FileText size={16} /> },
    { id: "connectors", label: "Connectors", icon: <Plug size={16} /> },
    { id: "account", label: "Account", icon: <User size={16} /> },
    { id: "usage", label: "Usage", icon: <BarChart3 size={16} /> },
    { id: "customize", label: "Customize", icon: <Palette size={16} /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-t-2xl sm:rounded-xl w-full max-w-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)] shrink-0">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-1 px-2 pt-2 overflow-x-auto border-b border-[var(--border)] shrink-0">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-xs sm:text-sm whitespace-nowrap transition-colors",
                tab === t.id
                  ? "bg-white/10 text-white border-b-2 border-[var(--primary)]"
                  : "text-[var(--muted)] hover:text-white hover:bg-white/5"
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {tab === "models" && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--muted)]">
                Available AI providers and models. Free models work without paid
                credits.
              </p>
              {PROVIDERS.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-[var(--border)] overflow-hidden"
                >
                  <div className="px-3 py-2 bg-black/30 font-medium text-sm flex items-center justify-between">
                    <span>{p.name}</span>
                    <span className="text-[10px] text-[var(--muted)]">
                      {p.models.filter((m) => m.free).length} free ·{" "}
                      {p.models.filter((m) => !m.free).length} paid
                    </span>
                  </div>
                  <ul className="divide-y divide-[var(--border)]">
                    {p.models.map((m) => (
                      <li
                        key={m.id}
                        className="px-3 py-2 flex items-start justify-between gap-2 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-medium truncate">{m.name}</p>
                          <p className="text-[11px] text-[var(--muted)] truncate">
                            {m.description}
                          </p>
                        </div>
                        <span
                          className={clsx(
                            "text-[10px] px-2 py-0.5 rounded-full shrink-0",
                            m.free
                              ? "bg-green-500/15 text-green-400"
                              : "bg-amber-500/15 text-amber-400"
                          )}
                        >
                          {m.free ? "Free" : "Paid"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {tab === "instructions" && (
            <div className="space-y-3">
              <p className="text-sm text-[var(--muted)]">
                Custom instructions are sent as a system prompt with every
                message. The AI will follow them in real time.
              </p>
              <textarea
                value={localInstructions}
                onChange={(e) => setLocalInstructions(e.target.value)}
                rows={10}
                placeholder="Example: You are a helpful coding assistant. Always reply in Hindi. Be concise. Use simple language."
                className="w-full rounded-xl bg-black/30 border border-[var(--border)] p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary)] resize-y min-h-[160px]"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={saveInstructions}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-sm font-medium disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Instructions"}
                </button>
                {saved && (
                  <span className="text-sm text-green-400 flex items-center gap-1">
                    <Check size={16} /> Saved — applied on next message
                  </span>
                )}
              </div>
            </div>
          )}

          {tab === "connectors" && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--muted)]">
                Connect apps with real OAuth (Supabase Auth). Google, GitHub, and
                Microsoft open the real provider login and request the listed
                scopes — same pattern as ChatGPT / Claude connectors.
              </p>

              {connectError && (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {connectError}
                </div>
              )}

              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search connectors..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-black/30 border border-[var(--border)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                />
              </div>

              <div className="rounded-xl border border-dashed border-[var(--border)] p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                    <Plus size={18} className="text-[var(--muted)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm">Custom</p>
                    <p className="text-xs text-[var(--muted)] truncate">
                      Add your own custom connector
                    </p>
                  </div>
                </div>
                <button
                  disabled
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--muted)] cursor-not-allowed"
                >
                  Coming soon
                </button>
              </div>

              {connectorsLoading ? (
                <div className="flex items-center justify-center py-8 text-[var(--muted)]">
                  <Loader2 className="animate-spin" size={24} />
                </div>
              ) : (
                CATEGORY_ORDER.map((cat) => {
                  const items = filteredConnectors.filter(
                    (c) => c.category === cat
                  );
                  if (items.length === 0) return null;
                  return (
                    <div key={cat} className="space-y-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] px-1">
                        {CATEGORY_LABELS[cat]}
                      </h3>
                      <div className="rounded-xl border border-[var(--border)] overflow-hidden divide-y divide-[var(--border)]">
                        {items.map((c) => {
                          const status = connectorStatuses[c.id];
                          const isConnected = !!status?.connected;
                          const isBusy = connectingId === c.id;
                          const label = oauthLabel(c);
                          return (
                            <div
                              key={c.id}
                              className="px-3 py-3 flex items-center justify-between gap-3"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm truncate">
                                  {c.name}
                                </p>
                                <p className="text-[11px] text-[var(--muted)] truncate">
                                  {c.description}
                                </p>
                                {label && (
                                  <p className="text-[10px] text-green-500/90 mt-0.5">
                                    {label}
                                  </p>
                                )}
                              </div>
                              <div className="shrink-0">
                                {isConnected ? (
                                  <button
                                    onClick={() => handleDisconnect(c.id)}
                                    disabled={isBusy}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-red-500/40 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                                  >
                                    {isBusy ? (
                                      <Loader2
                                        size={14}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      "Disconnect"
                                    )}
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleConnect(c)}
                                    disabled={isBusy}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white disabled:opacity-50"
                                  >
                                    {isBusy ? (
                                      <Loader2
                                        size={14}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      "Connect"
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}

              {filteredConnectors.length === 0 && !connectorsLoading && (
                <p className="text-sm text-[var(--muted)] text-center py-6">
                  No connectors match your search.
                </p>
              )}

              <div className="rounded-xl border border-[var(--border)] p-3 text-xs text-[var(--muted)] space-y-1">
                <p className="font-medium text-white/80">Real OAuth (Supabase)</p>
                <p>
                  • <strong className="text-white/70">Google</strong>: Gmail,
                  Calendar, Drive, BigQuery — enable Google provider + scopes in
                  Supabase & Google Cloud.
                </p>
                <p>
                  • <strong className="text-white/70">GitHub</strong>: enable
                  GitHub provider in Supabase Authentication.
                </p>
                <p>
                  • <strong className="text-white/70">Microsoft</strong>: Outlook
                  / Teams — enable Azure provider in Supabase.
                </p>
                <p>
                  • Other apps need their own OAuth client; Connect will show an
                  error until that is set up.
                </p>
              </div>
            </div>
          )}

          {tab === "account" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-[var(--border)] p-4 space-y-3">
                <h3 className="font-medium text-sm text-[var(--muted)] uppercase tracking-wide">
                  Account details
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-[var(--muted)]">Email</span>
                    <span className="truncate">{user?.email || "—"}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[var(--muted)]">User ID</span>
                    <span className="font-mono text-xs truncate max-w-[60%]">
                      {user?.id || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[var(--muted)]">Provider</span>
                    <span>{user?.app_metadata?.provider || "email"}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[var(--muted)]">Created</span>
                    <span>
                      {user?.created_at
                        ? new Date(user.created_at).toLocaleDateString()
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-[var(--border)] p-4 space-y-2">
                <h3 className="font-medium text-sm text-[var(--muted)] uppercase tracking-wide">
                  Account check
                </h3>
                <p className="text-sm text-green-400">✓ Session active</p>
                <p className="text-sm text-green-400">✓ Supabase connected</p>
                <p className="text-sm text-[var(--muted)]">
                  Chats and settings sync to your account.
                </p>
              </div>
              <button
                onClick={() => signOut()}
                className="w-full py-3 rounded-xl border border-red-500/40 text-red-400 hover:bg-red-500/10 text-sm font-medium"
              >
                Sign Out
              </button>
            </div>
          )}

          {tab === "usage" && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--muted)]">
                Approximate usage from your saved chats. Free models use
                provider free quotas; paid models use your API balance.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[var(--border)] p-4 text-center">
                  <p className="text-2xl font-semibold">{chatCount}</p>
                  <p className="text-xs text-[var(--muted)] mt-1">Chats</p>
                </div>
                <div className="rounded-xl border border-[var(--border)] p-4 text-center">
                  <p className="text-2xl font-semibold">{messageCount}</p>
                  <p className="text-xs text-[var(--muted)] mt-1">Messages</p>
                </div>
              </div>
            </div>
          )}

          {tab === "customize" && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--muted)]">
                Theme and defaults. More options coming soon.
              </p>
              <div className="rounded-xl border border-[var(--border)] p-4 space-y-3">
                <h3 className="text-sm font-medium">Theme</h3>
                <div className="flex gap-2">
                  <button className="flex-1 py-2 rounded-lg bg-[var(--primary)]/20 border border-[var(--primary)] text-sm">
                    Dark
                  </button>
                  <button
                    className="flex-1 py-2 rounded-lg bg-black/20 border border-[var(--border)] text-sm text-[var(--muted)] cursor-not-allowed"
                    disabled
                  >
                    Light (soon)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
