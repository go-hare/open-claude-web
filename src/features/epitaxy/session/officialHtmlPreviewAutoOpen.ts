/**
 * Official c11959232 `oE` — html-preview-* auto-open.
 *
 * Pin oE: first snapshot of starting/running ids is seed (no open);
 * later new PI-matching html-preview-* ids bind + setSidePane("preview")
 * + addHtmlFile immediately (no Vu/Sd delay).
 * Do not invent a second preview stack; bindPreviewServer + loadHtmlPreview
 * is the local Launch residual.
 */
import { useEffect, useRef } from "react";

export const OFFICIAL_HTML_PREVIEW_PREFIX = "html-preview-";

/** Official c119 `tt` / shared-28 `Ok` — local non-remote openFile → Preview, not File. */
export const OFFICIAL_TT_HTML_PREVIEW_EXT = /\.(html?|svg|pdf|mp4|webm|m4v|mov|ogv)$/i;

export function isOfficialTtHtmlPreviewPath(filePath: string) {
  return OFFICIAL_TT_HTML_PREVIEW_EXT.test(filePath);
}

/** Official `tt` `a`: abs = path.startsWith("/") ? path : `${cwd}/${path}`. */
export function officialTtHtmlPreviewAbsPath(filePath: string, cwd?: string) {
  if (!filePath) return filePath;
  if (filePath.startsWith("/") || /^[A-Za-z]:[\\/]/.test(filePath)) return filePath;
  if (!cwd) return filePath;
  return `${cwd.replace(/[\\/]+$/, "")}/${filePath.replace(/^[\\/]+/, "")}`;
}

type LaunchHtmlPreview = {
  loadHtmlPreview?: (filePath: string) => Promise<string | null | undefined>;
};

/** Official `Ci?.loadHtmlPreview` — Launch residual. Missing → tt falls back to File pane. */
export function officialLoadHtmlPreview(filePath: string): Promise<string | null | undefined> {
  if (typeof window === "undefined") return Promise.resolve(null);
  const launch = (window as Window & { "claude.web"?: { Launch?: LaunchHtmlPreview } })["claude.web"]?.Launch;
  if (typeof launch?.loadHtmlPreview !== "function") return Promise.resolve(null);
  return launch.loadHtmlPreview(filePath);
}

export type OfficialHtmlPreviewServerRow = {
  cwd?: string;
  externalUrl?: string;
  filePath?: string;
  name?: string;
  serverId?: string;
  sessionId?: string;
  status?: string;
};

export function isOfficialHtmlPreviewServerId(id: string | undefined | null) {
  return typeof id === "string" && id.startsWith(OFFICIAL_HTML_PREVIEW_PREFIX);
}

export function officialHtmlPreviewFilePath(row: OfficialHtmlPreviewServerRow) {
  if (typeof row.filePath === "string" && row.filePath.length > 0) return row.filePath;
  if (typeof row.cwd === "string" && typeof row.name === "string") {
    return `${row.cwd.replace(/\/$/, "")}/${row.name}`;
  }
  return null;
}

/**
 * Official c119 `PI(e,t)`:
 *   if (!e.cwd.startsWith(t)) return false;
 *   s = e.cwd.slice(t.length);
 *   return !(s.length>0 && !s.startsWith("/")) && !s.includes("/.claude/worktrees/")
 *
 * Wu auto-open only when the html-preview cwd is under the session cwd and
 * not a nested `/.claude/worktrees/` remainder.
 */
export function officialHtmlPreviewMatchesSessionCwd(
  rowCwd: string | undefined,
  sessionCwd: string | undefined,
) {
  if (!rowCwd || !sessionCwd) return false;
  if (!rowCwd.startsWith(sessionCwd)) return false;
  const remainder = rowCwd.slice(sessionCwd.length);
  if (remainder.length > 0 && !remainder.startsWith("/")) return false;
  return !remainder.includes("/.claude/worktrees/");
}

