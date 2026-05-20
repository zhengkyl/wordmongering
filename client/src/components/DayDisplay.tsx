import { cl } from "../lib/cl";
import { getDayFormattedDate } from "../lib/daily";
import type { GameResult } from "../lib/storage";

export function DayDisplay({
  day,
  class: outerClass,
  animation,
}: {
  day: number;
  class?: string;
  animation?: string;
}) {
  const formattedDate = getDayFormattedDate(day);
  return (
    <div class={cl(["font-bold leading-none text-2xl whitespace-pre", outerClass])} style={{ viewTransitionName: "puzzle-date", animation }}>
      {formattedDate}
    </div>
  );
}

export function ScoreDisplay({ result }: { result: GameResult }) {
  return <div class="text-lg flex justify-center gap-4" style={{
    viewTransitionName: "puzzle-score"
  }}>
    {result.plays === 1 ?
      <div><span class="font-bold">Your score: </span>{result.lastPlay.length}</div>
      :
      <>
        <div><span class="font-bold">Your score: </span>{result.lastPlay.length}</div>
        <div><span class="font-bold">Your best: </span>{result.bestScore}</div>
      </>
    }
    <div></div>
  </div>
}
