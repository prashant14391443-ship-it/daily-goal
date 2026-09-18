"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getOfflineChanges, clearOfflineChanges } from "@/lib/offlineDB";
import { Loader2 } from "lucide-react";

export default function OfflineSync() {
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    // Wipe cached private data on sign-out (shared-phone safety)
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" && navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "CLEAR_API_CACHE" });
      }
      if (event === "SIGNED_IN") sync();
    });

    async function sync() {
      if (!navigator.onLine) return;
      const changes = await getOfflineChanges();
      if (changes.length === 0) return;
      setSyncing(true);
      const done: string[] = [];
      for (const ch of changes) {
        try {
          if (ch.action === "insert") await supabase.from(ch.table).insert(ch.data);
          else if (ch.action === "update") await supabase.from(ch.table).update(ch.data).eq("id", ch.data.id);
          else if (ch.action === "delete") await supabase.from(ch.table).delete().eq("id", ch.data.id);
          else if (ch.action === "upsert") await supabase.from(ch.table).upsert(ch.data);
          done.push(ch.id);
        } catch {}
      }
      if (done.length) await clearOfflineChanges(done);
      setSyncing(false);
    }

    sync();
    window.addEventListener("online", sync);
    return () => { window.removeEventListener("online", sync); sub.subscription.unsubscribe(); };
  }, []);

  if (!syncing) return null;
  return (
    <div className="fixed bottom-20 right-4 z-[200] bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-full shadow-lg flex items-center gap-2">
      <Loader2 size={14} className="animate-spin" /> Syncing…
    </div>
  );
}