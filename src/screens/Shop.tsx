import { RULES } from "../lib/game";
import type { RunStats } from "../App";

export function Shop({
  round,
  stats,
  onNextRound,
}: {
  round: number;
  stats: RunStats;
  onNextRound: () => void;
}) {
  const lastRound = stats.rounds[stats.rounds.length - 1];
  const playsUsed = lastRound ? lastRound.playsUsed : 0;
  const playsRemaining = RULES.playsLimit - playsUsed;

  return (
    <div class="h-full flex flex-col items-center justify-center gap-8 p-8">
      <div class="text-center">
        <p class="text-stone-500 font-semibold text-lg">Round {round} of {RULES.rounds}</p>
        <h1 class="text-5xl font-bold mt-1">Round Complete!</h1>
      </div>

      <div class="flex gap-8 text-center">
        <div>
          <div class="text-4xl font-bold text-rose-500">{lastRound ? lastRound.score : 0}</div>
          <div class="text-stone-500 text-sm mt-1">Score</div>
        </div>
        <div>
          <div class="text-4xl font-bold">{playsRemaining}</div>
          <div class="text-stone-500 text-sm mt-1">Plays remaining</div>
        </div>
      </div>

      {/* TODO: shop items go here */}

      <button
        class="px-10 py-4 bg-stone-800 text-white text-xl font-semibold rounded-full hover:bg-stone-700 transition-colors"
        onClick={onNextRound}
      >
        Next Round →
      </button>
    </div>
  );
}
