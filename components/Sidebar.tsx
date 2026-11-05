"use client";

import { Chat } from "@/types";
import { Plus, MessageSquare, Trash2, Settings, X, LogOut, Compass } from "lucide-react";
import clsx from "clsx";
import Link from "next/link";

interface SidebarProps {
  chats: Chat[];
  currentChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  onOpenSettings: () => void;
  isOpen: boolean;
  onClose: () => void;
  onSignOut?: () => void;
  userEmail?: string | null;
}

export default function Sidebar({
  chats,
  currentChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onOpenSettings,
  isOpen,
  onClose,
  onSignOut,
  userEmail,
}: SidebarProps) {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden touch-manipulation"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={clsx(
          "fixed md:static inset-y-0 left-0 z-50 h-full w-[85vw] max-w-[300px] md:w-72 lg:w-80 bg-[var(--sidebar)] border-r border-[var(--border)] flex flex-col transition-transform duration-200 ease-out overflow-hidden",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="p-3 sm:p-4 border-b border-[var(--border)] flex items-center justify-between shrink-0">
          <h1 className="text-base sm:text-lg font-semibold tracking-tight">Multi AI Chat</h1>
          <button
            onClick={onClose}
            className="md:hidden p-2 rounded-lg hover:bg-white/10 touch-manipulation"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-3 flex gap-2">
          <button
            onClick={() => { onNewChat(); onClose(); }}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-medium transition-colors touch-manipulation text-sm"
          >
            <Plus size={18} />
            New Chat
          </button>
          <Link
            href="/explore"
            onClick={onClose}
            className="flex items-center justify-center gap-1 px-3 py-3 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:bg-white/10 transition-colors text-xs text-[var(--muted)] hover:text-white touch-manipulation"
            title="Explore Models"
          >
            <Compass size={16} />
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-2 sm:px-3 pb-3 space-y-0.5">
          {chats.length === 0 && (
            <p className="text-sm text-[var(--muted)] text-center py-8 px-2">
              No chats yet. Start a new conversation.
            </p>
          )}
          {chats
            .slice()
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .map((chat) => (
              <div
                key={chat.id}
                className={clsx(
                  "group flex items-center gap-2 px-3 py-3 rounded-xl cursor-pointer transition-colors touch-manipulation",
                  currentChatId === chat.id
                    ? "bg-white/10"
                    : "hover:bg-white/5 active:bg-white/10"
                )}
                onClick={() => { onSelectChat(chat.id); onClose(); }}
              >
                <MessageSquare size={16} className="shrink-0 text-[var(--muted)]" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{chat.title || "Untitled"}</p>
                  <p className="text-[11px] text-[var(--muted)] truncate">
                    {chat.provider} · {chat.model.split("/").pop()}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteChat(chat.id); }}
                  className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition-opacity touch-manipulation"
                  aria-label="Delete chat"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
        </div>

        <div className="p-3 border-t border-[var(--border)] space-y-1 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {userEmail && (
            <p className="px-3 py-1 text-xs text-[var(--muted)] truncate">{userEmail}</p>
          )}
          <button
            onClick={() => { onOpenSettings(); onClose(); }}
            className="w-full flex items-center gap-2 px-3 py-3 rounded-xl hover:bg-white/5 transition-colors text-sm touch-manipulation"
          >
            <Settings size={16} />
            Settings
          </button>
          {onSignOut && (
            <button
              onClick={onSignOut}
              className="w-full flex items-center gap-2 px-3 py-3 rounded-xl hover:bg-red-500/10 text-red-400 transition-colors text-sm touch-manipulation"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
