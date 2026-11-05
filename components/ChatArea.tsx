"use client";

import { useEffect, useRef, useState } from "react";
import { Chat } from "@/types";
import { Send, Menu, Loader2, Bot, User } from "lucide-react";
import { PROVIDERS, getModelById } from "@/lib/models";
import clsx from "clsx";

interface ChatAreaProps {
  chat: Chat | null;
  onSendMessage: (content: string) => Promise<void>;
  isLoading: boolean;
  onOpenSidebar: () => void;
  selectedModel: string;
  selectedProvider: string;
  onModelChange: (provider: string, model: string) => void;
}

export default function ChatArea({
  chat,
  onSendMessage,
  isLoading,
  onOpenSidebar,
  selectedModel,
  selectedProvider,
  onModelChange,
}: ChatAreaProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat?.messages, isLoading]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    const content = input.trim();
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    await onSendMessage(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  };

  const currentModelInfo = getModelById(selectedModel);
  const providerModels = PROVIDERS.find((p) => p.id === selectedProvider)?.models || [];

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 w-full">
      <header className="flex flex-col gap-2 px-3 py-2.5 sm:px-4 sm:py-3 border-b border-[var(--border)] bg-[var(--sidebar)]/90 backdrop-blur shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onOpenSidebar}
            className="md:hidden p-2 -ml-1 rounded-lg hover:bg-white/10 shrink-0 touch-manipulation"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="font-medium text-sm sm:text-base truncate">
              {chat?.title || "New Conversation"}
            </h2>
            <p className="text-[11px] sm:text-xs text-[var(--muted)] truncate">
              {currentModelInfo?.name || selectedModel}
              {" · "}
              {currentModelInfo?.free ? (
                <span className="text-green-400">Free</span>
              ) : (
                <span className="text-amber-400">Paid</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full">
          <select
            value={selectedProvider}
            onChange={(e) => {
              const provider = e.target.value;
              const first = PROVIDERS.find((p) => p.id === provider)?.models[0];
              if (first) onModelChange(provider, first.id);
            }}
            className="flex-1 text-xs sm:text-sm bg-[var(--card)] border border-[var(--border)] rounded-lg px-2 py-2.5 sm:py-2 focus:outline-none focus:ring-1 focus:ring-[var(--primary)] min-w-0"
          >
            {PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select
            value={selectedModel}
            onChange={(e) => onModelChange(selectedProvider, e.target.value)}
            className="flex-[1.5] text-xs sm:text-sm bg-[var(--card)] border border-[var(--border)] rounded-lg px-2 py-2.5 sm:py-2 focus:outline-none focus:ring-1 focus:ring-[var(--primary)] min-w-0"
          >
            {providerModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}{m.free ? " ✓" : ""}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-3 sm:space-y-4">
        {(!chat || chat.messages.length === 0) && (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 py-10">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center mb-4">
              <Bot size={28} className="text-[var(--primary)]" />
            </div>
            <h3 className="text-base sm:text-lg font-medium mb-2">Start a conversation</h3>
            <p className="text-xs sm:text-sm text-[var(--muted)] max-w-sm">
              Select a free model (Groq / OpenRouter) and send a message. Chats save to your account.
            </p>
          </div>
        )}

        {chat?.messages.map((msg) => (
          <div
            key={msg.id}
            className={clsx(
              "flex gap-2 sm:gap-3 w-full max-w-3xl mx-auto",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[var(--primary)]/20 flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={14} className="text-[var(--primary)]" />
              </div>
            )}
            <div
              className={clsx(
                "rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 max-w-[88%] sm:max-w-[85%]",
                msg.role === "user"
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--card)] border border-[var(--border)]"
              )}
            >
              <p className="text-sm sm:text-[15px] whitespace-pre-wrap break-words leading-relaxed">
                {msg.content || "..."}
              </p>
              {msg.role === "assistant" && msg.model && (
                <p className="text-[10px] text-[var(--muted)] mt-1.5">
                  {msg.provider} · {msg.model.split("/").pop()}
                </p>
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                <User size={14} />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2 sm:gap-3 max-w-3xl mx-auto">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[var(--primary)]/20 flex items-center justify-center shrink-0">
              <Bot size={14} className="text-[var(--primary)]" />
            </div>
            <div className="rounded-2xl px-4 py-3 bg-[var(--card)] border border-[var(--border)] flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-[var(--muted)]" />
              <span className="text-sm text-[var(--muted)]">Thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} className="h-2" />
      </div>

      <div className="p-3 sm:p-4 border-t border-[var(--border)] bg-[var(--sidebar)]/80 shrink-0" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Message the AI..."
              rows={1}
              className="w-full resize-none bg-[var(--card)] border border-[var(--border)] rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary)] max-h-[160px]"
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2.5 sm:p-3 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 touch-manipulation"
            aria-label="Send"
          >
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        </form>
        <p className="text-center text-[10px] text-[var(--muted)] mt-1.5 hidden sm:block">
          Free models have rate limits. Responses from third-party providers.
        </p>
      </div>
    </div>
  );
}
