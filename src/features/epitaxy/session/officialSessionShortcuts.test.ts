import { describe, expect, it } from "vitest";
import {
  matchOfficialSessionShortcut,
  type OfficialSessionShortcutContext,
} from "./officialSessionShortcuts";
import { cycleOfficialTranscriptMode } from "./officialTranscriptMode";

function keyEvent(
  partial: Partial<KeyboardEvent> & { code: string; key?: string },
): KeyboardEvent {
  return {
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    ...partial,
  } as KeyboardEvent;
}

const macClaude: OfficialSessionShortcutContext = { isClaudeApp: true, mac: true };
const nonMacWeb: OfficialSessionShortcutContext = { isClaudeApp: false, mac: false };

describe("cycleOfficialTranscriptMode (c119 ld)", () => {
  it("cycles normal → thinking → verbose → summary → normal", () => {
    expect(cycleOfficialTranscriptMode("normal")).toBe("thinking");
    expect(cycleOfficialTranscriptMode("thinking")).toBe("verbose");
    expect(cycleOfficialTranscriptMode("verbose")).toBe("summary");
    expect(cycleOfficialTranscriptMode("summary")).toBe("normal");
  });

  it("skips summary when hideSummary", () => {
    expect(cycleOfficialTranscriptMode("verbose", { hideSummary: true })).toBe("normal");
    expect(cycleOfficialTranscriptMode("summary", { hideSummary: true })).toBe("normal");
  });
});

describe("matchOfficialSessionShortcut (c119 lk)", () => {
  it("matches cycleTranscriptMode ctrl+o", () => {
    expect(
      matchOfficialSessionShortcut(
        keyEvent({ code: "KeyO", ctrlKey: true }),
        macClaude,
      ),
    ).toBe("cycleTranscriptMode");
  });

  it("matches closePane cmd+\\ on mac", () => {
    expect(
      matchOfficialSessionShortcut(
        keyEvent({ code: "Backslash", metaKey: true }),
        macClaude,
      ),
    ).toBe("closePane");
  });

  it("matches togglePreview cmd+alt+p on mac (not only shift)", () => {
    expect(
      matchOfficialSessionShortcut(
        keyEvent({ code: "KeyP", metaKey: true, altKey: true }),
        macClaude,
      ),
    ).toBe("togglePreview");
    expect(
      matchOfficialSessionShortcut(
        keyEvent({ code: "KeyP", metaKey: true, shiftKey: true }),
        macClaude,
      ),
    ).toBe("togglePreview");
  });

  it("matches toggleDiff ctrl+shift+d when !isClaudeApp", () => {
    expect(
      matchOfficialSessionShortcut(
        keyEvent({ code: "KeyD", ctrlKey: true, shiftKey: true }),
        nonMacWeb,
      ),
    ).toBe("toggleDiff");
  });

  it("does not match cmd+shift+d when !isClaudeApp", () => {
    expect(
      matchOfficialSessionShortcut(
        keyEvent({ code: "KeyD", metaKey: true, shiftKey: true }),
        nonMacWeb,
      ),
    ).toBeNull();
  });

  it("matches toggleSideChat cmd+; (session may ignore dispatch)", () => {
    expect(
      matchOfficialSessionShortcut(
        keyEvent({ code: "Semicolon", metaKey: true }),
        macClaude,
      ),
    ).toBe("toggleSideChat");
  });
});
