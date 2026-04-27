import { cl } from "../lib/cl";

const MOCK_DISTRIBUTION = [1, 3, 9, 24, 41, 58, 47, 31, 18, 9, 4, 2];

export function ScoreDistribution({ playerScore }: { playerScore: number }) {
  const max = Math.max(...MOCK_DISTRIBUTION);
  return (
    <div class="flex flex-col gap-1">
      <div class="font-semibold text-sm mb-2">Score Distribution</div>
      {MOCK_DISTRIBUTION.map((count, i) => {
        const words = i + 1;
        const isPlayer = words === playerScore;
        const pct = Math.round((count / max) * 100);
        return (
          <div key={i} class="flex items-center gap-2 text-sm">
            <div class="w-4 text-right font-mono text-gray-500">{words}</div>
            <div class="flex-1">
              <div
                class={cl([
                  "h-6 flex items-center justify-end px-2 font-bold text-white text-xs min-w-8",
                  isPlayer ? "bg-green-500" : "bg-stone-300",
                ])}
                style={{ width: `${pct}%` }}
              >
                {count}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
