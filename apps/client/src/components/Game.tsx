import { useEffect, useRef, useState } from "preact/hooks";
import { cl } from "../lib/cl";
import type { EnemyTile } from "../lib/computeGreenTiles";
import { computeEnemyGreenTiles } from "../lib/computeGreenTiles";
import { PUZZLES } from "../lib/puzzles";
import { activeShape, POP_DURATION, STEP_MS, TILE_PX } from "../lib/shapes";
import { ReportModal } from "./ReportModal";

export function Game({ day, onComplete }: { day: number; onComplete: (words: string[]) => void }) {
  const puzzleWord = PUZZLES[day];
  const dictionaryRef = useRef<Set<string> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const slideStepsRef = useRef(-1);

  const usedWordsRef = useRef<string[]>([]);
  const [dictLoaded, setDictLoaded] = useState(false);

  const initialEnemy = puzzleWord.split("").map((letter, id) => ({ id, letter }));
  const [enemy, setEnemy] = useState<EnemyTile[]>(initialEnemy);
  const [enemyTotal] = useState(initialEnemy.length);

  const [input, setInput] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [poppingCount, setPoppingCount] = useState<number | null>(null);
  const [slideOffset, setSlideOffset] = useState<number | null>(null);

  const [reportWord, setReportWord] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" });
  }, []);

  useEffect(() => {
    function refocusOnType(e: KeyboardEvent) {
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        inputRef.current!.focus();
      }
    }
    document.addEventListener("keydown", refocusOnType);
    return () => document.removeEventListener("keydown", refocusOnType);
  }, []);

  useEffect(() => {
    fetch("/dictionary.txt")
      .then((r) => r.text())
      .then((text) => {
        dictionaryRef.current = new Set(text.split("\n"));
        setDictLoaded(true);
        console.log(`Dictionary loaded with ${dictionaryRef.current.size} words`);
      });
  }, []);

  const isAnimating = poppingCount !== null || slideOffset !== null;
  const { green: greenTiles, candidate: candidateTiles } = computeEnemyGreenTiles(enemy, input);

  let bx = 0,
    by = 0,
    maxBx = 0,
    minBy = 0;
  for (let i = 0; i < enemyTotal; i++) {
    const { dx, dy } = activeShape(i, enemyTotal);
    bx += dx;
    by += dy;
    if (bx > maxBx) maxBx = bx;
    if (by < minBy) minBy = by;
  }
  const containerW = maxBx + TILE_PX;
  const containerH = -minBy + TILE_PX;
  const yOffset = -minBy;

  const renderCount = enemy.length + (slideOffset ?? 0);
  const positions: { x: number; y: number }[] = Array(renderCount);
  let cx = 0,
    cy = 0;
  for (let i = 0; i < renderCount; i++) {
    const { dx, dy } = activeShape(i, renderCount);
    cx += dx;
    cy += dy;
    positions[i] = { x: cx, y: cy + yOffset };
  }

  function triggerError(msg: string) {
    setErrorMsg(msg);
    setTimeout(() => {
      const el = inputRef.current!;
      el.classList.remove("shake");
      void el.offsetWidth;
      el.classList.add("shake");
    }, 0);
  }

  function handleSubmit() {
    if (!dictLoaded || isAnimating) return;
    if (greenTiles.size === 0) {
      triggerError(`Must contain '${enemy[0].letter.toUpperCase()}'`);
      return;
    }

    const word = input.toLowerCase();
    if (!dictionaryRef.current!.has(word)) {
      triggerError("Not in dictionary");
      return;
    }

    const greenCount = greenTiles.size;
    const nextEnemy = enemy.filter(({ id }) => !greenTiles.has(id));

    usedWordsRef.current.push(word);

    setErrorMsg(null);
    setInput("");
    setPoppingCount(greenCount);

    setTimeout(() => {
      setPoppingCount(null);
      setEnemy(nextEnemy);
      if (nextEnemy.length === 0) {
        onComplete(usedWordsRef.current);
        return;
      }
      slideStepsRef.current = greenCount;
      setSlideOffset(greenCount);
      setTimeout(() => {
        slideStepsRef.current--;
        setSlideOffset(slideStepsRef.current);
      }, STEP_MS);
    }, POP_DURATION);
  }

  return (
    <div class="relative max-w-screen-sm mx-auto flex-grow-1 flex flex-col">
      <div class="relative m-auto" style={{ width: containerW, height: containerH }}>
        {enemy.map(({ id, letter }, index) => {
          const { x, y } = positions[index + (slideOffset ?? 0)];
          const isPopping = poppingCount !== null && index < poppingCount;
          return (
            <div
              key={id}
              onTransitionEnd={
                index === 0
                  ? (e) => {
                      if (e.propertyName !== "transform" || slideStepsRef.current < 0) return;
                      slideStepsRef.current--;
                      setSlideOffset(slideStepsRef.current >= 0 ? slideStepsRef.current : null);
                    }
                  : undefined
              }
              style={{
                transform: `translate(${x}px, ${y}px)`,
                transition: `transform ${STEP_MS}ms linear`,
              }}
              class={cl(["sketchy absolute top-0 left-0 w-12 h-12", isPopping && "pop-out"])}
            >
              {index === 0 && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 160 160"
                  class="w-24 h-24 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-amber-700 -z-10"
                >
                  <path
                    fill="currentColor"
                    d="M76 3c-4 1-5 14-4 25l-9 3-6 5-6 3q-13 8-19 24l-4 14h-3c-3 0-33 8-19 9q12 2 21 1l1 7q5 14 14 25c6 7 8 8 24 8h11v4c0 9 7 37 9 25 4-17 3-17 3-25l1-6q17-2 30-15 11-15 11-37h1c9-1 16 0 25-9 3-3-16-2-24-1l-3 1q-1-9-6-17c-7-13-28-20-40-21-2-10-5-24-8-23m9 34 5 1q13 3 22 19l4 10-9 5q-3 5 11 3 3 17-5 29-8 11-23 11 2-10-5-13-7 1-8 14l-11-1q-8 0-15-4a38 38 0 0 1-12-24c8-1 16-1 12-6q-5-5-12-5l2-12q4-10 15-18 9-6 18-4c1 8 4 19 8 14q4-7 4-11l17 11c6 3-9-11-14-15l-3-3z"
                  />
                </svg>
              )}
              <div
                class={cl([
                  "w-12 h-12 flex justify-center items-center font-bold text-2xl uppercase select-none shadow-sm transition-colors",
                  greenTiles.has(id)
                    ? "bg-green-200"
                    : candidateTiles.has(id)
                      ? "bg-orange-100 contrast-60"
                      : "bg-orange-100 contrast-40",
                ])}
              >
                {letter}
              </div>
            </div>
          );
        })}
      </div>

      <div class="text-center p-4">
        <div>Type a word containing this letter</div>
        <div>(and as many following letters as you can)</div>

        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 31.5 62.2"
          class="absolute top-0 left-0 w-24px"
          style={{
            transform: `translate(${positions[0].x - 32}px, ${positions[0].y + TILE_PX - 8}px)`,
          }}
        >
          <g fill="none" stroke="#000" stroke-linecap="round" stroke-width="4">
            <path d="M21 42.7c.6 3.4 3.3 6 5.5 8.5.8 1 2.7 1.9 2.9 3-1 1.5-3 1.2-4.3 2.1-3.3 1.3-6.5 3-10 4" />
            <path d="M8.3 1.9c-1.8 4.6-2.8 9.6-4.1 14.4a72 72 0 0 0-2 20.5c0 3 .4 6.1 2.3 8.6 2 2.8 5 4.8 8.2 5.7 3.8 1.4 6.2 2 13.8 2.7" />
          </g>
        </svg>
      </div>
      <div class="mt-auto max-w-screen-sm z-10 px-4 py-2">
        <div class="relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onInput={(e) => {
              setInput((e.target as HTMLInputElement).value.trim());
              setErrorMsg(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            class={cl([
              "w-full h-14 pl-3 pr-20 sm:(text-xl h-16 pl-4 pr-22) rounded-xl font-bold uppercase tracking-widest transition-colors bg-orange-100 outline-none",
              errorMsg && "ring-4 ring-red-500/60",
            ])}
            placeholder="type a word..."
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck={false}
          />
          <button
            class="absolute top-2 right-2 sm:(top-3 right-3) rounded-md h-10 px-3 font-bold text-white bg-blue-500 @hover:bg-blue-600 !active:bg-blue-700"
            onClick={handleSubmit}
          >
            PLAY
          </button>
        </div>
        <div class="flex h-9 px-3 sm:px-4 py-2 gap-2 text-sm text-red-600" role="alert">
          <span>{errorMsg}</span>
          {errorMsg === "Not in dictionary" && (
            <button
              class="underline text-red-400 hover:text-red-600"
              onClick={() => setReportWord(input)}
            >
              Report missing
            </button>
          )}
        </div>
      </div>
      {reportWord !== null && <ReportModal word={reportWord} onClose={() => setReportWord(null)} />}
    </div>
  );
}
