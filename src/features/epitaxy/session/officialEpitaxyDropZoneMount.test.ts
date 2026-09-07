import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Official Ek (c11959232): `jsxs(Ek,{className:"h-full min-w-0 flex flex-col"`
 * wraps title + greeting + chat + tC pills + Qj. Overlay Pk is
 * `epitaxy-drop-overlay absolute inset-0` of that column — not the
 * shrink-0 composer chrome (tC `pb-p3` overlaps Qj; wrapping only
 * pills+prompt rings the workspace pills).
 */
const dir = dirname(fileURLToPath(import.meta.url));
const webSrc = join(dir, "..", "..", "..");

function readSrc(rel: string): string {
  return readFileSync(join(webSrc, rel), "utf8");
}

describe("official Ek DropZone mount (c11959232)", () => {
  it("draft home mounts Ek on the session column, not OfficialCodeComposer", () => {
    const home = readSrc("features/epitaxy/EpitaxyHome.tsx");
    const composer = readSrc("features/epitaxy/composer/OfficialCodeComposer.tsx");
    expect(home).toContain('<OfficialEpitaxyDropZone');
    expect(home).toContain('className="h-full min-w-0 flex flex-col"');
    expect(composer).not.toContain("<OfficialEpitaxyDropZone");
    expect(composer).toContain("dropHandlersRef");
  });

  it("existing session mounts Ek on the tile column; Qj chrome is shrink-0", () => {
    const tile = readSrc("features/epitaxy/EpitaxySessionTile.tsx");
    const existing = readSrc("features/epitaxy/session/OfficialExistingSessionComposer.tsx");
    expect(tile).toContain("<OfficialEpitaxyDropZone");
    expect(tile).toContain('className="h-full min-w-0 flex flex-col"');
    expect(existing).not.toContain("<OfficialEpitaxyDropZone");
    expect(existing).toContain(
      'className="epitaxy-chat-column epitaxy-chat-size relative shrink-0 flex flex-col gap-g5 [contain:layout]"',
    );
    // Official vI: jsxs(Ek) fills iE. KI flex wrap only when a side column exists.
    expect(tile).toContain("{hasSidePanes ? (");
    expect(tile).toContain(") : chatColumn}");
  });

  it("PaneLayout session content keeps official overflow-x-clip overflow-y-auto (cbc59a8af)", () => {
    const pane = readSrc("shell/PaneLayout.tsx");
    expect(pane).toContain(
      'const contentClassName = "flex-1 min-h-0 relative flex flex-col overflow-x-clip overflow-y-auto"',
    );
    expect(pane).not.toContain("overflow-hidden");
  });

  it("iE isolate rounded-r6 is OfficialChatTileShell only — not a second box around Ek", () => {
    const tile = readSrc("features/epitaxy/EpitaxySessionTile.tsx");
    const home = readSrc("features/epitaxy/EpitaxyHome.tsx");
    expect(tile).toContain("<OfficialChatTileShell onActivate=");
    expect(tile).toContain("<OfficialEpitaxyDropZone");
    expect(tile).not.toContain('className="h-full w-full min-w-0 relative isolate rounded-r6"');
    expect(home).toContain("<OfficialChatTileShell onActivate=");
    expect(home).toContain("<OfficialEpitaxyDropZone");
    expect(home).not.toContain('className="h-full w-full min-w-0 relative isolate rounded-r6"');
  });

  it("iE shell wires official onFocusCapture/onPointerDownCapture (setFocusedTile)", () => {
    const shell = readSrc("features/epitaxy/OfficialEpitaxyComponents.tsx");
    expect(shell).toContain("onFocusCapture={onActivate}");
    expect(shell).toContain("onPointerDownCapture={onActivate}");
  });

  it("folder drop uses officialNativeFilePath (r2) not File.path", () => {
    const existing = readSrc("features/epitaxy/session/OfficialExistingSessionComposer.tsx");
    const composer = readSrc("features/epitaxy/composer/OfficialCodeComposer.tsx");
    expect(existing).toContain("officialNativeFilePath");
    expect(composer).toContain("officialNativeFilePath");
    expect(existing).not.toContain("(first as File & { path?: string }).path");
    expect(composer).not.toContain("(first as File & { path?: string }).path");
  });

  it("workspace pills keep official pb-p3 overlap class", () => {
    const pills = readSrc("features/epitaxy/composer/OfficialWorkspaceControls.tsx");
    expect(pills).toContain('className="flex flex-wrap gap-g5 pb-p3 pr-[96px]"');
  });

  it("Qj StarterKit disables dropcursor (official disableDropCursor:!0)", () => {
    const prompt = readSrc("features/epitaxy/OfficialPromptEditor.tsx");
    const existing = readSrc("features/epitaxy/session/OfficialExistingSessionComposer.tsx");
    expect(prompt).toContain("dropcursor: false");
    expect(existing).toContain("dropcursor: false");
  });

  it("Fu pin layout deps include viewportHeight (c3d5 H / composer shelf shrink)", () => {
    const transcript = readSrc("features/epitaxy/session/OfficialTranscript.tsx");
    expect(transcript).toContain(
      "}, [isScrolling, itemCount, totalSize, tryRestoreAnchorKey, viewportHeight]);",
    );
    expect(transcript).toContain("sizerHeight = Math.max(totalSize, viewportHeight)");
  });

  it("chat tiles-shell is official overflowMin, not idle translateZ (c119 YI)", () => {
    const surface = readSrc("features/epitaxy/EpitaxyFrameSurface.tsx");
    expect(surface).toContain('position: "absolute"');
    expect(surface).toContain("minWidth: 320");
    expect(surface).not.toMatch(/const tileShellStyle[\s\S]*?translateZ\(1px\)/);
  });

  it("Ek uses official bubble onDragEnter/Leave/Over/Drop and Pk overlay", () => {
    const zone = readSrc("features/epitaxy/session/OfficialEpitaxyDropZone.tsx");
    expect(zone).toContain("onDragEnter={onDragEnter}");
    expect(zone).toContain("onDragLeave={onDragLeave}");
    expect(zone).toContain("onDragOver={onDragOver}");
    expect(zone).toContain("onDrop={onDrop}");
    expect(zone).toContain("epitaxy-drop-overlay absolute inset-0 z-40 pointer-events-none");
    expect(zone).not.toContain("addEventListener");
    expect(zone).not.toContain("onDragOverCapture");
    expect(zone).not.toContain("overflow-clip");
    expect(zone).not.toContain("data-skip-approval-enter");
  });
});
