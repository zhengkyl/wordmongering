import type { ComponentChildren } from "preact";
import { createContext } from "preact";
import { useContext, useEffect, useState } from "preact/hooks";

const DictionaryContext = createContext<Set<string> | null>(null);

export function DictionaryProvider({ children }: { children: ComponentChildren }) {
  const [dictionary, setDictionary] = useState<Set<string> | null>(null);

  useEffect(() => {
    fetch("/dictionary.txt")
      .then((r) => r.text())
      .then((text) => {
        const set = new Set(text.trim().split("\n"));
        console.log(`Dictionary loaded with ${set.size} words`);
        setDictionary(set);
      });
  }, []);

  return (
    <DictionaryContext.Provider value={dictionary}>
      {children}
    </DictionaryContext.Provider>
  );
}

export function useDictionary() {
  return useContext(DictionaryContext);
}
