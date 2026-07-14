import { processFile, type FileDiffMetadata } from "@pierre/diffs";
import { FileDiff } from "@pierre/diffs/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { LocalSessionsBridge } from "../../../adapters/desktopBridge/types";
import {
  OfficialDiffGutterUtility,
  type OfficialDiffHoveredLine,
} from "./OfficialDiffGutterUtility";
import { useOfficialPierreTheme, useWorkerPool } from "./OfficialPierreWorkerPool";
import type { OfficialDiffFileEntry } from "./diffFileTypes";
// Registers official `diffs-container` CE + core Pierre CSS (c9a932a07 Zd host).
import "./ensurePierreDiffsContainer";
import { officialPierreLangFromPath } from "./officialPierreLang";

/**
 * Code file row (Fc-shaped shell + npm `@pierre/diffs` FileDiff):
 * - sticky `epitaxy-pane-subheader` with collapse chevron + path + +N -N
 * - body: package `FileDiff` when expanded and pool is ready
 * - full old/new via getDiffFileContent → `{ oldText, newText }`
 * - metrics / options match Desktop Fc (lineHeight 17, bars, wrap, …)
 * - renderer stack is pure package: do not mix ion `DlxMyTNL` worker or host chunks
 */
/** Desktop Hc ≈ { hunkLineCount, lineHeight:17, … }; package metrics use `spacing` for vertical gap. */
const OFFICIAL_DIFF_METRICS = {
  hunkLineCount: 50,
  lineHeight: 17,
  diffHeaderHeight: 44,
  hunkSeparatorHeight: 32,
  spacing: 8,
};

/**
 * Desktop Fc unsafeCSS (c9a Fc layout) + ion line-bg binding (c9a style sheet):
 * package 1.2 always color-mixes override into decoration (88% bg + 20% tint → nearly white);
 * ion uses `--diffs-line-bg: var(--diffs-bg-deletion|addition)` which is the override as-is
 * when epitaxy sets `--diffs-bg-*-override: var(--extended-20-*)`.
 */
const OFFICIAL_FC_UNSAFE_CSS =
  "[data-separator-wrapper] { padding-left: var(--p4); } [data-expand-button] { min-width: 16px; border-right: 0; } [data-separator-content] { padding: 0; } [data-column-number] { padding-left: calc(2ch + var(--p4)); } [data-code] { --diffs-code-grid: var(--diffs-grid-number-column-width) minmax(0, 1fr); overflow: clip; } [data-line], [data-annotation-content] { overflow-wrap: anywhere; min-width: 0; } [data-gutter] { position: sticky; left: 0; z-index: 1; background: var(--diffs-bg); } [data-line-type='change-deletion'] { --diffs-line-bg: var(--diffs-bg-deletion); --diffs-computed-diff-line-bg: var(--diffs-bg-deletion); --diffs-computed-selected-line-bg: var(--diffs-bg-deletion); } [data-line-type='change-deletion'][data-column-number], [data-line-type='change-deletion'][data-gutter-buffer] { --diffs-line-bg: var(--diffs-bg-deletion-number); --diffs-computed-diff-line-bg: var(--diffs-bg-deletion-number); --diffs-computed-selected-line-bg: var(--diffs-bg-deletion-number); } [data-line-type='change-addition'] { --diffs-line-bg: var(--diffs-bg-addition); --diffs-computed-diff-line-bg: var(--diffs-bg-addition); --diffs-computed-selected-line-bg: var(--diffs-bg-addition); } [data-line-type='change-addition'][data-column-number], [data-line-type='change-addition'][data-gutter-buffer] { --diffs-line-bg: var(--diffs-bg-addition-number); --diffs-computed-diff-line-bg: var(--diffs-bg-addition-number); --diffs-computed-selected-line-bg: var(--diffs-bg-addition-number); }";

