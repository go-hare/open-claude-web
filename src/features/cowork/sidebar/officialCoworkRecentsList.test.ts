import { describe, expect, it, beforeEach, vi } from "vitest";
import type { SessionSummary } from "../../../adapters/desktopBridge/types";

const clearCachesMock = vi.fn();
vi.mock("../session/coworkSessionDeletion", () => ({
  clearCoworkSessionCaches: (...args: unknown[]) => clearCachesMock(...args),
}));

import {
  applyOfficialCoworkRecentsListEvent,
  officialCoworkRecentsClearTombstonesForTests,
  officialCoworkRecentsMarkArchived,
  officialCoworkRecentsRemove,
  officialCoworkRecentsUpsert,
  toCoworkListRow,
} from "./officialCoworkRecentsList";

function row(partial: Partial<SessionSummary> & Pick<SessionSummary, "id" | "title">): SessionSummary {
  return {
    kind: "epitaxy",
    sessionKind: "cowork",
    updatedAt: "",
    updatedAtMs: 1,
    isArchived: false,
    isRunning: false,
    ...partial,
  };
}

describe("officialCoworkRecentsList (BELz Q5 / e6 / n6)", () => {
  beforeEach(() => {
    officialCoworkRecentsClearTombstonesForTests();
    clearCachesMock.mockReset();
  });

  it("e6 upsert replaces changed row and keeps identity when deep-equal", () => {
    const a = row({ id: "a", title: "A", isRunning: true, cwd: "/tmp" });
    const list = [a];
    const same = officialCoworkRecentsUpsert(list, { ...a, cwd: "/tmp" });
    expect(same).toBe(list);
    const next = officialCoworkRecentsUpsert(list, { ...a, title: "B" });
    expect(next).not.toBe(list);
    expect(next[0].title).toBe("B");
  });

  it("e6 skips upsert while X5 tombstone (archived/deleted)", () => {
    const list = [row({ id: "a", title: "A" })];
    const afterArchive = officialCoworkRecentsMarkArchived(list, "a");
    expect(afterArchive[0].isArchived).toBe(true);
    const skipped = officialCoworkRecentsUpsert(afterArchive, row({ id: "a", title: "Z", isRunning: true }));
    expect(skipped).toBe(afterArchive);
  });

  it("Q5 archived only sets isArchived — does not invent Dve hasWorktree clear", () => {
    const list = [row({ id: "a", title: "A", hasWorktree: true, isPinned: true })];
    const afterArchive = officialCoworkRecentsMarkArchived(list, "a");
    expect(afterArchive[0].isArchived).toBe(true);
    expect(afterArchive[0].hasWorktree).toBe(true);
    expect(afterArchive[0].isPinned).toBe(true);
  });

  it("n6 deleted removes and tombstones", () => {
    const list = [row({ id: "a", title: "A" }), row({ id: "b", title: "B" })];
    const next = officialCoworkRecentsRemove(list, "a");
    expect(next.map((s) => s.id)).toEqual(["b"]);
    const again = officialCoworkRecentsRemove(next, "a");
    expect(again).toBe(next);
  });

  it("n6 ignores message / stream_event", () => {
    let sessions = [row({ id: "a", title: "A", isRunning: false })];
    const setSessions = (updater: (current: SessionSummary[]) => SessionSummary[]) => {
      sessions = updater(sessions);
    };
    expect(applyOfficialCoworkRecentsListEvent(
      { type: "message", sessionId: "a", message: { type: "assistant" } },
      setSessions,
      async () => null,
      () => undefined,
    )).toBe(false);
    expect(applyOfficialCoworkRecentsListEvent(
      { type: "stream_event", sessionId: "a" },
      setSessions,
      async () => null,
      () => undefined,
    )).toBe(false);
    expect(sessions[0].title).toBe("A");
  });

  it("n6 session_updated always fetchSession — never event.session merge (not Dve)", async () => {
    let sessions = [row({ id: "a", title: "A", isRunning: false, model: "opus" })];
    const setSessions = (updater: (current: SessionSummary[]) => SessionSummary[]) => {
      sessions = updater(sessions);
    };
    const fetched = row({ id: "a", title: "From getSession", isRunning: true, model: "opus" });
    const fetchSession = vi.fn(async () => fetched);
    const handled = applyOfficialCoworkRecentsListEvent(
      { type: "session_updated", sessionId: "a", session: { id: "a", title: "Patch title", isRunning: true } },
      setSessions,
      fetchSession,
      () => undefined,
    );
    expect(handled).toBe(true);
    expect(fetchSession).toHaveBeenCalledWith("a");
    await vi.waitFor(() => {
      expect(sessions[0].title).toBe("From getSession");
    });
    expect(sessions[0].title).not.toBe("Patch title");
    expect(sessions[0].isRunning).toBe(true);
  });

  it("n6 does not handle Code-only unarchived / cleared / stopped / paused", () => {
    let sessions = [row({ id: "a", title: "A", isArchived: true })];
    const setSessions = (updater: (current: SessionSummary[]) => SessionSummary[]) => {
      sessions = updater(sessions);
    };
    const fetchSession = vi.fn(async () => row({ id: "a", title: "Z" }));
    for (const type of ["unarchived", "cleared", "stopped", "paused"] as const) {
      expect(applyOfficialCoworkRecentsListEvent(
        { type, sessionId: "a", session: { id: "a", isArchived: false } },
        setSessions,
        fetchSession,
        () => undefined,
      )).toBe(false);
    }
    expect(fetchSession).not.toHaveBeenCalled();
    expect(sessions[0].isArchived).toBe(true);
    expect(sessions[0].title).toBe("A");
  });

  it("n6 archived/deleted clear $5 caches like official", () => {
    let sessions = [row({ id: "a", title: "A" })];
    const setSessions = (updater: (current: SessionSummary[]) => SessionSummary[]) => {
      sessions = updater(sessions);
    };
    expect(applyOfficialCoworkRecentsListEvent(
      { type: "archived", sessionId: "a" },
      setSessions,
      async () => null,
      () => undefined,
    )).toBe(true);
    expect(sessions[0].isArchived).toBe(true);
    expect(clearCachesMock).toHaveBeenCalledWith("a");

    clearCachesMock.mockClear();
    expect(applyOfficialCoworkRecentsListEvent(
      { type: "deleted", sessionId: "a" },
      setSessions,
      async () => null,
      () => undefined,
    )).toBe(true);
    expect(sessions.map((s) => s.id)).toEqual([]);
    expect(clearCachesMock).toHaveBeenCalledWith("a");
  });

  it("n6 initialized reloads t6 getAll", () => {
    const reloadAll = vi.fn();
    expect(applyOfficialCoworkRecentsListEvent(
      { type: "initialized" },
      () => undefined,
      async () => null,
      reloadAll,
    )).toBe(true);
    expect(reloadAll).toHaveBeenCalledOnce();
  });

  it("toCoworkListRow strips getSession snapshot-only fields", () => {
    const snapshot = {
      ...row({ id: "a", title: "A" }),
      messages: [{ id: "m1", role: "user" as const, text: "hi", createdAt: "" }],
      bufferedMessages: [],
      rawSession: { sessionId: "a" },
      rawMessages: [{ type: "user" }],
      rawBufferedMessages: [],
    };
    const listRow = toCoworkListRow(snapshot);
    expect(listRow.id).toBe("a");
    expect(listRow.title).toBe("A");
    expect("rawSession" in listRow).toBe(false);
    expect(listRow.messages).toBeUndefined();
    expect(listRow.bufferedMessages).toBeUndefined();
  });
});
