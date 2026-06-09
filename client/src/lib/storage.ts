import { getDayNumber } from "./daily";

const RESULTS_KEY = "wm_results";
const RESULTS_VERSION = 3;
const STREAKS_KEY = "wm_streaks";
const STREAKS_VERSION = 3;

type StreakRecord = Record<number, [number, number]>;
type ResultsRecord = Record<number, GameResult>;

export type GameResult = {
  firstScore: number;
  bestScore: number;
  lastPlay: string[];
  plays: number;
};

function loadVersionedData(key: string, version: number, migrate: (old: any) => any) {
  const raw = localStorage.getItem(key);
  if (!raw) return {};

  const parsed = JSON.parse(raw);
  if (!("_v" in parsed)) return { };

  if (parsed._v !== version) {
    return migrate(parsed);
  }
  return parsed.data
}

export function getResultsRecord(){
  return loadVersionedData(RESULTS_KEY, RESULTS_VERSION, () => ({})) as ResultsRecord
}
function getStreaksRecord(){
  return loadVersionedData(STREAKS_KEY, STREAKS_VERSION, () =>({})) as StreakRecord
}

export function getDayResults(day: number): GameResult | null {
  return getResultsRecord()[day] ?? null;
}

export function updateDayResults(day: number, words: string[]): GameResult {
  const all = getResultsRecord();
  const existing = all[day] ?? null;
  
  const gameResult = existing ? {
    firstScore: existing.firstScore,
    bestScore: existing.bestScore <= words.length ? existing.bestScore : words.length,
    lastPlay: words,
    plays: existing.plays + 1
  } : {
    firstScore: words.length,
    bestScore: words.length,
    lastPlay: words,
    plays: 1
  }
  all[day] = gameResult;

  localStorage.setItem(RESULTS_KEY, JSON.stringify({ _v: RESULTS_VERSION, data:all }));
  return gameResult;
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

  const record = getStreaksRecord();
  if (day in record) return null;
  record[day] = time;

  localStorage.setItem(STREAKS_KEY, JSON.stringify({ _v: STREAKS_VERSION, data: record }));

  return getStats(record);
}

export function getCompletedDaySet(): Set<number> {
  return new Set(Object.keys(getResultsRecord()).map(Number));
}

export function getStats(record?: StreakRecord): {
  daysPlayed: number;
  currentStreak: number;
  bestStreak: number;
} {
  if (!record) {
    record = getStreaksRecord();
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
