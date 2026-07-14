import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { SessionSummary } from "../../adapters/desktopBridge";
import type { LocalSessionsBridge, OfficialGitDiffComparison } from "../../adapters/desktopBridge/types";
import { parseLocalBranches, resolveOfficialBaseBranch } from "./composer/workspaceControlsHelpers";
import { OfficialSpinner } from "./cowork/CoworkActivitySpinner";
import { OfficialDiffFileRow } from "./diff/OfficialDiffFileRow";
import { OfficialDiffFileTree } from "./diff/OfficialDiffFileTree";
import {
  mapOfficialComparisonToFileEntries,
  OFFICIAL_DIFF_FILE_ATTR,
} from "./diff/diffFileTypes";

export type OfficialDiffCompareMeta = {
  base: string;
  headLabel: string;
};

type EpitaxySessionRef = {
  id: string;
  type: "local" | "remote" | "bridge";
};

/**
 * Official Code diff pane (c11959232 `rN` / `ng` / `oN` / `tu`→`Fc` / `sg` PierreWorkerPool / `Xh` tree):
 * - comparison = LocalSessions.getGitDiff structured payload (O7i/a2A), not raw stdout
 * - file list = official `tc`/`Yd` (only files with patch)
 * - full lines = getDiffFileContent → `{oldText,newText}` (H7i) via merge_base
 * - renderer = Pierre FileDiff (`Zd`)
 * - empty copy: "No changes to show."
 * - hideHeader: title bar owns Show files + base → head (oN)
 * - tree only when `showTree && canFitTree` (official `P = k && S`, S = width >= 400)
 * - `onCanFitTreeChange` → oN only shows Hide/Show files when canFitTree (c119 `d&&yd`)
 */
