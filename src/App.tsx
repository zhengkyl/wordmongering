import { PointerActivationConstraints, PointerSensor } from "@dnd-kit/dom";
import { DragDropProvider, DragOverlay, useDraggable, useDroppable } from "@dnd-kit/react";
import {
  useEffect,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { DeckDialog } from "./components/DeckDialog";
import { GameProvider, useGame } from "./components/GameContext";
import { usePhaseRunner, type PhaseRunner } from "./hooks/usePhaseRunner";
import { getCollapsedField, useSlots } from "./hooks/useSlots";
import { ALPHABET, type Deck } from "./lib/constants";
import { findBestPlays, RULES, validateWord } from "./lib/game";
import {
  createInitialState,
  gameReducer,
  getTile,
  tileLetters,
  type GameAction,
  type GameState,
  type PlayResult,
} from "./lib/gameState";
import { DISCARD, DRAW, getTileAnim, IDLE, SCORING, type ActivePhase } from "./lib/phases";
import { POWER_UPS, type PowerUpDef, type PowerUpId } from "./lib/powerups";
import { EndScreen } from "./screens/EndScreen";
import { Earnings } from "./screens/Earnings";
import { Shop } from "./screens/Shop";

// Only imported in dev — Rollup tree-shakes this out of production builds
// since it's only referenced inside `import.meta.env.DEV && ...`
import { DevMenu } from "./dev/DevMenu";

// --- Run-level types ---

export type RoundResult = { round: number; score: number; playsUsed: number; discardsUsed: number };
export type RunStats = { rounds: RoundResult[] };

type AppScreen = { type: "playing" } | { type: "earnings" } | { type: "shop" } | { type: "end"; won: boolean };

export function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialState);

  const { phase, setPhase, isActiveRef, enter, after, exit } = usePhaseRunner<ActivePhase>(IDLE);
  const slots = useSlots();

  // --- Screen routing ---
  const [screen, setScreen] = useState<AppScreen>({ type: "playing" });
  const [round, setRound] = useState(1);
  const [runStats, setRunStats] = useState<RunStats>({ rounds: [] });
  const [inventory, setInventory] = useState<PowerUpId[]>([]);
  const [pennies, setPennies] = useState(0);

  // --- Dictionary ---
  const dictionaryRef = useRef<Set<string> | null>(null);
  const [dictLoaded, setDictLoaded] = useState(false);

  useEffect(() => {
    fetch("/dictionary.txt")
      .then((r) => r.text())
      .then((text) => {
        dictionaryRef.current = new Set(text.split("\n"));
        setDictLoaded(true);
        console.log(`Dictionary loaded with ${dictionaryRef.current.size} words`);
      });
  }, []);

  // --- Hand-change effect: sync slots + trigger drawing phase ---
  // prevHandRef captures the hand before each dispatch so we can diff for newly drawn tiles.
  // On first render prevHandRef is empty, so all tiles are treated as new and animate in.
  const prevHandRef = useRef<string[]>([]);

  useEffect(() => {
    const prevHandSet = new Set(prevHandRef.current);
    const newTileIds = new Set(state.hand.filter((id) => !prevHandSet.has(id)));
    prevHandRef.current = state.hand;
    slots.reset(state.hand);

    if (newTileIds.size > 0) {
      const maxSlotIdx = state.hand.reduce(
        (max, id, i) => (newTileIds.has(id) ? Math.max(max, i) : max),
        0,
      );
      enter({ type: "drawing", newTileIds });
      after(maxSlotIdx * DRAW.STAGGER + DRAW.ANIM, exit);
    } else {
      exit();
    }
  }, [state.hand]);

  // --- Screen transition effect ---
  // Fires after animations complete (phase idle) to advance to shop or end screen.
  useEffect(() => {
    if (screen.type !== "playing") return;
    if (phase.type !== "idle") return;
    if (state.gamePhase === "round_complete") {
      const result = { round, score: state.score, playsUsed: RULES.playsLimit - state.playsLeft, discardsUsed: RULES.discardsLimit - state.discardsLeft };
      const newStats = { rounds: [...runStats.rounds, result] };
      setRunStats(newStats);
      setPennies((prev) => prev + 10 + 2 * state.playsLeft + state.discardsLeft);
      if (round >= RULES.rounds) {
        setScreen({ type: "end", won: true });
      } else {
        setScreen({ type: "earnings" });
      }
    } else if (state.gamePhase === "lost") {
      const result = { round, score: state.score, playsUsed: RULES.playsLimit - state.playsLeft, discardsUsed: RULES.discardsLimit - state.discardsLeft };
      const newStats = { rounds: [...runStats.rounds, result] };
      setRunStats(newStats);
      setScreen({ type: "end", won: false });
    }
  }, [phase.type, state.gamePhase]);

  // --- Run handlers ---

  const handleContinueToShop = () => setScreen({ type: "shop" });

  const handleNextRound = (acquired: PowerUpId | null, penniesSpent: number) => {
    if (acquired != null) setInventory((prev) => [...prev, acquired]);
    setPennies((prev) => prev - penniesSpent);
    prevHandRef.current = [];
    slots.clearSlots();
    dispatch({ type: "RESET" });
    setRound((r) => r + 1);
    setScreen({ type: "playing" });
  };

  const handlePlayAgain = () => {
    prevHandRef.current = [];
    slots.clearSlots();
    dispatch({ type: "RESET" });
    setRound(1);
    setRunStats({ rounds: [] });
    setPennies(0);
    setScreen({ type: "playing" });
  };

  return (
    <div class="h-dvh relative">
      {screen.type === "playing" && (
        <PlayingScreen
          gameState={state}
          dispatch={dispatch}
          runner={{ phase, setPhase, isActiveRef, enter, after, exit }}
          slots={slots}
          prevHandRef={prevHandRef}
          dictionaryRef={dictionaryRef}
          dictLoaded={dictLoaded}
          round={round}
          inventory={inventory}
        />
      )}
      {screen.type === "earnings" && (
        <Earnings round={round} stats={runStats} pennies={pennies} onContinue={handleContinueToShop} />
      )}
      {screen.type === "shop" && (
        <Shop pennies={pennies} onNextRound={handleNextRound} />
      )}
      {screen.type === "end" && (
        <EndScreen won={screen.won} stats={runStats} onPlayAgain={handlePlayAgain} />
      )}
      {import.meta.env.DEV && (
        <DevMenu
          dispatch={dispatch as any}
          gameState={state}
          enter={enter}
          exit={exit}
          onShuffle={slots.shuffleHand}
        />
      )}
    </div>
  );
}

