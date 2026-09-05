"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import type { ActionType } from "@/app/hooks/jarvisActions";

interface ActionToastProps {
  action: ActionType | null;
  message: string;
  onClose: () => void;
}

export function ActionToast({ action, message, onClose }: ActionToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (action && action !== "chat") {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onClose, 300);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [action, onClose]);

  if (!action || action === "chat" || !message) return null;

  const getIcon = () => {
    switch (action) {
      case "log_study": return "🎓";
      case "log_workout": return "💪";
      case "log_habit": return "✅";
      case "log_calories": return "🍽️";
      case "add_task": return "📝";
      default: return "⚡";
    }
  };

  return (
    <div
      className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
      }`}
    >
      <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-800/90 backdrop-blur-xl border border-slate-700 shadow-2xl shadow-black/50">
        <span className="text-2xl">{getIcon()}</span>
        <p className="text-sm font-semibold text-white max-w-xs">{message}</p>
        <button
          onClick={() => {
            setVisible(false);
            setTimeout(onClose, 300);
          }}
          className="ml-2 text-slate-400 hover:text-white transition-colors"
        >
          <XCircle className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}