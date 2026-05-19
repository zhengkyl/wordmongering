import { useState } from "preact/hooks";
import { Game } from "../components/Game";
import { PageLayout } from "../components/PageLayout";
import { useWords } from "../components/WordsContext";

// prettier-ignore
const LETTER_POOL = Object.entries({
  e: 12, t: 10, a:  9, o:  8, i:  7, n:  7,
  s:  7, h:  6, r:  6, d:  4, l:  5, c:  3,
  u:  3, m:  3, w:  3, f:  3, g:  2, y:  2,
  p:  2, b:  1, v:  1, k:  1, j:  1, q:  1,
  x:  1, z:  1,
}).flatMap(([ch, n]) => Array(n).fill(ch)).join("");

function randomLetters(n: number): string[] {
  return Array.from(
    { length: n },
    () => LETTER_POOL[Math.floor(Math.random() * LETTER_POOL.length)],
  );
}

export function EndlessGamePage() {
  const { words } = useWords();
  const [puzzle] = useState(() => randomLetters(12).join(""));

  return (
    <PageLayout noVerticalPadding>
      {words !== null && (
        <Game
          words={words}
          puzzle={puzzle}
          extraTilesOnTurn={(turn) => (turn % 3 === 0 ? randomLetters(12) : [])}
        />
      )}
    </PageLayout>
  );
}
