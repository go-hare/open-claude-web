/**
 * Residual warm A→B hot-switch (c119 Ja / index openSession a?.sub):
 * - Warm bucket (messages.length>0 && !isTranscriptPending) must NOT enter Ja
 *   (isLoading = D && Ya.length===0 && (B||J)).
 * - ensureBucket idle empty must NOT invent pending Ja on missing bucket.
 * - Cold first fetch still uses markLoading → B/J true so Ja paints (not li).
 * No invent key={sessionId} / restoreKey — residual Xb stays mounted and re-renders Ya.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  emptyOfficialCodeSessionBucket,
  officialCodeSessionStore,
} from "./officialCodeSessionStore";

function residualIsLoading(input: {
  sessionId?: string;
  entriesLength: number;
  isTranscriptPending: boolean;
  isMetaPending: boolean;
}) {
  // Residual Ja: Boolean(D) && 0===Ya.length && (B||J)
  return Boolean(input.sessionId)
    && input.entriesLength === 0
    && (input.isTranscriptPending || input.isMetaPending);
}

function hasWarmTranscript(sessionId: string) {
  const existing = officialCodeSessionStore.getState().buckets[sessionId];
  return Boolean(
    existing
    && existing.messages.length > 0
    && !existing.isTranscriptPending,
  );
}

describe("official Code warm session switch (residual A→B)", () => {
  beforeEach(() => {
    officialCodeSessionStore.setState({ buckets: {} });
  });

  it("warm B with durable messages skips Ja (isLoading false)", () => {
    officialCodeSessionStore.getState().openSession(
      "b",
      {
        id: "b",
        title: "warm",
        cwd: "/",
        createdAt: 0,
        updatedAt: 0,
        isRunning: false,
      } as never,
      [
        {
          id: "m1",
          role: "user",
          text: "hi",
          createdAt: 0,
        } as never,
      ],
    );

    const bucket = officialCodeSessionStore.getState().buckets.b!;
    expect(hasWarmTranscript("b")).toBe(true);
    expect(bucket.isTranscriptPending).toBe(false);
    expect(bucket.isMetaPending).toBe(false);
    // Ya non-empty → Ja false even if flags were true
    expect(
      residualIsLoading({
        sessionId: "b",
        entriesLength: 1,
        isTranscriptPending: bucket.isTranscriptPending,
        isMetaPending: bucket.isMetaPending,
      }),
    ).toBe(false);
  });

  it("ensureBucket missing id is idle empty — not invent pending Ja", () => {
    const created = officialCodeSessionStore.getState().ensureBucket("cold");
    expect(created.isTranscriptPending).toBe(false);
    expect(created.isMetaPending).toBe(false);
    expect(created.messages).toEqual([]);
    // Residual missing he.buckets[id] → idle empty; product EMPTY_BUCKET_IDLE same.
    // isLoading stays false until markLoading sets B (useLayoutEffect before paint).
    expect(
      residualIsLoading({
        sessionId: "cold",
        entriesLength: 0,
        isTranscriptPending: created.isTranscriptPending,
        isMetaPending: created.isMetaPending,
      }),
    ).toBe(false);
  });

  it("cold markLoading sets B so Ja formula is true while Ya empty", () => {
    officialCodeSessionStore.getState().ensureBucket("cold");
    officialCodeSessionStore.getState().markLoading("cold", false);
    const bucket = officialCodeSessionStore.getState().buckets.cold!;
    expect(bucket.isTranscriptPending).toBe(true);
    expect(
      residualIsLoading({
        sessionId: "cold",
        entriesLength: 0,
        isTranscriptPending: bucket.isTranscriptPending,
        isMetaPending: bucket.isMetaPending,
      }),
    ).toBe(true);
  });

  it("warm openSession re-entry with messages keeps B false (no invent pending)", () => {
    officialCodeSessionStore.getState().openSession(
      "a",
      { id: "a", title: "a", cwd: "/", createdAt: 0, updatedAt: 0, isRunning: false } as never,
      [{ id: "u1", role: "user", text: "a", createdAt: 0 } as never],
    );
    // Re-open meta only (Recents path) must not resurrect B when messages already warm.
    officialCodeSessionStore.getState().openSession(
      "a",
      { id: "a", title: "a2", cwd: "/", createdAt: 0, updatedAt: 1, isRunning: false } as never,
    );
    const bucket = officialCodeSessionStore.getState().buckets.a!;
    expect(bucket.messages.length).toBe(1);
    expect(bucket.isTranscriptPending).toBe(false);
    expect(hasWarmTranscript("a")).toBe(true);
  });

  it("EMPTY idle bucket shape matches ensureBucket invent-ban", () => {
    const idle = emptyOfficialCodeSessionBucket(false);
    const pending = emptyOfficialCodeSessionBucket(true);
    expect(idle.isTranscriptPending).toBe(false);
    expect(pending.isTranscriptPending).toBe(true);
  });
});
