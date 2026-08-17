import { describe, expect, it } from "vitest";
import {
  residualExtractUltrareviewProgress,
  residualParseRemoteReviewProgress,
  residualParseReviewBugs,
  residualUltrareviewDisplayStage,
  residualUltrareviewStepStatus,
} from "./residualUltrareviewProgress";
import type { ChatMessage } from "../../../adapters/desktopBridge/types";

function systemHook(
  subtype: "hook_progress" | "hook_response",
  stdout: string,
  extras: Record<string, unknown> = {},
): ChatMessage {
  return {
    id: String(extras.uuid ?? "hook-1"),
    role: "system",
    text: stdout,
    createdAt: new Date().toISOString(),
    raw: {
      type: "system",
      subtype,
      hook_id: extras.hook_id ?? "review-hook",
      uuid: extras.uuid ?? "hook-1",
      stdout,
      outcome: extras.outcome,
    },
  };
}

describe("residualParseRemoteReviewProgress", () => {
  it("parses last remote-review-progress JSON", () => {
    const stdout = [
      `<remote-review-progress>${JSON.stringify({ stage: "finding", bugs_found: 1, bugs_verified: 0, bugs_refuted: 0 })}</remote-review-progress>`,
      `<remote-review-progress>${JSON.stringify({ stage: "verifying", bugs_found: 2, bugs_verified: 1, bugs_refuted: 0 })}</remote-review-progress>`,
    ].join("\n");
    expect(residualParseRemoteReviewProgress(stdout)).toEqual({
      stage: "verifying",
      bugs_found: 2,
      bugs_verified: 1,
      bugs_refuted: 0,
    });
  });
});

describe("residualParseReviewBugs", () => {
  it("collects review-bug JSON entries", () => {
    const stdout = [
      `<review-bug>${JSON.stringify({ id: "b1", name: "Null deref", file: "a.ts", line: 10, status: "confirmed", desc: "x" })}</review-bug>`,
      `<review-bug>${JSON.stringify({ id: "b2", status: "verifying" })}</review-bug>`,
    ].join("");
    const bugs = residualParseReviewBugs(stdout);
    expect(bugs).toHaveLength(2);
    expect(bugs[0]).toMatchObject({ id: "b1", file: "a.ts", line: 10, status: "confirmed" });
  });
});

describe("residualExtractUltrareviewProgress", () => {
  it("tracks running progress then completes on hook_response success", () => {
    const progressStdout = `<remote-review-progress>${JSON.stringify({
      stage: "synthesizing",
      bugs_found: 3,
      bugs_verified: 2,
      bugs_refuted: 1,
    })}</remote-review-progress>`;
    const messages: ChatMessage[] = [
      systemHook("hook_progress", progressStdout, { uuid: "p1" }),
      systemHook("hook_response", progressStdout, { uuid: "p2", outcome: "success" }),
    ];
    const progress = residualExtractUltrareviewProgress(messages);
    expect(progress).toMatchObject({
      status: "completed",
      stage: "synthesizing",
      bugs_found: 3,
      bugs_verified: 2,
      bugs_refuted: 1,
    });
    expect(residualUltrareviewDisplayStage(progress!)).toBe("dedupe");
  });

  it("merges bugs across progress events for the same hook_id", () => {
    const messages: ChatMessage[] = [
      systemHook(
        "hook_progress",
        `<remote-review-progress>${JSON.stringify({ stage: "finding", bugs_found: 1, bugs_verified: 0, bugs_refuted: 0 })}</remote-review-progress>`
          + `<review-bug>${JSON.stringify({ id: "a", status: "pending", name: "A" })}</review-bug>`,
        { uuid: "1" },
      ),
      systemHook(
        "hook_progress",
        `<remote-review-progress>${JSON.stringify({ stage: "verifying", bugs_found: 1, bugs_verified: 0, bugs_refuted: 0 })}</remote-review-progress>`
          + `<review-bug>${JSON.stringify({ id: "a", status: "confirmed", name: "A" })}</review-bug>`,
        { uuid: "2" },
      ),
    ];
    const progress = residualExtractUltrareviewProgress(messages);
    expect(progress?.stage).toBe("verifying");
    expect(progress?.bugs).toEqual([
      expect.objectContaining({ id: "a", status: "confirmed", name: "A" }),
    ]);
  });

  it("marks error status and errorText from failed hook_response", () => {
    const messages: ChatMessage[] = [
      systemHook("hook_response", "boom failed", { outcome: "failure", uuid: "e1" }),
    ];
    // residual: without progress/bugs and no prior map entry, gw skips — seed with progress first
    const seeded: ChatMessage[] = [
      systemHook(
        "hook_progress",
        `<remote-review-progress>${JSON.stringify({ stage: "finding", bugs_found: 0, bugs_verified: 0, bugs_refuted: 0 })}</remote-review-progress>`,
        { uuid: "e0" },
      ),
      systemHook("hook_response", "boom failed", { outcome: "failure", uuid: "e1" }),
    ];
    const progress = residualExtractUltrareviewProgress(seeded);
    expect(progress?.status).toBe("error");
    expect(progress?.errorText).toContain("boom failed");
    void messages;
  });

  it("attaches findings from assistant after completed progress", () => {
    const progressStdout = `<remote-review-progress>${JSON.stringify({
      stage: "synthesizing",
      bugs_found: 1,
      bugs_verified: 1,
      bugs_refuted: 0,
    })}</remote-review-progress>`;
    const messages: ChatMessage[] = [
      systemHook("hook_response", progressStdout, { outcome: "success", uuid: "c1" }),
      {
        id: "a1",
        role: "assistant",
        text: "Review complete — 1 finding\n## Null pointer",
        createdAt: new Date().toISOString(),
        raw: {
          type: "assistant",
          message: {
            role: "assistant",
            content: [{ type: "text", text: "Review complete — 1 finding\n## Null pointer" }],
          },
        },
      },
    ];
    const progress = residualExtractUltrareviewProgress(messages);
    expect(progress?.status).toBe("completed");
    expect(progress?.findings).toBe("## Null pointer");
  });
});

describe("residualUltrareviewStepStatus", () => {
  const base = {
    id: "1",
    type: "review_progress" as const,
    hook_id: "h",
    status: "running" as const,
    stage: "verifying" as const,
    bugs_found: 1,
    bugs_verified: 0,
    bugs_refuted: 0,
  };

  it("marks prior stages done and later pending", () => {
    expect(residualUltrareviewStepStatus("setup", "verify", base, false)).toBe("done");
    expect(residualUltrareviewStepStatus("find", "verify", base, false)).toBe("done");
    expect(residualUltrareviewStepStatus("verify", "verify", base, false)).toBe("active");
    expect(residualUltrareviewStepStatus("dedupe", "verify", base, false)).toBe("pending");
  });

  it("marks active stage stopped when session stopped", () => {
    expect(residualUltrareviewStepStatus("verify", "verify", base, true)).toBe("stopped");
  });
});