// --- Playing screen ---

type PlayingScreenProps = {
  gameState: GameState;
  dispatch: Dispatch<GameAction>;
  runner: PhaseRunner<ActivePhase>;
  slots: ReturnType<typeof useSlots>;
  prevHandRef: MutableRefObject<string[]>;
  dictionaryRef: MutableRefObject<Set<string> | null>;
  dictLoaded: boolean;
  round: number;
  inventory: PowerUpId[];
};

function PlayingScreen({
  gameState,
  dispatch,
  runner,
  slots,
  prevHandRef,
  dictionaryRef,
  dictLoaded,
  round,
  inventory,
}: PlayingScreenProps) {
  const { phase, setPhase, isActiveRef, enter, after } = runner;

  // --- Suggestion state ---
  const [lastResult, setLastResult] = useState<PlayResult | null>(null);
  const [currentSuggestions, setCurrentSuggestions] = useState<string[]>([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [playedHandSuggestions, setPlayedHandSuggestions] = useState<string[]>([]);
  const [playedBest, setPlayedBest] = useState(false);

  useEffect(() => {
    if (!dictLoaded) return;
    setCurrentSuggestions(
      findBestPlays(tileLetters(gameState.deck, gameState.hand), dictionaryRef.current!),
    );
  }, [gameState.hand, dictLoaded]);

  // --- Phase handlers ---

  const startScoringPhase = (tileIds: string[], activePowerUps: PowerUpDef[]) => {
    const rawTiles = tileIds.map((id) => {
      const [letter] = getTile(gameState.deck, id);
      return { letter: letter as string, pts: ALPHABET[letter as keyof typeof ALPHABET].points };
    });

    // Pre-compute per-tile power-up chains: tilePtsChains[i] = [basePts, afterPu0, afterPu1, ...]
    const tilePtsChains = rawTiles.map((rawTile, i) => {
      const chain = [rawTile.pts];
      for (const pu of activePowerUps) {
        chain.push(
          pu.onTile({ letter: rawTile.letter, pts: chain[chain.length - 1] }, i, rawTiles),
        );
      }
      return chain;
    });

    // Pre-compute onEnd chain
    const tileTotal = tilePtsChains.reduce((s, chain) => s + chain[chain.length - 1], 0);
    const scoredTiles = rawTiles.map((t, i) => ({
      letter: t.letter,
      pts: tilePtsChains[i][tilePtsChains[i].length - 1],
    }));
    const endChain = [tileTotal];
    for (const pu of activePowerUps)
      endChain.push(pu.onEnd(endChain[endChain.length - 1], scoredTiles));
    const finalTotal = endChain[endChain.length - 1];

    const perTileDuration = Math.max(
      SCORING.TILE_ANIM - SCORING.TILE_OVERLAP,
      SCORING.PEAK_OFFSET + activePowerUps.length * SCORING.POWERUP_DISPLAY,
    );
    const tileAnimDelays = rawTiles.map((_, i) => `${i * perTileDuration}ms`);

    enter({ type: "scoring", tileIds, tileAnimDelays, step: null, runningTotal: 0 });

    rawTiles.forEach((_, i) => {
      const tileStart = i * perTileDuration;

      after(tileStart + SCORING.PEAK_OFFSET, () =>
        setPhase((p) =>
          p.type === "scoring"
            ? { ...p, step: { tileIndex: i, powerUpIndex: -1, pts: tilePtsChains[i][0] } }
            : p,
        ),
      );

      for (let j = 0; j < activePowerUps.length; j++) {
        after(tileStart + SCORING.PEAK_OFFSET + (j + 1) * SCORING.POWERUP_DISPLAY, () =>
          setPhase((p) =>
            p.type === "scoring"
              ? { ...p, step: { tileIndex: i, powerUpIndex: j, pts: tilePtsChains[i][j + 1] } }
              : p,
          ),
        );
      }

      after(tileStart + perTileDuration, () =>
        setPhase((p) =>
          p.type === "scoring"
            ? {
                ...p,
                step: null,
                runningTotal: p.runningTotal + tilePtsChains[i][tilePtsChains[i].length - 1],
              }
            : p,
        ),
      );
    });

    const endStart = rawTiles.length * perTileDuration + SCORING.POST_ANIM;

    for (let j = 0; j < activePowerUps.length; j++) {
      after(endStart + j * SCORING.POWERUP_DISPLAY, () =>
        setPhase((p) =>
          p.type === "scoring"
            ? { ...p, step: { tileIndex: tileIds.length, powerUpIndex: j, pts: endChain[j + 1] } }
            : p,
        ),
      );
    }

    after(endStart + activePowerUps.length * SCORING.POWERUP_DISPLAY + SCORING.POST_ANIM, () => {
      prevHandRef.current = gameState.hand;
      const word = rawTiles.map((t) => t.letter).join("");
      setLastResult({ valid: true, word, pts: finalTotal });
      dispatch({ type: "PLAY", tileIds, pts: finalTotal });
      const willContinue =
        gameState.score + finalTotal < RULES.targetScore && gameState.playsLeft - 1 > 0;
      if (willContinue) dispatch({ type: "DRAW", count: tileIds.length });
    });
  };

  const handleDiscard = () => {
    const fieldTileIds = slots.fieldSlots.filter((id) => id != null) as string[];
    setLastResult(null);
    setPlayedHandSuggestions([]);
    setPlayedBest(false);
    if (fieldTileIds.length === 0) return;
    prevHandRef.current = gameState.hand;
    enter({ type: "discarding", tileIds: fieldTileIds });
    after(DISCARD.FALL_ANIM, () => dispatch({ type: "DISCARD", tileIds: fieldTileIds }));
  };

  const handlePlay = () => {
    const tileIds = slots.fieldSlots.filter((id) => id != null) as string[];
    if (tileIds.length === 0) return;
    const letters = tileLetters(gameState.deck, tileIds);
    const word = letters.join("");
    setPlayedBest(currentSuggestions.includes(word));
    setPlayedHandSuggestions(currentSuggestions);
    setSuggestionIndex(Math.floor(Math.random() * currentSuggestions.length));

    if (!validateWord(word, dictionaryRef.current!)) {
      setLastResult({ valid: false, word, pts: 0 });
      return;
    }

    const activePowerUps = inventory.map((id) => POWER_UPS[id]);
    startScoringPhase(tileIds, activePowerUps);
  };

  // --- Keyboard handler ---
  const allowedLetters = /^[A-Z]$/;
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isActiveRef.current) return;

      const letterKey = e.key.toUpperCase();

      if (allowedLetters.test(letterKey) && !e.ctrlKey && !e.metaKey) {
        const handIndex = slots.handSlots.findIndex((tileId) => {
          if (tileId == null) return false;
          const [letter] = getTile(gameState.deck, tileId);
          return letter === letterKey;
        });
        if (handIndex === -1) return;
        slots.handToLastField(slots.handSlots[handIndex]!, handIndex);
        e.preventDefault();
        return;
      }

      switch (e.key) {
        case "Enter": {
          handlePlay();
          break;
        }
        case "Backspace": {
          if (e.ctrlKey) {
            slots.clearField();
          } else {
            for (let i = slots.fieldSlots.length - 1; i >= 0; i--) {
              if (slots.fieldSlots[i] != null) {
                slots.fieldToHand(slots.fieldSlots[i]!, i);
                break;
              }
            }
          }
          break;
        }
        default:
          return;
      }

      e.preventDefault();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [slots.handSlots]);

  const dragStartTime = useRef(0);
  const [shouldAnimateOverlay, setShouldAnimateOverlay] = useState(false);

  return (
    <div class="h-full grid [grid-template-rows:auto_auto_1fr_auto]">
      <ScoreBar score={gameState.score} playsLeft={gameState.playsLeft} discardsLeft={gameState.discardsLeft} round={round} />
      <ResultBanner
        phase={phase}
        lastResult={lastResult}
        playedBest={playedBest}
        playedHandSuggestions={playedHandSuggestions}
        suggestionIndex={suggestionIndex}
      />
      <DragDropProvider
        sensors={(defaults) => [
          ...defaults,
          PointerSensor.configure({
            activationConstraints(event, _source) {
              const { pointerType, target: _ } = event;

              switch (pointerType) {
                case "mouse":
                  return [new PointerActivationConstraints.Distance({ value: 10 })];
                case "touch":
                  return [new PointerActivationConstraints.Delay({ value: 250, tolerance: 5 })];
                default:
                  return [
                    new PointerActivationConstraints.Delay({ value: 200, tolerance: 10 }),
                    new PointerActivationConstraints.Distance({ value: 5 }),
                  ];
              }
            },
          }),
        ]}
        onDragStart={() => (dragStartTime.current = performance.now())}
        onDragEnd={(event) => {
          if (event.canceled) return;
          if (isActiveRef.current) return;

          const { operation } = event;

          const tileId = operation.source!.id as string;
          const fieldIndex = slots.fieldSlots.findIndex((id) => id === tileId);
          const from = fieldIndex === -1 ? "hand" : "field";

          const isBuggedDrag = operation.transform.x === 0 && operation.transform.y === 0;
          if (isBuggedDrag && (operation.activatorEvent as any).pointerType !== "mouse") {
            return;
          }

          if (isBuggedDrag || performance.now() - dragStartTime.current < 50) {
            setShouldAnimateOverlay(false);
            if (from === "field") {
              slots.fieldToHand(tileId, fieldIndex);
            } else {
              const handIndex = slots.handSlots.findIndex((id) => id === tileId);
              slots.handToFirstField(tileId, handIndex);
            }
            return;
          }

          if (!operation.target) {
            if (from === "field") {
              setShouldAnimateOverlay(false);
              slots.fieldToHand(tileId, fieldIndex);
            }
            return;
          }

          setShouldAnimateOverlay(true);

          const toIndex = parseInt((operation.target.id as string).split("_")[1]);

          if (from === "field") {
            slots.setFieldSlots((prev) => {
              const next = prev.slice();
              next[fieldIndex] = null;
              next[toIndex] = tileId;
              return getCollapsedField(next, fieldIndex);
            });
          } else {
            const handIndex = slots.handSlots.findIndex((id) => id === tileId);
            slots.setHandSlots((prev) => prev.map((id, i) => (i === handIndex ? null : id)));
            slots.setFieldSlots((prev) => prev.map((id, i) => (i === toIndex ? tileId : id)));
          }
        }}
      >
        <GameProvider
          deck={gameState.deck}
          phase={phase}
          drawPile={gameState.drawPile}
          fieldSlots={slots.fieldSlots}
          handSlots={slots.handSlots}
          fieldToHand={slots.fieldToHand}
          handToFirstField={slots.handToFirstField}
          handToLastField={slots.handToLastField}
          disabled={phase.type !== "idle"}
          discardsLeft={gameState.discardsLeft}
          onShuffle={slots.shuffleHand}
          onDiscard={handleDiscard}
          onPlay={handlePlay}
        >
          <FieldGrid />
          <HandGrid />
        </GameProvider>
        {/* TODO dragoverlay only renders one things at a time, so "drops" while still animating are not animated */}
        <DragOverlay dropAnimation={shouldAnimateOverlay ? undefined : null}>
          {(source) => {
            const [letter] = getTile(gameState.deck, source.id as string);
            return <Tile letter={letter} />;
          }}
        </DragOverlay>
      </DragDropProvider>
    </div>
  );
}

