import { useEffect, useState } from "preact/hooks";
import { RULES } from "../lib/game";
import type { RunStats } from "../App";

const PENNY_MS = 80;
const ROW_GAP = 400;

function PennyRow({
  label,
  bonus,
  count,
  total,
}: {
  label: string;
  bonus: string;
  count: number;
  total: number;
}) {
  return (
    <div class="flex items-start gap-3">
      <div class="w-48 shrink-0 text-right">
        <span class="text-stone-500 text-sm">{label}</span>
        <span class="text-stone-400 text-xs block">{bonus}</span>
      </div>
      <div class="flex flex-wrap gap-1">
        {Array.from({ length: count }, (_, i) => (
          <span
            key={i}
            data-anim="penny-pop"
            class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-400 text-amber-900 font-bold text-xs select-none"
          >
            ¢
          </span>
        ))}
        {count > 0 && count === total && (
          <span class="self-center text-amber-700 font-semibold text-sm ml-1">+{total}¢</span>
        )}
      </div>
    </div>
  );
}

export function Earnings({
  round,
  stats,
  pennies,
  onContinue,
}: {
  round: number;
  stats: RunStats;
  pennies: number;
  onContinue: () => void;
}) {
  const lastRound = stats.rounds[stats.rounds.length - 1];
  const handsRemaining = lastRound ? RULES.playsLimit - lastRound.playsUsed : 0;
  const discardsRemaining = lastRound ? RULES.discardsLimit - lastRound.discardsUsed : 0;

  const row1Total = 10;
  const row2Total = 2 * handsRemaining;
  const row3Total = discardsRemaining;

  const [shown, setShown] = useState({ r1: 0, r2: 0, r3: 0 });

  useEffect(() => {
    const ids: ReturnType<typeof setTimeout>[] = [];

    for (let i = 0; i < row1Total; i++) {
      ids.push(setTimeout(() => setShown((s) => ({ ...s, r1: i + 1 })), i * PENNY_MS));
    }

    const row2Start = row1Total * PENNY_MS + ROW_GAP;
    for (let i = 0; i < row2Total; i++) {
      ids.push(setTimeout(() => setShown((s) => ({ ...s, r2: i + 1 })), row2Start + i * PENNY_MS));
    }

    const row3Start = row2Start + row2Total * PENNY_MS + ROW_GAP;
    for (let i = 0; i < row3Total; i++) {
      ids.push(setTimeout(() => setShown((s) => ({ ...s, r3: i + 1 })), row3Start + i * PENNY_MS));
    }

    return () => ids.forEach(clearTimeout);
  }, []);

  return (
    <div class="h-full flex flex-col items-center justify-center gap-8 p-8">
      <div class="text-center">
        <p class="text-stone-500 font-semibold text-lg">Round {round} of {RULES.rounds}</p>
        <h1 class="text-5xl font-bold mt-1">Round Complete!</h1>
      </div>

      <div class="flex flex-col gap-3">
        <PennyRow label="Base" bonus="" count={shown.r1} total={row1Total} />
        <PennyRow
          label="×2 per play remaining"
          bonus={`${handsRemaining} remaining`}
          count={shown.r2}
          total={row2Total}
        />
        <PennyRow
          label="×1 per discard remaining"
          bonus={`${discardsRemaining} remaining`}
          count={shown.r3}
          total={row3Total}
        />
      </div>

      <div class="text-2xl font-bold text-amber-600">Total: {pennies}¢</div>

      <button
        class="px-10 py-4 bg-stone-800 text-white text-xl font-semibold rounded-full hover:bg-stone-700 transition-colors"
        onClick={onContinue}
      >
        Continue →
      </button>
    </div>
  );
}
