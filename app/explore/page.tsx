"use client";

import { useState } from "react";
import { PROVIDERS } from "@/lib/models";
import { Search, Zap, Lock, ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

const PROVIDER_LINKS: Record<string, string> = {
  groq: "https://console.groq.com",
  openrouter: "https://openrouter.ai",
  deepseek: "https://platform.deepseek.com",
  kimi: "https://platform.moonshot.ai",
  xai: "https://console.x.ai",
};

export default function ExplorePage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "free" | "paid">("all");

  const allModels = PROVIDERS.flatMap((p) =>
    p.models.map((m) => ({ ...m, providerName: p.name, providerLink: PROVIDER_LINKS[p.id] || "#" }))
  );

  const filtered = allModels.filter((m) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      m.name.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q) ||
      m.providerName.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q);
    const matchFilter =
      filter === "all" || (filter === "free" ? m.free : !m.free);
    return matchSearch && matchFilter;
  });

  const freeCount = allModels.filter((m) => m.free).length;
  const paidCount = allModels.filter((m) => !m.free).length;

  return (
    <div className="min-h-screen bg-[var(--background)] text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--sidebar)] border-b border-[var(--border)] px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <Link
              href="/"
              className="p-2 rounded-xl hover:bg-white/10 text-[var(--muted)] hover:text-white transition-colors"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-base font-semibold leading-tight">Explore Models</h1>
              <p className="text-xs text-[var(--muted)]">
                {freeCount} free · {paidCount} paid · {allModels.length} total
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search models, providers..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--card)] border border-[var(--border)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary)] placeholder:text-[var(--muted)]"
              />
            </div>
            <div className="flex gap-1">
              {(["all", "free", "paid"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={clsx(
                    "px-3 py-2 rounded-xl text-xs font-medium transition-colors capitalize",
                    filter === f
                      ? "bg-[var(--primary)] text-white"
                      : "bg-[var(--card)] border border-[var(--border)] text-[var(--muted)] hover:text-white"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Providers section */}
      <div className="max-w-3xl mx-auto px-4 py-5 space-y-6">
        {PROVIDERS.map((provider) => {
          const providerFiltered = filtered.filter((m) => m.provider === provider.id);
          if (providerFiltered.length === 0) return null;

          return (
            <div key={provider.id}>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold">{provider.name}</h2>
                <a
                  href={PROVIDER_LINKS[provider.id] || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] text-[var(--muted)] hover:text-white transition-colors"
                >
                  API Docs <ExternalLink size={11} />
                </a>
              </div>
              <div className="rounded-xl border border-[var(--border)] overflow-hidden divide-y divide-[var(--border)]">
                {providerFiltered.map((m) => (
                  <div key={m.id} className="flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
                    <div
                      className={clsx(
                        "mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                        m.free ? "bg-green-500/15" : "bg-amber-500/15"
                      )}
                    >
                      {m.free ? (
                        <Zap size={14} className="text-green-400" />
                      ) : (
                        <Lock size={14} className="text-amber-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{m.name}</span>
                        <span
                          className={clsx(
                            "text-[10px] px-1.5 py-0.5 rounded-full",
                            m.free
                              ? "bg-green-500/15 text-green-400"
                              : "bg-amber-500/15 text-amber-400"
                          )}
                        >
                          {m.free ? "Free" : "Paid"}
                        </span>
                        {m.context && (
                          <span className="text-[10px] text-[var(--muted)] bg-white/5 px-1.5 py-0.5 rounded-full">
                            {m.context} ctx
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--muted)] mt-0.5">{m.description}</p>
                      <p className="text-[10px] text-[var(--muted)]/60 mt-0.5 font-mono truncate">{m.id}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-[var(--muted)]">
            <Search size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No models found for &quot;{search}&quot;</p>
          </div>
        )}
      </div>
    </div>
  );
}
