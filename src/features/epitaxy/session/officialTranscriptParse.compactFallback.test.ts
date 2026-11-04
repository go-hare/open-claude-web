import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { ChatMessage } from "../../../adapters/desktopBridge/types";
import {
  formatOfficialCompactedLabel,
  formatOfficialCompactTokens,
  parseOfficialTranscriptEntries,
} from "./officialTranscriptParse";

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

describe("eke compact_boundary / model_fallback (c06cf / shared-100 mT / BC)", () => {
  it("parses compact_boundary compact_metadata into compacted pre/post tokens", () => {
    const entries = parseOfficialTranscriptEntries([
      system("c1", "compact_boundary", {
        compact_metadata: { pre_tokens: 12000, post_tokens: 4000 },
      }),
    ]);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.author).toBe("assistant");
    expect(entries[0]?.items[0]).toMatchObject({
      id: "c1",
      kind: "compacted",
      preTokens: 12000,
      postTokens: 4000,
    });
  });

  it("skips compact_boundary with parent_tool_use_id", () => {
    const entries = parseOfficialTranscriptEntries([
      system("c1", "compact_boundary", {
        parent_tool_use_id: "tool-1",
        compact_metadata: { pre_tokens: 10, post_tokens: 1 },
      }),
    ]);
    expect(entries).toEqual([]);
  });

  it("parses model_fallback availability retry", () => {
    const entries = parseOfficialTranscriptEntries([
      system("f1", "model_fallback", {
        original_model: "claude-opus-4-6",
        fallback_model: "claude-sonnet-4-6",
        trigger: "overloaded",
      }),
    ]);
    expect(entries[0]?.items[0]).toMatchObject({
      kind: "model_fallback",
      originalModel: "claude-opus-4-6",
      fallbackModel: "claude-sonnet-4-6",
      trigger: "overloaded",
      direction: "retry",
    });
  });

  it("parses model_refusal_fallback BC fields", () => {
    const entries = parseOfficialTranscriptEntries([
      system("f2", "model_refusal_fallback", {
        direction: "retry",
        original_model: "claude-opus-4-6",
        fallback_model: "claude-sonnet-4-6",
        api_refusal_category: "cyber",
        api_refusal_explanation: "  blocked  ",
      }),
    ]);
    expect(entries[0]?.items[0]).toMatchObject({
      kind: "model_fallback",
      originalModel: "claude-opus-4-6",
      fallbackModel: "claude-sonnet-4-6",
      apiRefusalCategory: "cyber",
      apiRefusalExplanation: "  blocked  ",
    });
  });

  it("compacting does not trip Ja Loading (Fu white flash)", () => {
    const source = readFileSync(
      path.join(fileURLToPath(import.meta.url), "..", "useEpitaxySessionData.tsx"),
      "utf8",
    );
    expect(source).toMatch(/bucket\.compactionStatus !== "compacting"/);
  });

  it("Kf compact label matches c80ec Le", () => {
    expect(formatOfficialCompactTokens(1500)).toBe("1.5k");
    expect(formatOfficialCompactTokens(1000)).toBe("1k");
    expect(formatOfficialCompactedLabel(12000, 4000)).toBe("Compacted session · saved 8k tokens");
    expect(formatOfficialCompactedLabel(1500)).toBe("Compacted session · from 1.5k tokens");
    expect(formatOfficialCompactedLabel()).toBe("Compacted session");
  });

  it("parses informational into hook_notice notices[]", () => {
    const entries = parseOfficialTranscriptEntries([
      system("h1", "informational", { content: "PostToolUse hook feedback:", level: "warning" }),
    ]);
    expect(entries[0]?.items[0]).toMatchObject({
      kind: "hook_notice",
      notices: [{ level: "warning", message: "PostToolUse hook feedback" }],
    });
  });

  it("parses ui_log plugin hook_notice", () => {
    const entries = parseOfficialTranscriptEntries([
      system("h2", "ui_log", { plugin: "demo", text: "hello" }),
    ]);
    expect(entries[0]?.items[0]).toMatchObject({
      kind: "hook_notice",
      plugin: "demo",
      notices: [{ level: "notice", message: "hello" }],
    });
  });

  it("merges consecutive plugin-less hook_notice notices", () => {
    const entries = parseOfficialTranscriptEntries([
      system("h3", "informational", { content: "one", level: "notice" }),
      system("h4", "informational", { content: "two", level: "notice" }),
    ]);
    expect(entries).toHaveLength(1);
    const item = entries[0]?.items[0];
    expect(item?.kind).toBe("hook_notice");
    if (item?.kind === "hook_notice") expect(item.notices).toHaveLength(2);
  });
});