export function OfficialDiffFileRow({
  bridge,
  contentRef,
  file,
  fileAttr,
  sessionId,
}: {
  bridge: LocalSessionsBridge;
  contentRef: string;
  file: OfficialDiffFileEntry;
  /** Official scroll target attribute (c11959232 `Jd` / c9a `jc`). */
  fileAttr: string;
  sessionId: string;
}) {
  const theme = useOfficialPierreTheme();
  // Official Fc mounts Zd under session-root `sg` (kI) so WorkerPoolContext is already set.
  // pierre FileDiff freezes workerManager in the constructor — if context is still undefined,
  // highlight falls to plain text forever (no data-diff-span / token colors). Gate Zd until pool is ready.
  const workerPool = useWorkerPool();
  const [collapsed, setCollapsed] = useState(false);
  const [fileLines, setFileLines] = useState<{
    error?: string;
    isLoading: boolean;
    newText?: string;
    oldText?: string;
  }>({ isLoading: false });

  const filePath = file.filePath;
  const rawFile = file.rawFile;
  const [dirPrefix, baseName] = useMemo(() => splitDisplayPath(filePath), [filePath]);

  // Official: fetchFileLines only when status is not added/removed.
  const canFetchFullLines = file.status !== "added" && file.status !== "removed";

  useEffect(() => {
    if (collapsed || !canFetchFullLines) {
      setFileLines({ isLoading: false });
      return;
    }
    let alive = true;
    setFileLines({ isLoading: true });

    // Official nN → H7i: getDiffFileContent(cwd, mergeBase, filePath, previous_filename?) → {oldText,newText}|null
    const linesPromise =
      bridge.getDiffFileContent?.(
        sessionId,
        contentRef,
        filePath,
        rawFile.previous_filename,
      ) ?? Promise.resolve(null);

    void linesPromise
      .then((result) => {
        if (!alive) return;
        if (!result) {
          setFileLines({ isLoading: false });
          return;
        }
        // Official: null!=oldText / null!=newText (empty string is valid full-side content).
        setFileLines({
          isLoading: false,
          oldText: result.oldText === null ? undefined : result.oldText,
          newText: result.newText === null ? undefined : result.newText,
        });
      })
      .catch((error) => {
        if (!alive) return;
        setFileLines({
          error: error instanceof Error ? error.message : "Failed to load file lines",
          isLoading: false,
        });
      });

    return () => {
      alive = false;
    };
  }, [
    bridge,
    canFetchFullLines,
    collapsed,
    contentRef,
    filePath,
    rawFile.previous_filename,
    sessionId,
  ]);

  /**
   * Official Fc fileDiff builder (`cd` / processFile) on `i.rawFile`:
   * ensure ---/+++ headers, processFile partial then full with old/new when available.
   */
  const fileDiff = useMemo(
    () => buildOfficialFileDiff(rawFile, file.contentHash, fileLines.oldText, fileLines.newText),
    [file.contentHash, fileLines.newText, fileLines.oldText, rawFile],
  );

  // Official Fc `$` / onAdd from gutter: stages draft annotation when line selection idle.
  // Annotation store (sc/$c/Bc) not ported yet — keep click path wired for DOM/class parity.
  const onGutterAdd = useCallback((_lineNumber: number, _side: OfficialDiffHoveredLine["side"]) => {
    // no-op until PR/draft annotation store is ported
  }, []);

  // Package FileDiff: renderGutterUtility + enableGutterUtility (InteractionManager slot).
  const renderGutterUtility = useCallback(
    (getHoveredLine: () => OfficialDiffHoveredLine | undefined) => (
      <OfficialDiffGutterUtility getHoveredLine={getHoveredLine} onAdd={onGutterAdd} />
    ),
    [onGutterAdd],
  );

  // Package FileDiffOptions (API names from `@pierre/diffs`, not ion aliases).
  // onPostRender: package hydrate can mark highlighted=true before the worker lands;
  // without a re-apply, token spans never paint. This stays on package APIs only.
  const options = useMemo(
    () => ({
      theme,
      diffStyle: "unified" as const,
      diffIndicators: "bars" as const,
      overflow: "wrap" as const,
      disableFileHeader: true,
      enableLineSelection: true,
      enableGutterUtility: true,
      lineDiffType: "word-alt" as const,
      unsafeCSS: OFFICIAL_FC_UNSAFE_CSS,
      onPostRender(node: HTMLElement, instance: { rerender: () => void }, phase: string) {
        const host = node as HTMLElement & {
          __pierreTokenPaintTimer?: number;
          __pierreTokenPaintLastRerender?: number;
        };
        if (phase === "unmount") {
          if (host.__pierreTokenPaintTimer != null) {
            window.clearInterval(host.__pierreTokenPaintTimer);
            host.__pierreTokenPaintTimer = undefined;
          }
          host.__pierreTokenPaintLastRerender = undefined;
          return;
        }
        if (domHasDiffTokens(host) || host.__pierreTokenPaintTimer != null) return;
        const hunksRenderer = (instance as unknown as {
          hunksRenderer?: { renderCache?: { result?: unknown; highlighted?: boolean } };
        }).hunksRenderer;
        const renderCache = hunksRenderer?.renderCache;
        if (renderCache?.highlighted && !resultHasDiffTokens(renderCache.result)) {
          renderCache.highlighted = false;
        }
        const started = Date.now();
        const stop = () => {
          if (host.__pierreTokenPaintTimer != null) {
            window.clearInterval(host.__pierreTokenPaintTimer);
            host.__pierreTokenPaintTimer = undefined;
          }
        };
        const tick = () => {
          if (domHasDiffTokens(host)) {
            stop();
            return;
          }
          const cache = hunksRenderer?.renderCache;
          if (resultHasDiffTokens(cache?.result)) {
            const now = Date.now();
            if (
              host.__pierreTokenPaintLastRerender == null ||
              now - host.__pierreTokenPaintLastRerender > 80
            ) {
              host.__pierreTokenPaintLastRerender = now;
              instance.rerender();
            }
            return;
          }
          if (cache?.highlighted && !resultHasDiffTokens(cache.result)) {
            cache.highlighted = false;
          }
          if (Date.now() - started > 3000) stop();
        };
        host.__pierreTokenPaintTimer = window.setInterval(tick, 50);
        tick();
      },
    }),
    [theme],
  );

  const expanded = !collapsed && fileDiff !== null;
  // FileDiff freezes workerManager at construct time — mount only after package pool is ready.
  const canMountPierre = expanded && fileDiff !== null && workerPool != null;
  const attrProps = { [fileAttr]: filePath } as Record<string, string>;

  return (
    <div {...attrProps}>
      <div className="epitaxy-pane-subheader sticky top-0 z-[4]">
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          disabled={!fileDiff}
          aria-expanded={fileDiff ? expanded : undefined}
          aria-label={expanded ? "Collapse file" : "Expand file"}
          className="flex items-center justify-center size-[16px] shrink-0 text-t5 enabled:hover:text-t7 disabled:opacity-40 outline-none hide-focus-ring ring-focus rounded-r2"
        >
          <svg
            width={16}
            height={16}
            viewBox="0 0 16 16"
            aria-hidden="true"
            className={expanded ? undefined : "-rotate-90"}
          >
            <path
              d="M3.47 5.47a.75.75 0 0 1 1.06 0L8 8.94l3.47-3.47a.75.75 0 1 1 1.06 1.06l-4 4a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 0 1 0-1.06"
              fill="currentColor"
            />
          </svg>
        </button>
        <span className="flex min-w-0 overflow-hidden text-code text-t7" title={filePath}>
          {dirPrefix ? <span className="truncate">{dirPrefix}</span> : null}
          <span className={dirPrefix ? "shrink-0" : "truncate"}>{baseName}</span>
        </span>
        <span className="shrink-0 text-code">
          <span className="text-extended-green">{`+${file.additions}`}</span>
          {" "}
          <span className="text-extended-pink">{`-${file.deletions}`}</span>
        </span>
      </div>
      {canMountPierre && fileDiff ? (
        <div className="epitaxy-diff-panel mx-[1px]">
          <FileDiff
            key={`${file.contentHash}:${fileDiff.isPartial ? "partial" : "full"}:pool`}
            fileDiff={fileDiff}
            metrics={OFFICIAL_DIFF_METRICS}
            options={options}
            renderGutterUtility={renderGutterUtility}
          />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Official Fc `cd`-shaped builder (c9a932a07) on rawFile:
 * ensure ---/+++ headers, processFile partial then full with old/new when available.
 */
function buildOfficialFileDiff(
  rawFile: OfficialDiffFileEntry["rawFile"],
  contentHash: string,
  oldText: string | undefined,
  newText: string | undefined,
): FileDiffMetadata | null {
  if (!rawFile.patch) return null;
  // Official: ensure ---/+++ when patch is hunk-only; keep diff --git patches as-is.
  const patch = ensurePatchHeaders(rawFile.patch, rawFile);
  const baseKey = `${rawFile.filename}::${contentHash}`;
  // Official cd: oldFile = null!=oldText ? {contents:oldText} : undefined
  //              newFile = null!=newText ? {name:filename, contents:newText} : undefined
  // Pierre 1.2 processFile accepts oldFile without name; name is only required by TS FileContents.
  // Official cd: oldFile = null!=oldText ? {contents:r} : undefined (no name).
  // Pierre 1.2 TS FileContents requires name — cast to match official runtime shape.
  const oldFile =
    oldText !== undefined
      ? ({ contents: oldText } as unknown as { name: string; contents: string })
      : undefined;
  const newFile =
    newText !== undefined ? ({ name: rawFile.filename, contents: newText } as const) : undefined;
  const hasFull = oldFile !== undefined && newFile !== undefined;

  let parsed = processFile(patch, {
    cacheKey: hasFull ? `${baseKey}::full` : baseKey,
    oldFile,
    newFile,
  });
  if (!parsed) return null;

  // Official: if full parse leaves invalid trailing context, re-parse as partial.
  if (!parsed.isPartial && !hasValidTrailingContext(parsed)) {
    parsed = processFile(patch, { cacheKey: baseKey }) ?? parsed;
  }

  parsed.name = rawFile.filename;
  parsed.prevName = rawFile.previous_filename ?? undefined;
  // Official: c.lang || (c.lang = Ga(e.filename))
  if (!parsed.lang) parsed.lang = officialPierreLangFromPath(rawFile.filename);
  return parsed;
}

/** Official ensure ---/+++ wrapper when patch is hunk-only. */
function ensurePatchHeaders(
  patch: string,
  file: { filename: string; previous_filename?: string; status: string },
) {
  if (patch.startsWith("---") || patch.startsWith("diff --git")) return patch;
  const oldPath =
    file.status === "added" ? "/dev/null" : `a/${file.previous_filename ?? file.filename}`;
  const newPath = file.status === "removed" ? "/dev/null" : `b/${file.filename}`;
  return `--- ${oldPath}\n+++ ${newPath}\n${patch}`;
}

/** Official trailing-context check after full processFile. */
function hasValidTrailingContext(fileDiff: FileDiffMetadata) {
  const last = fileDiff.hunks.at(-1);
  if (!last) return true;
  const addTail = fileDiff.additionLines.length - (last.additionLineIndex + last.additionCount);
  const delTail = fileDiff.deletionLines.length - (last.deletionLineIndex + last.deletionCount);
  return addTail === delTail && addTail >= 0;
}

function resultHasDiffTokens(result: unknown): boolean {
  if (result == null) return false;
  try {
    return JSON.stringify(result).includes("--diffs-token");
  } catch {
    return false;
  }
}

function domHasDiffTokens(host: HTMLElement): boolean {
  return (host.shadowRoot?.querySelector("[data-code]")?.innerHTML ?? "").includes(
    "--diffs-token",
  );
}

/** Path display split (dir prefix / basename, mid-path bias). */
function splitDisplayPath(path: string): [string, string] {
  const last = path.lastIndexOf("/");
  if (last <= 0) return ["", path];
  const mid = Math.floor(path.length / 2);
  let cut = path.indexOf("/", mid);
  if (cut === -1 || cut >= last) cut = last;
  return [path.slice(0, cut + 1), path.slice(cut + 1)];
}

