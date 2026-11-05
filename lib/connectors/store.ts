import { createClient } from "@/lib/supabase/server";
import { decryptJson, encryptJson } from "./crypto";
import type { ConnData } from "./types";

export interface ConnRow {
  connectorId: string;
  status: "pending" | "connected";
  serverUrl: string | null;
  label: string | null;
  data: ConnData;
}

export interface ConnLite {
  connectorId: string;
  status: "pending" | "connected";
  serverUrl: string | null;
  label: string | null;
}

async function session() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return { supabase, userId: data.user.id };
}

const TABLE = "connector_connections";

export async function listConnectionsLite(): Promise<ConnLite[]> {
  const { supabase } = await session();
  const { data, error } = await supabase
    .from(TABLE)
    .select("connector_id,status,server_url,label");
  if (error) throw new Error(error.message);
  return (data || []).map((r: any) => ({
    connectorId: r.connector_id,
    status: r.status,
    serverUrl: r.server_url,
    label: r.label,
  }));
}

/** True when the signed-in user has at least one connected connector. Never throws. */
export async function hasConnected(): Promise<boolean> {
  try {
    const { supabase } = await session();
    const { data } = await supabase
      .from(TABLE)
      .select("connector_id")
      .eq("status", "connected")
      .limit(1);
    return !!data && data.length > 0;
  } catch {
    return false;
  }
}

async function toRow(r: any): Promise<ConnRow | null> {
  try {
    const data = r.data ? await decryptJson<ConnData>(r.data) : {};
    return {
      connectorId: r.connector_id,
      status: r.status,
      serverUrl: r.server_url,
      label: r.label,
      data,
    };
  } catch {
    return null;
  }
}

export async function listConnected(): Promise<ConnRow[]> {
  const { supabase } = await session();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("status", "connected");
  if (error) throw new Error(error.message);
  const rows = await Promise.all((data || []).map(toRow));
  return rows.filter((r): r is ConnRow => r !== null);
}

export async function findPendingByState(state: string): Promise<ConnRow | null> {
  const { supabase } = await session();
  const { data } = await supabase
    .from(TABLE)
    .select("*")
    .eq("oauth_state", state)
    .eq("status", "pending")
    .maybeSingle();
  return data ? toRow(data) : null;
}

interface Meta {
  serverUrl?: string | null;
  label?: string | null;
}

export async function savePending(
  connectorId: string,
  state: string,
  data: ConnData,
  meta: Meta = {}
): Promise<void> {
  const { supabase, userId } = await session();
  const { error } = await supabase.from(TABLE).upsert(
    {
      user_id: userId,
      connector_id: connectorId,
      status: "pending",
      server_url: meta.serverUrl ?? null,
      label: meta.label ?? null,
      oauth_state: state,
      data: await encryptJson(data),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,connector_id" }
  );
  if (error) throw new Error(error.message);
}

export async function saveConnected(
  connectorId: string,
  data: ConnData,
  meta: Meta = {}
): Promise<void> {
  const { supabase, userId } = await session();
  const { error } = await supabase.from(TABLE).upsert(
    {
      user_id: userId,
      connector_id: connectorId,
      status: "connected",
      server_url: meta.serverUrl ?? null,
      label: meta.label ?? null,
      oauth_state: null,
      data: await encryptJson(data),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,connector_id" }
  );
  if (error) throw new Error(error.message);
}

export async function removeConnection(connectorId: string): Promise<void> {
  const { supabase, userId } = await session();
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("user_id", userId)
    .eq("connector_id", connectorId);
  if (error) throw new Error(error.message);
}
