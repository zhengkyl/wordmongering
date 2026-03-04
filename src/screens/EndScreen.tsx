import type { RunStats } from "../App";

export function EndScreen({
  won,
  stats,
  onPlayAgain,
}: {
  won: boolean;
  stats: RunStats;
  onPlayAgain: () => void;
}) {
  const totalScore = stats.rounds.reduce((sum, r) => sum + r.score, 0);

  return (
    <div class="h-full flex flex-col items-center justify-center gap-8 p-8">
      <h1 class="text-5xl font-bold">{won ? "You Win!" : "Game Over"}</h1>

      {stats.rounds.length > 0 && (
        <div class="w-full max-w-sm">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-stone-200">
                <th class="py-2 pr-4 text-stone-500 font-semibold">Round</th>
                <th class="py-2 pr-4 text-stone-500 font-semibold text-right">Score</th>
                <th class="py-2 text-stone-500 font-semibold text-right">Plays used</th>
              </tr>
            </thead>
            <tbody>
              {stats.rounds.map((r) => (
                <tr key={r.round} class="border-b border-stone-100">
                  <td class="py-2 pr-4">{r.round}</td>
                  <td class="py-2 pr-4 text-right font-semibold text-rose-500">{r.score}</td>
                  <td class="py-2 text-right">{r.playsUsed}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td class="pt-3 font-bold">Total</td>
                <td class="pt-3 text-right font-bold text-rose-500">{totalScore}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <button
        class="px-10 py-4 bg-stone-800 text-white text-xl font-semibold rounded-full hover:bg-stone-700 transition-colors"
        onClick={onPlayAgain}
      >
        Play Again
      </button>
    </div>
  );
}
