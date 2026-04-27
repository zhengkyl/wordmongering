import { useEffect, useRef, useState } from "preact/hooks";
import { useParams } from "wouter-preact";
import { ReportModal } from "../components/ReportModal";
import { ScoreDistribution } from "../components/ScoreDistribution";
import { SettingsModal } from "../components/SettingsModal";
import { cl } from "../lib/cl";
import { computeGreenTiles } from "../lib/computeGreenTiles";
import { PUZZLES } from "../lib/puzzles";
import { activeShape, POP_DURATION, STEP_MS, TILE_PX } from "../lib/shapes";
import type { EnemyTile, WordRecord } from "../lib/types";

const WM_EPOCH = Date.UTC(2026, 3, 26, 10);
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function GamePage() {
  const params = useParams<{ day: string }>();
  const day = Number(params.day);

  const maxDays = Math.ceil((Date.now() - WM_EPOCH) / MS_PER_DAY);
  const puzzleWord = PUZZLES[day];
  if (day > maxDays || !puzzleWord) {
    return <div>Nothing here yet.</div>;
  }

  const dictionaryRef = useRef<Set<string> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const slideStepsRef = useRef(-1);
  const [dictLoaded, setDictLoaded] = useState(false);

  const initialEnemy = puzzleWord.split("").map((letter, id) => ({ id, letter }));
  const [enemy, setEnemy] = useState<EnemyTile[]>(initialEnemy);
  const [enemyTotal] = useState(initialEnemy.length);

  const [input, setInput] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [poppingCount, setPoppingCount] = useState<number | null>(null);
  const [slideOffset, setSlideOffset] = useState<number | null>(null);

  const [usedWords, setUsedWords] = useState<WordRecord[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [reportWord, setReportWord] = useState<string | null>(null);

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
  const { green: greenTiles, candidate: candidateTiles } = computeGreenTiles(enemy, input);

  const renderCount = enemy.length + (slideOffset ?? 0);
  const positions: { x: number; y: number }[] = Array(renderCount);
  let cx = 0,
    cy = 0;
  for (let i = 0; i < renderCount; i++) {
    const { dx, dy } = activeShape(i, renderCount);
    cx += dx;
    cy += dy;
    positions[i] = { x: cx, y: cy };
  }
  let bx = 0,
    by = 0,
    maxBx = 0,
    maxBy = 0;
  for (let i = 0; i < enemyTotal; i++) {
    const { dx, dy } = activeShape(i, enemyTotal);
    bx += dx;
    by += dy;
    if (bx > maxBx) maxBx = bx;
    if (by > maxBy) maxBy = by;
  }
  const containerW = maxBx + TILE_PX;
  const containerH = maxBy + TILE_PX;

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
    if (!dictionaryRef.current!.has(input.toLowerCase())) {
      triggerError("Not in dictionary");
      return;
    }

    const greenCount = greenTiles.size;
    const nextEnemy = enemy.filter(({ id }) => !greenTiles.has(id));

    const greenLetterCounts = new Map<string, number>();
    for (const { id, letter } of enemy) {
      if (greenTiles.has(id)) {
        greenLetterCounts.set(letter, (greenLetterCounts.get(letter) ?? 0) + 1);
      }
    }
    const tiles = input
      .toLowerCase()
      .split("")
      .map((c) => {
        const n = greenLetterCounts.get(c) ?? 0;
        if (n > 0) {
          greenLetterCounts.set(c, n - 1);
          return { letter: c, green: true };
        }
        return { letter: c, green: false };
      });
    setUsedWords((prev) => [...prev, { tiles }]);

    setErrorMsg(null);
    setInput("");
    setPoppingCount(greenCount);

    setTimeout(() => {
      setPoppingCount(null);
      setEnemy(nextEnemy);
      if (nextEnemy.length === 0) return;
      slideStepsRef.current = greenCount;
      setSlideOffset(greenCount);
      setTimeout(() => {
        slideStepsRef.current--;
        setSlideOffset(slideStepsRef.current);
      }, STEP_MS);
    }, POP_DURATION);
  }

  return (
    <div>
      <div class="flex gap-2 p-2">
        <div class="font-semibold">WORDMONGERING</div>
      </div>
      <div class="relative max-w-screen-sm m-auto pb-48">
        {enemy.length === 0 ? (
          <div class="sketchy-lg bg-background p-2">
            <div class="text-center font-bold text-xl mb-1">
              Completed in {usedWords.length} word{usedWords.length !== 1 ? "s" : ""}!
            </div>
            <div class="text-center text-sm text-gray-500 mb-6"></div>
            <div class="bg-orange-100 text-sm p-2 relative">
              <button
                title="Copy"
                class="rounded-md block absolute top-1 right-1 p-2 @hover:bg-stone-100/60 !active:bg-stone-200/60"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  data-lucide
                  class="w-5 h-5"
                >
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
              </button>
              <pre>{`wordmongering.com\n#${day} - ${usedWords.length}/${initialEnemy.length}\n${usedWords.map(({ tiles }) => tiles.map((t) => (t.green ? "🟩" : "⬜")).join("")).join("\n")}`}</pre>
            </div>
            <div class="flex flex-col gap-4 mt-4">
              <div>Words</div>
              {usedWords.map(({ tiles }, i) => (
                <div key={i} class="flex flex-wrap gap-0.5">
                  {tiles.map(({ letter, green }, j) => (
                    <div
                      key={j}
                      class={cl([
                        "sketchy border-2 w-8 h-8 flex justify-center items-center text-lg font-bold uppercase",
                        green ? "bg-green-200" : "bg-background",
                      ])}
                    >
                      {letter}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div class="mt-4">
              <ScoreDistribution playerScore={usedWords.length} />
            </div>
          </div>
        ) : (
          <>
            {greenTiles.size === 0 ? (
              <div class="text-center p-4">
                <div>Type a word containing this letter</div>
                <div>(and as many following letters as you can)</div>
              </div>
            ) : (
              <div class="text-center p-4">Clear all tiles using as few words as you can</div>
            )}
            <div class="relative m-auto" style={{ width: containerW, height: containerH }}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 31.5 62.2"
                class="absolute top-0 left-0 w-24px"
                style={{
                  transform: `translate(${positions[0].x - 32}px, ${positions[0].y - 18}px)`,
                }}
              >
                <g fill="none" stroke="#000" stroke-linecap="round" stroke-width="4">
                  <path d="M21 42.7c.6 3.4 3.3 6 5.5 8.5.8 1 2.7 1.9 2.9 3-1 1.5-3 1.2-4.3 2.1-3.3 1.3-6.5 3-10 4" />
                  <path d="M8.3 1.9c-1.8 4.6-2.8 9.6-4.1 14.4a72 72 0 0 0-2 20.5c0 3 .4 6.1 2.3 8.6 2 2.8 5 4.8 8.2 5.7 3.8 1.4 6.2 2 13.8 2.7" />
                </g>
              </svg>

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
                            setSlideOffset(
                              slideStepsRef.current >= 0 ? slideStepsRef.current : null,
                            );
                          }
                        : undefined
                    }
                    style={{
                      "--border-src": "var(--border1)",
                      transform: `translate(${x}px, ${y}px)`,
                      transition: `transform ${STEP_MS}ms linear`,
                    }}
                    class={cl([
                      "sketchy absolute top-0 left-0 w-12 h-12 flex justify-center items-center font-bold text-2xl uppercase select-none shadow-sm transition-colors",
                      isPopping && "pop-out",
                      greenTiles.has(id)
                        ? "bg-green-200"
                        : candidateTiles.has(id)
                          ? "bg-orange-100 contrast-60"
                          : "bg-orange-100 contrast-40",
                    ])}
                  >
                    {letter}
                  </div>
                );
              })}
            </div>
          </>
        )}
        {enemy.length > 0 && (
          <div class="sketchy-lg fixed bottom-0 w-full m-auto max-w-screen-sm z-10 p-2 flex flex-col gap-2 bg-background">
            <div class="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onInput={(e) => {
                  setInput((e.target as HTMLInputElement).value);
                  setErrorMsg(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                class={cl([
                  "sketchy-lg w-full px-3 py-2 font-bold uppercase tracking-widest transition-colors outline-none bg-orange-100",
                  errorMsg && "border-red-500 outline-red-500",
                ])}
                placeholder="type a word..."
                autocomplete="off"
                autocorrect="off"
                autocapitalize="off"
                spellcheck={false}
              />
              <button
                class="sketchy-md inline-flex justify-center items-center px-3 bg-blue-500 text-white font-bold @hover:bg-blue-600 !active:bg-blue-700"
                onClick={handleSubmit}
              >
                <svg class="w-5 h-5 mr-1" viewBox="0 0 24 24" data-lucide>
                  <path d="m11 19-6-6" />
                  <path d="m5 21-2-2" />
                  <path d="m8 16-4 4" />
                  <path d="M9.5 17.5 21 6V3h-3L6.5 14.5" />
                </svg>
                Play
              </button>
            </div>
            <div class="flex justify-between">
              <div
                class={cl([
                  "flex items-center gap-2 text-sm text-red-600",
                  errorMsg ? "visible" : "",
                ])}
              >
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
              <button class="underline border-none" onClick={() => setShowSettings(true)}>
                Settings
              </button>
            </div>
          </div>
        )}
      </div>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {reportWord !== null && <ReportModal word={reportWord} onClose={() => setReportWord(null)} />}
    </div>
  );
}
