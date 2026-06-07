import type { ComponentChildren } from "preact";
import { createContext } from "preact";
import { useContext, useEffect, useState } from "preact/hooks";

const WordsContext = createContext<{
  words: Set<string> | null;
  superWords: string[] | null;
}>({ words: null, superWords: null });

export function WordsProvider({ children }: { children: ComponentChildren }) {
  const [words, setWords] = useState<Set<string> | null>(null);
  const [superWords, setSuperWords] = useState<string[] | null>(null);

  useEffect(() => {
    fetch("/words.txt")
      .then((r) => r.text())
      .then((text) => {
        const set = new Set(text.trim().split("\n"));
        console.log(`${set.size} words loaded`);
        setWords(set);
      });
    fetch("/super25k.txt")
      .then((r) => r.text())
      .then((text) => {
        setSuperWords(text.trim().split("\n"));
      });
  }, []);

  return (
    <WordsContext.Provider value={{ words, superWords }}>{children}</WordsContext.Provider>
  );
}

export function useWords() {
  return useContext(WordsContext);
}
