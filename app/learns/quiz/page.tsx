import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import QuizContent from "./QuizContent";

export default function LearnQuizPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-400" />
      </main>
    }>
      <QuizContent />
    </Suspense>
  );
}