/**
 * Official Kv residual (shared-6): localStorage key `epitaxy-transcript-links-in-preview`.
 * Settings Open-links row (cdc95db1a `f`) writes this; Cowork markdown `linkElement` consumes it.
 */

export const EPITAXY_TRANSCRIPT_LINKS_IN_PREVIEW_KEY =
  "epitaxy-transcript-links-in-preview";

export function readTranscriptLinksInPreview(): boolean {
  try {
    // Official Al(Kv, true) — default ON when the key is absent.
    return window.localStorage.getItem(EPITAXY_TRANSCRIPT_LINKS_IN_PREVIEW_KEY) !== "false";
  } catch {
    return true;
  }
}

export function writeTranscriptLinksInPreview(next: boolean): void {
  try {
    window.localStorage.setItem(
      EPITAXY_TRANSCRIPT_LINKS_IN_PREVIEW_KEY,
      next ? "true" : "false",
    );
  } catch {
    /* ignore quota / private mode */
  }
}

type LaunchBridge = {
  openExternalLinkInPreview?: (
    previewId?: string,
    cwd?: string,
    url?: string,
  ) => Promise<unknown> | unknown;
  navigatePreview?: (url: string) => Promise<unknown> | unknown;
  showPreview?: () => Promise<unknown> | unknown;
};

function launchBridge(): LaunchBridge | undefined {
  const web = window["claude.web"] as { Launch?: LaunchBridge } | undefined;
  return web?.Launch;
}

/**
 * Official cdc95 `f` consume: when the toggle is on, transcript links open in the
 * built-in preview instead of the OS default browser. No Launch IPC → fall through.
 */
export function handleCoworkTranscriptLinkClick(
  event: { preventDefault: () => void },
  url: string,
): boolean {
  if (!readTranscriptLinksInPreview()) return false;
  const launch = launchBridge();
  if (typeof launch?.openExternalLinkInPreview === "function") {
    event.preventDefault();
    void launch.openExternalLinkInPreview(url);
    return true;
  }
  if (typeof launch?.navigatePreview === "function") {
    event.preventDefault();
    void launch.navigatePreview(url);
    return true;
  }
  return false;
}
