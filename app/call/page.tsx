"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import LivekitRoom from "@/app/LivekitRoom";
import CallRatingModal from "@/app/components/CallRatingModal";
import { ArrowLeft, Phone } from "lucide-react";

function Inner() {
  const params = useSearchParams();
  const room = params.get("room") || "";
  const withUid = params.get("with") || "";
  const router = useRouter();
  const [me, setMe] = useState("");
  const [myName, setMyName] = useState("friend");
  const [partnerName, setPartnerName] = useState("Friend");
  const [rateCall, setRateCall] = useState<{ callId: string } | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid || !room || !withUid) { router.push("/practice"); return; }
      setMe(uid);
      const [mine, theirs] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("user_id", uid).maybeSingle(),
        supabase.from("profiles").select("display_name").eq("user_id", withUid).maybeSingle(),
      ]);
      setMyName((mine.data as any)?.display_name || "friend");
      setPartnerName((theirs.data as any)?.display_name || "Friend");
      await supabase.from("call_invites").update({ status: "joined" }).eq("room", room).eq("status", "ringing");
    };
    init();
  }, [room, withUid, router]);

  if (!me || !room) return <p className="p-6 text-slate-400 text-sm">Connecting…</p>;

  return (
    <main className="fixed inset-0 flex flex-col bg-slate-950 text-white p-3 pb-4">
      <div className="mb-3 flex items-center gap-3 max-w-xl mx-auto w-full shrink-0">
        <Link href="/practice" className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center">
          <ArrowLeft size={18} className="text-slate-300" />
        </Link>
        <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
          <Phone size={18} className="text-green-400" />
        </div>
        <p className="font-bold truncate">Call with {partnerName}</p>
      </div>
      <div className="flex-1 min-h-0 max-w-xl mx-auto w-full overflow-y-auto">
        <LivekitRoom roomName={room} identity={myName} partnerId={withUid} callType="friend"
          onCallEnd={(sec, _p, callId) => { if (callId && sec >= 30) setRateCall({ callId }); }}
          onLeave={() => router.push("/practice")} />
      </div>
      {rateCall && <CallRatingModal callId={rateCall.callId} partnerId={withUid} onClose={() => setRateCall(null)} />}
    </main>
  );
}

export default function CallPage() {
  return (
    <Suspense fallback={<p className="p-6 text-slate-400 text-sm">Loading…</p>}>
      <Inner />
    </Suspense>
  );
}