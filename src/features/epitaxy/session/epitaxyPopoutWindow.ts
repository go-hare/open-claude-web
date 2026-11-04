import type { OfficialViewPane } from "../OfficialEpitaxyComponents";
import type { OfficialFileViewTarget } from "./OfficialFilePane";

const POPOUT_PANES = new Set<string>([
  "file",
  "plan",
  "diff",
  "preview",
  "terminal",
  "tasks",
  "runs",
  "browser",
  "framebuffer",
]);

/** Official cd377 `Ci` — popout BrowserWindow loads the session with `?popout=<tileId>`. */
export function readEpitaxyPopoutPane(): OfficialViewPane | null {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("popout");
  if (!value || !POPOUT_PANES.has(value)) return null;
  return value as OfficialViewPane;
}

export function isEpitaxyPopoutWindow(): boolean {
  return readEpitaxyPopoutPane() !== null;
}

/**
 * Official c563 `bt` + cccc `XO`/`gh`: popout host hydrates fileTabs/fileView
 * from the openPopout payload (product: query string on the same URL).
 */
export function readEpitaxyPopoutHydration(): {
  fileTabs: string[];
  fileView: OfficialFileViewTarget | null;
  pane: OfficialViewPane;
} | null {
  if (typeof window === "undefined") return null;
  const pane = readEpitaxyPopoutPane();
  if (!pane) return null;
  const params = new URLSearchParams(window.location.search);
  const file = params.get("file") ?? "";
  const lineRaw = params.get("line");
  const line = lineRaw ? Number(lineRaw) : undefined;
  const findQuery = params.get("find") ?? undefined;
  let fileTabs: string[] = [];
  const tabsRaw = params.get("tabs");
  if (tabsRaw) {
    try {
      const parsed: unknown = JSON.parse(tabsRaw);
      if (Array.isArray(parsed)) {
        fileTabs = parsed.filter((item): item is string => typeof item === "string" && item.length > 0);
      }
    } catch {
      fileTabs = [];
    }
  }
  const fileView: OfficialFileViewTarget | null = file
    ? {
        path: file,
        ...(Number.isFinite(line) ? { line } : {}),
        ...(findQuery ? { findQuery } : {}),
      }
    : null;
  if (file && !fileTabs.includes(file)) fileTabs = [...fileTabs, file];
  return { pane, fileView, fileTabs };
}

export function officialViewPanePopoutTitle(
  view: OfficialViewPane,
  session: { title?: string } | null,
): string {
  if (view === "file") return "Files";
  if (view === "plan") return "Plan";
  if (view === "diff") return "Diff";
  if (view === "preview") return "Preview";
  if (view === "terminal") return "Terminal";
  if (view === "tasks") return "Tasks";
  if (view === "runs") return "Runs";
  if (session?.title) return session.title;
  return view;
}
