import { Link } from "wouter-preact";
import { cl } from "../lib/cl";
import { inputUsedIndexes } from "../lib/computeGreenTiles";
import { type GameResult } from "../lib/storage";
import { ScoreDistribution } from "./ScoreDistribution";

interface Props {
  day: number;
  puzzle: string;
  gameResult: GameResult;
  streaks: { daysPlayed: number; currentStreak: number; bestStreak: number } | null;
  onPlayAgain: () => void;
}

export function Results({ day, puzzle, gameResult, streaks, onPlayAgain }: Props) {
  let tempPuzzle = puzzle;
  const wordsTiles = gameResult.lastPlay.map((word) => {
    const indexes = inputUsedIndexes(tempPuzzle, word);
    tempPuzzle = tempPuzzle.slice(indexes.length);
    const tiles: { letter: string; green: boolean }[] = [];
    for (let i = 0; i < word.length; i++) {
      tiles.push({ letter: word.charAt(i), green: indexes.includes(i) });
    }
    return tiles;
  });

  return (
    <>
      <div class="grid grid-cols-3 gap-2 text-center">
        <div class="font-bold text-2xl col-span-3">
          You won in {gameResult.lastPlay.length} moves!
        </div>
        {streaks && (
          <>
            <div>
              <div class="font-bold text-2xl">{streaks.daysPlayed}</div>
              <div class="text-sm text-gray-500">Days Played</div>
            </div>
            <div>
              <div class="font-bold text-2xl">{streaks.currentStreak}</div>
              <div class="text-sm text-gray-500">Current Streak</div>
            </div>
            <div>
              <div class="font-bold text-2xl">{streaks.bestStreak}</div>
              <div class="text-sm text-gray-500">Best Streak</div>
            </div>
          </>
        )}
        <Link href="/" class="justify-self-center btn btn-ghost">
          Menu
        </Link>
        <button class="btn btn-orange" onClick={onPlayAgain}>
          Replay
        </button>
        <button
          class="justify-self-center btn btn-ghost"
          onClick={() => {
            const turns = wordsTiles.map((tiles) =>
              tiles.map((t) => (t.green ? "🟩" : "⬜")).join(""),
            );
            const shareText = [
              "wordmongering.com",
              `#${day} - ${wordsTiles.length}/${puzzle.length}`,
              ...turns,
            ].join("\n");
            window.navigator.clipboard.writeText(shareText);
          }}
        >
          Share
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            data-lucide
            class="w-5 h-5 ml-2"
          >
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          </svg>
        </button>
      </div>
      <ScoreDistribution
        day={day}
        bestScore={gameResult.bestScore}
        lastScore={gameResult.lastPlay.length}
        plays={gameResult.plays}
      />
      <details class="group rounded-xl bg-orange-100 mb-4" open>
        <summary class="font-semibold cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden flex justify-between items-center p-4">
          Your moves
          <span class="inline-block transition-transform group-open:-rotate-90">{"<"}</span>
        </summary>
        <ul class="flex flex-col gap-2 list-decimal p-4 pt-0 pl-8">
          {wordsTiles.map((tiles, i) => (
            <li key={i}>
              <div class="font-bold uppercase">
                {tiles.map(({ letter, green }, j) => (
                  <div
                    key={j}
                    class={cl([
                      "inline-block w-6 text-center",
                      green ? "bg-green-300" : "bg-orange-200",
                    ])}
                  >
                    <span class="vertical-middle">{letter}</span>
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </details>
    </>
  );
}
