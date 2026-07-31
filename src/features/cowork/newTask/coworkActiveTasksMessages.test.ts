import { afterEach, describe, expect, it, vi } from "vitest";
import {
  COWORK_ACTIVE_READ_STATE_KEY,
  COWORK_ACTIVE_READ_STATE_LEGACY_KEY,
  clearCoworkActiveReadState,
  isCoworkSessionUnreadForOverview,
  readCoworkActiveReadState,
  writeCoworkActiveReadState,
} from "./coworkActiveTasksMessages";

const memory = new Map<string, string>();

afterEach(() => {
  memory.clear();
  vi.unstubAllGlobals();
});

function stubStorage() {
  const storage = {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
    removeItem: (key: string) => {
      memory.delete(key);
    },
  };
  vi.stubGlobal("window", { localStorage: storage });
  vi.stubGlobal("localStorage", storage);
}

describe("cowork-read-state residual (GSe)", () => {
  it("seeds initializedAt=now on first read so historical sessions are not all active", () => {
    stubStorage();
    const before = Date.now();
    const state = readCoworkActiveReadState();
    const after = Date.now();
    expect(state.sessions).toEqual({});
    expect(state.initializedAt).toBeGreaterThanOrEqual(before);
    expect(state.initializedAt).toBeLessThanOrEqual(after);
    expect(memory.get(COWORK_ACTIVE_READ_STATE_KEY)).toBeTruthy();
    // Re-read is stable.
    expect(readCoworkActiveReadState().initializedAt).toBe(state.initializedAt);
  });

  it("rejects product legacy initializedAt:0 which flooded the overview", () => {
    stubStorage();
    memory.set(
      COWORK_ACTIVE_READ_STATE_LEGACY_KEY,
      JSON.stringify({ initializedAt: 0, sessions: { old: 1 } }),
    );
    const state = readCoworkActiveReadState();
    expect(state.initializedAt).toBeGreaterThan(0);
    expect(state.sessions).toEqual({});
  });

  it("migrates valid legacy key into official cowork-read-state", () => {
    stubStorage();
    const legacy = { initializedAt: 1_700_000_000_000, sessions: { s1: 1_700_000_000_100 } };
    memory.set(COWORK_ACTIVE_READ_STATE_LEGACY_KEY, JSON.stringify(legacy));
    const state = readCoworkActiveReadState();
    expect(state).toEqual(legacy);
    expect(JSON.parse(memory.get(COWORK_ACTIVE_READ_STATE_KEY)!)).toEqual(legacy);
    expect(memory.has(COWORK_ACTIVE_READ_STATE_LEGACY_KEY)).toBe(false);
  });

  it("clear resets watermark to now (official p6t Clear active)", () => {
    stubStorage();
    writeCoworkActiveReadState({
      initializedAt: 1,
      sessions: { a: 2 },
    });
    const before = Date.now();
    const next = clearCoworkActiveReadState();
    expect(next.sessions).toEqual({});
    expect(next.initializedAt).toBeGreaterThanOrEqual(before);
  });

  it("YSe: activity before initializedAt is not unread", () => {
    const readState = { initializedAt: 1_000, sessions: {} as Record<string, number> };
    expect(
      isCoworkSessionUnreadForOverview({ id: "s", updatedAtMs: 500, createdAtMs: 400 }, readState),
    ).toBe(false);
    expect(
      isCoworkSessionUnreadForOverview({ id: "s", updatedAtMs: 1_500, createdAtMs: 400 }, readState),
    ).toBe(true);
    expect(
      isCoworkSessionUnreadForOverview(
        { id: "s", updatedAtMs: 1_200, createdAtMs: 400 },
        { initializedAt: 1_000, sessions: { s: 1_300 } },
      ),
    ).toBe(false);
  });
});
