"use client";

import { useEffect, useState } from "react";
import { X, Bot, User, BarChart3, Palette, FileText, Check, Plug } from "lucide-react";
import { PROVIDERS } from "@/lib/models";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import ConnectorsPanel from "@/components/ConnectorsPanel";
import clsx from "clsx";

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  instructions: string;
  onInstructionsChange: (value: string) => void;
  messageCount?: number;
  chatCount?: number;
}

type Tab = "models" | "connectors" | "instructions" | "account" | "usage" | "customize";

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

  useEffect(() => {
    setLocalInstructions(instructions);
  }, [instructions, isOpen]);

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

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "models", label: "AI Models", icon: <Bot size={16} /> },
    { id: "connectors", label: "Connectors", icon: <Plug size={16} /> },
    { id: "instructions", label: "Instructions", icon: <FileText size={16} /> },
    { id: "account", label: "Account", icon: <User size={16} /> },
    { id: "usage", label: "Usage", icon: <BarChart3 size={16} /> },
    { id: "customize", label: "Customize", icon: <Palette size={16} /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-t-2xl sm:rounded-xl w-full max-w-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)] shrink-0">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10" aria-label="Close">
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
                Available AI providers and models. Free models work without paid credits.
              </p>
              {PROVIDERS.map((p) => (
                <div key={p.id} className="rounded-xl border border-[var(--border)] overflow-hidden">
                  <div className="px-3 py-2 bg-black/30 font-medium text-sm flex items-center justify-between">
                    <span>{p.name}</span>
                    <span className="text-[10px] text-[var(--muted)]">
                      {p.models.filter((m) => m.free).length} free · {p.models.filter((m) => !m.free).length} paid
                    </span>
                  </div>
                  <ul className="divide-y divide-[var(--border)]">
                    {p.models.map((m) => (
                      <li key={m.id} className="px-3 py-2 flex items-start justify-between gap-2 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{m.name}</p>
                          <p className="text-[11px] text-[var(--muted)] truncate">{m.description}</p>
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

          {tab === "connectors" && <ConnectorsPanel />}

          {tab === "instructions" && (
            <div className="space-y-3">
              <p className="text-sm text-[var(--muted)]">
                Custom instructions are sent as a system prompt with every message. The AI will follow them in real time.
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

          {tab === "account" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-[var(--border)] p-4 space-y-3">
                <h3 className="font-medium text-sm text-[var(--muted)] uppercase tracking-wide">Account details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-[var(--muted)]">Email</span>
                    <span className="truncate">{user?.email || "—"}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[var(--muted)]">User ID</span>
                    <span className="font-mono text-xs truncate max-w-[60%]">{user?.id || "—"}</span>
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
                <h3 className="font-medium text-sm text-[var(--muted)] uppercase tracking-wide">Account check</h3>
                <p className="text-sm text-green-400">✓ Session active</p>
                <p className="text-sm text-green-400">✓ Supabase connected</p>
                <p className="text-sm text-[var(--muted)]">Chats and settings sync to your account.</p>
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
                Approximate usage from your saved chats. Free models use provider free quotas; paid models use your API balance.
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
              <div className="rounded-xl border border-[var(--border)] p-4 space-y-2 text-sm">
                <h3 className="font-medium">Credits note</h3>
                <p className="text-[var(--muted)]">
                  Groq & OpenRouter free models: limited by each provider daily rate limits (not billed here).
                </p>
                <p className="text-[var(--muted)]">
                  DeepSeek / Kimi / Grok paid models: credits are charged on the provider side when you use your API key.
                </p>
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
                  <button className="flex-1 py-2 rounded-lg bg-black/20 border border-[var(--border)] text-sm text-[var(--muted)] cursor-not-allowed" disabled>
                    Light (soon)
                  </button>
                </div>
              </div>
              <div className="rounded-xl border border-[var(--border)] p-4 space-y-2 text-sm text-[var(--muted)]">
                <p>Default model is selected from the chat header.</p>
                <p>Custom instructions apply globally from the Instructions tab.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
