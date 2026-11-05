"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import ChatArea from "@/components/ChatArea";
import Settings from "@/components/Settings";
import LoginModal from "@/components/LoginModal";
import { Chat } from "@/types";
import { useAuth } from "@/lib/auth-context";
import {
  fetchUserChats,
  createChat,
  deleteChat as dbDeleteChat,
  addMessage,
  updateChatTitle,
  updateChatMeta,
  updateMessageContent,
  setConnectorStatus,
} from "@/lib/db";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { user, loading: authLoading, signOut } = useAuth();

  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("groq");
  const [selectedModel, setSelectedModel] = useState("openai/gpt-oss-20b");
  const [chatsLoading, setChatsLoading] = useState(false);
  const [instructions, setInstructions] = useState("");

  useEffect(() => {
    if (!user) {
      setChats([]);
      setCurrentChatId(null);
      setInstructions("");
      return;
    }

    setChatsLoading(true);
    fetchUserChats(user.id)
      .then((loaded) => {
        setChats(loaded);
        if (loaded.length > 0) {
          setCurrentChatId(loaded[0].id);
          setSelectedProvider(loaded[0].provider);
          setSelectedModel(loaded[0].model);
        }
      })
      .finally(() => setChatsLoading(false));

    const supabase = createClient();
    supabase
      .from("user_settings")
      .select("instructions")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.instructions) setInstructions(data.instructions);
      });
  }, [user]);

  // After Google OAuth for a connector, mark it connected and open Settings
  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const connectorId = params.get("connectors");
    if (!connectorId) return;

    setConnectorStatus(user.id, connectorId, true, {
      provider: "google",
    }).then(() => {
      setSettingsOpen(true);
      // Clean URL without reload
      const url = new URL(window.location.href);
      url.searchParams.delete("connectors");
      window.history.replaceState({}, "", url.pathname + url.search);
    });
  }, [user]);

  const currentChat = chats.find((c) => c.id === currentChatId) || null;
  const messageCount = chats.reduce((n, c) => n + c.messages.length, 0);

  const handleNewChat = useCallback(async () => {
    if (!user) return;
    const newChat = await createChat(
      user.id,
      "New Chat",
      selectedModel,
      selectedProvider
    );
    if (newChat) {
      setChats((prev) => [newChat, ...prev]);
      setCurrentChatId(newChat.id);
    }
  }, [user, selectedModel, selectedProvider]);

  const handleDeleteChat = useCallback(
    async (id: string) => {
      await dbDeleteChat(id);
      setChats((prev) => prev.filter((c) => c.id !== id));
      if (currentChatId === id) setCurrentChatId(null);
    },
    [currentChatId]
  );

  const handleModelChange = (provider: string, model: string) => {
    setSelectedProvider(provider);
    setSelectedModel(model);
    if (currentChatId) {
      updateChatMeta(currentChatId, model, provider);
      setChats((prev) =>
        prev.map((c) =>
          c.id === currentChatId ? { ...c, model, provider } : c
        )
      );
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!user || !content.trim()) return;

    let chatId = currentChatId;

    if (!chatId) {
      const newChat = await createChat(
        user.id,
        content.slice(0, 50) + (content.length > 50 ? "..." : ""),
        selectedModel,
        selectedProvider
      );
      if (!newChat) return;
      chatId = newChat.id;
      setChats((prev) => [newChat, ...prev]);
      setCurrentChatId(chatId);
    }

    const userMsg = await addMessage(chatId, {
      role: "user",
      content,
      model: selectedModel,
      provider: selectedProvider,
    });
    if (!userMsg) return;

    setChats((prev) =>
      prev.map((c) => {
        if (c.id !== chatId) return c;
        return {
          ...c,
          messages: [...c.messages, userMsg],
          updatedAt: Date.now(),
          title:
            c.messages.length === 0
              ? content.slice(0, 50) + (content.length > 50 ? "..." : "")
              : c.title,
        };
      })
    );

    if (chats.find((c) => c.id === chatId)?.messages.length === 0) {
      await updateChatTitle(
        chatId,
        content.slice(0, 50) + (content.length > 50 ? "..." : "")
      );
    }

    setIsLoading(true);

    const assistantMsg = await addMessage(chatId, {
      role: "assistant",
      content: "",
      model: selectedModel,
      provider: selectedProvider,
    });

    if (assistantMsg) {
      setChats((prev) =>
        prev.map((c) => {
          if (c.id !== chatId) return c;
          return {
            ...c,
            messages: [...c.messages, assistantMsg],
            updatedAt: Date.now(),
          };
        })
      );
    }

    try {
      const history =
        chats
          .find((c) => c.id === chatId)
          ?.messages.map((m) => ({
            role: m.role,
            content: m.content,
          })) || [];

      const messages = [...history, { role: "user" as const, content }];

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          model: selectedModel,
          provider: selectedProvider,
          systemInstructions: instructions,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content || "";
              if (delta) {
                assistantContent += delta;
                setChats((prev) =>
                  prev.map((c) => {
                    if (c.id !== chatId) return c;
                    return {
                      ...c,
                      messages: c.messages.map((m) =>
                        m.id === assistantMsg?.id
                          ? { ...m, content: assistantContent }
                          : m
                      ),
                    };
                  })
                );
              }
            } catch {
              /* skip */
            }
          }
        }
      }

      if (assistantMsg && assistantContent) {
        await updateMessageContent(assistantMsg.id, assistantContent);
      } else if (assistantMsg) {
        await updateMessageContent(
          assistantMsg.id,
          "No response received. Please check your API key and rate limits."
        );
        setChats((prev) =>
          prev.map((c) => {
            if (c.id !== chatId) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantMsg.id
                  ? {
                      ...m,
                      content:
                        "No response received. Please check your API key and rate limits.",
                    }
                  : m
              ),
            };
          })
        );
      }
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : "Failed to get response. Check API keys.";
      const errorMsg = await addMessage(chatId!, {
        role: "assistant",
        content: `Error: ${msg}`,
        model: selectedModel,
        provider: selectedProvider,
      });
      if (errorMsg) {
        setChats((prev) =>
          prev.map((c) => {
            if (c.id !== chatId) return c;
            return {
              ...c,
              messages: [...c.messages, errorMsg],
              updatedAt: Date.now(),
            };
          })
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[var(--background)] overflow-hidden">
        <Loader2 className="animate-spin text-[var(--muted)]" size={32} />
      </div>
    );
  }

  if (!user) return <LoginModal />;

  return (
    <div className="h-full w-full flex overflow-hidden">
      <Sidebar
        chats={chats}
        currentChatId={currentChatId}
        onSelectChat={setCurrentChatId}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        onOpenSettings={() => setSettingsOpen(true)}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSignOut={signOut}
        userEmail={user.email}
      />
      <ChatArea
        chat={currentChat}
        onSendMessage={handleSendMessage}
        isLoading={isLoading || chatsLoading}
        onOpenSidebar={() => setSidebarOpen(true)}
        selectedModel={selectedModel}
        selectedProvider={selectedProvider}
        onModelChange={handleModelChange}
      />
      <Settings
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        instructions={instructions}
        onInstructionsChange={setInstructions}
        messageCount={messageCount}
        chatCount={chats.length}
      />
    </div>
  );
}
