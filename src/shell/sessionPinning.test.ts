import { describe, expect, it } from "vitest";
import type { SessionSummary } from "../adapters/desktopBridge";
import {
  isPinnedSession,
  orderPinnedSessions,
  pinSession,
  sessionPinKey,
  unpinSession,
} from "./sessionPinning";

function session(partial: Partial<SessionSummary> & Pick<SessionSummary, "id" | "kind">): SessionSummary {
  return {
    title: partial.title ?? "t",
    createdAtMs: 0,
    updatedAt: "",
    updatedAtMs: 0,
    sessionKind: partial.sessionKind,
    isPinned: partial.isPinned,
    ...partial,
  } as SessionSummary;
}

describe("sessionPinKey (shared code/cowork)", () => {
  it("maps epitaxy kind to cowork key", () => {
    expect(sessionPinKey(session({ id: "a", kind: "epitaxy" }))).toBe("cowork:a");
  });

  it("maps sessionKind cowork over raw kind", () => {
    expect(sessionPinKey(session({ id: "b", kind: "epitaxy", sessionKind: "cowork" }))).toBe("cowork:b");
  });

  it("maps code sessions to code key", () => {
    expect(sessionPinKey(session({ id: "c", kind: "code", sessionKind: "code" }))).toBe("code:c");
  });

  it("pin/unpin normalizes legacy epitaxy keys", () => {
    const s = session({ id: "x", kind: "epitaxy", sessionKind: "cowork" });
    const pinned = pinSession(s, ["epitaxy:x", "code:other"]);
    expect(pinned).toEqual(["cowork:x", "code:other"]);
    expect(isPinnedSession(s, ["epitaxy:x"])).toBe(true);
    expect(unpinSession(s, ["epitaxy:x", "cowork:x", "code:other"])).toEqual(["code:other"]);
  });

  it("orderPinnedSessions resolves legacy epitaxy keys", () => {
    const s = session({ id: "x", kind: "epitaxy" });
    const ordered = orderPinnedSessions([s], ["epitaxy:x"]);
    expect(ordered.map((item) => item.id)).toEqual(["x"]);
  });

  it("orderPinnedSessions drops archived sessions (including isPinned fallback)", () => {
    const active = session({ id: "a", kind: "code", sessionKind: "code" });
    const archivedPinned = session({ id: "b", kind: "code", sessionKind: "code", isArchived: true, isPinned: true });
    const ordered = orderPinnedSessions(
      [active, archivedPinned],
      ["code:a", "code:b"],
    );
    expect(ordered.map((item) => item.id)).toEqual(["a"]);
  });

  it("isPinnedSession is false for archived even if pin key remains", () => {
    const archived = session({ id: "b", kind: "code", sessionKind: "code", isArchived: true, isPinned: true });
    expect(isPinnedSession(archived, ["code:b"])).toBe(false);
  });
});
