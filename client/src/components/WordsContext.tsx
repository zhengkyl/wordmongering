import type { ComponentChildren } from "preact";
import { createContext } from "preact";
import { useContext, useEffect, useState } from "preact/hooks";

const WordsContext = createContext<{
  words: Set<string> | null;
  superWords: string[] | null;
  puzzles: string[] | null;
}>({ words: null, puzzles: null, superWords: null });

export function WordsProvider({ children }: { children: ComponentChildren }) {
  const [words, setWords] = useState<Set<string> | null>(null);
  const [superWords, setSuperWords] = useState<string[] | null>(null);
  const [puzzles, setPuzzles] = useState<string[] | null>(null);

  useEffect(() => {
    fetch("/words.txt")
      .then((r) => r.text())
      .then((text) => {
        const set = new Set(text.trim().split("\n"));
        console.log(`${set.size} words loaded`);
        setWords(set);
      });
    fetch("/puzzles.txt")
      .then((r) => r.text())
      .then((text) => {
        console.log(text.trim().split("\n"));
        setPuzzles(text.trim().split("\n"));
      });
    fetch("/super25k.txt")
      .then((r) => r.text())
      .then((text) => {
        setSuperWords(text.trim().split("\n"));
      });
  }, []);

  return (
    <WordsContext.Provider value={{ words, puzzles, superWords }}>{children}</WordsContext.Provider>
  );
}

export function useWords() {
  return useContext(WordsContext);
}
