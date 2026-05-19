import { getDayNumber } from "./daily";

type AllResults = Record<string, GameResult>;

type PlayRecord = Record<number, [number, number]>;

const RESULTS_KEY = "wm_results";
const RESULTS_VERSION = 2;
const STREAKS_KEY = "wm_streaks";
const STREAKS_VERSION = 2;

export type GameResult = {
  firstScore: number;
  bestScore: number;
  lastPlay: string[];
  plays: number;
};

function getAllResults(): AllResults {
  const raw = localStorage.getItem(RESULTS_KEY);
  if (!raw) return {};
  const parsed = JSON.parse(raw);
  if (!("_v" in parsed) || parsed._v !== RESULTS_VERSION) {
    return {};
  }
  return (parsed as { _v: number; data: AllResults }).data;
}

function saveAllResults(data: AllResults) {
  localStorage.setItem(RESULTS_KEY, JSON.stringify({ _v: RESULTS_VERSION, data }));
}

export function getDayResults(day: number): GameResult | null {
  return getAllResults()[day] ?? null;
}

export function updateDayResults(day: number, words: string[]): GameResult {
  const all = getAllResults();
  const existing = all[day] ?? null;
  const plays = (existing?.plays ?? 0) + 1;
  const gameResult: GameResult = {
    firstScore: existing ? existing.firstScore : words.length,
    bestScore: existing && existing.bestScore <= words.length ? existing.bestScore : words.length,
    lastPlay: words,
    plays,
  };
  all[day] = gameResult;
  saveAllResults(all);
  return gameResult;
}

function getPlayRecord(): PlayRecord {
  const raw = localStorage.getItem(STREAKS_KEY);
  if (!raw) return {};
  const parsed = JSON.parse(raw);
  if (!("_v" in parsed) || parsed._v !== STREAKS_VERSION) {
    return {};
  }
  return (parsed as { _v: number; data: PlayRecord }).data;
}

function savePlayRecord(data: PlayRecord) {
  localStorage.setItem(STREAKS_KEY, JSON.stringify({ _v: STREAKS_VERSION, data }));
}

export function updateStreak(
  day: number,
): { daysPlayed: number; currentStreak: number; bestStreak: number } | null {
  const finishDay = getDayNumber();
  const now = new Date();

  let time: [number, number];
  if (finishDay === day) {
    time = [now.getHours(), now.getMinutes()];
  } else if (finishDay === day + 1 && now.getHours() < 3) {
    time = [24 + now.getHours(), now.getMinutes()];
  } else {
    return null;
  }

  const record = getPlayRecord();
  if (day in record) return null;
  record[day] = time;
  savePlayRecord(record);
  return getStats(record);
}

export function getCompletedDaySet(): Set<number> {
  return new Set(Object.keys(getAllResults()).map(Number));
}

export function getStats(record?: PlayRecord): {
  daysPlayed: number;
  currentStreak: number;
  bestStreak: number;
} {
  if (!record) {
    record = getPlayRecord();
  }

  const days = Object.keys(record)
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
