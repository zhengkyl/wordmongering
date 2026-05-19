import { useMemo } from "preact/hooks";
import { Link } from "wouter-preact";
import { cl } from "../lib/cl";
import { inputMatchedIndexes, sampleOptimalMoves } from "../lib/computeGreenTiles";
import { type GameResult } from "../lib/storage";
import { ScoreDistribution } from "./ScoreDistribution";
import { useWords } from "./WordsContext";

interface Props {
  day: number;
  puzzle: string;
  gameResult: GameResult;
  streaks: { daysPlayed: number; currentStreak: number; bestStreak: number } | null;
  onPlayAgain: () => void;
}

export function Results({ day, puzzle, gameResult, streaks, onPlayAgain }: Props) {
  const { superWords } = useWords();
  const moves = useMemo(() => {
    let tempPuzzle = puzzle;
    return gameResult.lastPlay.map((word) => {
      const indexes = inputMatchedIndexes(tempPuzzle, word);

      let rating;
      let optimalMoves;
      if (superWords) {
        const result = sampleOptimalMoves(tempPuzzle, superWords, 5);
        rating = rateMove(indexes.length, result.matched);
        optimalMoves = result.sample;
      } else {
        rating = null;
        optimalMoves = null;
      }

      const puzzleState = tempPuzzle;
      tempPuzzle = tempPuzzle.slice(indexes.length);

      return { word, indexes, rating, optimalMoves, puzzleState };
    });
  }, [puzzle, gameResult.lastPlay, superWords]);

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
          Play again
        </button>
        <button
          class="justify-self-center btn btn-ghost"
          onClick={() => {
            const turns = moves.map(({ word, indexes }) =>
              word
                .split("")
                .map((_, i) => (indexes.includes(i) ? "🟩" : "⬜"))
                .join(""),
            );
            const shareText = [
              "wordmongering.com",
              `#${day} - ${moves.length}/10`,
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
      <div class="rounded-xl bg-background mb-4">
        <div class="font-semibold p-4">Your moves</div>
        <ul class="flex flex-col gap-2 list-decimal p-4 pt-0 pl-8">
          {moves.map(({ word, indexes, rating, optimalMoves, puzzleState }, i) => (
            <li key={i} class="group">
              <div class="flex justify-between flex-wrap gap-2">
                <div class="font-bold">
                  <WordTiles
                    word={word}
                    indexes={indexes}
                    letterClass="w-6"
                    matchedClass="bg-lime-300"
                  />
                </div>
                <MoveAnnotation rating={rating} />
              </div>
              {optimalMoves && (
                <details>
                  <summary
                    class={cl([
                      "px-1.5 py-0.5 cursor-pointer [&::-webkit-details-marker]:hidden focus-visible:opacity-100 @hover:opacity-100 transition-opacity select-none",
                      rating === "blunder" || rating === "weak"
                          ? "text-red-800 font-semibold opacity-80 "
                          : "text-stone-500 opacity-50 ",
                    ])}
                  >
                    Reveal best move
                  </summary>
                  <div class="text-sm p-2 bg-orange-100">
                    <div>Puzzle</div>
                    <div class="font-bold">
                      <PuzzleTiles
                        word={puzzleState}
                        userClass="bg-lime-300"
                        optimalClass="bg-teal-300"
                        userMatched={indexes.length}
                        optimalMatched={optimalMoves[0].indexes.length}
                      />
                    </div>
                    <div>Moves</div>
                    <ul class="font-bold flex flex-col gap-2">
                      {optimalMoves.map(({ word, indexes }, j) => (
                        <li key={j}>
                          <WordTiles
                            word={word}
                            indexes={indexes}
                            letterClass="w-4"
                            matchedClass="bg-teal-300"
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                </details>
              )}
            </li>
          ))}
        </ul>
      </div>
      <ScoreDistribution
        day={day}
        bestScore={gameResult.bestScore}
        lastScore={gameResult.lastPlay.length}
        plays={gameResult.plays}
      />
    </>
  );
}

function PuzzleTiles({
  word,
  userClass,
  optimalClass,
  userMatched,
  optimalMatched,
}: {
  word: string;
  userClass: string;
  optimalClass: string;
  userMatched: number;
  optimalMatched: number;
}) {
  return word.split("").map((letter, i) => (
    <span
      key={i}
      class={cl([
        "inline-block text-center w-4",
        i < userMatched ? userClass : i < optimalMatched ? optimalClass : null,
      ])}
    >
      {letter}
    </span>
  ));
}

function WordTiles({
  word,
  indexes,
  letterClass,
  matchedClass,
}: {
  word: string;
  indexes: number[];
  letterClass: string;
  matchedClass: string;
}) {
  return word.split("").map((letter, i) => (
    <span
      key={i}
      class={cl(["inline-block text-center", letterClass, indexes.includes(i) ? matchedClass : ""])}
    >
      {letter}
    </span>
  ));
}

type Rating = "brilliant" | "strong" | "weak" | "blunder" | null;

const ANNOTATION: Record<NonNullable<Rating>, { label: string; cls: string }> = {
  brilliant: { label: "Brilliant!!", cls: "bg-teal-200 text-teal-800" },
  strong: { label: "Strong!", cls: "bg-green-200 text-green-800" },
  weak: { label: "Weak?", cls: "bg-orange-200 text-orange-800" },
  blunder: { label: "Blunder??", cls: "bg-red-200 text-red-800" },
};

function MoveAnnotation({ rating }: { rating: Rating }) {
  if (!rating) return null;
  const { label, cls } = ANNOTATION[rating];
  return <span class={cl(["px-1.5 py-0.5 text-sm font-semibold select-none", cls])}>{label}</span>;
}

function rateMove(cleared: number, nearOptimal: number): Rating {
  if (cleared >= nearOptimal) {
    if (cleared >= 6) return "brilliant";
  }
  if (cleared >= nearOptimal - 1) {
    if (cleared >= 5) return "strong";
  }

  if (cleared <= nearOptimal - 4) {
    if (cleared <= 2) return "blunder";
  }
  if (cleared <= nearOptimal - 3) {
    if (cleared <= 3) return "weak";
  }
  return null;
}
