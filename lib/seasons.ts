export const SEASON_MS = 90 * 24 * 3600000;
export const SEASON_EPOCH = new Date("2026-08-01T00:00:00Z").getTime();

export const SEASON_LEVELS = [
  { name: "Bronze", icon: "🥉", need: 0 },
  { name: "Silver", icon: "🥈", need: 500 },
  { name: "Platinum", icon: "⚪", need: 1000 },
  { name: "Gold", icon: "🥇", need: 2000 },
  { name: "Diamond", icon: "💎", need: 4000 },
  { name: "Hero", icon: "🦸", need: 8000 },
  { name: "Elite Hero", icon: "⚡", need: 16000 },
  { name: "Master", icon: "🎓", need: 25000 },
];

export const LIFETIME_LEVELS = [
  { name: "Legend", icon: "👑", need: 64000 },
  { name: "Dragon", icon: "🐉", need: 128000 },
  { name: "Immortal", icon: "🌌", need: 256000 },
  { name: "BATMAN", icon: "🦇", need: 512000 },
];

export function seasonInfo(now = Date.now()) {
  const index = Math.max(1, Math.floor((now - SEASON_EPOCH) / SEASON_MS) + 1);
  const start = SEASON_EPOCH + (index - 1) * SEASON_MS;
  const end = start + SEASON_MS;
  return {
    index,
    startISO: new Date(start).toISOString(),
    daysLeft: Math.max(0, Math.ceil((end - now) / 86400000)),
  };
}

export function levelOf(
  levels: { name: string; icon: string; need: number }[],
  coins: number
) {
  let cur = levels[0];
  for (const l of levels) if (coins >= l.need) cur = l;
  const i = levels.indexOf(cur);
  return { ...cur, next: levels[i + 1] || null };
}