// --- Shared slot/tile primitives ---

const SLOT_CLASS =
  "flex-1 aspect-square rounded-lg border transition-shadow ease-out bg-stone-200 data-[drop-target=true]:(ring ring-4 ring-blue-500 shadow-xl shadow-inset)";

function FieldSlot({
  id,
  disabled,
  children,
}: {
  id: string;
  disabled?: boolean;
  children?: ReactNode;
}) {
  const droppable = useDroppable({ id, disabled });
  return (
    <div ref={droppable.ref} class={SLOT_CLASS} data-drop-target={droppable.isDropTarget}>
      {children}
    </div>
  );
}

function HandSlot({ children }: { children?: ReactNode }) {
  return <div class={SLOT_CLASS}>{children}</div>;
}

const TILE_CLASS =
  "[container-type:inline-size] font-mono h-full rounded-lg border font-bold text-stone-800 text-3xl sm:(text-6xl) flex justify-center items-center bg-neutral-50 select-none touch-none";

function SortableTile({
  id,
  anim,
  animDelay,
  onClick,
}: {
  id: string;
  anim?: string;
  animDelay?: string;
  onClick?: () => void;
}) {
  const { deck } = useGame();
  const [letter] = getTile(deck, id);
  const { ref, isDragging, isDropping } = useDraggable({ id, disabled: anim != null });
  return (
    <div
      ref={ref}
      class={TILE_CLASS}
      data-anim={anim}
      style={{ opacity: isDragging || isDropping ? 0 : undefined, animationDelay: animDelay }}
      onClick={onClick}
    >
      <span class="[font-size:60cqw]">{letter}</span>
    </div>
  );
}

