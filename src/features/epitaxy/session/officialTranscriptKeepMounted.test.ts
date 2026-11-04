import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));

describe("official Gat l9 keepMounted (cd5a31703)", () => {
  it("locks l9 closest data-index + last-row-controls, span 32", () => {
    const source = readFileSync(path.join(here, "officialTranscriptKeepMounted.ts"), "utf8");
    expect(source).toContain("[data-index]");
    expect(source).toContain("data-transcript-last-row-controls");
    expect(source).toContain("OFFICIAL_KEEP_SELECTION_SPAN = 32");
    expect(source).toContain("selectionchange");
    expect(source).toContain("activeElement");
    expect(source).toContain("rowsEl?.contains(active)");
    expect(source).not.toContain("channelEditing");
    expect(source).not.toContain("holdRegistry");
  });
});
