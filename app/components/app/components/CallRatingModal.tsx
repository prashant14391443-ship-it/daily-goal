"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Star, X } from "lucide-react";

export default function CallRatingModal({
  callId,
  partnerId,
  onClose,
}: {
  callId: string;
  partnerId: string;
  onClose: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [saved, setSaved] = useState(false);

  const submit = async () => {
    if (rating < 1) return onClose();
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (uid) {
      await supabase
        .from("call_ratings")
        .upsert({ call_id: callId, rater_id: uid, target_id: partnerId, rating }, { onConflict: "call_id,rater_id" });
    }
    setSaved(true);
    setTimeout(onClose, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-6 text-center">
        {saved ? (
          <p className="text-lg font-bold text-green-400 py-6">✅ Thanks for rating!</p>
        ) : (
          <>
            <div className="flex justify-between items-center mb-2">
              <p className="font-bold text-white">Rate your partner</p>
              <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-4">How was this conversation?</p>
            <div className="flex justify-center gap-2 mb-5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)} className="transition-transform active:scale-90">
                  <Star size={30} className={n <= rating ? "fill-amber-400 text-amber-400" : "text-slate-600"} />
                </button>
              ))}
            </div>
            <button
              onClick={submit}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 font-bold text-white active:scale-[0.98]"
            >
              {rating ? "Submit rating" : "Skip"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}