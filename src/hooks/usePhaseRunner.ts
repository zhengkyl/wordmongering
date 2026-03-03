import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

export type PhaseRunner<T> = {
  phase: T;
  setPhase: Dispatch<SetStateAction<T>>;
  isActiveRef: { current: boolean };
  /** Start a new phase. Cancels all pending timeouts from the previous phase. */
  enter: (newPhase: T) => void;
  /** Schedule a timeout tracked by this runner. Canceled automatically on next enter(). */
  after: (delay: number, fn: () => void) => void;
  /** Return to the exit phase. */
  exit: () => void;
};

export function usePhaseRunner<T>(exitPhase: T): PhaseRunner<T> {
  const [phase, setPhase] = useState<T>(exitPhase);
  const isActiveRef = useRef(false);
  const pendingRef = useRef<ReturnType<typeof window.setTimeout>[]>([]);

  useEffect(
    () => () => {
      pendingRef.current.forEach(clearTimeout);
    },
    [],
  );

  function enter(newPhase: T) {
    pendingRef.current.forEach(clearTimeout);
    pendingRef.current = [];
    setPhase(newPhase);
    isActiveRef.current = true;
  }

  function after(delay: number, fn: () => void) {
    pendingRef.current.push(window.setTimeout(fn, delay));
  }

  function exit() {
    setPhase(exitPhase);
    isActiveRef.current = false;
  }

  return { phase, setPhase, isActiveRef, enter, after, exit };
}
