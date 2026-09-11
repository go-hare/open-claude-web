import { describe, expect, it } from "vitest";
import {
  buildEpitaxyActionCenterAttention,
} from "./epitaxyActionCenterAttention";
import type { SessionSummary } from "../../adapters/desktopBridge/types";

function session(partial: Partial<SessionSummary> & { id: string }): SessionSummary {
  return {
    kind: "code",
    title: partial.title ?? partial.id,
    updatedAt: "2026-09-09T00:00:00.000Z",
    ...partial,
  } as SessionSummary;
}

describe("buildEpitaxyActionCenterAttention unread (Pw bn)", () => {
  it("does not invent unread from host isUnread", () => {
    const rows = buildEpitaxyActionCenterAttention(
      [session({ id: "a", isUnread: true, hasCompleted: true })],
      new Set(),
    );
    expect(rows).toEqual([]);
  });

  it("adds unread when bn() has the id and session is not running", () => {
    const rows = buildEpitaxyActionCenterAttention(
      [session({ id: "a", isRunning: false })],
      new Set(["a"]),
    );
    expect(rows.map((row) => ({ id: row.session.id, kind: row.kind }))).toEqual([
      { id: "a", kind: "unread" },
    ]);
  });

  it("skips unread while running", () => {
    const rows = buildEpitaxyActionCenterAttention(
      [session({ id: "a", isRunning: true })],
      new Set(["a"]),
    );
    expect(rows).toEqual([]);
  });

  it("blocked wins over unread", () => {
    const rows = buildEpitaxyActionCenterAttention(
      [session({
        id: "a",
        postTurnSummary: { statusCategory: "need_input" },
      })],
      new Set(["a"]),
    );
    expect(rows.map((row) => row.kind)).toEqual(["blocked"]);
  });
});
