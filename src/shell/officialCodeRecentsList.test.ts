import { describe, expect, it, beforeEach, vi } from "vitest";
import type { SessionSummary } from "../adapters/desktopBridge/types";

const clearCachesMock = vi.fn();
vi.mock("../features/epitaxy/session/codeSessionDeletion", () => ({
  clearCodeSessionCaches: (...args: unknown[]) => clearCachesMock(...args),
}));

import {
  applyOfficialRecentsListEvent,
  mergeOfficialRecentsSessionPatch,
  officialRecentsClearTombstonesForTests,
  officialRecentsMarkArchived,
  officialRecentsMarkUnarchived,
  officialRecentsRemove,
  officialRecentsUpsert,
} from "./officialCodeRecentsList";

function row(partial: Partial<SessionSummary> & Pick<SessionSummary, "id" | "title">): SessionSummary {
  return {
    kind: "code",
    sessionKind: "code",
    updatedAt: "",
    updatedAtMs: 1,
    isArchived: false,
    isRunning: false,
    ...partial,
  };
}

describe("officialCodeRecentsList (BELz Ive/Dve)", () => {
  beforeEach(() => {
    officialRecentsClearTombstonesForTests();
    clearCachesMock.mockReset();
  });

  it("Ive upsert replaces changed row and keeps identity when deep-equal", () => {
    const a = row({ id: "a", title: "A", isRunning: true, repo: { name: "x", branch: "main" } });
    const list = [a];
    // Nested repo remint with same values — official lodash isEqual keeps identity.
    const same = officialRecentsUpsert(list, { ...a, repo: { name: "x", branch: "main" } });
    expect(same).toBe(list);
    const next = officialRecentsUpsert(list, { ...a, title: "B" });
    expect(next).not.toBe(list);
    expect(next[0].title).toBe("B");
  });

  it("Ive skips upsert while Eve tombstone (archived/deleted)", () => {
    const list = [row({ id: "a", title: "A", hasWorktree: true })];
    const afterArchive = officialRecentsMarkArchived(list, "a");
    expect(afterArchive[0].isArchived).toBe(true);
    // Official archived also clears worktreePath/worktreeName → product hasWorktree:false
    expect(afterArchive[0].hasWorktree).toBe(false);
    const skipped = officialRecentsUpsert(afterArchive, row({ id: "a", title: "Z", isRunning: true }));
    expect(skipped).toBe(afterArchive);
    const afterUnarchive = officialRecentsMarkUnarchived(afterArchive, "a");
    const allowed = officialRecentsUpsert(afterUnarchive, row({ id: "a", title: "Z", isRunning: true }));
    expect(allowed[0].title).toBe("Z");
  });

  it("Lve removes and tombstones", () => {
    const list = [row({ id: "a", title: "A" }), row({ id: "b", title: "B" })];
    const next = officialRecentsRemove(list, "a");
    expect(next.map((s) => s.id)).toEqual(["b"]);
    const again = officialRecentsRemove(next, "a");
    expect(again).toBe(next);
  });

  it("Dve ignores message / stream_event and upserts session_updated", () => {
    let sessions = [row({ id: "a", title: "A", isRunning: false })];
    const setSessions = (updater: (current: SessionSummary[]) => SessionSummary[]) => {
      sessions = updater(sessions);
    };
    const handledMessage = applyOfficialRecentsListEvent(
      { type: "message", sessionId: "a", message: { type: "assistant" } },
      setSessions,
      async () => null,
      () => undefined,
    );
    expect(handledMessage).toBe(false);
    expect(sessions[0].title).toBe("A");

    const handled = applyOfficialRecentsListEvent(
      { type: "session_updated", sessionId: "a", session: { id: "a", title: "Renamed", isRunning: true } },
      setSessions,
      async () => null,
      () => undefined,
    );
    expect(handled).toBe(true);
    expect(sessions[0].title).toBe("Renamed");
    expect(sessions[0].isRunning).toBe(true);
  });

  it("merge patch keeps sparse prior fields", () => {
    const current = row({ id: "a", title: "A", model: "opus", effort: "high", permissionMode: "acceptEdits" });
    const merged = mergeOfficialRecentsSessionPatch(current, { id: "a", isRunning: true });
    expect(merged?.model).toBe("opus");
    expect(merged?.effort).toBe("high");
    expect(merged?.permissionMode).toBe("acceptEdits");
    expect(merged?.isRunning).toBe(true);
  });

  it("Dve archived/deleted clear $5/$H5 caches like official", () => {
    let sessions = [row({ id: "a", title: "A", hasWorktree: true })];
    const setSessions = (updater: (current: SessionSummary[]) => SessionSummary[]) => {
      sessions = updater(sessions);
    };
    expect(applyOfficialRecentsListEvent(
      { type: "archived", sessionId: "a" },
      setSessions,
      async () => null,
      () => undefined,
    )).toBe(true);
    expect(sessions[0].isArchived).toBe(true);
    expect(sessions[0].hasWorktree).toBe(false);
    expect(clearCachesMock).toHaveBeenCalledWith("a");

    clearCachesMock.mockClear();
    expect(applyOfficialRecentsListEvent(
      { type: "deleted", sessionId: "a" },
      setSessions,
      async () => null,
      () => undefined,
    )).toBe(true);
    expect(sessions.map((s) => s.id)).toEqual([]);
    expect(clearCachesMock).toHaveBeenCalledWith("a");
  });
});