function Tile({ letter }: { letter: keyof Deck }) {
  return <div class={TILE_CLASS}>{letter}</div>;
}

const BUTTON_CLASS =
  "rounded-lg border-2 font-semibold transition-colors disabled:(opacity-50 cursor-not-allowed)";
const PRIMARY = "border-stone-800 bg-stone-800 text-white @hover:bg-stone-700";
const SECONDARY = "border-stone-300 bg-white text-stone-600 @hover:bg-stone-50";

// --- Extracted components ---

function ScoreBar({
  score,
  playsLeft,
  discardsLeft,
  round,
}: {
  score: number;
  playsLeft: number;
  discardsLeft: number;
  round: number;
}) {
  return (
    <div
      data-anim="scorebar-intro"
      class="bg-stone-100 relative before:(content-[''] absolute inset-0 bg-rose-300 w-[var(--p)] transition-[width] duration-700)"
      style={{ "--p": `${Math.min((score / RULES.targetScore) * 100, 100)}%` } as any}
    >
      <div class="relative h-10 flex items-center justify-center gap-8 px-4 font-bold">
        <span>
          Round {round} / {RULES.rounds}
        </span>
        <span>
          Score: {score} / {RULES.targetScore}
        </span>
        <span>Plays left: {playsLeft}</span>
        <span>Discards left: {discardsLeft}</span>
      </div>
    </div>
  );
}

