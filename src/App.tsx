import { useEffect, useRef, useState } from "react";

const alphabet = "abcdefghijklmnopqrstuvwxyz";

type EnemyTile = { id: number; letter: string };

const POP_DURATION = 350;
const STEP_MS = 150;

// ── Shape system ────────────────────────────────────────────────────────────

type ShapeStep = { dx: number; dy: number };
type ShapeFunc = (index: number, total: number) => ShapeStep;

const TILE_PX = 48;
const SNAKE_COLS = 4;
const H_STEP = 52; // tile + 4px gap
const V_STEP = 68; // tile + 16px gap
const WAVE = 8;

const snakeShape: ShapeFunc = (index, _total) => {
  if (index === 0) return { dx: 0, dy: 0 };
  const colInRow = index % SNAKE_COLS;
  const row = Math.floor(index / SNAKE_COLS);
  const dir = row % 2 === 0 ? 1 : -1;
  if (colInRow === 0) return { dx: 0, dy: V_STEP - 2 * WAVE };
  const wave = colInRow === 1 || colInRow === SNAKE_COLS - 1 ? WAVE : 0;
  return { dx: dir * H_STEP, dy: wave };
};

const activeShape: ShapeFunc = snakeShape;

// ── Component ────────────────────────────────────────────────────────────────

export function App() {
  const dictionaryRef = useRef<Set<string> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const tileRefs = useRef<Map<number, HTMLElement>>(new Map());
  const tileRefCallbacks = useRef<Map<number, (el: HTMLElement | null) => void>>(new Map());

  function getTileRef(id: number) {
    let cb = tileRefCallbacks.current.get(id);
    if (!cb) {
      cb = (el) => {
        if (el) tileRefs.current.set(id, el);
        else tileRefs.current.delete(id);
      };
      tileRefCallbacks.current.set(id, cb);
    }
    return cb;
  }
  const [dictLoaded, setDictLoaded] = useState(false);

  const [enemy, setEnemy] = useState<EnemyTile[]>(
    (alphabet + alphabet).split("").map((letter, id) => ({ id, letter })),
  );

  const [input, setInput] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [poppingCount, setPoppingCount] = useState<number | null>(null);
  const [slideOffset, setSlideOffset] = useState<number | null>(null);

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
  const containerW = Math.max(0, ...positions.map((p) => p.x)) + TILE_PX;
  const containerH = Math.max(0, ...positions.map((p) => p.y)) + TILE_PX;

  function triggerError(msg: string) {
    setErrorMsg(msg);

    // NOTE: needs to happen after errorMsg rerender
    // otherwise desynced class is removed
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
      triggerError("No matching letters");
      return;
    }
    if (!dictionaryRef.current!.has(input.toLowerCase())) {
      triggerError("Not in dictionary");
      return;
    }

    const greenCount = greenTiles.size;
    const nextEnemy = enemy.filter(({ id }) => !greenTiles.has(id));

    setErrorMsg(null);
    setInput("");
    setPoppingCount(greenCount);

    setTimeout(() => {
      setPoppingCount(null);
      setEnemy(nextEnemy);
      setSlideOffset(greenCount);
      for (let step = 1; step <= greenCount; step++) {
        setTimeout(() => setSlideOffset(greenCount - step), STEP_MS * step);
      }
      setTimeout(() => setSlideOffset(null), STEP_MS * (greenCount + 1));
    }, POP_DURATION);
  }

  return (
    <div>
      <div class="flex gap-2 p-2">
        <div class="font-semibold">WORDMONGERING</div>
      </div>
      <div class="relative max-w-screen-sm m-auto pb-48">
        <div class="text-center p-4">Type a word containing this letter</div>
        <div class="relative m-auto" style={{ width: containerW, height: containerH }}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 31.5 62.2"
            class="absolute top-0 left-0 w-24px"
            style={{ transform: `translate(${positions[0].x - 32}px, ${positions[0].y - 18}px)` }}
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
                ref={getTileRef(id)}
                style={{
                  "--border-src": "var(--border1)",
                  transform: `translate(${x}px, ${y}px)`,
                  ...(slideOffset !== null && { transition: `transform ${STEP_MS}ms linear` }),
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
              class="sketchy-md inline-flex justify-center items-center px-3 bg-blue-500 text-white font-bold"
              onClick={handleSubmit}
            >
              <svg
                class="w-5 h-5 mr-1"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
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
                <button class="underline text-red-400 hover:text-red-600" onClick={() => {}}>
                  Report missing
                </button>
              )}
            </div>
            <button class="underline border-none">Settings</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function computeGreenTiles(
  enemy: EnemyTile[],
  input: string,
): { green: Set<number>; candidate: Set<number> } {
  const counts = new Map<string, number>();
  for (const c of input.toLowerCase()) {
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }

  const candidate = new Set<number>();
  for (const { id, letter } of enemy) {
    const count = counts.get(letter) ?? 0;
    if (count > 0) {
      candidate.add(id);
      counts.set(letter, count - 1);
    }
  }

  const green = new Set<number>();
  for (const { id } of enemy) {
    if (!candidate.has(id)) break;
    green.add(id);
  }

  return { green, candidate };
}

function cl(classList: (string | false | 0 | null | undefined)[]) {
  return classList.filter(Boolean).join(" ");
}
