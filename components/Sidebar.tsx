"use client";

import { Chat } from "@/types";
import { Plus, MessageSquare, Trash2, Settings, X, LogOut } from "lucide-react";
import clsx from "clsx";

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
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={clsx(
          "fixed md:static inset-y-0 left-0 z-50 w-72 bg-[var(--sidebar)] border-r border-[var(--border)] flex flex-col transition-transform duration-200",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight">Multi AI Chat</h1>
          <button
            onClick={onClose}
            className="md:hidden p-1 rounded hover:bg-white/10"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-3">
          <button
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-medium transition-colors"
          >
            <Plus size={18} />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
          {chats.length === 0 && (
            <p className="text-sm text-[var(--muted)] text-center py-8">
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
                  "group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors",
                  currentChatId === chat.id
                    ? "bg-white/10"
                    : "hover:bg-white/5"
                )}
                onClick={() => {
                  onSelectChat(chat.id);
                  onClose();
                }}
              >
                <MessageSquare size={16} className="shrink-0 text-[var(--muted)]" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{chat.title || "Untitled"}</p>
                  <p className="text-xs text-[var(--muted)] truncate">
                    {chat.provider} · {chat.model.split("/").pop()}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteChat(chat.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-red-400 transition-opacity"
                  aria-label="Delete chat"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
        </div>

        <div className="p-3 border-t border-[var(--border)] space-y-1">
          {userEmail && (
            <p className="px-3 py-1 text-xs text-[var(--muted)] truncate">
              {userEmail}
            </p>
          )}
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-sm"
          >
            <Settings size={16} />
            Settings
          </button>
          {onSignOut && (
            <button
              onClick={onSignOut}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors text-sm"
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
