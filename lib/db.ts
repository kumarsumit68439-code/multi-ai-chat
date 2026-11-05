import { createClient } from "@/lib/supabase/client";
import { Chat, Message } from "@/types";

export async function fetchUserChats(userId: string): Promise<Chat[]> {
  const supabase = createClient();

  const { data: chats, error } = await supabase
    .from("chats")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error || !chats) return [];

  const result: Chat[] = [];

  for (const chat of chats) {
    const { data: messages } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chat.id)
      .order("created_at", { ascending: true });

    result.push({
      id: chat.id,
      title: chat.title,
      model: chat.model,
      provider: chat.provider,
      createdAt: new Date(chat.created_at).getTime(),
      updatedAt: new Date(chat.updated_at).getTime(),
      messages: (messages || []).map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: new Date(m.created_at).getTime(),
        model: m.model,
        provider: m.provider,
      })),
    });
  }

  return result;
}

export async function createChat(
  userId: string,
  title: string,
  model: string,
  provider: string
): Promise<Chat | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("chats")
    .insert({
      user_id: userId,
      title,
      model,
      provider,
    })
    .select()
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    title: data.title,
    model: data.model,
    provider: data.provider,
    createdAt: new Date(data.created_at).getTime(),
    updatedAt: new Date(data.updated_at).getTime(),
    messages: [],
  };
}

export async function updateChatTitle(chatId: string, title: string) {
  const supabase = createClient();
  await supabase
    .from("chats")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", chatId);
}

export async function updateChatMeta(
  chatId: string,
  model: string,
  provider: string
) {
  const supabase = createClient();
  await supabase
    .from("chats")
    .update({ model, provider, updated_at: new Date().toISOString() })
    .eq("id", chatId);
}

export async function deleteChat(chatId: string) {
  const supabase = createClient();
  await supabase.from("chats").delete().eq("id", chatId);
}

export async function addMessage(
  chatId: string,
  message: Omit<Message, "id" | "timestamp"> & { id?: string }
): Promise<Message | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("messages")
    .insert({
      chat_id: chatId,
      role: message.role,
      content: message.content,
      model: message.model,
      provider: message.provider,
    })
    .select()
    .single();

  if (error || !data) return null;

  await supabase
    .from("chats")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", chatId);

  return {
    id: data.id,
    role: data.role,
    content: data.content,
    timestamp: new Date(data.created_at).getTime(),
    model: data.model,
    provider: data.provider,
  };
}

export async function updateMessageContent(messageId: string, content: string) {
  const supabase = createClient();
  await supabase
    .from("messages")
    .update({ content })
    .eq("id", messageId);
}

/** Connected connector status for a user */
export interface UserConnector {
  connector_id: string;
  connected: boolean;
  provider?: string;
  scopes?: string[];
  updated_at?: string;
}

/**
 * Fetch all connector connection statuses for a user.
 * Requires table: user_connectors (
 *   user_id uuid references auth.users,
 *   connector_id text,
 *   connected boolean default false,
 *   provider text,
 *   scopes text[],
 *   updated_at timestamptz default now(),
 *   primary key (user_id, connector_id)
 * )
 */
export async function fetchUserConnectors(
  userId: string
): Promise<Record<string, UserConnector>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_connectors")
    .select("connector_id, connected, provider, scopes, updated_at")
    .eq("user_id", userId);

  if (error || !data) return {};

  const map: Record<string, UserConnector> = {};
  for (const row of data) {
    map[row.connector_id] = {
      connector_id: row.connector_id,
      connected: !!row.connected,
      provider: row.provider ?? undefined,
      scopes: row.scopes ?? undefined,
      updated_at: row.updated_at ?? undefined,
    };
  }
  return map;
}

export async function setConnectorStatus(
  userId: string,
  connectorId: string,
  connected: boolean,
  extra?: { provider?: string; scopes?: string[] }
): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from("user_connectors").upsert(
    {
      user_id: userId,
      connector_id: connectorId,
      connected,
      provider: extra?.provider ?? null,
      scopes: extra?.scopes ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,connector_id" }
  );
  return !error;
}
