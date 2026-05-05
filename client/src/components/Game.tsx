import { useEffect, useRef, useState } from "preact/hooks";
import { cl } from "../lib/cl";
import type { PuzzleTile } from "../lib/computeGreenTiles";
import { puzzleMatchedTiles } from "../lib/computeGreenTiles";
import { POP_DURATION, serpentine, STEP_MS, TILE_PX } from "../lib/shapes";
import { ReportModal } from "./ReportModal";

type GamePhase =
  | { type: "intro"; offset: number }
  | { type: "idle" }
  | { type: "popping"; count: number }
  | { type: "sliding"; offset: number };

export function Game({
  puzzle,
  onComplete,
}: {
  puzzle: string;
  onComplete: (words: string[]) => void;
}) {
  const dictionaryRef = useRef<Set<string> | null>(null);
  const [dictLoaded, setDictLoaded] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const usedWordsRef = useRef<string[]>([]);

  const [tiles, setTiles] = useState<PuzzleTile[]>(
    puzzle.split("").map((letter, id) => ({ id, letter })),
  );

  const [phase, setPhase] = useState<GamePhase>({ type: "intro", offset: puzzle.length });

  const [input, setInput] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
    setPhase({ type: "intro", offset: puzzle.length - 1 });
    window.scrollTo(0, document.body.scrollHeight - window.innerHeight);
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

  const slideOffset = phase.type === "intro" || phase.type === "sliding" ? phase.offset : null;
  const poppingCount = phase.type === "popping" ? phase.count : null;
  const isAnimating = phase.type !== "idle";
  const { matched, candidates } = puzzleMatchedTiles(tiles, input);

  let minX = 0,
    maxX = 0,
    minY = 0;
  for (let i = 0; i < puzzle.length; i++) {
    const { x, y } = serpentine(i / 2);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
  }
  const containerW = maxX - minX + TILE_PX;
  const containerH = -minY + TILE_PX;
  const xOffset = -minX;
  const yOffset = -minY;

  const renderCount = tiles.length + (slideOffset ?? 0);
  const positions: { x: number; y: number }[] = Array(renderCount);

  for (let i = 0; i < renderCount; i++) {
    const { x, y: dy } = serpentine(i / 2);
    positions[i] = { x: x + xOffset, y: dy + yOffset };
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

    const greenCount = matched.length;
    if (greenCount === 0) {
      triggerError(`Must contain '${tiles[0].letter.toUpperCase()}'`);
      return;
    }

    const word = input.toLowerCase();
    if (!dictionaryRef.current!.has(word)) {
      triggerError("Not in dictionary");
      return;
    }

    const nextEnemy = tiles.slice(greenCount);

    usedWordsRef.current.push(word);

    setErrorMsg(null);
    setInput("");
    setPhase({ type: "popping", count: greenCount });

    setTimeout(() => {
      setTiles(nextEnemy);
      if (nextEnemy.length === 0) {
        onComplete(usedWordsRef.current);
        return;
      }
      setPhase({ type: "sliding", offset: greenCount });
      setTimeout(() => {
        setPhase({ type: "sliding", offset: greenCount - 1 });
      }, STEP_MS);
    }, POP_DURATION);
  }

  const activePos = positions[matched.length];

  return (
    <div class="relative max-w-screen-sm mx-auto flex-grow-1 flex flex-col">
      <div class="relative m-auto" style={{ width: containerW, height: containerH }}>
        {phase.type === "idle" && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 100 100"
            class="w-14 h-14 absolute -ml-1 -mt-1"
            style={{
              transform: `translate(${activePos.x}px, ${activePos.y}px)`,
              transition: `transform 150ms linear`,
              // zIndex: tiles.length - index,
            }}
          >
            <path
              class="march"
              fill="none"
              stroke="#000"
              d="M91 91c-6 5-76 5-82 0-5-6-5-76 0-82 6-5 76-5 82 0 5 6 5 76 0 82"
            />
          </svg>
        )}
        {tiles.map(({ id, letter }, index) => {
          const { x, y } = positions[index + (slideOffset ?? 0)];
          const isPopping = poppingCount !== null && index < poppingCount;
          return (
            <div
              key={id}
              onTransitionEnd={
                index === 0
                  ? (e) => {
                      if (e.propertyName !== "transform") return;
                      setPhase((prev) => {
                        if (prev.type !== "intro" && prev.type !== "sliding") return prev;
                        if (prev.offset === 0) {
                          if (prev.type === "intro") {
                            requestAnimationFrame(() => {
                              window.scrollTo({
                                top: document.body.scrollHeight - window.innerHeight,
                                behavior: "instant",
                              });
                            });
                          }
                          return { type: "idle" };
                        }
                        return { type: prev.type, offset: prev.offset - 1 };
                      });
                    }
                  : undefined
              }
              style={{
                transform: `translate(${x}px, ${y}px)`,
                transition: `transform ${STEP_MS}ms linear`,
                zIndex: tiles.length - index,
              }}
              class={cl(["absolute top-0 left-0 w-12 h-12 select-none", isPopping && "pop-out "])}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 100 100"
                class="absolute inset-0"
              >
                <path
                  class={cl([
                    matched.includes(id)
                      ? "fill-green-200"
                      : candidates.includes(id)
                        ? "fill-orange-100"
                        : "fill-orange-200",
                  ])}
                  d="M50 0c43 0 50 7 50 50s-7 50-50 50S0 93 0 50 7 0 50 0"
                />
              </svg>
              <div
                class={cl([
                  "absolute inset-0 flex justify-center items-center font-bold text-2xl uppercase",
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
              Report missing word
            </button>
          )}
        </div>
      </div>
      {reportWord !== null && <ReportModal word={reportWord} onClose={() => setReportWord(null)} />}
      <svg class="hidden" viewBox="0 0 1 1" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <clipPath id="SquircleClip-1" clipPathUnits="objectBoundingBox">
            <path
              d="M 0,0.5
                C 0,0  0,0  0.5,0
                  1,0  1,0  1,0.5
                  1,1  1,1  0.5,1
                  0,1  0,1  0,0.5"
            ></path>
          </clipPath>
          <clipPath id="SquircleClip-2" clipPathUnits="objectBoundingBox">
            <path
              d="M 0,0.5
                C 0,0.0575  0.0575,0  0.5,0
                  0.9425,0  1,0.0575  1,0.5
                  1,0.9425  0.9425,1  0.5,1
                  0.0575,1  0,0.9425  0,0.5"
            ></path>
          </clipPath>
          <clipPath id="SquircleClip-3" clipPathUnits="objectBoundingBox">
            <path
              d="M 0,0.5
                C 0,0.115  0.115,0  0.5,0
                  0.885,0  1,0.115  1,0.5
                  1,0.885  0.885,1  0.5,1
                  0.115,1  0,0.885  0,0.5"
            ></path>
          </clipPath>
          <clipPath id="SquircleClip-4" clipPathUnits="objectBoundingBox">
            <path
              d="M 0,0.5
                C 0,0.1725  0.1725,0  0.5,0
                  0.8275,0  1,0.1725  1,0.5
                  1,0.8275  0.8275,1  0.5,1
                  0.1725,1  0,0.8275  0,0.5"
            ></path>
          </clipPath>
          <clipPath id="SquircleClip-5" clipPathUnits="objectBoundingBox">
            <path
              d="M 0,0.5
                C 0,0.23  0.23,0  0.5,0
                  0.77,0  1,0.23  1,0.5
                  1,0.77  0.77,1  0.5,1
                  0.23,1  0,0.77  0,0.5"
            ></path>
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}
