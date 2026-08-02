/**
 * Tasks pane usage line residual — duration from bookends when usage object absent.
 * formatDuration aligns official zR RR.
 */
import { describe, expect, it } from "vitest";
import {
  formatDuration,
  parseOfficialTasks,
  resolveOfficialTaskUsageParts,
} from "./officialTasksAndPlan";
import type { ChatMessage } from "../../../adapters/desktopBridge/types";

function systemMessage(raw: Record<string, unknown>): ChatMessage {
  return {
    id: String(raw.uuid ?? raw.task_id ?? Math.random()),
    role: "system",
    text: "",
    createdAt: String(raw.timestamp ?? new Date().toISOString()),
    raw,
  };
}

describe("formatDuration (official RR)", () => {
  it("rounds sub-minute seconds including 0", () => {
    expect(formatDuration(0)).toBe("0s");
    expect(formatDuration(499)).toBe("0s");
    expect(formatDuration(500)).toBe("1s");
    expect(formatDuration(3_500)).toBe("4s");
  });

  it("always shows seconds remainder when ≥60s", () => {
    expect(formatDuration(60_000)).toBe("1m 0s");
    expect(formatDuration(90_000)).toBe("1m 30s");
  });
});

describe("resolveOfficialTaskUsageParts", () => {
  it("uses usage.durationMs when present", () => {
    const parts = resolveOfficialTaskUsageParts({
      status: "completed",
      startedAt: 1_000,
      completedAt: 5_000,
      usage: { durationMs: 12_000, totalTokens: 1500, toolUses: 2 },
    });
    expect(parts[0]).toBe("12s");
    expect(parts[1]).toContain("tokens");
    expect(parts[2]).toBe("2 tool uses");
  });

  it("falls back to completedAt - startedAt without usage", () => {
    const parts = resolveOfficialTaskUsageParts({
      status: "completed",
      startedAt: Date.parse("2026-08-01T11:00:00.000Z"),
      completedAt: Date.parse("2026-08-01T11:00:45.000Z"),
    });
    expect(parts).toEqual(["45s"]);
  });

  it("running task uses now - startedAt", () => {
    const startedAt = 1_000_000;
    const parts = resolveOfficialTaskUsageParts(
      { status: "running", startedAt },
      startedAt + 3_500,
    );
    expect(parts).toEqual(["4s"]);
  });

  it("running duration advances when nowMs ticks", () => {
    const startedAt = Date.parse("2026-08-01T12:00:00.000Z");
    const t0 = resolveOfficialTaskUsageParts({ status: "running", startedAt }, startedAt + 1_000);
    const t1 = resolveOfficialTaskUsageParts({ status: "running", startedAt }, startedAt + 5_000);
    expect(t0).toEqual(["1s"]);
    expect(t1).toEqual(["5s"]);
  });

  it("returns empty when no timing signals", () => {
    expect(resolveOfficialTaskUsageParts({ status: "completed" })).toEqual([]);
  });
});

describe("parseOfficialTasks task_started status", () => {
  it("does not reopen a completed task when task_started is seen after notification", () => {
    const messages = [
      systemMessage({
        type: "system",
        subtype: "task_notification",
        task_id: "t1",
        status: "completed",
        summary: "done",
        uuid: "n1",
        timestamp: "2026-08-01T12:00:10.000Z",
      }),
      systemMessage({
        type: "system",
        subtype: "task_started",
        task_id: "t1",
        task_type: "local_agent",
        description: "Worker",
        uuid: "s1",
        timestamp: "2026-08-01T12:00:01.000Z",
      }),
    ];
    const tasks = parseOfficialTasks(messages);
    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.status).toBe("completed");
    expect(tasks[0]?.description).toBe("Worker");
    expect(tasks[0]?.startedAt).toBe(Date.parse("2026-08-01T12:00:01.000Z"));
  });
});
