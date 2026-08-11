import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-5xl font-extrabold">DAILY GOAL</h1>
      <p className="text-slate-400">
        Your productivity dashboard for study, gym and habits.
      </p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="rounded-lg bg-blue-600 px-5 py-2 font-semibold hover:bg-blue-500"
        >
          Login
        </Link>
        <Link
          href="/signup"
          className="rounded-lg bg-slate-800 px-5 py-2 font-semibold hover:bg-slate-700"
        >
          Sign Up
        </Link>
      </div>
      <nav className="flex flex-wrap gap-4 text-sm text-slate-300">
        <Link href="/dashboard" className="hover:text-white">Dashboard</Link>
        <Link href="/study-tracker" className="hover:text-white">Study Tracker</Link>
        <Link href="/gym-log" className="hover:text-white">Gym Log</Link>
        <Link href="/routine-habits" className="hover:text-white">Routine and Habits</Link>
        <Link href="/pricing" className="hover:text-white">Pricing</Link>
      </nav>
    </main>
  );
}