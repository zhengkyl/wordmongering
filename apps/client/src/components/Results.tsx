import { Link } from "wouter-preact";
import { cl } from "../lib/cl";
import { wordGreenIndexes } from "../lib/computeGreenTiles";
import { getStats, type GameResult } from "../lib/storage";
import { ScoreDistribution } from "./ScoreDistribution";

interface Props {
  day: number;
  puzzle: string;
  gameResult: GameResult;
  onPlayAgain: () => void;
}

export function ResultsPage({ day, puzzle, gameResult, onPlayAgain }: Props) {
  const { daysPlayed, currentStreak, bestStreak } = getStats();

  let tempPuzzle = puzzle;
  const wordsTiles = gameResult.words.map((word) => {
    const indexes = wordGreenIndexes(tempPuzzle, word);
    tempPuzzle = tempPuzzle.slice(indexes.length);
    const tiles = [];
    for (let i = 0; i < word.length; i++) {
      tiles.push({ letter: word.charAt(i), green: indexes.includes(i) });
    }
    return tiles;
  });

  return (
    <div class="max-w-screen-sm m-auto p-4 bg-background flex flex-col gap-2">
      <div class="font-bold text-xl text-center">Congratulations!</div>
      <div class="grid grid-cols-3 text-center">
        <div>
          <div class="font-bold text-2xl">{daysPlayed}</div>
          <div class="text-sm text-gray-500">Days Played</div>
        </div>
        <div>
          <div class="font-bold text-2xl">{currentStreak}</div>
          <div class="text-sm text-gray-500">Current Streak</div>
        </div>
        <div>
          <div class="font-bold text-2xl">{bestStreak}</div>
          <div class="text-sm text-gray-500">Best Streak</div>
        </div>
      </div>
      <div class="grid grid-cols-3">
        <Link
          href="/"
          class="justify-self-center bg-orange-100 @hover:bg-orange-200 !active:bg-orange-300 rounded-xl px-3 py-2 font-semibold"
        >
          Menu
        </Link>
        <button
          class="bg-blue-500 @hover:bg-blue-600 !active:bg-blue-700 text-white rounded-xl inline-flex justify-center items-center px-3 py-2 font-semibold"
          onClick={onPlayAgain}
        >
          Play again
        </button>
        <button
          class="justify-self-center inline-flex justify-center items-center rounded-xl p-2 font-semibold @hover:bg-orange-100/50 !active:bg-orange-100"
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
      <div class="flex flex-col gap-4 mt-4">
        <div class="font-semibold text-sm">Your moves</div>
        <ul class="flex flex-col gap-2 list-decimal pl-4">
          {wordsTiles.map((tiles, i) => (
            <li key={i} class="">
              <div class="font-bold uppercase">
                {tiles.map(({ letter, green }, j) => (
                  <div
                    key={j}
                    class={cl([
                      "inline-block w-6 text-center",
                      green ? "bg-emerald-200" : "bg-orange-100",
                    ])}
                  >
                    <span class="vertical-middle">{letter}</span>
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
      <ScoreDistribution day={day} playerScore={wordsTiles.length} plays={gameResult.plays} />
    </div>
  );
}
