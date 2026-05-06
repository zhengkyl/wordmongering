import { useEffect, useState } from "preact/hooks";
import { cl } from "../lib/cl";

interface Props {
  day: number;
  playerScore: number;
  plays: number;
}

export function ScoreDistribution({ day, playerScore, plays }: Props) {
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
    <div class="flex flex-col gap-4 mt-4">
      <div class="flex items-center justify-between">
        <div class="font-semibold">Score distribution</div>
        <div class="flex text-xs">
          <button
            class={cl([
              "px-2 py-1 rounded-lg font-semibold",
              filterFirst && "bg-orange-200 @hover:bg-orange-300 !active:bg-orange-400",
            ])}
            onClick={() => setFilterFirst(true)}
          >
            First plays
          </button>
          <button
            class={cl([
              "px-2 py-1 rounded-lg font-semibold",
              !filterFirst && "bg-orange-200 @hover:bg-orange-300 !active:bg-orange-400",
            ])}
            onClick={() => setFilterFirst(false)}
          >
            All plays
          </button>
        </div>
      </div>
      {globalData ? (
        <ScoreChart
          playerScore={playerScore}
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
  playerScore: number;
  data: Record<number, number>;
}

function ScoreChart({ data, playerScore }: ChartProps) {
  const keys = Object.keys(data).map(Number);
  const max = keys.reduce((max, curr) => (curr > max ? curr : max), 0);
  const min = keys.reduce((min, curr) => (curr < min ? curr : min), 999);
  const bars = max - min + 1;

  const maxCount = Object.values(data).reduce((max, curr) => (curr > max ? curr : max), 0);

  return Array.from({ length: bars }, (_, i) => {
    const words = i + min;
    const count = data[words] ?? 0;
    const isPlayer = words === playerScore;
    const pct = Math.round((count / maxCount) * 100);
    return (
      <div key={i} class="flex items-center text-sm">
        <div class="-ml-4 w-8 pr-2 text-right font-mono text-gray-500">{words}</div>
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
  });
}
