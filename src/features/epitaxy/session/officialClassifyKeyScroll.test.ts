import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { officialKeyScrollLogicalKey } from "./officialClassifyKeyScroll";

const here = path.dirname(fileURLToPath(import.meta.url));

describe("official NZ key classify (ca80fca8d)", () => {
  it("jZ maps ctrl+Home/End and drops other modifiers", () => {
    expect(officialKeyScrollLogicalKey({
      altKey: false,
      ctrlKey: true,
      key: "Home",
      metaKey: false,
      shiftKey: false,
    } as KeyboardEvent)).toBe("Home");
    expect(officialKeyScrollLogicalKey({
      altKey: false,
      ctrlKey: true,
      key: "ArrowUp",
      metaKey: false,
      shiftKey: false,
    } as KeyboardEvent)).toBeNull();
    expect(officialKeyScrollLogicalKey({
      altKey: false,
      ctrlKey: false,
      key: "ArrowUp",
      metaKey: false,
      shiftKey: false,
    } as KeyboardEvent)).toBe("ArrowUp");
  });

  it("Fu uses NZ, not pin-file C; does not invent find/toast", () => {
    const fu = readFileSync(path.join(here, "officialTranscriptFu.ts"), "utf8");
    const nz = readFileSync(path.join(here, "officialClassifyKeyScroll.ts"), "utf8");
    expect(fu).toContain("officialClassifyKeyScroll");
    expect(fu).not.toContain("OFFICIAL_PIN_CLASSIFY_KEY_SCROLL");
    expect(nz).toContain("epitaxy-virtual-transcript");
    expect(nz).toContain("officialKeyScrollOutsideOverflow");
    expect(nz).not.toContain("skipIdleToasts");
    expect(nz).not.toContain("findInPage");
  });
});