export function OfficialDiffPane({
  bridge,
  onCanFitTreeChange,
  onCompareMetaChange,
  session,
  sessionRef,
  showTree,
}: {
  bridge: LocalSessionsBridge;
  /** Official ng → oN: hide FolderOpenFront control when pane narrower than 400. */
  onCanFitTreeChange?: (canFit: boolean) => void;
  onCompareMetaChange?: (meta: OfficialDiffCompareMeta) => void;
  session: SessionSummary | null;
  sessionRef: EpitaxySessionRef;
  showTree: boolean;
}) {
  const [state, setState] = useState<{
    base: string;
    comparison: OfficialGitDiffComparison | null;
    error?: string;
    headLabel: string;
    isLoading: boolean;
  }>({ base: "main", comparison: null, headLabel: "working tree", isLoading: true });
  const [activePath, setActivePath] = useState<string | null>(null);
  // Official ng: S = useState(!0); tree still gated by width>=400 before paint when possible.
  const [canFitTree, setCanFitTree] = useState(true);
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const canFitTreeRef = useRef(true);
  const onCanFitTreeChangeRef = useRef(onCanFitTreeChange);
  onCanFitTreeChangeRef.current = onCanFitTreeChange;

  useEffect(() => {
    let alive = true;
    setState((current) => ({
      ...current,
      comparison: null,
      error: undefined,
      isLoading: true,
    }));
    setActivePath(null);

    void (async () => {
      const [gitInfoRaw, branchesRaw] = await Promise.all([
        bridge.getGitInfo?.(sessionRef.id).catch(() => null),
        bridge.getLocalBranches?.(sessionRef.id).catch(() => null),
      ]);
      if (!alive) return;

      const gitInfo = asRecord(gitInfoRaw);
      const currentBranch =
        stringValue(session?.repo?.branch) ??
        stringValue(gitInfo.branch) ??
        stringValue(gitInfo.currentBranch);
      const branches = parseLocalBranches(branchesRaw, currentBranch ?? "");
      const base = resolveOfficialBaseBranch({
        branches,
        currentBranch,
        defaultBranch: stringValue(gitInfo.defaultBranch),
      });
      const headLabel = currentBranch && currentBranch !== base ? currentBranch : "working tree";
      onCompareMetaChange?.({ base, headLabel });

      // Official O7i: getGitDiff(cwd, baseBranch) → comparison with files[].patch + merge_base.
      const comparison = (await bridge.getGitDiff?.(sessionRef.id, base).catch(() => null)) ?? null;
      if (!alive) return;

      setState({
        base,
        comparison,
        error: comparison ? undefined : "Failed to load diff",
        headLabel,
        isLoading: false,
      });
    })().catch((error) => {
      if (!alive) return;
      setState({
        base: "main",
        comparison: null,
        error: error instanceof Error ? error.message : "Failed to load diff",
        headLabel: "working tree",
        isLoading: false,
      });
    });

    return () => {
      alive = false;
    };
  }, [bridge, onCompareMetaChange, session?.repo?.branch, sessionRef.id]);

  // Official ng: b = Yd(comparison) = tc(comparison).
  const files = useMemo(
    () => mapOfficialComparisonToFileEntries(state.comparison),
    [state.comparison],
  );
  const contentRef = state.comparison?.merge_base ?? state.base;
  const treeFiles = useMemo(
    () => files.map((file) => ({ filePath: file.filePath, additions: file.additions, deletions: file.deletions })),
    [files],
  );

  const selectFile = useCallback((filePath: string) => {
    setActivePath(filePath);
    const target = listRef.current?.querySelector(`[${OFFICIAL_DIFF_FILE_ATTR}="${CSS.escape(filePath)}"]`);
    target?.scrollIntoView({ behavior: "instant" as ScrollBehavior, block: "start" });
  }, []);

  const applyCanFitTree = useCallback((next: boolean) => {
    if (canFitTreeRef.current === next) return;
    canFitTreeRef.current = next;
    setCanFitTree(next);
    onCanFitTreeChangeRef.current?.(next);
  }, []);

  // Official ng ResizeObserver: S = width >= 400; notify oN via onCanFitTreeChange when it flips.
  // useLayoutEffect so first paint does not mount the 240 tree into a narrow side pane
  // (content ~127px → wrap turns each line into multi-hundred-px rows → bars height:100%
  // looks like one continuous column). Official still uses useEffect; layout is safer here.
  useLayoutEffect(() => {
    if (files.length === 0) return;
    const node = layoutRef.current;
    if (!node) return;

    const measure = (width: number) => {
      if (width === 0) return;
      applyCanFitTree(width >= 400);
    };

    measure(node.getBoundingClientRect().width);

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      measure(entry?.contentRect.width ?? 0);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [applyCanFitTree, files.length]);

  // Keep parent oN in sync when this pane unmounts / remounts.
  useEffect(() => {
    onCanFitTreeChangeRef.current?.(canFitTreeRef.current);
    return () => {
      onCanFitTreeChangeRef.current?.(true);
    };
  }, []);

  if (state.isLoading) {
    return (
      <div role="status" className="h-full flex items-center justify-center text-t5">
        <OfficialSpinner />
        <span className="sr-only">Loading diff</span>
      </div>
    );
  }

  if (state.error) {
    return <div className="h-full flex items-center justify-center text-body text-t5 px-p8 text-center">{state.error}</div>;
  }

  // Official ng: comparison has files but tc yields none → "Diff content unavailable…"
  if (state.comparison && state.comparison.files.length > 0 && files.length === 0) {
    const count = state.comparison.files.length;
    return (
      <div className="h-full flex items-center justify-center text-body text-t5">
        {`Diff content unavailable for ${count === 1 ? "1 file" : `${count} files`}.`}
      </div>
    );
  }

  if (!state.comparison || files.length === 0) {
    return <div className="h-full flex items-center justify-center text-body text-t5">No changes to show.</div>;
  }

  // Official P = k && S (showTree && canFitTree).
  const showSidebar = showTree && canFitTree;

  // Official ng: flex h-full; tree 240 + stacked file rows.
  // Pierre pool (`sg`) is provided by session-level OfficialPierreWorkerPool (c119 kI), not here.
  return (
    <div className="h-full select-text flex flex-col text-body text-t8">
      <div ref={layoutRef} className="flex flex-1 min-h-0">
        {showSidebar ? (
          <div className="shrink-0 border-r border-[var(--border-default)] flex flex-col min-h-0" style={{ width: 240 }}>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <OfficialDiffFileTree activePath={activePath} files={treeFiles} onSelectFile={selectFile} />
            </div>
          </div>
        ) : null}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div ref={listRef} className="pb-[8px]">
              {files.map((file) => (
                <OfficialDiffFileRow
                  key={file.filePath}
                  bridge={bridge}
                  contentRef={contentRef}
                  file={file}
                  fileAttr={OFFICIAL_DIFF_FILE_ATTR}
                  sessionId={sessionRef.id}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
