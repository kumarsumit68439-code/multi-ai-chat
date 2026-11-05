"use client";

import { X } from "lucide-react";
import { PROVIDERS } from "@/lib/models";

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Settings({ isOpen, onClose }: SettingsProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)] sticky top-0 bg-[var(--card)]">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-6">
          <section>
            <h3 className="text-sm font-medium text-[var(--muted)] mb-2 uppercase tracking-wide">
              API Keys (Vercel Environment Variables)
            </h3>
            <p className="text-sm text-[var(--muted)] mb-4">
              API keys are stored securely in Vercel Environment Variables. Add them in your
              Vercel project settings under Settings → Environment Variables. Never expose keys
              in the frontend.
            </p>

            <div className="space-y-3">
              {PROVIDERS.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-[var(--border)]"
                >
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-[var(--muted)] font-mono">{p.envKey}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-white/5 text-[var(--muted)]">
                    Server-side only
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-medium text-[var(--muted)] mb-2 uppercase tracking-wide">
              Free Models Available
            </h3>
            <ul className="text-sm space-y-1 text-[var(--muted)] list-disc list-inside">
              <li>
                <strong className="text-white">Groq</strong> — Multiple free models with rate
                limits (no credit card required)
              </li>
              <li>
                <strong className="text-white">OpenRouter</strong> — Free models (suffix :free)
                with daily request limits
              </li>
              <li>
                <strong className="text-white">DeepSeek / Kimi / Grok</strong> — Require paid
                credits / API balance
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-sm font-medium text-[var(--muted)] mb-2 uppercase tracking-wide">
              How to Add Keys
            </h3>
            <ol className="text-sm space-y-2 text-[var(--muted)] list-decimal list-inside">
              <li>Open your Vercel project dashboard</li>
              <li>Go to Settings → Environment Variables</li>
              <li>
                Add each key (GROQ_API_KEY, OPENROUTER_API_KEY, DEEPSEEK_API_KEY, MOONSHOT_API_KEY,
                XAI_API_KEY)
              </li>
              <li>Redeploy the project after adding keys</li>
            </ol>
          </section>

          <section className="pt-2 border-t border-[var(--border)]">
            <p className="text-xs text-[var(--muted)]">
              Chat history is stored securely in Supabase per user account.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
