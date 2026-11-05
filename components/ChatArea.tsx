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
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
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
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
  };

  const currentModelInfo = getModelById(selectedModel);

  return (
    <div className="flex-1 flex flex-col h-full min-w-0">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--sidebar)]/80 backdrop-blur shrink-0">
        <button
          onClick={onOpenSidebar}
          className="md:hidden p-2 rounded-lg hover:bg-white/10"
          aria-label="Open sidebar"
        >
          <Menu size={20} />
        </button>

        <div className="flex-1 min-w-0">
          <h2 className="font-medium truncate">
            {chat?.title || "New Conversation"}
          </h2>
          <p className="text-xs text-[var(--muted)] truncate">
            {currentModelInfo?.name || selectedModel} ·{" "}
            {currentModelInfo?.free ? (
              <span className="text-green-400">Free</span>
            ) : (
              <span className="text-amber-400">Paid</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedProvider}
            onChange={(e) => {
              const provider = e.target.value;
              const firstModel = PROVIDERS.find((p) => p.id === provider)?.models[0];
              if (firstModel) onModelChange(provider, firstModel.id);
            }}
            className="text-xs bg-[var(--card)] border border-[var(--border)] rounded-lg px-2 py-1.5 focus:outline-none max-w-[120px]"
          >
            {PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={selectedModel}
            onChange={(e) => onModelChange(selectedProvider, e.target.value)}
            className="text-xs bg-[var(--card)] border border-[var(--border)] rounded-lg px-2 py-1.5 focus:outline-none max-w-[180px]"
          >
            {PROVIDERS.find((p) => p.id === selectedProvider)?.models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} {m.free ? "(Free)" : ""}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {(!chat || chat.messages.length === 0) && (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center mb-4">
              <Bot size={32} className="text-[var(--primary)]" />
            </div>
            <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
            <p className="text-sm text-[var(--muted)] max-w-md">
              Select a free model from Groq or OpenRouter and send a message.
              Your chats are saved to your account.
            </p>
          </div>
        )}

        {chat?.messages.map((msg) => (
          <div
            key={msg.id}
            className={clsx(
              "flex gap-3 max-w-3xl mx-auto",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-[var(--primary)]/20 flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={16} className="text-[var(--primary)]" />
              </div>
            )}
            <div
              className={clsx(
                "rounded-2xl px-4 py-3 max-w-[85%]",
                msg.role === "user"
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--card)] border border-[var(--border)]"
              )}
            >
              <p className="text-sm whitespace-pre-wrap break-words">{msg.content || "..."}</p>
              {msg.role === "assistant" && msg.model && (
                <p className="text-[10px] text-[var(--muted)] mt-2">
                  {msg.provider} · {msg.model.split("/").pop()}
                </p>
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                <User size={16} />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 max-w-3xl mx-auto">
            <div className="w-8 h-8 rounded-full bg-[var(--primary)]/20 flex items-center justify-center shrink-0">
              <Bot size={16} className="text-[var(--primary)]" />
            </div>
            <div className="rounded-2xl px-4 py-3 bg-[var(--card)] border border-[var(--border)] flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-[var(--muted)]" />
              <span className="text-sm text-[var(--muted)]">Thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-[var(--border)] bg-[var(--sidebar)]/50 shrink-0">
        <form
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto flex items-end gap-2"
        >
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Message the AI..."
              rows={1}
              className="w-full resize-none bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary)] max-h-[200px]"
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-3 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </form>
        <p className="text-center text-[10px] text-[var(--muted)] mt-2">
          Responses are generated by third-party models. Free tiers have rate limits.
        </p>
      </div>
    </div>
  );
}
