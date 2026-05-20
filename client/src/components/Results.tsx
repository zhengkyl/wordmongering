import { useMemo } from "preact/hooks";
import { cl } from "../lib/cl";
import { inputMatchedIndexes, sampleOptimalMoves } from "../lib/computeGreenTiles";
import { type GameResult } from "../lib/storage";
import { ScoreDisplay } from "./DayDisplay";
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
  return (
    <>
      <ScoreDisplay result={gameResult} />
      <div class="grid grid-cols-3 gap-2 text-center">
        <button class="btn btn-orange col-span-2" onClick={onPlayAgain}>
          Play again
        </button>
        <button
          class="btn btn-ghost justify-center"
          onClick={() => {
            let tempPuzzle = puzzle;
            const turns = gameResult.lastPlay.map((word) => {
              const indexes = inputMatchedIndexes(tempPuzzle, word);
              tempPuzzle = tempPuzzle.slice(indexes.length);
              return word
                .split("")
                .map((_, i) => (indexes.includes(i) ? "🟩" : "⬜"))
                .join("");
            });
            const shareText = [
              "wordmongering.com",
              `#${day} - ${gameResult.lastPlay.length}/10`,
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
      <MoveAnalysis puzzle={puzzle} words={gameResult.lastPlay} />
    </>
  );
}

export function MoveAnalysis({ puzzle, words }: { puzzle: string; words: string[] }) {
  const { superWords } = useWords();
  const moves = useMemo(() => {
    let tempPuzzle = puzzle;
    return words.map((word, i) => {
      const indexes = inputMatchedIndexes(tempPuzzle, word);

      let rating: Rating = null;
      let optimalMoves = null;
      if (indexes.length === tempPuzzle.length) {
        if (indexes.length >= 6) {
          rating = "brilliant";
        } else if (indexes.length >= 5) {
          rating = "strong";
        }
      } else if (superWords) {
        const result = sampleOptimalMoves(tempPuzzle, superWords, 5);
        rating = rateMove(indexes.length, result.matched);
        if (indexes.length !== result.matched) {
          optimalMoves = result.sample;
        }
      }
      const puzzleState = tempPuzzle;
      tempPuzzle = tempPuzzle.slice(indexes.length);

      return { word, indexes, rating, optimalMoves, puzzleState };
    });
  }, [puzzle, words, superWords]);

  return (
    <div class="rounded-xl bg-background">
      <div class="text-lg font-semibold py-2">Your moves</div>
      <ul class="flex flex-col gap-2 list-decimal pt-0 pl-4">
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
            {superWords && (optimalMoves ? (
              <details>
                <summary
                  class={cl([
                    "py-1 cursor-pointer [&::-webkit-details-marker]:hidden focus-visible:opacity-100 @hover:opacity-100 transition-opacity select-none",
                    rating === "blunder" || rating === "weak"
                      ? "text-red-800 font-semibold opacity-80 "
                      : "text-stone-500 opacity-50",
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
            ) : <div class="pl-2 py-1 text-stone-500 opacity-50 select-none">You played the best move!</div>)}
          </li>
        ))}
      </ul>
    </div>
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
    return "brilliant";
  }
  if (cleared >= nearOptimal - 1) {
    return "strong";
  }

  if (cleared <= nearOptimal - 4) {
    if (cleared <= 2) return "blunder";
  }
  if (cleared <= nearOptimal - 3) {
    if (cleared <= 3) return "weak";
  }
  return null;
}