function ResultBanner({
  phase,
  lastResult,
  playedBest,
  playedHandSuggestions,
  suggestionIndex,
}: {
  phase: ActivePhase;
  lastResult: PlayResult | null;
  playedBest: boolean;
  playedHandSuggestions: string[];
  suggestionIndex: number;
}) {
  return (
    <div class="h-12 flex flex-col items-center justify-center font-semibold gap-1">
      {
        phase.type === "scoring" ? (
          <span class="text-green-600">
            {phase.runningTotal > 0 ? `+${phase.runningTotal}` : ""}
            {phase.step != null
              ? phase.step.tileIndex < phase.tileIds.length
                ? ` [+${phase.step.pts}]`
                : ` [end: +${phase.step.pts - phase.runningTotal}]`
              : ""}
          </span>
        ) : phase.type === "idle" ? (
          <>
            {lastResult && (
              <span
                class={
                  lastResult.valid
                    ? playedBest
                      ? "text-yellow-500"
                      : "text-green-600"
                    : "text-red-600"
                }
              >
                {lastResult.valid
                  ? `${lastResult.word} +${lastResult.pts} pts${playedBest ? " — best play!" : ""}`
                  : `${lastResult.word} — not a word`}
              </span>
            )}
            {playedHandSuggestions[0] && lastResult != null && lastResult.valid && !playedBest && (
              <span class="text-stone-400 text-sm font-normal">
                Could have played: {playedHandSuggestions[suggestionIndex]}
              </span>
            )}
          </>
        ) : null /* discarding, drawing, future phases: silent */
      }
    </div>
  );
}

