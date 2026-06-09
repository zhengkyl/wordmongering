import type { ComponentChildren } from "preact";
import { createContext } from "preact";
import { useContext, useEffect, useState } from "preact/hooks";
import { parseDeadSet, type DeadSets } from "../lib/generatePuzzle";

const WordsContext = createContext<{
  words: Set<string> | null;
  superWords: string[] | null;
  dead: DeadSets | null;
}>({ words: null, superWords: null, dead: null });

export function WordsProvider({ children }: { children: ComponentChildren }) {
  const [words, setWords] = useState<Set<string> | null>(null);
  const [superWords, setSuperWords] = useState<string[] | null>(null);
  const [dead, setDead] = useState<DeadSets | null>(null);

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
    Promise.all(
      ["dead2", "dead3"].map((name) => fetch(`/${name}.txt`).then((r) => r.text())),
    ).then(([two, three]) => {
      setDead({ two: parseDeadSet(two), three: parseDeadSet(three) });
    });
  }, []);

  return (
    <WordsContext.Provider value={{ words, superWords, dead }}>{children}</WordsContext.Provider>
  );
}

export function useWords() {
  return useContext(WordsContext);
}