export function officialHtmlPreviewShouldAutoOpen(
  row: OfficialHtmlPreviewServerRow,
  sessionCwd?: string,
) {
  const id = row.serverId ?? "";
  if (!isOfficialHtmlPreviewServerId(id)) return false;
  if (typeof row.externalUrl === "string" && row.externalUrl.length > 0) return false;
  if (officialHtmlPreviewFilePath(row) === null) return false;
  if (sessionCwd !== undefined) return officialHtmlPreviewMatchesSessionCwd(row.cwd, sessionCwd);
  return true;
}

/**
 * Official TI Globe `$` rows from Nr `htmlFiles`.
 * label = basename; hint = cwd-relative path when it differs from basename.
 */
/** Official TI `L` — selected Globe row is the bound html-preview-* filePath. */
export function officialSelectedHtmlFilePath(
  previewServerId: string | undefined,
  htmlFiles: readonly string[],
  previewTargetPath?: string | null,
) {
  if (!isOfficialHtmlPreviewServerId(previewServerId) || htmlFiles.length === 0) return undefined;
  if (previewTargetPath && htmlFiles.includes(previewTargetPath)) return previewTargetPath;
  return htmlFiles[htmlFiles.length - 1];
}

export function officialHtmlFilesGlobeItems(
  files: readonly string[],
  cwd: string | undefined,
  selectedPath: string | undefined,
) {
  return files.map((path) => {
    const label = path.split("/").pop() ?? path;
    const relative = cwd && path.startsWith(`${cwd}/`) ? path.slice(cwd.length + 1) : path;
    return {
      hint: relative === label ? undefined : relative,
      label,
      path,
      selected: path === selectedPath,
    };
  });
}

type LaunchActiveServers = {
  activeServers_$store$_getState?: () => Promise<OfficialHtmlPreviewServerRow[] | null | undefined> | OfficialHtmlPreviewServerRow[] | null | undefined;
};

function launchActiveServers(): LaunchActiveServers | null {
  if (typeof window === "undefined") return null;
  const web = (window as Window & { "claude.web"?: { Launch?: LaunchActiveServers } })["claude.web"];
  return web?.Launch ?? null;
}

/**
 * Official oE: first starting/running snapshot is seed; later new PI html-preview-* open now.
 */
export function useOfficialHtmlPreviewAutoOpen({
  enabled,
  onOpen,
  sessionCwd,
  sessionId,
}: {
  enabled: boolean;
  onOpen: (input: { filePath: string; serverId: string }) => void;
  sessionCwd?: string;
  sessionId?: string;
}) {
  const seenRef = useRef<Set<string> | null>(null);
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  useEffect(() => {
    seenRef.current = null;
  }, [sessionId]);

  useEffect(() => {
    if (!enabled || !sessionId || !sessionCwd) return undefined;
    let alive = true;
    const tick = async () => {
      const rows = await launchActiveServers()?.activeServers_$store$_getState?.();
      if (!alive || !Array.isArray(rows)) return;
      const liveIds = new Set<string>();
      for (const row of rows) {
        const id = row.serverId ?? "";
        if (!id) continue;
        if (row.status !== "starting" && row.status !== "running") continue;
        liveIds.add(id);
      }
      if (seenRef.current === null) {
        seenRef.current = liveIds;
        return;
      }
      for (const row of rows) {
        const id = row.serverId ?? "";
        if (!id || !liveIds.has(id) || seenRef.current.has(id)) continue;
        if (!officialHtmlPreviewShouldAutoOpen({ ...row, sessionId: row.sessionId ?? sessionId }, sessionCwd)) continue;
        if (row.sessionId && row.sessionId !== sessionId) continue;
        const filePath = officialHtmlPreviewFilePath(row);
        if (!filePath) continue;
        onOpenRef.current({ filePath, serverId: id });
      }
      seenRef.current = liveIds;
    };
    void tick();
    const timer = window.setInterval(() => void tick(), 500);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [enabled, sessionCwd, sessionId]);
}
