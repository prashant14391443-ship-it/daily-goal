import { supabase } from "@/lib/supabase";
import { queueChange, cacheData, getCachedData } from "@/lib/offlineDB";

export function isOnline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine;
}

function tempId(): string {
  try { return crypto.randomUUID(); } catch { return `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
}

export async function mirrorUpsert(table: string, row: any) {
  const list = (await getCachedData<any[]>(`table:${table}`)) || [];
  const i = list.findIndex((r) => r.id === row.id);
  if (i >= 0) list[i] = { ...list[i], ...row };
  else list.unshift(row);
  await cacheData(`table:${table}`, list.slice(0, 500));
}

export async function mirrorRemove(table: string, id: string) {
  const list = (await getCachedData<any[]>(`table:${table}`)) || [];
  await cacheData(`table:${table}`, list.filter((r) => r.id !== id));
}

export async function mirrorList(table: string): Promise<any[]> {
  return (await getCachedData<any[]>(`table:${table}`)) || [];
}

export async function dbInsert(table: string, row: any): Promise<{ ok: boolean; offline: boolean; id: string }> {
  const id = row.id || tempId();
  const full = { ...row, id };
  if (isOnline()) {
    const { error } = await supabase.from(table).insert(full);
    if (!error) {
      await mirrorUpsert(table, full);
      return { ok: true, offline: false, id };
    }
  }
  await mirrorUpsert(table, { ...full, _pending: true });
  await queueChange({ table, action: "insert", data: full });
  return { ok: true, offline: true, id };
}

export async function dbUpdate(table: string, id: string, patch: any): Promise<{ ok: boolean; offline: boolean }> {
  if (isOnline()) {
    const { error } = await supabase.from(table).update(patch).eq("id", id);
    if (!error) {
      await mirrorUpsert(table, { id, ...patch });
      return { ok: true, offline: false };
    }
  }
  await mirrorUpsert(table, { id, ...patch, _pending: true });
  await queueChange({ table, action: "update", data: { id, ...patch } });
  return { ok: true, offline: true };
}

export async function dbDelete(table: string, id: string): Promise<{ ok: boolean; offline: boolean }> {
  if (isOnline()) {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (!error) {
      await mirrorRemove(table, id);
      return { ok: true, offline: false };
    }
  }
  await mirrorRemove(table, id);
  await queueChange({ table, action: "delete", data: { id } });
  return { ok: true, offline: true };
}

// 🆕 v2: optional `match` filter applied to CACHED rows so offline views never show wrong-date data
export async function dbLoad(
  table: string,
  buildQuery: (q: any) => any,
  match?: (row: any) => boolean
): Promise<{ rows: any[]; fromCache: boolean }> {
  if (isOnline()) {
    try {
      const { data, error } = await buildQuery(supabase.from(table).select("*"));
      if (!error && data) {
        await cacheData(`table:${table}`, (data as any[]).slice(0, 500));
        return { rows: data, fromCache: false };
      }
    } catch {}
  }
  const rows = await mirrorList(table);
  return { rows: match ? rows.filter(match) : rows, fromCache: true };
}