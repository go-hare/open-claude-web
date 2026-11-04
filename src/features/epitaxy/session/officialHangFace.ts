/**
 * Official shared-frame `Qk` (`_r` / c734 `ye`).
 * minMs default `Xk=650`; settleMs 250; restretch; line holds hang until busy keys change.
 */
import { useEffect, useReducer, useRef } from "react";

export const OFFICIAL_HANG_DEFAULT_MIN_MS = 650;
export const OFFICIAL_HANG_BUSY_BODY_MIN_MS = 2000;

type HangFace<T> = {
  armed: boolean;
  key: string;
  line?: string;
  value: T;
};

type HangAction<T> =
  | { armed: boolean; key: string; line?: string; type: "swap"; value: T }
  | { line?: string; type: "shown"; value: T };

function hangReducer<T>(state: HangFace<T>, action: HangAction<T>): HangFace<T> {
  if (action.type === "shown") {
    if (Object.is(action.value, state.value) && action.line === state.line) return state;
    return { ...state, line: action.line, value: action.value };
  }
  if (action.key === state.key) return state;
  return { armed: action.armed, key: action.key, line: action.line, value: action.value };
}

export function officialHangFaceKey(state: string, label: unknown) {
  if (typeof label !== "string") return `${state}|`;
  return `${state}|${label}`;
}

export function officialHangBusyLine(keys: string[] | undefined) {
  if (!keys || keys.length === 0) return undefined;
  return [...keys].sort().join("\0");
}

export function useOfficialHangFace<T>(
  value: T,
  key: string,
  options: {
    hangMark?: boolean;
    line?: string;
    minMs?: number | ((current: T) => number | undefined);
    restretch?: boolean;
    settleMs?: number;
  } = {},
): { hang: boolean; value: T } {
  const settleMs = options.settleMs ?? 0;
  const restretch = options.restretch === true;
  const line = options.line;
  const [shown, dispatch] = useReducer(hangReducer<T>, undefined, () => ({
    armed: false,
    key,
    line,
    value,
  }));
  const pendingRef = useRef({ line, value });
  const shownAtRef = useRef<{ at: number; key: string } | null>(null);
  const pendingAtRef = useRef<{ at: number; key: string } | null>(null);
  const pending = key !== shown.key;
  const minMsRaw = typeof options.minMs === "function" ? options.minMs(shown.value) : options.minMs;
  const minMs = minMsRaw ?? OFFICIAL_HANG_DEFAULT_MIN_MS;
  const armOnSwap = !(restretch && minMs === 0);

  if (pending && (minMs === 0 || (!shown.armed && settleMs === 0))) {
    dispatch({ armed: armOnSwap, key, line, type: "swap", value });
  }

  useEffect(() => {
    if (!pending) pendingRef.current = { line, value };
  }, [line, pending, value]);

  useEffect(() => {
    const next = pendingRef.current;
    if (pending && !(Object.is(shown.value, next.value) && shown.line === next.line)) {
      dispatch({ line: next.line, type: "shown", value: next.value });
    }
  }, [pending, shown.line, shown.value]);

  useEffect(() => {
    if (shownAtRef.current?.key !== shown.key) {
      shownAtRef.current = { at: performance.now(), key: shown.key };
    }
  }, [shown.key]);

  useEffect(() => {
    if (pending) {
      if (pendingAtRef.current?.key !== key) pendingAtRef.current = { at: performance.now(), key };
    } else {
      pendingAtRef.current = null;
    }
  }, [key, pending]);

  const sameLine = line !== undefined && line === shown.line;
  const holdMin = shown.armed && !sameLine;

  useEffect(() => {
    if (!pending) return undefined;
    const now = performance.now();
    const settleAt = (pendingAtRef.current?.at ?? now) + settleMs;
    const minAt = holdMin && shownAtRef.current !== null ? shownAtRef.current.at + minMs : now;
    const at = Math.max(settleAt, minAt);
    const swap = () => dispatch({ armed: armOnSwap, key, line, type: "swap", value });
    if (now >= at) {
      swap();
      return undefined;
    }
    const timer = window.setTimeout(swap, at - now);
    return () => window.clearTimeout(timer);
  }, [armOnSwap, holdMin, key, line, minMs, pending, settleMs, value]);

  const hangMark = options.hangMark === true;
  const hang = hangMark && pending;
  return { hang, value: pending ? shown.value : value };
}
