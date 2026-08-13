import { describe, expect, it } from "vitest";
import type { ChatMessage } from "../../../adapters/desktopBridge/types";
import { parseOfficialTranscriptEntries } from "./officialTranscriptParse";

function user(id: string, text: string, extraRaw: Record<string, unknown> = {}): ChatMessage {
  return {
    id,
    role: "user",
    text,
    createdAt: "2026-08-13T00:00:00.000Z",
    raw: {
      type: "user",
      uuid: id,
      message: { role: "user", content: [{ type: "text", text }] },
      ...extraRaw,
    },
  };
}

function assistant(id: string, text: string): ChatMessage {
  return {
    id,
    role: "assistant",
    text,
    createdAt: "2026-08-13T00:00:01.000Z",
    raw: {
      type: "assistant",
      uuid: id,
      message: { role: "assistant", content: [{ type: "text", text }] },
    },
  };
}

function resultErrorDuringExecution(id: string, errors: string[] = ["error"]): ChatMessage {
  return {
    id,
    role: "assistant",
    text: errors.join("\n"),
    createdAt: "2026-08-13T00:00:02.000Z",
    raw: {
      type: "result",
      uuid: id,
      is_error: true,
      subtype: "error_during_execution",
      errors,
    },
  };
}

describe("official jke / Qhe interrupt residual", () => {
  it("skips error_during_execution turn_error when prior user is interrupt (jke/_ke)", () => {
    const entries = parseOfficialTranscriptEntries([
      user("u1", "222"),
      user("u2", "[Request interrupted by user]"),
      resultErrorDuringExecution("r1"),
    ]);
    expect(entries.some((entry) => entry.items.some((item) => item.kind === "turn_error"))).toBe(false);
  });

  it("skips error_during_execution after tool-use interrupt marker", () => {
    const entries = parseOfficialTranscriptEntries([
      user("u1", "222"),
      user("u2", "[Request interrupted by user for tool use]"),
      resultErrorDuringExecution("r1"),
    ]);
    expect(entries.some((entry) => entry.items.some((item) => item.kind === "turn_error"))).toBe(false);
  });

  it("keeps error_during_execution when prior user is a normal prompt", () => {
    const entries = parseOfficialTranscriptEntries([
      user("u1", "222"),
      resultErrorDuringExecution("r1", ["real failure"]),
    ]);
    const errors = entries.flatMap((entry) => entry.items).filter((item) => item.kind === "turn_error");
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ kind: "turn_error", subtype: "error_during_execution" });
  });

  it("does not skip when an assistant row sits between user and result", () => {
    const entries = parseOfficialTranscriptEntries([
      user("u1", "[Request interrupted by user]"),
      assistant("a1", "partial"),
      resultErrorDuringExecution("r1"),
    ]);
    expect(entries.some((entry) => entry.items.some((item) => item.kind === "turn_error"))).toBe(true);
  });

  it("does not treat a prior image user as skippable (product bug residual)", () => {
    const entries = parseOfficialTranscriptEntries([
      {
        id: "u-img",
        role: "user",
        text: "",
        createdAt: "2026-08-13T00:00:00.000Z",
        raw: {
          type: "user",
          uuid: "u-img",
          message: {
            role: "user",
            content: [{ type: "image", source: { data: "abc", media_type: "image/png" } }],
          },
        },
      },
      resultErrorDuringExecution("r1"),
    ]);
    expect(entries.some((entry) => entry.items.some((item) => item.kind === "turn_error"))).toBe(true);
  });

  it("drops assistant Qhe text 'No response requested.' (ake residual)", () => {
    const entries = parseOfficialTranscriptEntries([
      user("u1", "222"),
      assistant("a1", "No response requested."),
    ]);
    const texts = entries.flatMap((entry) =>
      entry.items.filter((item): item is Extract<typeof item, { kind: "text" }> => item.kind === "text"),
    );
    expect(texts.map((item) => item.text)).not.toContain("No response requested.");
  });

  it("does not skip when a later queued user sits immediately before the result (official jke)", () => {
    const entries = parseOfficialTranscriptEntries([
      user("u1", "222"),
      user("u2", "[Request interrupted by user]"),
      user("u3", "333"),
      resultErrorDuringExecution("r1"),
    ]);
    expect(entries.some((entry) => entry.items.some((item) => item.kind === "turn_error"))).toBe(true);
  });

  it("hides interrupt marker text (official Mke kke → no Hb text item)", () => {
    const entries = parseOfficialTranscriptEntries([
      user("u1", "222"),
      user("u2", "[Request interrupted by user]"),
      user("u3", "[Request interrupted by user for tool use]"),
    ]);
    const texts = entries.flatMap((entry) =>
      entry.items.filter((item): item is Extract<typeof item, { kind: "text" }> => item.kind === "text"),
    );
    expect(texts.map((item) => item.text)).toEqual(["222"]);
    expect(entries.some((entry) => entry.id === "u2")).toBe(false);
    expect(entries.some((entry) => entry.id === "u3")).toBe(false);
  });
});
