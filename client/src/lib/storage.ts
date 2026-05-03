import { getDayNumber } from "./daily";

type AllResults = Record<string, GameResult>;

type PlayRecord = Record<number, [number, number]>;

const RESULTS_KEY = "wm_results";
const STREAKS_KEY = "wm_streaks";

export type GameResult = { words: string[]; plays: number };

function getAllResults(): AllResults {
  const raw = localStorage.getItem(RESULTS_KEY);
  if (!raw) return {};
  return JSON.parse(raw) as AllResults;
}

export function getDayResults(day: number): GameResult | null {
  return getAllResults()[day] ?? null;
}

export function updateDayResults(day: number, words: string[]) {
  const all = getAllResults();
  const plays = (all[day]?.plays ?? 0) + 1;
  all[day] = {
    words,
    plays,
  };
  localStorage.setItem(RESULTS_KEY, JSON.stringify(all));
  return { plays };
}

export function updateStreak(day: number, time: [number, number]): void {
  const raw = localStorage.getItem(STREAKS_KEY);
  const record: PlayRecord = raw ? (JSON.parse(raw) as PlayRecord) : {};
  if (day in record) return;
  record[day] = time;
  localStorage.setItem(STREAKS_KEY, JSON.stringify(record));
}

export function getCompletedDaySet(): Set<number> {
  return new Set(Object.keys(getAllResults()).map(Number));
}

export function getStats(): {
  daysPlayed: number;
  currentStreak: number;
  bestStreak: number;
} {
  const raw = localStorage.getItem(STREAKS_KEY);
  if (!raw) return { daysPlayed: 0, currentStreak: 0, bestStreak: 0 };

  const days = Object.keys(JSON.parse(raw) as PlayRecord)
    .map(Number)
    .sort((a, b) => a - b);

  if (days.length === 0) return { daysPlayed: 0, currentStreak: 0, bestStreak: 0 };

  let bestStreak = 0;
  let currentStreak = 0;
  for (let i = 0; i < days.length; i++) {
    if (days[i] === days[i - 1] + 1) {
      currentStreak++;
    } else {
      currentStreak = 1;
    }

    if (currentStreak > bestStreak) bestStreak = currentStreak;
  }
  if (days[days.length - 1] !== getDayNumber()) currentStreak = 0;

  return { daysPlayed: days.length, currentStreak, bestStreak };
}
