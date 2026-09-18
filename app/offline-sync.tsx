"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getOfflineChanges, clearOfflineChanges } from "@/lib/offlineDB";
import { Loader2 } from "lucide-react";

export default function OfflineSync() {
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const sync = async () => {
      if (!navigator.onLine) return;
      
      const changes = await getOfflineChanges();
      if (changes.length === 0) return;

      setSyncing(true);
      const syncedIds: string[] = [];

      for (const change of changes) {
        try {
          if (change.action === "insert") {
            await supabase.from(change.table).insert(change.data);
          } else if (change.action === "update") {
            await supabase.from(change.table).update(change.data).eq("id", change.data.id);
          } else if (change.action === "delete") {
            await supabase.from(change.table).delete().eq("id", change.data.id);
          }
          syncedIds.push(change.id);
        } catch (e) {
          console.error("Sync failed for:", change, e);
        }
      }

      if (syncedIds.length > 0) {
        await clearOfflineChanges(syncedIds);
      }
      setSyncing(false);
    };

    sync();
    window.addEventListener("online", sync);
    return () => window.removeEventListener("online", sync);
  }, []);

  if (!syncing) return null;
  return (
    <div className="fixed bottom-20 right-4 z-[200] bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-full shadow-lg flex items-center gap-2">
      <Loader2 size={14} className="animate-spin" />
      Syncing offline changes...
    </div>
  );
}