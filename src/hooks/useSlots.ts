import { useState } from "react";
import { RULES } from "../lib/game";
import { fill, shuffleInPlace } from "../lib/utils";

function lastEmptyStart(array: any[]) {
  let lastFilled = array.length - 1;
  for (; lastFilled >= 0; lastFilled--) {
    if (array[lastFilled] != null) {
      break;
    }
  }
  return lastFilled + 1;
}
function firstEmptyStart(array: any[]) {
  let i = 0;
  for (; i < array.length; i++) {
    if (array[i] == null) {
      break;
    }
  }
  return i;
}

export function getCollapsedField(
  next: (string | null)[],
  removedIndex: number,
): (string | null)[] {
  const row = Math.floor(removedIndex / RULES.rowLen);
  const rows = next.length / RULES.rowLen;

  if (rows > 1) {
    if (row === 0) {
      let numEmpty = 0;
      for (; numEmpty < next.length; numEmpty++) {
        if (next[numEmpty] != null) break;
      }
      const emptyRows = Math.floor(numEmpty / RULES.rowLen);
      const trimRows = Math.min(emptyRows, rows - 1);
      if (trimRows) return next.slice(trimRows * RULES.rowLen);
    } else if (row === rows - 1) {
      const nonEmptyRows = Math.ceil(lastEmptyStart(next) / RULES.rowLen);
      const keepRows = Math.max(nonEmptyRows, 1);
      if (keepRows < rows) return next.slice(0, keepRows * RULES.rowLen);
    }
  }
  return next;
}

export function useSlots() {
  const [fieldSlots, setFieldSlots] = useState<(string | null)[]>(fill(null, RULES.rowLen));
  const [handSlots, setHandSlots] = useState<(string | null)[]>(fill(null, RULES.handSize));

  function reset(hand: string[]) {
    setFieldSlots(fill(null, RULES.rowLen));
    setHandSlots((prev) => {
      const drawn = hand.filter((id) => !prev.includes(id));
      let i = 0;
      return prev.map((id) => (id == null ? drawn[i++] : id));
    });
  }

  function fieldToHand(tileId: string, fieldIndex: number) {
    setFieldSlots((_prev) => {
      const next = _prev.slice();
      next[fieldIndex] = null;
      return getCollapsedField(next, fieldIndex);
    });
    setHandSlots((_prev) => {
      const next = _prev.slice();
      const emptyIdx = next.findIndex((id) => id == null);
      next[emptyIdx] = tileId;
      return next;
    });
  }

  function handToLastField(tileId: string, handIndex: number) {
    setHandSlots((_prev) => {
      const next = _prev.slice();
      next[handIndex] = null;
      return next;
    });
    setFieldSlots((_prev) => {
      const next = _prev.slice();

      if (next.length < RULES.maxRows * RULES.rowLen) {
        const i = lastEmptyStart(next);
        if (i === next.length) next.push(...fill(null, RULES.rowLen));
        next[i] = tileId;
      } else {
        const i = firstEmptyStart(next);
        next[i] = tileId;
      }

      return next;
    });
  }
  function handToFirstField(tileId: string, handIndex: number) {
    setHandSlots((_prev) => {
      const next = _prev.slice();
      next[handIndex] = null;
      return next;
    });
    setFieldSlots((_prev) => {
      const next = _prev.slice();
      const i = firstEmptyStart(next);
      if (i === next.length) next.push(...fill(null, RULES.rowLen));
      next[i] = tileId;
      return next;
    });
  }

  function clearField() {
    const returnTiles = fieldSlots.filter((s) => s != null) as string[];
    if (!returnTiles.length) return;

    setFieldSlots(fill(null, RULES.rowLen));
    setHandSlots((_prev) => {
      const next = _prev.slice();
      for (let i = 0; i < next.length; i++) {
        if (next[i] == null) next[i] = returnTiles.pop()!;
      }
      return next;
    });
  }

  function clearSlots() {
    setFieldSlots(fill(null, RULES.rowLen));
    setHandSlots(fill(null, RULES.handSize));
  }

  function shuffleHand() {
    setHandSlots((_prev) => {
      const handTiles = _prev.filter((id) => id != null) as string[];
      shuffleInPlace(handTiles);
      let i = 0;
      return _prev.map((id) => (id != null ? handTiles[i++] : null));
    });
  }

  return {
    fieldSlots,
    handSlots,
    setFieldSlots,
    setHandSlots,
    reset,
    clearSlots,
    fieldToHand,
    handToFirstField,
    handToLastField,
    clearField,
    shuffleHand,
  };
}
