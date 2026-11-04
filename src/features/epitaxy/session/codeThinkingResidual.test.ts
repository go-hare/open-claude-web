import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  officialTranscriptModeExpandsDetails,
  officialTranscriptModeShowsThinking,
  officialXmShowsThinking,
} from "./officialTranscriptMode";

const here = path.dirname(fileURLToPath(import.meta.url));
const transcriptSource = readFileSync(path.join(here, "OfficialTranscript.tsx"), "utf8");

describe("Code thinking residual-first Y1 / ZX (cd5a)", () => {
  it("shows thinking only in thinking|verbose modes (official pr/xc)", () => {
    expect(officialTranscriptModeShowsThinking("normal")).toBe(false);
    expect(officialTranscriptModeShowsThinking("summary")).toBe(false);
    expect(officialTranscriptModeShowsThinking("thinking")).toBe(true);
    expect(officialTranscriptModeShowsThinking("verbose")).toBe(true);
  });

  it("official xm Thinking gate: local always, remote only with thinking block", () => {
    expect(officialXmShowsThinking({ sessionId: null, isLocalSession: false })).toBe(true);
    expect(officialXmShowsThinking({ sessionId: "code_abc", isLocalSession: true })).toBe(true);
    expect(officialXmShowsThinking({ sessionId: "local_abc", isLocalSession: false })).toBe(true);
    expect(officialXmShowsThinking({ sessionId: "cse_abc", isLocalSession: false, messages: [] })).toBe(false);
    expect(officialXmShowsThinking({
      sessionId: "cse_abc",
      isLocalSession: false,
      messages: [{
        role: "assistant",
        raw: { type: "assistant", message: { content: [{ type: "thinking", thinking: "  hmm  " }] } },
      }],
    })).toBe(true);
    expect(officialXmShowsThinking({
      sessionId: "cse_abc",
      isLocalSession: false,
      messages: [{
        role: "assistant",
        raw: { type: "assistant", message: { content: [{ type: "thinking", thinking: "   " }] } },
      }],
    })).toBe(false);
  });

  it("expands tool details only in verbose (not thinking mode alone)", () => {
    expect(officialTranscriptModeExpandsDetails("thinking")).toBe(false);
    expect(officialTranscriptModeExpandsDetails("verbose")).toBe(true);
    expect(officialTranscriptModeExpandsDetails("normal")).toBe(false);
  });

  it("locks Y1 italic, XX Thought process, and X1 precedingThinking", () => {
    expect(transcriptSource).toMatch(
      /data-official-source="cd5a31703-B4nKQMBN\.js:Y1"/,
    );
    expect(transcriptSource).toMatch(
      /source="cd5a31703-B4nKQMBN\.js:XX"/,
    );
    expect(transcriptSource).toMatch(
      /data-official-source="cd5a31703-B4nKQMBN\.js:X1"/,
    );
    expect(transcriptSource).toMatch(
      /text-body text-muted italic whitespace-pre-wrap break-words/,
    );
    expect(transcriptSource).toMatch(/data-find-omitted=""/);
    expect(readFileSync(path.join(here, "OfficialTurnStatusStep.tsx"), "utf8")).toMatch(/data-find-omitted/);
    expect(transcriptSource).toMatch(/cd5a31703-B4nKQMBN\.js:nQe/);
    expect(transcriptSource).toMatch(/cd5a31703-B4nKQMBN\.js:YX/);
    expect(readFileSync(path.join(here, "OfficialTurnStatusStep.tsx"), "utf8")).toMatch(
      /data-cds="TurnStatusStep"/,
    );
    expect(transcriptSource).toMatch(/const CodeThinkingBlock = memo\(/);
    expect(transcriptSource).toMatch(/thoughtProcess/);
    expect(transcriptSource).not.toMatch(
      /data-official-source="cd5a31703-B4nKQMBN\.js:qb"/,
    );
  });

  it("does not import CoworkThinkingCell into Code path", () => {
    // Import statements only — comments may mention the forbid rule.
    expect(transcriptSource).not.toMatch(
      /import\s*\{[^}]*CoworkThinkingCell/,
    );
    expect(transcriptSource).not.toMatch(
      /from\s+["'][^"']*CoworkThinkingCell["']/,
    );
    expect(transcriptSource).not.toMatch(
      /<\s*CoworkThinkingCell\b/,
    );
  });

  it("nM parked/blocked + RM Ayx9qWb2Pk + hangMark/mergeBusyStep", () => {
    expect(transcriptSource).toMatch(/data-parked=\{nm\.parked \? "" : undefined\}/);
    expect(transcriptSource).toMatch(/actionsText\.needsYourInput/);
    expect(transcriptSource).toMatch(/formatOfficialIcu\(actionsText\.claudeCodeNotice/);
    expect(transcriptSource).not.toMatch(/function officialHookNoticeTitle/);
    const step = readFileSync(path.join(here, "OfficialTurnStatusStep.tsx"), "utf8");
    expect(step).toMatch(/hangMark/);
    expect(step).toMatch(/mergeBusyStep/);
    expect(step).toMatch(/data-hang=\{hang \? "" : undefined\}/);
    const live = readFileSync(path.join(here, "officialTurnLiveStore.ts"), "utf8");
    expect(live).toMatch(/permissionPending/);
    expect(live).toMatch(/parked = Boolean\(marked && live\.permissionPending\)/);
    expect(live).toMatch(/showsBlocked: parked/);
    expect(live).toMatch(/officialQj/);
    expect(live).toMatch(/officialZjFace/);
    expect(live).toMatch(/useOfficialZjFace/);
    expect(step).toMatch(/useOfficialHangFace/);
    expect(step).toMatch(/restretch/);
    expect(step).toMatch(/officialHangBusyLine/);
    expect(transcriptSource).toMatch(/useOfficialZjFace/);
    expect(transcriptSource).toMatch(/officialQj/);
    expect(transcriptSource).toMatch(/officialHangBusyLine\(toolsForMark\.map/);
    expect(transcriptSource).toMatch(/useOfficialHangFace\(hangVisual/);
    expect(transcriptSource).toMatch(/shineBusy = Boolean\(nm\.marked && !blocked && !tree && hangBusy\)/);
    expect(transcriptSource).toMatch(/nm\.marked && !nm\.parked && !tree \? <OfficialAmElapsedSeconds/);
    expect(transcriptSource).toMatch(/data-hang=\{hang \? "" : undefined\}/);
    expect(transcriptSource).toMatch(/shared-frame-DVFSKIcx\.js:Jk/);
    expect(transcriptSource).toMatch(/data-morph-key=\{key\}/);
    expect(transcriptSource).toMatch(/group\/morph inline-grid/);
    expect(readFileSync(path.join(here, "officialHangFace.ts"), "utf8")).toMatch(/OFFICIAL_HANG_DEFAULT_MIN_MS = 650/);
    expect(readFileSync(path.join(here, "officialZjFace.ts"), "utf8")).toMatch(/officialZjPublish/);
    expect(readFileSync(path.join(here, "officialZjFace.ts"), "utf8")).toMatch(/officialZjReconcileDraw/);
  });
});
