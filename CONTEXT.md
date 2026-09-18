# DAILY GOAL — Project Context

## Stack
- Next.js 16 (App Router, Turbopack) on Vercel
- Supabase (auth + Postgres), Tailwind, lucide-react
- Groq + Gemini for AI, LiveKit for voice, Upstash Redis for aiGate
- PWA with service worker (offline-capable)

## Security status (DONE)
- RLS enabled + owner policies on all user tables (tasks, habits, habit_logs, gym_logs, study_sessions, countdowns, flashcards, nutrition_logs, reflections, user_goals, user_coins, coin_log, bad_habits, bad_habit_logs, summaries, learning_progress, daily_study_log, english_logs, test_attempts)
- test_attempt_questions: owner-select via attempt; questions/paper_variants/year_patterns: authenticated read only
- SUPABASE_SERVICE_ROLE_KEY only in app/api routes + lib/testEngine.ts (server-only, verified)
- No NEXT_PUBLIC_ on any secret key (verified in Vercel)
- robots.txt blocks AI scrapers

## Offline system (DONE)
- lib/offlineDB.ts — IndexedDB (queue + mirror)
- lib/offlineWrite.ts — dbInsert/dbUpdate/dbDelete/dbUpsertBy/dbLoad (fromCache always false = silent mode)
- app/offline-sync.tsx — auto-sync queue on reconnect (insert/update/delete/upsert)
- public/sw.js v11 — fast install, cache-first navigation, silent precrawl of ALL_PAGES, supabase API replay
- manifest start_url = /dashboard (instant launch)
- 11 offline pages: tasklog, habitslog, workout, studylog, nutrition, flashcards, quit, myday, repeat, routines, freeze + dashboard
- app/components/AiGuard.tsx — blocks ONLINE_ONLY routes + AI APIs offline with toast; injects auth header; dg-toast event
- app/components/OfflineBanner.tsx — returns null (silent)
- Coins stay server-side (online-only award) to prevent offline farming

## Key architecture
- Shared paper variants: paper_variants table, paperKey(examId, scope, scopeId, year) + variant; fillAttemptQuestions/quickFill in lib/testEngine.ts
- aiGate: global 1500 units/day pool + per-user 40/day; guest wall on AI
- Test flow: /exam -> /api/test/start -> /test/[id] -> /api/test/topup (silent background assembly)
- Dashboard caches to localStorage (dg-dash-cache-v1), CoinPill caches (dg-coins-v1) for instant paint
- app/page.tsx: neutral first paint (icon.svg tick), redirect to /dashboard if cached session

## File map (important)
- app/api/test/start|topup|answer|finish/route.ts
- lib/testEngine.ts, lib/qGen.ts, lib/aiGate.ts, lib/offlineWrite.ts, lib/offlineDB.ts
- public/sw.js, public/manifest.webmanifest, public/robots.txt
- app/components/AiGuard.tsx, CoinPill.tsx, DraggableAIBubble.tsx

## Rules to not break
- Service role never in "use client" files
- Coin awards online-only
- Offline = silent (no banners/chips); toast only on internet-only taps
- RLS: every new user table needs owner policy