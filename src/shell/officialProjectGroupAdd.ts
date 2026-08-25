import type { SessionSummary } from "../adapters/desktopBridge";
import { setSelectedFolder } from "../features/customize/selectedFolderStore";

/**
 * Official ca0135 fl mapping `d`: first local cwd in the project bucket.
 * Skip remote-control rows (product densable; official uses source.kind).
 */
export function projectGroupFolder(sessions: SessionSummary[]): string | null {
  for (const session of sessions) {
    const cwd = session.cwd?.trim();
    if (!cwd || cwd.startsWith("remote-control:")) continue;
    return cwd;
  }
  return null;
}

/**
 * Official ca0135 fl Add click:
 *   if mapping `c`: `u(c)` → setSelectedFolder + push `/code` (no reset-draft)
 *   else: `epitaxy:reset-draft` + push `/code`
 */
export function applyOfficialProjectGroupAdd(options: {
  folder: string | null;
  navigate: () => void;
}): void {
  if (options.folder) {
    setSelectedFolder(options.folder);
    options.navigate();
    return;
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("epitaxy:reset-draft"));
  }
  options.navigate();
}
