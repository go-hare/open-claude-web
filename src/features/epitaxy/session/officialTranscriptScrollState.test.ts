import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { OFFICIAL_SCROLL_FADE_PX, OFFICIAL_SCROLL_JUMP_PX } from "./officialTranscriptScrollState";

const here = path.dirname(fileURLToPath(import.meta.url));

function readSrc(name: string) {
  return readFileSync(path.join(here, name), "utf8");
}

describe("official D9 / gw end-sentinel scroll state (cd5a31703 + shared-4)", () => {
  it("locks fade 8 / jump 200 IO, not scrollHeight math", () => {
    expect(OFFICIAL_SCROLL_FADE_PX).toBe(8);
    expect(OFFICIAL_SCROLL_JUMP_PX).toBe(200);
    const source = readSrc("officialTranscriptScrollState.ts");
    expect(source).toContain("IntersectionObserver");
    expect(source).toContain("rootMargin");
    expect(source).toContain("showScrollButton");
    expect(source).toContain("!held && !jumpIntersecting");
    expect(source).toContain("!held && !fadeIntersecting");
    expect(source).toContain("${marginPx - overlayPx}");
    expect(source).not.toContain("distanceFromBottom");
    expect(source).not.toContain("scrollHeight - node.scrollTop");
  });

  it("Transcript mounts D9 sentinel over the sizer and wires gw", () => {
    const transcript = readSrc("OfficialTranscript.tsx");
    const fu = readSrc("officialTranscriptFu.ts");
    expect(transcript).toContain('data-testid="transcript-end-sentinel"');
    expect(transcript).toContain("absolute bottom-0 left-0 h-px w-full pointer-events-none");
    expect(transcript).toContain("useOfficialTranscriptScrollState");
    expect(transcript).not.toContain("distanceFromBottom");
    expect(fu).toContain("getScrollElement");
    expect(fu).toContain("subscribePin: pin.subscribe");
    expect(fu).toContain("officialWindowOverscanPx()");
    expect(fu).not.toMatch(/keepAllRowsMounted:\s*true/);
  });
});
