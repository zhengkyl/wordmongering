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
    <div class="rounded-xl bg-background min-h-24">
      <div class="text-lg font-semibold py-2">Everyone's scores</div>
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
  const max = keys.reduce((max, curr) => (curr > max ? curr : max), Math.max(primaryScore, secondaryScore ?? 0));
  const min = keys.reduce((min, curr) => (curr < min ? curr : min), Math.min(primaryScore, secondaryScore ?? 999));
  const bars = max - min + 1;

  const maxPercent = Object.values(data).reduce((max, curr) => (curr > max ? curr : max), 1);

  return (
    <ol start={min} class="flex flex-col gap-2 list-decimal pl-4">
      {Array.from({ length: bars }, (_, i) => {
        const words = i + min;
        const percent = data[words] ?? 0;
        const isPrimary = words === primaryScore;
        const isSecondary = words === secondaryScore;
        const width = Math.round((percent / maxPercent) * 100);
        return (
          <li key={i} class="dotless">
            <div
              class={cl([
                "h-6 px-2 font-bold text-white text-xs min-w-fit flex items-center gap-2 justify-end",
                isPrimary ? "bg-lime-500" : isSecondary ? "bg-orange-400" : "bg-stone-400",
              ])}
              style={{ width: `${width}%` }}
            >
              {percent}%
            </div>
          </li>
        );
      })}
    </ol>
  );
}
