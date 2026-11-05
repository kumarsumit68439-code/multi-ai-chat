"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Chat } from "@/types";
import {
  Send,
  Menu,
  Loader2,
  Bot,
  User,
  Paperclip,
  Mic,
  MicOff,
  X,
  FileText,
} from "lucide-react";
import { PROVIDERS, getModelById } from "@/lib/models";
import clsx from "clsx";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_TEXT_EXTRACT = 200_000;

interface ChatAreaProps {
  chat: Chat | null;
  onSendMessage: (content: string) => Promise<void>;
  isLoading: boolean;
  onOpenSidebar: () => void;
  selectedModel: string;
  selectedProvider: string;
  onModelChange: (provider: string, model: string) => void;
}

interface AttachedFile {
  name: string;
  size: number;
  type: string;
  preview?: string;
  textContent?: string;
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
  const [attached, setAttached] = useState<AttachedFile | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat?.messages, isLoading]);

  const buildMessageContent = useCallback(() => {
    let content = input.trim();
    if (attached?.textContent) {
      const header = `\n\n[Attached file: ${attached.name}]\n\`\`\`\n`;
      const footer = `\n\`\`\``;
      const body =
        attached.textContent.length > MAX_TEXT_EXTRACT
          ? attached.textContent.slice(0, MAX_TEXT_EXTRACT) +
            "\n...[truncated for length]"
          : attached.textContent;
      content = (content ? content + header : header.slice(2)) + body + footer;
    } else if (attached) {
      content =
        (content ? content + "\n\n" : "") +
        `[Attached file: ${attached.name} (${(attached.size / 1024).toFixed(1)} KB)]`;
    }
    return content;
  }, [input, attached]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const content = buildMessageContent();
    if (!content || isLoading) return;
    setInput("");
    setAttached(null);
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
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (file.size > MAX_FILE_SIZE) {
      alert(`File too large. Max ${MAX_FILE_SIZE / 1024 / 1024} MB.`);
      return;
    }
    const isText =
      file.type.startsWith("text/") ||
      /\.(txt|md|json|csv|js|ts|tsx|jsx|py|java|c|cpp|h|css|html|xml|yml|yaml|log|sql|sh|rs|go|rb|php)$/i.test(
        file.name
      );
    const entry: AttachedFile = {
      name: file.name,
      size: file.size,
      type: file.type || "application/octet-stream",
    };
    if (file.type.startsWith("image/")) {
      entry.preview = URL.createObjectURL(file);
    }
    if (isText) {
      try {
        entry.textContent = await file.text();
      } catch {
        /* */
      }
    }
    setAttached(entry);
  };

  const stopVoice = useCallback(() => {
    try {
      recognitionRef.current?.stop?.();
    } catch {
      /* */
    }
    setIsRecording(false);
  }, []);

  const startSpeechToText = () => {
    setRecordingError(null);
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      setRecordingError("Speech not supported in this browser");
      return;
    }
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-IN";
    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = (ev: any) => {
      setIsRecording(false);
      if (ev.error !== "aborted" && ev.error !== "no-speech") {
        setRecordingError(ev.error || "Speech error");
      }
    };
    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      if (transcript) {
        setInput((prev) => (prev ? prev + " " : "") + transcript.trim());
      }
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const toggleVoice = () => {
    if (isRecording) stopVoice();
    else startSpeechToText();
  };

  const currentModelInfo = getModelById(selectedModel);
  const providerModels =
    PROVIDERS.find((p) => p.id === selectedProvider)?.models || [];

  return (
    <div
      className="flex-1 w-full min-w-0 h-full overflow-hidden bg-[var(--background)]"
      style={{
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        gridTemplateColumns: "1fr",
      }}
    >
      <header className="px-3 pt-2 pb-2 sm:px-4 border-b border-[var(--border)] bg-[var(--sidebar)]">
        <div className="flex items-center gap-2 min-w-0 mb-1.5">
          <button
            onClick={onOpenSidebar}
            className="md:hidden p-2 -ml-1 rounded-xl hover:bg-white/10 shrink-0 touch-manipulation"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="font-medium text-sm truncate leading-tight">
              {chat?.title || "New Conversation"}
            </h2>
            <p className="text-[11px] text-[var(--muted)] truncate leading-tight">
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
            className="flex-1 text-xs bg-[var(--card)] border border-[var(--border)] rounded-xl px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--primary)] min-w-0"
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
            className="flex-[1.6] text-xs bg-[var(--card)] border border-[var(--border)] rounded-xl px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--primary)] min-w-0"
          >
            {providerModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
                {m.free ? " ✓" : ""}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div
        ref={messagesContainerRef}
        className="overflow-y-auto overscroll-contain px-3 sm:px-4 py-3 space-y-3"
        style={{ WebkitOverflowScrolling: "touch", minHeight: 0 }}
      >
        {(!chat || chat.messages.length === 0) && (
          <div className="flex flex-col items-center justify-center text-center px-4 py-16">
            <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center mb-3">
              <Bot size={24} className="text-[var(--primary)]" />
            </div>
            <h3 className="text-base font-medium mb-1.5">Start a conversation</h3>
            <p className="text-xs text-[var(--muted)] max-w-xs leading-relaxed">
              Select a free model, attach a file or use voice, then send a message.
            </p>
          </div>
        )}

        {chat?.messages.map((msg) => (
          <div
            key={msg.id}
            className={clsx(
              "flex gap-2 w-full max-w-3xl mx-auto",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-[var(--primary)]/20 flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={14} className="text-[var(--primary)]" />
              </div>
            )}
            <div
              className={clsx(
                "rounded-2xl px-3 py-2.5 max-w-[85%]",
                msg.role === "user"
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--card)] border border-[var(--border)]"
              )}
            >
              <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                {msg.content || "..."}
              </p>
              {msg.role === "assistant" && msg.model && (
                <p className="text-[10px] text-[var(--muted)] mt-1">
                  {msg.provider} · {msg.model.split("/").pop()}
                </p>
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                <User size={14} />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2 max-w-3xl mx-auto">
            <div className="w-7 h-7 rounded-full bg-[var(--primary)]/20 flex items-center justify-center shrink-0">
              <Bot size={14} className="text-[var(--primary)]" />
            </div>
            <div className="rounded-2xl px-4 py-3 bg-[var(--card)] border border-[var(--border)] flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-[var(--muted)]" />
              <span className="text-sm text-[var(--muted)]">Thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} className="h-1" />
      </div>

      <div
        className="px-3 pt-2 border-t border-[var(--border)] bg-[var(--sidebar)]"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        {attached && (
          <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--card)] border border-[var(--border)] text-xs">
            {attached.preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={attached.preview}
                alt=""
                className="w-8 h-8 rounded object-cover"
              />
            ) : (
              <FileText size={16} className="text-[var(--muted)]" />
            )}
            <span className="flex-1 truncate">{attached.name}</span>
            <button
              type="button"
              onClick={() => setAttached(null)}
              className="p-1 rounded-lg hover:bg-white/10"
              aria-label="Remove"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {recordingError && (
          <p className="mb-1.5 text-xs text-red-400">{recordingError}</p>
        )}

        <form onSubmit={handleSubmit} className="flex items-end gap-1.5">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept="*/*"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="p-2.5 rounded-xl hover:bg-white/10 text-[var(--muted)] hover:text-white disabled:opacity-40 shrink-0 touch-manipulation"
            aria-label="Attach file"
          >
            <Paperclip size={20} />
          </button>
          <button
            type="button"
            onClick={toggleVoice}
            disabled={isLoading}
            className={clsx(
              "p-2.5 rounded-xl shrink-0 touch-manipulation transition-colors",
              isRecording
                ? "bg-red-500/20 text-red-400"
                : "hover:bg-white/10 text-[var(--muted)] hover:text-white disabled:opacity-40"
            )}
            aria-label={isRecording ? "Stop" : "Voice"}
          >
            {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          <div className="flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={isRecording ? "Listening..." : "Message the AI..."}
              rows={1}
              className="w-full resize-none bg-[var(--card)] border border-[var(--border)] rounded-2xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary)] max-h-[120px] placeholder:text-[var(--muted)]"
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={(!input.trim() && !attached) || isLoading}
            className="p-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed shrink-0 touch-manipulation"
            aria-label="Send"
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
