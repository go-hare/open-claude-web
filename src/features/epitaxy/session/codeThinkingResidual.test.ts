import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  officialTranscriptModeExpandsDetails,
  officialTranscriptModeShowsThinking,
} from "./officialTranscriptMode";

const here = path.dirname(fileURLToPath(import.meta.url));
const transcriptSource = readFileSync(path.join(here, "OfficialTranscript.tsx"), "utf8");

describe("Code thinking residual-first qb (c11959232)", () => {
  it("shows thinking only in thinking|verbose modes (official pr/xc)", () => {
    expect(officialTranscriptModeShowsThinking("normal")).toBe(false);
    expect(officialTranscriptModeShowsThinking("summary")).toBe(false);
    expect(officialTranscriptModeShowsThinking("thinking")).toBe(true);
    expect(officialTranscriptModeShowsThinking("verbose")).toBe(true);
  });

  it("expands tool details only in verbose (not thinking mode alone)", () => {
    expect(officialTranscriptModeExpandsDetails("thinking")).toBe(false);
    expect(officialTranscriptModeExpandsDetails("verbose")).toBe(true);
    expect(officialTranscriptModeExpandsDetails("normal")).toBe(false);
  });

  it("locks qb class residual and data-official-source", () => {
    expect(transcriptSource).toMatch(
      /data-official-source="c11959232-h_zsw3wI\.js:qb"/,
    );
    expect(transcriptSource).toMatch(
      /text-body text-t6 italic whitespace-pre-wrap break-words/,
    );
    // Official qb is memoized plain italic — not a collapsible component mount.
    expect(transcriptSource).toMatch(/const CodeThinkingBlock = memo\(/);
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
});
