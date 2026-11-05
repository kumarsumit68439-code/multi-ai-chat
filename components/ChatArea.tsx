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
  Image as ImageIcon,
} from "lucide-react";
import { PROVIDERS, getModelById } from "@/lib/models";
import clsx from "clsx";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB practical client limit (not 20 GB)
const MAX_TEXT_EXTRACT = 200_000; // chars sent as context

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
        `[Attached file: ${attached.name} (${(attached.size / 1024).toFixed(1)} KB) — binary/image; text extraction not available]`;
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
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (file.size > MAX_FILE_SIZE) {
      alert(
        `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max ${MAX_FILE_SIZE / 1024 / 1024} MB for browser upload. For very large files use external storage.`
      );
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

    if (isText || file.type.startsWith("text/")) {
      try {
        const text = await file.text();
        entry.textContent = text;
      } catch {
        /* ignore */
      }
    }

    setAttached(entry);
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const startRecording = async () => {
    setRecordingError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mime });
        if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
          // Prefer live recognition instead of post-process
        } else {
          setInput(
            (prev) =>
              (prev ? prev + " " : "") +
              "[Voice note recorded — please type your message; speech-to-text needs browser support or API]"
          );
        }
        setAttached({
          name: `voice-${Date.now()}.${mime.includes("webm") ? "webm" : "m4a"}`,
          size: blob.size,
          type: mime,
        });
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (err: any) {
      setRecordingError(
        err?.message || "Microphone access denied or not available"
      );
      setIsRecording(false);
    }
  };

  // Live speech recognition (Chrome / Edge)
  const startSpeechToText = () => {
    setRecordingError(null);
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      startRecording();
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = (ev: any) => {
      setIsRecording(false);
      if (ev.error !== "aborted") {
        setRecordingError(ev.error || "Speech recognition error");
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
    recognition.start();
    (mediaRecorderRef as any).current = {
      stop: () => recognition.stop(),
      state: "recording",
    };
  };

  const toggleVoice = () => {
    if (isRecording) {
      stopRecording();
      try {
        (mediaRecorderRef as any).current?.stop?.();
      } catch {
        /* */
      }
    } else {
      startSpeechToText();
    }
  };

  const currentModelInfo = getModelById(selectedModel);
  const providerModels =
    PROVIDERS.find((p) => p.id === selectedProvider)?.models || [];

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 w-full bg-[var(--background)]">
      {/* Header — compact, Grok/Claude style */}
      <header className="flex flex-col gap-2 px-3 py-2 sm:px-4 sm:py-2.5 border-b border-[var(--border)] bg-[var(--sidebar)]/95 backdrop-blur-md shrink-0 sticky top-0 z-10">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onOpenSidebar}
            className="md:hidden p-2 -ml-1 rounded-xl hover:bg-white/10 shrink-0 touch-manipulation"
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

        {/* Model selectors */}
        <div className="flex items-center gap-2 w-full">
          <select
            value={selectedProvider}
            onChange={(e) => {
              const provider = e.target.value;
              const first = PROVIDERS.find((p) => p.id === provider)?.models[0];
              if (first) onModelChange(provider, first.id);
            }}
            className="flex-1 text-xs sm:text-sm bg-[var(--card)] border border-[var(--border)] rounded-xl px-2.5 py-2.5 sm:py-2 focus:outline-none focus:ring-1 focus:ring-[var(--primary)] min-w-0 appearance-none"
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
            className="flex-[1.6] text-xs sm:text-sm bg-[var(--card)] border border-[var(--border)] rounded-xl px-2.5 py-2.5 sm:py-2 focus:outline-none focus:ring-1 focus:ring-[var(--primary)] min-w-0 appearance-none"
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-3 sm:px-4 py-3 sm:py-4 space-y-3 sm:space-y-4">
        {(!chat || chat.messages.length === 0) && (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 py-10">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center mb-4">
              <Bot size={28} className="text-[var(--primary)]" />
            </div>
            <h3 className="text-base sm:text-lg font-medium mb-2">
              Start a conversation
            </h3>
            <p className="text-xs sm:text-sm text-[var(--muted)] max-w-sm">
              Select a free model (Groq / OpenRouter), attach a file or use
              voice, then send a message. Chats save to your account.
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

      {/* Composer — Grok/Claude style bottom bar */}
      <div
        className="px-3 sm:px-4 pt-2 border-t border-[var(--border)] bg-[var(--sidebar)]/90 backdrop-blur-md shrink-0"
        style={{
          paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
        }}
      >
        {attached && (
          <div className="max-w-3xl mx-auto mb-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--card)] border border-[var(--border)] text-xs">
            {attached.preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={attached.preview}
                alt=""
                className="w-8 h-8 rounded object-cover"
              />
            ) : attached.type.startsWith("image/") ? (
              <ImageIcon size={16} className="text-[var(--muted)]" />
            ) : (
              <FileText size={16} className="text-[var(--muted)]" />
            )}
            <span className="flex-1 truncate">{attached.name}</span>
            <span className="text-[var(--muted)]">
              {(attached.size / 1024).toFixed(0)} KB
            </span>
            <button
              type="button"
              onClick={() => setAttached(null)}
              className="p-1 rounded-lg hover:bg-white/10"
              aria-label="Remove attachment"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {recordingError && (
          <p className="max-w-3xl mx-auto mb-2 text-xs text-red-400 px-1">
            {recordingError}
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto flex items-end gap-1.5 sm:gap-2"
        >
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
            className="p-2.5 sm:p-3 rounded-xl hover:bg-white/10 text-[var(--muted)] hover:text-white disabled:opacity-40 transition-colors shrink-0 touch-manipulation"
            aria-label="Attach file"
            title="Attach file (max 20 MB)"
          >
            <Paperclip size={20} />
          </button>

          <button
            type="button"
            onClick={toggleVoice}
            disabled={isLoading}
            className={clsx(
              "p-2.5 sm:p-3 rounded-xl transition-colors shrink-0 touch-manipulation",
              isRecording
                ? "bg-red-500/20 text-red-400 animate-pulse"
                : "hover:bg-white/10 text-[var(--muted)] hover:text-white disabled:opacity-40"
            )}
            aria-label={isRecording ? "Stop recording" : "Voice input"}
            title={isRecording ? "Stop" : "Voice / speech to text"}
          >
            {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          <div className="flex-1 relative min-w-0">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={
                isRecording ? "Listening..." : "Message the AI..."
              }
              rows={1}
              className="w-full resize-none bg-[var(--card)] border border-[var(--border)] rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary)] max-h-[160px] placeholder:text-[var(--muted)]"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={(!input.trim() && !attached) || isLoading}
            className="p-2.5 sm:p-3 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 touch-manipulation"
            aria-label="Send"
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </form>
        <p className="text-center text-[10px] text-[var(--muted)] mt-1.5 hidden sm:block">
          Free models have rate limits · Attach text/code files or use voice ·
          Max file 20 MB
        </p>
      </div>
    </div>
  );
}
