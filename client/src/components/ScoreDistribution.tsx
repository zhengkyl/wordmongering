import { useEffect, useState } from "preact/hooks";
import { cl } from "../lib/cl";

interface Props {
  day: number;
  bestScore: number;
  lastScore: number;
  plays: number;
}

export function ScoreDistribution({ day, bestScore, lastScore }: Props) {
  const [globalData, setGlobalData] = useState<Record<number, number> | null>(null);

  useEffect(() => {
    fetch(`/api/solves/${day}`, {
      signal: AbortSignal.timeout(5000),
    })
      .then((r) => r.json())
      .then(setGlobalData)
      .catch(() => setErrorMsg("Failed to load data"));
  }, [day]);

  const [errorMsg, setErrorMsg] = useState("");

  return (
    <div class="flex flex-col gap-4 p-4 rounded-xl bg-background min-h-24">
      <div class="flex items-center justify-between">
        <div class="font-semibold">Everyone's scores</div>
      </div>
      {globalData ? (
        <ScoreChart
          primaryScore={lastScore}
          secondaryScore={lastScore !== bestScore ? bestScore : undefined}
          data={globalData}
        />
      ) : errorMsg ? (
        <div class="text-red-600">Failed to load scores.</div>
      ) : (
        <div>Loading scores...</div>
      )}
    </div>
  );
}

interface ChartProps {
  primaryScore: number;
  secondaryScore: number | undefined;
  data: Record<number, number>;
}

function ScoreChart({ data, primaryScore, secondaryScore }: ChartProps) {
  const keys = Object.keys(data).map(Number);
  const max = keys.reduce((max, curr) => (curr > max ? curr : max), 0);
  const min = keys.reduce((min, curr) => (curr < min ? curr : min), 999);
  const bars = max - min + 1;

  const maxCount = Object.values(data).reduce((max, curr) => (curr > max ? curr : max), 0);
  const total = Object.values(data).reduce((sum, curr) => sum + curr, 0);

  return (
    <ol start={min} class="flex flex-col gap-2 text-sm list-decimal pl-4">
      {Array.from({ length: bars }, (_, i) => {
        const words = i + min;
        const count = data[words] ?? 0;
        const isPrimary = words === primaryScore;
        const isSecondary = words === secondaryScore;
        const pct = Math.round((count / maxCount) * 100);
        return (
          <li key={i}>
            <div
              class={cl([
                "h-6 px-2 font-bold text-white text-xs min-w-fit flex items-center justify-end",
                isPrimary ? "bg-green-500" : isSecondary ? "bg-orange-400" : "bg-stone-400",
              ])}
              style={{ width: `${pct}%` }}
            >
              {isPrimary && <span class="mr-auto">You</span>}
              {isSecondary && <span class="mr-auto">You (best)</span>}
              {Math.round((count / total) * 100)}%
            </div>
          </li>
        );
      })}
    </ol>
  );
}
