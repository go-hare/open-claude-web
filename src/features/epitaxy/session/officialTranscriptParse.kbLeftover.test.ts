import { describe, expect, it } from "vitest";
import type { ChatMessage } from "../../../adapters/desktopBridge/types";
import { parseOfficialTranscriptEntries } from "./officialTranscriptParse";

function system(id: string, subtype: string, extra: Record<string, unknown> = {}): ChatMessage {
  return {
    id,
    role: "assistant",
    text: "",
    createdAt: "2026-08-13T00:00:00.000Z",
    raw: {
      type: "system",
      subtype,
      uuid: id,
      ...extra,
    },
  };
}

function user(id: string, extra: Record<string, unknown>, text = ""): ChatMessage {
  return {
    id,
    role: "user",
    text,
    createdAt: "2026-08-13T00:00:00.000Z",
    raw: {
      type: "user",
      uuid: id,
      ...extra,
    },
  };
}

function assistant(id: string, extra: Record<string, unknown>, text = ""): ChatMessage {
  return {
    id,
    role: "assistant",
    text,
    createdAt: "2026-08-13T00:00:00.000Z",
    raw: {
      type: "assistant",
      uuid: id,
      ...extra,
    },
  };
}

describe("eke leftover Kb kinds (c06cf / cd5a)", () => {
  it("parses gap_fill_failed system into leftover item", () => {
    const entries = parseOfficialTranscriptEntries([system("g1", "gap_fill_failed")]);
    expect(entries[0]?.items[0]).toMatchObject({ id: "g1", kind: "gap_fill_failed" });
  });

  it("parses informational prevent_continuation as prompt_blocked, not hook_notice", () => {
    const entries = parseOfficialTranscriptEntries([
      system("b1", "informational", {
        prevent_continuation: true,
        content: "UserPromptSubmit operation blocked by hook:\nnope\n\nOriginal prompt: hello",
      }),
    ]);
    expect(entries[0]?.items[0]).toMatchObject({
      kind: "prompt_blocked",
      reason: "nope",
      originalPrompt: "hello",
    });
  });

  it("still parses ordinary informational as hook_notice", () => {
    const entries = parseOfficialTranscriptEntries([
      system("h1", "informational", { content: "PostToolUse hook feedback:", level: "warning" }),
    ]);
    expect(entries[0]?.items[0]).toMatchObject({
      kind: "hook_notice",
      notices: [{ level: "warning", message: "PostToolUse hook feedback" }],
    });
  });

  it("parses local_command <plan-usage/> as usage leftover, not text", () => {
    const entries = parseOfficialTranscriptEntries([
      system("u1", "local_command", {
        content: "<local-command-stdout><plan-usage/></local-command-stdout>",
      }),
    ]);
    expect(entries[0]?.items[0]).toMatchObject({ kind: "usage" });
  });

  it("parses local_command auto-mode apply stdout as auto_mode_setup_applied", () => {
    const stdout = JSON.stringify({
      ok: true,
      filePath: "/tmp/ccd-auto-mode-abc123/proposal.json",
      autoModeKeysWritten: ["permissions"],
      warnings: ["w1"],
      permissionsAllowNotFound: ["Bash(*)"],
    });
    const entries = parseOfficialTranscriptEntries([
      system("a1", "local_command", {
        content: `<local-command-stdout>${stdout}</local-command-stdout>`,
      }),
    ]);
    expect(entries[0]?.items[0]).toMatchObject({
      kind: "auto_mode_setup_applied",
      result: { filePath: "/tmp/ccd-auto-mode-abc123/proposal.json" },
    });
  });

  it("parses user /clear as user text plus assistant context_cleared", () => {
    const entries = parseOfficialTranscriptEntries([
      user("c1", { message: { content: "/clear" } }, "/clear"),
    ]);
    expect(entries.map((entry) => entry.author)).toEqual(["user", "assistant"]);
    expect(entries[1]?.items[0]).toMatchObject({ kind: "context_cleared" });
  });

  it("parses meta computer_disconnected reminder as leftover, not skipped isMeta", () => {
    const sentence = "The computer session ended.";
    const entries = parseOfficialTranscriptEntries([
      user("d1", {
        isMeta: true,
        isSynthetic: true,
        reminderKind: "computer_disconnected",
        inbound_origin: "tool_host_ended_reminder",
        ccr_event: { source: "client" },
        message: { content: `<system-reminder>${sentence}</system-reminder>` },
      }),
    ]);
    expect(entries[0]?.author).toBe("assistant");
    expect(entries[0]?.items[0]).toMatchObject({ kind: "computer_disconnected", sentence });
  });

  it("parses stamped assistant Remote Control text as leftover", () => {
    const already = "Remote Control is already on: this session connected automatically when it started. Send /remote-control again to turn it off.";
    const entries = parseOfficialTranscriptEntries([
      assistant("rc1", {
        isSyntheticReply: true,
        content: already,
      }, already),
    ]);
    expect(entries[0]?.items[0]).toMatchObject({
      kind: "remote_control_notice",
      notice: { kind: "already_on" },
    });
  });

  it("appends stop_warning after assistant ake items", () => {
    const entries = parseOfficialTranscriptEntries([
      assistant("st1", {
        message: {
          id: "msg-st1",
          content: [{ type: "text", text: "checking the page" }],
          stop_reason: "prompt_injection_risk",
        },
      }, "checking the page"),
    ]);
    expect(entries[0]?.items.map((item) => item.kind)).toEqual(["text", "stop_warning"]);
  });

  it("still parses compact_boundary as compacted, not leftover", () => {
    const entries = parseOfficialTranscriptEntries([
      system("c2", "compact_boundary", {
        compact_metadata: { pre_tokens: 12000, post_tokens: 4000 },
      }),
    ]);
    expect(entries[0]?.items[0]).toMatchObject({
      kind: "compacted",
      preTokens: 12000,
      postTokens: 4000,
    });
  });

  it("still parses local_command Context Usage as context, not leftover usage", () => {
    const body = [
      "## Context Usage",
      "",
      "**Model:** claude-opus-4-6",
      "**Tokens:** 1.2k / 200k (1%)",
    ].join("\n");
    const entries = parseOfficialTranscriptEntries([
      system("ctx1", "local_command", {
        content: `<local-command-stdout>${body}</local-command-stdout>`,
      }),
    ]);
    expect(entries[0]?.items[0]?.kind).toBe("context");
  });

  it("still parses local_command code-stats as stats, not leftover", () => {
    const stats = JSON.stringify({ dailyActivity: [] });
    const entries = parseOfficialTranscriptEntries([
      system("st2", "local_command", {
        content: `<local-command-stdout><code-stats>${stats}</code-stats></local-command-stdout>`,
      }),
    ]);
    expect(entries[0]?.items[0]).toMatchObject({ kind: "stats" });
  });
});
