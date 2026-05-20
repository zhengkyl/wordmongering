import { useState } from "preact/hooks";
import { Game } from "../components/Game";
import { PageLayout } from "../components/PageLayout";
import { MoveAnalysis } from "../components/Results";
import { useWords } from "../components/WordsContext";

// prettier-ignore
const LETTER_POOL = Object.entries({
  E: 12, T: 10, A: 9, O: 8, I: 7, N: 7,
  S: 7, H: 6, R: 6, D: 4, L: 5, C: 3,
  U: 3, M: 3, W: 3, F: 3, G: 2, Y: 2,
  P: 2, B: 1, V: 1, K: 1, J: 1, Q: 1,
  X: 1, Z: 1,
}).flatMap(([ch, n]) => Array(n).fill(ch)).join("");

function randomLetters(n: number): string[] {
  return Array.from(
    { length: n },
    () => LETTER_POOL[Math.floor(Math.random() * LETTER_POOL.length)],
  );
}

export function EndlessGamePage() {
  const { words } = useWords();
  const [gameKey, setGameKey] = useState(0);
  const [puzzle, setPuzzle] = useState(() => randomLetters(30).join(""));
  const [currentWords, setCurrentWords] = useState<string[]>([]);
  const [gameOver, setGameOver] = useState(false);

  function playAgain() {
    setPuzzle(randomLetters(30).join(""));
    setCurrentWords([]);
    setGameOver(false);
    setGameKey((k) => k + 1);
  }

  if (gameOver) {
    return (
      <PageLayout>
        <div class="text-center">
          <div class="text-2xl font-bold">{currentWords.length} turns</div>
        </div>
        <button class="btn btn-orange w-full justify-center" onClick={playAgain}>
          Play again
        </button>
        <MoveAnalysis puzzle={puzzle} words={currentWords} />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      {words !== null && (
        <>
          <div class="flex justify-between items-center py-2">
            <span class="font-bold">Turn {currentWords.length + 1}</span>
            <button class="btn btn-ghost" onClick={() => setGameOver(true)}>
              End game
            </button>
          </div>
          <Game
            key={gameKey}
            words={words}
            puzzle={puzzle}
            onTurn={setCurrentWords}
            extraTilesOnTurn={(nextEnemyLength) => (nextEnemyLength < 20 ? randomLetters(10) : [])}
            onComplete={(completedWords) => {
              setCurrentWords(completedWords);
              setGameOver(true);
            }}
          />
        </>
      )}
    </PageLayout>
  );
}
