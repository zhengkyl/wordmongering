import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { cl } from "../lib/cl";
import type { PuzzleTile } from "../lib/computeGreenTiles";
import { puzzleMatchedTiles } from "../lib/computeGreenTiles";
import { LOCAL_WM_EPOCH, MS_PER_DAY } from "../lib/daily";
import { serpentine, serpentineIndexForHeight } from "../lib/shapes";
import { soundEnabled } from "../lib/sound";
import { ReportModal } from "./ReportModal";

const POP_DURATION = 350;
const POP_STAGGER_MS = 60;
const POP_PEAK_MS = POP_DURATION * 0.25;
const STEP_MS = 150;
const TILE_PX = 48;

let audioCtx: AudioContext | null = null;

function playPop(delayMs: number, index: number) {
  if (!soundEnabled) return;
  if (!audioCtx) audioCtx = new AudioContext();
  const ctx = audioCtx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  const t = ctx.currentTime + delayMs / 1000;
  const base = 500 * Math.pow(2, (index * 2) / 12);
  osc.frequency.setValueAtTime(base * 1.5, t);
  osc.frequency.exponentialRampToValueAtTime(base * 0.15, t + 0.08);
  gain.gain.setValueAtTime(0.25, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  osc.start(t);
  osc.stop(t + 0.12);
}

type GamePhase =
  | { type: "intro"; offset: number }
  | { type: "idle" }
  | { type: "popping"; count: number }
  | { type: "sliding"; offset: number; initialOffset: number };

export function Game({
  day,
  puzzle,
  onComplete,
}: {
  day: number;
  puzzle: string;
  onComplete: (words: string[]) => void;
}) {
  const dictionaryRef = useRef<Set<string> | null>(null);
  const [dictLoaded, setDictLoaded] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const usedWordsRef = useRef<string[]>([]);
  const prevMatchedCountRef = useRef(0);

  const [tiles, setTiles] = useState<PuzzleTile[]>(
    puzzle.split("").map((letter, id) => ({ id, letter })),
  );

  const [phase, setPhase] = useState<GamePhase>(() => ({
    type: "intro",
    offset: Math.ceil(serpentineIndexForHeight(window.innerHeight)) + 1,
  }));

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

  useLayoutEffect(() => {
    window.scrollTo(0, document.body.scrollHeight);
    setPhase((prev) => {
      if (prev.type !== "intro") return prev;
      return { type: "intro", offset: prev.offset - 1 };
    });
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
    if (usedWordsRef.current.includes(word)) {
      triggerError("Cannot repeat words");
      return;
    }
    if (!dictionaryRef.current!.has(word)) {
      triggerError("Not in dictionary");
      return;
    }

    const nextEnemy = tiles.slice(greenCount);

    usedWordsRef.current.push(word);

    setErrorMsg(null);
    setInput("");
    setPhase({ type: "popping", count: greenCount });

    for (let i = 0; i < greenCount; i++) {
      playPop(i * POP_STAGGER_MS + POP_PEAK_MS, i);
    }

    setTimeout(
      () => {
        setTiles(nextEnemy);
        if (nextEnemy.length === 0) {
          onComplete(usedWordsRef.current);
          return;
        }
        setPhase({ type: "sliding", offset: greenCount, initialOffset: greenCount });
        setTimeout(() => {
          setPhase({ type: "sliding", offset: greenCount - 1, initialOffset: greenCount });
        }, STEP_MS);
      },
      POP_DURATION + (greenCount - 1) * POP_STAGGER_MS,
    );
  }

  const dayDate = new Date(LOCAL_WM_EPOCH + (day - 1) * MS_PER_DAY);
  const formattedDate = dayDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  function getTileDuration() {
    if (phase.type === "intro") {
      const maxOffset = Math.ceil(serpentineIndexForHeight(window.innerHeight)) + 1;
      const t = phase.offset / maxOffset;
      return Math.round(40 + 110 * (1 - t) ** 4);
    }
    if (phase.type === "sliding") {
      const t = phase.offset / phase.initialOffset;
      return Math.round(50 + 100 * (1 - t) ** 4);
    }
    return 150;
  }
  const tileDuration = getTileDuration();

  const cursorVisible = phase.type === "idle" && matched.length < tiles.length;

  return (
    <div class="max-w-screen-sm mx-auto flex-grow-1 flex flex-col relative">
      <div
        class="absolute left-0 right-0 text-center bottom-60vh overflow-hidden"
        style={{ animation: "fade-out 0.8s ease-out 1s forwards" }}
      >
        <div class="font-bold leading-none text-8xl whitespace-pre">Day {day}</div>
        <div class="mt-1">{formattedDate}</div>
      </div>
      <div
        class="isolate relative mt-auto mx-auto"
        style={{ width: containerW, height: containerH }}
      >
        {tiles.map(({ id, letter }, index) => {
          const { x, y } = positions[index + (slideOffset ?? 0)];
          const isPopping = poppingCount !== null && index < poppingCount;
          const isMatched = matched.includes(id);
          const isNewlyMatched = isMatched && index >= prevMatchedCountRef.current;
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
                          return { type: "idle" };
                        }
                        if (prev.type === "intro") {
                          return { type: "intro", offset: prev.offset - 1 };
                        }
                        return { ...prev, offset: prev.offset - 1 };
                      });
                    }
                  : undefined
              }
              style={{
                transform: `translate(${x}px, ${y}px)`,
                transition: `transform ${tileDuration}ms linear`,
              }}
              class="absolute top-0 left-0 w-12 h-12 select-none"
            >
              <div
                class={cl(["absolute inset-0", isPopping && "pop-out"])}
                style={{ animationDelay: isPopping ? `${index * POP_STAGGER_MS}ms` : undefined }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 100 100"
                  class="absolute inset-0"
                >
                  <path
                    class={
                      isNewlyMatched
                        ? "match-green fill-orange-200"
                        : isMatched
                          ? "fill-green-300"
                          : candidates.includes(id)
                            ? "fill-orange-300"
                            : "fill-orange-200"
                    }
                    style={
                      isNewlyMatched
                        ? {
                            animationDelay: `${(index - prevMatchedCountRef.current) * 30}ms`,
                          }
                        : undefined
                    }
                    d="M50 0c43 0 50 7 50 50s-7 50-50 50S0 93 0 50 7 0 50 0"
                  />
                </svg>
                <div class="absolute inset-0 flex justify-center items-center font-bold text-2xl uppercase">
                  {letter}
                </div>
              </div>
            </div>
          );
        })}
        {cursorVisible && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 100 100"
            class="w-14 h-14 absolute -ml-1 -mt-1 transition-transform"
            style={{
              transform: `translate(${positions[matched.length].x}px, ${positions[matched.length].y}px)`,
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
      </div>

      <div
        class="max-w-screen-sm px-4 opacity-0"
        style={{ animation: "fade-in 0.8s ease-out 1.5s forwards" }}
      >
        <div
          class={cl(["text-center py-4 transition-opacity", phase.type === "intro" && "opacity-0"])}
        >
          <div>Type a word containing this letter</div>
          <div>(and as many following letters as you can)</div>
        </div>
        <div class="py-2">
          <div class="relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onInput={(e) => {
                const newInput = (e.target as HTMLInputElement).value.trim();
                prevMatchedCountRef.current = matched.length;
                setInput(newInput);
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
      </div>
      {reportWord !== null && <ReportModal word={reportWord} onClose={() => setReportWord(null)} />}
    </div>
  );
}
