import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { cl } from "../lib/cl";
import type { PuzzleTile } from "../lib/computeGreenTiles";
import { puzzleMatchedTiles } from "../lib/computeGreenTiles";
import { serpentine, serpentineIndexForHeight } from "../lib/shapes";
import { soundEnabled } from "../lib/sound";
import { ReportModal } from "./ReportModal";

const POP_DURATION = 350;
const POP_STAGGER_MS = 60;
const POP_PEAK_MS = POP_DURATION * 0.25;
const STEP_MS = 150;
const TILE_PX = 48;

let audioCtx: AudioContext | null = null;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new AudioContext();
  audioCtx.resume().then(() => {
    const buf = audioCtx!.createBuffer(1, 1, audioCtx!.sampleRate);
    const src = audioCtx!.createBufferSource();
    src.buffer = buf;
    src.connect(audioCtx!.destination);
    src.start(0);
  });
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type GamePhase =
  | { type: "adding"; offset: number; initialOffset: number; addedAt: number }
  | { type: "idle" }
  | { type: "popping"; count: number }
  | { type: "sliding"; offset: number; initialOffset: number };

export function Game({
  words,
  puzzle,
  onComplete,
  onTurn,
  extraTilesOnTurn,
}: {
  words: Set<string>;
  puzzle: string;
  onComplete?: (words: string[]) => void;
  onTurn?: (words: string[]) => void;
  extraTilesOnTurn?: (nextEnemyLength: number) => string[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const usedWordsRef = useRef<string[]>([]);
  const prevMatchedCountRef = useRef(0);
  const turnRef = useRef(0);
  const nextIdRef = useRef(puzzle.length);
  const maxTilesRef = useRef(puzzle.length);
  const pendingAddRef = useRef<{ tiles: PuzzleTile[]; addedAt: number } | null>(null);

  const [tiles, setTiles] = useState<PuzzleTile[]>(
    puzzle.split("").map((letter, id) => ({ id, letter })),
  );

  const [phase, setPhase] = useState<GamePhase>(() => {
    const offset = Math.ceil(serpentineIndexForHeight(window.innerHeight)) + 1;
    return { type: "adding", offset, initialOffset: offset, addedAt: 0 };
  });

  const [rawInput, setRawInput] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [reportWord, setReportWord] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState(false);

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
    if (phase.type === "adding" && phase.offset === phase.initialOffset) {
      window.scrollTo(0, document.body.scrollHeight);
    }
    setPhase((prev) => {
      if (prev.type !== "adding" || prev.offset !== prev.initialOffset) return prev;
      return { ...prev, offset: prev.offset - 1 };
    });
  }, [tiles.length]);

  const slideOffset = phase.type === "adding" || phase.type === "sliding" ? phase.offset : null;
  const poppingCount = phase.type === "popping" ? phase.count : null;
  const isAnimating = phase.type !== "idle" || celebrating;
  const cleanInput = rawInput.toUpperCase();
  const { matched, candidates } = puzzleMatchedTiles(tiles, cleanInput);

  let minX = 0,
    maxX = 0,
    minY = 0;
  if (tiles.length > maxTilesRef.current) maxTilesRef.current = tiles.length;
  const boundsCount = maxTilesRef.current;
  for (let i = 0; i < boundsCount; i++) {
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

  async function handleSubmit() {
    if (words === null || isAnimating) return;

    const greenCount = matched.length;
    if (greenCount === 0) {
      triggerError(`Must contain '${tiles[0].letter}'`);
      return;
    }

    if (usedWordsRef.current.includes(cleanInput)) {
      triggerError("Cannot repeat words");
      return;
    }
    if (!words.has(cleanInput)) {
      triggerError("Not in word list");
      return;
    }

    const nextEnemy = tiles.slice(greenCount);
    turnRef.current += 1;
    const extraLetters = extraTilesOnTurn ? extraTilesOnTurn(nextEnemy.length) : [];
    const extraTiles: PuzzleTile[] = extraLetters.map((letter) => ({
      id: nextIdRef.current++,
      letter,
    }));

    usedWordsRef.current.push(cleanInput);
    if (onTurn) onTurn([...usedWordsRef.current]);

    if (cleanInput === "WORDMONGERING") {
      setCelebrating(true);
      playHorn();
      await sleep(3200);
      setCelebrating(false);
    }

    setErrorMsg(null);
    setRawInput("");
    setPhase({ type: "popping", count: greenCount });

    for (let i = 0; i < greenCount; i++) {
      playPop(i * POP_STAGGER_MS + POP_PEAK_MS, i);
    }

    setTimeout(
      () => {
        if (nextEnemy.length === 0 && extraTiles.length === 0) {
          setTiles(nextEnemy);
          if (onComplete) onComplete(usedWordsRef.current);
          return;
        }
        if (nextEnemy.length === 0) {
          // No slide needed; animate new tiles in directly.
          // useLayoutEffect([tiles.length]) fires before paint and does the first decrement.
          setTiles(extraTiles);
          setPhase({
            type: "adding",
            offset: extraTiles.length + 1,
            initialOffset: extraTiles.length + 1,
            addedAt: 0,
          });
          return;
        }
        if (extraTiles.length > 0) {
          pendingAddRef.current = { tiles: extraTiles, addedAt: nextEnemy.length };
        }
        setTiles(nextEnemy);
        setPhase({ type: "sliding", offset: greenCount, initialOffset: greenCount });
        setTimeout(() => {
          setPhase({ type: "sliding", offset: greenCount - 1, initialOffset: greenCount });
        }, STEP_MS);
      },
      POP_DURATION + (greenCount - 1) * POP_STAGGER_MS,
    );
  }
  function getTileDuration() {
    if (phase.type === "adding") {
      const t = phase.offset / phase.initialOffset;
      return Math.round(40 + 100 * (1 - t) ** 8);
    }
    if (phase.type === "sliding") {
      const t = phase.offset / phase.initialOffset;
      return Math.round(40 + 40 * (1 - t) ** 2);
    }
    return 150;
  }
  const tileDuration = getTileDuration();

  const cursorVisible = phase.type === "idle" && matched.length < tiles.length;

  return (
    <div class="flex-1 flex flex-col -my-8">
      <div
        class="isolate relative mt-auto mx-auto"
        style={{ width: containerW, height: containerH }}
      >
        {tiles.map(({ id, letter }, index) => {
          const tileOffset =
            phase.type === "adding" && index < phase.addedAt ? 0 : (slideOffset ?? 0);
          const { x, y } = positions[index + tileOffset];
          const isPopping = poppingCount !== null && index < poppingCount;
          const isMatched = matched.includes(id);
          const isFirstMoving =
            (phase.type === "adding" && index === phase.addedAt) ||
            (phase.type === "sliding" && index === 0);
          return (
            <div
              key={id}
              onTransitionEnd={
                isFirstMoving
                  ? (e) => {
                    if (e.propertyName !== "transform") return;
                    if (phase.type === "sliding" && phase.offset === 0) {
                      const pending = pendingAddRef.current;
                      if (pending !== null) {
                        pendingAddRef.current = null;
                        setTiles((prev) => [...prev, ...pending.tiles]);
                        setPhase({
                          type: "adding",
                          offset: pending.tiles.length + 1,
                          initialOffset: pending.tiles.length + 1,
                          addedAt: pending.addedAt,
                        });
                      } else {
                        setPhase({ type: "idle" });
                      }
                    } else {
                      setPhase((prev) => {
                        if (prev.type !== "adding" && prev.type !== "sliding") return prev;
                        if (prev.offset === 0) return { type: "idle" };
                        return { ...prev, offset: prev.offset - 1 };
                      });
                    }
                  }
                  : undefined
              }
              style={{
                transform: `translate(${x}px, ${y}px)`,
                transition:
                  phase.type === "adding" && index < phase.addedAt
                    ? "none"
                    : `transform ${tileDuration}ms linear`,
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
                      isMatched
                        ? "fill-lime-300"
                        : candidates.includes(id)
                          ? "fill-orange-300"
                          : "fill-orange-200"
                    }
                    d="M50 0c43 0 50 7 50 50s-7 50-50 50S0 93 0 50 7 0 50 0"
                  />
                </svg>
                <div class="absolute inset-0 flex justify-center items-center font-bold text-2xl">
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
      <div class="opacity-0" style={{ animation: "fade-in 0.8s ease-out 1.5s forwards" }}>
        <div class="text-sm text-center pt-4 pb-2">
          <div class="bg-background">
            Type a word containing this letter.
            <div class="text-stone-500 whitespace-pre">Match more letters to clear faster.</div>
          </div>
        </div>
        <div class="relative">
          <input
            ref={inputRef}
            type="text"
            value={rawInput}
            onInput={(e) => {
              initAudio();
              prevMatchedCountRef.current = matched.length;
              setRawInput((e.target as HTMLInputElement).value.trim());
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
            class="absolute top-2 right-2 sm:(top-3 right-3) btn-orange rounded-md text-2xl h-10 px-3 font-bold"
            onClick={handleSubmit}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="w-6 h-6"
            >
              <path d="M20 4v7a4 4 0 0 1-4 4H4" />
              <path d="m9 10-5 5 5 5" />
            </svg>
          </button>
        </div>
        <div class="flex h-9 px-3 sm:px-4 py-2 gap-2 text-sm text-red-600" role="alert">
          <span>{errorMsg}</span>
          {errorMsg === "Not in word list" && (
            <button
              class="underline text-red-400 @hover:text-red-600"
              onClick={() => setReportWord(cleanInput)}
            >
              Report missing word
            </button>
          )}
        </div>
      </div>
      {reportWord !== null && <ReportModal word={reportWord} onClose={() => setReportWord(null)} />}
      {celebrating && <WordmongeringCelebration />}
    </div>
  );
}

async function playPop(delayMs: number, index: number) {
  if (!soundEnabled) return;
  if (!audioCtx) audioCtx = new AudioContext();
  const ctx = audioCtx;
  await ctx.resume();
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

async function playHorn() {
  if (!soundEnabled) return;
  if (!audioCtx) audioCtx = new AudioContext();
  const ctx = audioCtx;
  await ctx.resume();
  const t = ctx.currentTime;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(500, t);
  filter.Q.setValueAtTime(2, t);

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0, t);
  masterGain.gain.linearRampToValueAtTime(0.6, t + 0.1);
  masterGain.gain.exponentialRampToValueAtTime(0.001, t + 3.2);
  filter.connect(masterGain);
  masterGain.connect(ctx.destination);

  const osc1 = ctx.createOscillator();
  osc1.type = "sawtooth";
  osc1.frequency.setValueAtTime(65, t);
  osc1.connect(filter);
  osc1.start(t);
  osc1.stop(t + 3.2);

  const osc2 = ctx.createOscillator();
  osc2.type = "sawtooth";
  osc2.frequency.setValueAtTime(65, t);
  osc2.detune.setValueAtTime(8, t);
  osc2.connect(filter);
  osc2.start(t);
  osc2.stop(t + 3.2);

  const osc3 = ctx.createOscillator();
  osc3.type = "sawtooth";
  osc3.frequency.setValueAtTime(130, t);
  osc3.connect(filter);
  osc3.start(t);
  osc3.stop(t + 3.2);
}

function WordmongeringCelebration() {
  return (
    <div class="fixed inset-0 pointer-events-none z-50 flex items-center justify-center bg-black">
      <div class="font-serif">
        <div class="font-bold text-4xl sm:text-6xl text-orange-400 tracking-tight">
          wordmongering
        </div>
        <div class="text-stone-500 mt-1 sm:text-lg">/ˈwərd ˌməŋ·gər·iŋ/</div>
        <div class="mt-4 pt-4 border-t border-stone-800">
          <span class="italic text-stone-500">n.</span>
          <span class="text-stone-300 ml-2 sm:text-lg">Using more words than necessary</span>
        </div>
      </div>
    </div>
  );
}
