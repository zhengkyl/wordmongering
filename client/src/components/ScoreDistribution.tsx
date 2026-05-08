import { useEffect, useState } from "preact/hooks";
import { cl } from "../lib/cl";

interface Props {
  day: number;
  firstScore: number;
  bestScore: number;
  lastScore: number;
  plays: number;
}

export function ScoreDistribution({ day, firstScore, bestScore, lastScore, plays }: Props) {
  const [globalData, setGlobalData] = useState<{
    allPlays: Record<number, number>;
    firstPlays: Record<number, number>;
  } | null>(null);

  useEffect(() => {
    fetch(`/api/dailies/${day}/results`, {
      signal: AbortSignal.timeout(5000),
    })
      .then((r) => r.json())
      .then(setGlobalData)
      .catch(() => setErrorMsg("Failed to load data"));
  }, [day]);

  const [errorMsg, setErrorMsg] = useState("");
  const [filterFirst, setFilterFirst] = useState(plays === 1);

  return (
    <div class="flex flex-col gap-4 p-4 rounded-xl bg-orange-100 min-h-40">
      <div class="flex items-center justify-between">
        <div class="font-semibold">Everyone's scores</div>
        <div class="flex text-xs">
          <button
            class={cl(["btn-tab", filterFirst && "btn-tab-active"])}
            onClick={() => setFilterFirst(true)}
          >
            First plays
          </button>
          <button
            class={cl(["btn-tab", !filterFirst && "btn-tab-active"])}
            onClick={() => setFilterFirst(false)}
          >
            All
          </button>
        </div>
      </div>
      {globalData ? (
        <ScoreChart
          primaryScore={filterFirst ? firstScore : lastScore}
          secondaryScore={!filterFirst && lastScore !== bestScore ? bestScore : undefined}
          data={filterFirst ? globalData.firstPlays : globalData.allPlays}
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
              {count}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