function FieldGrid() {
  const { fieldSlots, fieldToHand, phase } = useGame();
  return (
    <div class="mx-auto w-full max-w-[calc(600px+(600px-2rem+0.5rem)/3)] p-4 grid grid-cols-8 gap-2 max-w-[calc(600px+(600px+1rem)/4)]) content-center">
      {fieldSlots.map((tileId, i) => (
        <FieldSlot key={i} id={`field_${i}`} disabled={tileId != null}>
          {tileId != null && (
            <SortableTile
              key={tileId}
              id={tileId}
              {...getTileAnim(phase, tileId, i)}
              onClick={() => fieldToHand(tileId, i)}
            />
          )}
        </FieldSlot>
      ))}
    </div>
  );
}

function HandGrid() {
  const { handSlots, handToFirstField, phase, disabled, discardsLeft, onShuffle, onDiscard, onPlay } = useGame();
  return (
    <div class="mx-auto w-full max-w-[600px] p-4 grid grid-cols-6 grid-rows-6 sm:grid-rows-5 gap-2">
      <div class="grid grid-cols-subgrid [grid-column:2/6] grid-rows-subgrid [grid-row:1/5]">
        {handSlots.map((tileId, i) => (
          <HandSlot key={i}>
            {tileId != null && (
              <SortableTile
                key={tileId}
                id={tileId}
                {...getTileAnim(phase, tileId, i)}
                onClick={() => handToFirstField(tileId, i)}
              />
            )}
          </HandSlot>
        ))}
      </div>
      <div class="grid grid-cols-subgrid [grid-column:1/7] grid-rows-subgrid [grid-row:5/7]">
        <button
          class={`${BUTTON_CLASS} ${SECONDARY} [grid-column:2/span_2] [grid-row-start:2] sm:([grid-column:initial] [grid-row:initial])`}
          disabled={disabled}
          onClick={onShuffle}
        >
          <div>Shuffle</div>
        </button>
        <button
          class={`${BUTTON_CLASS} ${PRIMARY} [grid-column:2/span_2]`}
          disabled={disabled || discardsLeft === 0}
          onClick={onDiscard}
        >
          <div>Discard</div>
        </button>
        <button
          class={`${BUTTON_CLASS} ${PRIMARY} [grid-column:span_2]`}
          disabled={disabled}
          onClick={onPlay}
        >
          <div>Play</div>
        </button>
        <DeckDialog />
      </div>
    </div>
  );
}
