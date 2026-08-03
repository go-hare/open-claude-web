/**
 * Official c11959232 tool-row diff body (Zg diffMeta + sx diff branch + Xg badge).
 * - meta builder: Write/Edit/MultiEdit/NotebookEdit → parseDiffFromFile (su)
 * - pureSide new/deleted → pierre `File` (rx/iu) with green/pink line chrome
 * - mixed change → pierre `FileDiff` (hh) unified classic indicators
 * - row badge: Xg +N -M after settled
 */
import { parseDiffFromFile, type FileContents, type FileDiffMetadata } from "@pierre/diffs";
import { File, FileDiff } from "@pierre/diffs/react";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { OfficialButton } from "../OfficialEpitaxyComponents";
import { officialPierreLangFromPath } from "./officialPierreLang";
import { useOfficialPierreTheme, useWorkerPool } from "./OfficialPierreWorkerPool";
import { pierreTokenPaintOnPostRender } from "./pierreTokenPaint";
import "./ensurePierreDiffsContainer";

const TOOL_DIFF_GAP_CSS =
  "[data-code] { padding-bottom: var(--diffs-gap-block, var(--diffs-gap-fallback)); }";

/** Compact metrics for in-transcript tool diffs (not the side Diff pane Fc metrics). */
const TOOL_DIFF_METRICS = {
  hunkLineCount: 50,
  lineHeight: 17,
  diffHeaderHeight: 0,
  hunkSeparatorHeight: 28,
  spacing: 6,
};

/**
 * Collapse wrappers (framer-motion height 0→auto + overflow:hidden) can clip a
 * child that still reports content height. Treat any zero-height overflow-hidden
 * ancestor as "not ready" so Pierre does not hydrate into a clipped host.
 */
function isPierreHostLayoutReady(host: HTMLElement): boolean {
  if (host.getBoundingClientRect().height < 1) return false;
  let node: HTMLElement | null = host;
  while (node) {
    const style = window.getComputedStyle(node);
    const overflowHidden =
      style.overflow === "hidden" ||
      style.overflowY === "hidden" ||
      style.overflowX === "hidden";
    if (overflowHidden && node.getBoundingClientRect().height < 1) return false;
    node = node.parentElement;
  }
  return true;
}

/**
 * Official tool rows mount under `OfficialCollapse` (framer-motion height 0→auto).
 * Pierre `File`/`FileDiff` freezes worker + hydrates into `diffs-container` shadow on first
 * attach; when that happens at height:0 the shadow can end with only the SVG sprite / empty
 * `<pre>` and never re-paint lines.
 *
 * Strategy:
 * - Keep plain pre mounted while waiting (gives host intrinsic height for measurement).
 * - Promote to Pierre only when host + overflow-hidden collapse ancestors have height.
 * - Never force-mount Pierre into a still-clipped collapse (that was the empty shell bug).
 * - If layout never becomes ready, plain pre stays — content is never blank.
 */
function usePierreLayoutMountReady(hostRef: RefObject<HTMLElement | null>) {
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    let cancelled = false;
    let raf1 = 0;
    let raf2 = 0;
    let pollTimer = 0;

    const markReady = () => {
      if (cancelled) return;
      // Double rAF: wait one paint after collapse spring starts measuring height:auto.
      raf1 = window.requestAnimationFrame(() => {
        raf2 = window.requestAnimationFrame(() => {
          if (!cancelled) setReady(true);
        });
      });
    };

    setReady(false);

    const tryReady = () => {
      if (cancelled) return true;
      const node = hostRef.current;
      if (!node || !isPierreHostLayoutReady(node)) return false;
      markReady();
      return true;
    };

    if (tryReady()) {
      return () => {
        cancelled = true;
        window.cancelAnimationFrame(raf1);
        window.cancelAnimationFrame(raf2);
      };
    }

    let observer: ResizeObserver | null = null;
    const observeIfNeeded = () => {
      const node = hostRef.current;
      if (!node || observer) return;
      observer = new ResizeObserver(() => {
        if (tryReady()) {
          observer?.disconnect();
          observer = null;
        }
      });
      observer.observe(node);
    };
    observeIfNeeded();
    // Collapse spring is ~350ms; poll while height animates open / ref attaches.
    // Also observe ancestors: host height can be non-zero from plain pre while the
    // motion.div ancestor is still height:0 overflow:hidden.
    const ancestorObservers: ResizeObserver[] = [];
    const node = hostRef.current;
    if (node) {
      let ancestor: HTMLElement | null = node.parentElement;
      while (ancestor) {
        const style = window.getComputedStyle(ancestor);
        const overflowHidden =
          style.overflow === "hidden" ||
          style.overflowY === "hidden" ||
          style.overflowX === "hidden";
        if (overflowHidden) {
          const ao = new ResizeObserver(() => {
            if (tryReady()) {
              ao.disconnect();
              observer?.disconnect();
              window.clearInterval(pollTimer);
            }
          });
          ao.observe(ancestor);
          ancestorObservers.push(ao);
        }
        ancestor = ancestor.parentElement;
      }
    }
    pollTimer = window.setInterval(() => {
      observeIfNeeded();
      if (tryReady()) {
        observer?.disconnect();
        observer = null;
        for (const ao of ancestorObservers) ao.disconnect();
        window.clearInterval(pollTimer);
      }
    }, 32);
    // Soft stop polling after collapse should have settled; stay on plain pre if still
    // clipped — do NOT mark Pierre ready (avoids sprite-only empty shells).
    const fallbackTimer = window.setTimeout(() => {
      if (cancelled) return;
      observer?.disconnect();
      observer = null;
      for (const ao of ancestorObservers) ao.disconnect();
      window.clearInterval(pollTimer);
      // One last chance if layout is actually ready by now.
      tryReady();
    }, 1200);

    return () => {
      cancelled = true;
      observer?.disconnect();
      for (const ao of ancestorObservers) ao.disconnect();
      window.clearInterval(pollTimer);
      window.clearTimeout(fallbackTimer);
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
    };
  }, [hostRef]);

  return ready;
}

function pierreShadowHasLines(host: HTMLElement | null | undefined): boolean {
  if (!host) return false;
  const container = host.querySelector("diffs-container") as HTMLElement | null;
  const root = (container?.shadowRoot ?? container ?? host) as ParentNode;
  if (root.querySelector("[data-line], [data-line-number-content]")) return true;
  // Plain-text File path still paints code rows under [data-code]; empty sprite-only
  // shells only have the SVG (+ optional empty pre).
  const code = root.querySelector("[data-code]");
  if (code && (code.textContent?.replace(/\s/g, "").length ?? 0) > 0) return true;
  return false;
}

/**
 * If Pierre mounts but shadow stays sprite-only / empty pre, remount once; then fail-open
 * to plain pre. Product bridge for collapse/worker race — not official invent of new chrome.
 */
function usePierreEmptyRecovery(
  hostRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  remountKey: string,
) {
  const [generation, setGeneration] = useState(0);
  const [failedOpen, setFailedOpen] = useState(false);

  useEffect(() => {
    setGeneration(0);
    setFailedOpen(false);
  }, [remountKey]);

  useEffect(() => {
    if (!enabled || failedOpen) return;
    const started = Date.now();
    // First remount after ~600ms empty; second fail-open ~600ms after remount.
    const emptyBudgetMs = 600;
    const timer = window.setInterval(() => {
      if (pierreShadowHasLines(hostRef.current)) {
        window.clearInterval(timer);
        return;
      }
      if (Date.now() - started < emptyBudgetMs) return;
      window.clearInterval(timer);
      if (generation < 1) {
        setGeneration((value) => value + 1);
      } else {
        setFailedOpen(true);
      }
    }, 80);
    return () => window.clearInterval(timer);
  }, [enabled, failedOpen, generation, hostRef, remountKey]);

  return { failedOpen, generation };
}

function ToolDiffPlainPre({ text }: { text: string }) {
  return (
    <pre className="m-0 px-p6 pb-p8 text-code text-assistant-secondary whitespace-pre-wrap break-all">
      {text}
    </pre>
  );
}

export type OfficialToolDiffMeta = {
  counts: { additions: number; deletions: number };
  fileDiff: FileDiffMetadata;
  newFile: FileContents;
  oldFile: FileContents;
  path: string;
  pureSide: "additions" | "deletions" | null;
};

type ToolLike = {
  input: Record<string, unknown>;
  isError?: boolean;
  name: string;
  status?: string;
};

function ensureTrailingNewline(value: string) {
  // Official vg
  return value === "" || value.endsWith("\n") ? value : `${value}\n`;
}

/** Official sb FNV-1a 32-bit — File cacheKey for worker highlight LRU. */
function hashOfficialToolCacheKey(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function basename(path: string) {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? path;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * Official Zg `C` builder: only for summary.kind === "diff" and !error.
 * Write → empty old / content new; Edit → old_string/new_string; MultiEdit joined with …; NotebookEdit new_source.
 */
export function buildOfficialToolDiffMeta(tool: ToolLike): OfficialToolDiffMeta | null {
  if (tool.isError || tool.status === "error") return null;
  const path =
    stringValue(tool.input.file_path) ??
    stringValue(tool.input.notebook_path) ??
    "file";
  const displayName = basename(path);
  const lang = officialPierreLangFromPath(displayName) as FileContents["lang"];
  let oldContents = "";
  let newContents = "";
  switch (tool.name) {
    case "Write":
      newContents = stringValue(tool.input.content) ?? "";
      break;
    case "Edit":
      oldContents = stringValue(tool.input.old_string) ?? stringValue(tool.input.oldString) ?? "";
      newContents = stringValue(tool.input.new_string) ?? stringValue(tool.input.newString) ?? "";
      break;
    case "MultiEdit": {
      const edits = Array.isArray(tool.input.edits) ? tool.input.edits : [];
      const olds: string[] = [];
      const news: string[] = [];
      for (const edit of edits) {
        if (!edit || typeof edit !== "object") continue;
        const record = edit as Record<string, unknown>;
        if (typeof record.old_string === "string") olds.push(record.old_string);
        else if (typeof record.oldString === "string") olds.push(record.oldString);
        if (typeof record.new_string === "string") news.push(record.new_string);
        else if (typeof record.newString === "string") news.push(record.newString);
      }
      oldContents = olds.join("\n…\n");
      newContents = news.join("\n…\n");
      break;
    }
    case "NotebookEdit":
      newContents = stringValue(tool.input.new_source) ?? stringValue(tool.input.newSource) ?? "";
      break;
    default:
      return null;
  }
  if (!oldContents && !newContents) return null;
  oldContents = ensureTrailingNewline(oldContents);
  newContents = ensureTrailingNewline(newContents);
  const oldFile: FileContents = {
    name: displayName,
    contents: oldContents,
    lang,
    cacheKey: `tool-old:${tool.name}:${displayName}:${lang}:${hashOfficialToolCacheKey(oldContents)}:${oldContents.length}`,
  };
  const newFile: FileContents = {
    name: displayName,
    contents: newContents,
    lang,
    cacheKey: `tool-new:${tool.name}:${displayName}:${lang}:${hashOfficialToolCacheKey(newContents)}:${newContents.length}`,
  };
  let fileDiff: FileDiffMetadata;
  try {
    fileDiff = parseDiffFromFile(oldFile, newFile);
  } catch {
    return null;
  }
  if (!fileDiff.lang) fileDiff.lang = lang;
  // Official Zg counts: sum hunk.additionLines / deletionLines (not additionCount —
  // additionCount includes context lines from the hunk header).
  const additions = fileDiff.hunks.reduce((total, hunk) => total + (hunk.additionLines ?? 0), 0);
  const deletions = fileDiff.hunks.reduce((total, hunk) => total + (hunk.deletionLines ?? 0), 0);
  // Official: pureSide "new"→additions, "deleted"→deletions, else null
  const pureSide =
    fileDiff.type === "new" ? "additions" : fileDiff.type === "deleted" ? "deletions" : null;
  return {
    counts: { additions, deletions },
    fileDiff,
    newFile,
    oldFile,
    path,
    pureSide,
  };
}

/** Official Xg — settled +N -M on the tool summary row. */
export function OfficialToolDiffBadge({
  adds,
  dels,
  flashOnMount = false,
}: {
  adds: number;
  dels: number;
  flashOnMount?: boolean;
}) {
  if (adds <= 0 && dels <= 0) return null;
  const addFlash = flashOnMount ? "epitaxy-diff-badge-add-flash" : "";
  const delFlash = flashOnMount ? "epitaxy-diff-badge-del-flash" : "";
  return (
    <span className="flex gap-g1 items-center text-body shrink-0">
      <span className={`text-extended-green ${addFlash}`}>+{adds}</span>
      <span className={`text-extended-pink ${delFlash}`}>-{dels}</span>
    </span>
  );
}

function ToolDiffPathButton({ onOpen, path }: { onOpen?: (path: string) => void; path: string }) {
  // Official tx/ou: full path in header (screenshot shows absolute path), truncate mid-row.
  if (!onOpen) {
    return <span className="flex flex-1 min-w-0 text-body text-assistant-secondary truncate" title={path}>{path}</span>;
  }
  return (
    <button
      className="flex flex-1 min-w-0 text-left text-body text-assistant-secondary outline-none hide-focus-ring ring-focus hover:underline underline-offset-[3px] bg-transparent border-0 p-0 m-0 cursor-default"
      onClick={(event) => {
        event.stopPropagation();
        onOpen(path);
      }}
      title={path}
      type="button"
    >
      <span className="truncate">{path}</span>
    </button>
  );
}

/**
 * Official c11959232 `xx` — tool body copy control.
 * opacity-0 until group/body hover|focus; yd uncontained small;
 * icon CheckSelection | CopySquareBehind; 1200ms copied flash.
 */
function ToolDiffCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  if (!text) return null;
  return (
    <div className="opacity-0 group-hover/body:opacity-100 focus-within:opacity-100 [transition:opacity_150ms_cubic-bezier(0.215,0.61,0.355,1)] motion-reduce:transition-none">
      <OfficialButton
        ariaLabel={copied ? "Copied" : "Copy"}
        icon={copied ? "CheckSelection" : "CopySquareBehind"}
        onClick={() => {
          // Official xx: writeText + 1200ms CheckSelection flash (c11959232).
          void navigator.clipboard?.writeText(text).catch(() => {});
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1200);
        }}
        size="small"
        variant="uncontained"
      />
    </div>
  );
}

/**
 * Official sx pureSide branch (rx) — single-side File with tinted line chrome.
 *
 * Official minified string targets `[data-line-number]`. Current `@pierre/diffs`
 * gutter host is `[data-column-number]` (line text still uses
 * `[data-line-number-content]`). Match both so green/pink number chrome applies.
 */
function OfficialToolPureSideFile({
  baseUnsafeCSS,
  diffMeta,
}: {
  baseUnsafeCSS: string;
  diffMeta: OfficialToolDiffMeta;
}) {
  const theme = useOfficialPierreTheme();
  const workerPool = useWorkerPool();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const layoutReady = usePierreLayoutMountReady(hostRef);
  const isAdditions = diffMeta.pureSide === "additions";
  const file = isAdditions ? diffMeta.newFile : diffMeta.oldFile;
  const plainText = file.contents;
  const remountKey = file.cacheKey ?? `${file.name}:${file.contents.length}`;
  const pierreEnabled = Boolean(workerPool) && layoutReady;
  const { failedOpen, generation } = usePierreEmptyRecovery(hostRef, pierreEnabled, remountKey);
  const lineBg = isAdditions ? "var(--extended-20-green)" : "var(--extended-20-pink)";
  const numberColor = isAdditions ? "var(--extended-green)" : "var(--extended-pink)";
  const marker = isAdditions ? "+" : "−";
  const options = useMemo(
    () => ({
      theme,
      disableFileHeader: true,
      overflow: "wrap" as const,
      // Same chrome as c119 `rx`; column-number is package 1.2 gutter attr.
      unsafeCSS:
        baseUnsafeCSS +
        `[data-line]{background:${lineBg};}` +
        `[data-column-number],[data-line-number]{background:${lineBg};color:${numberColor};}` +
        `[data-line-number-content]{color:${numberColor};}` +
        `[data-line-number-content]::before{content:"${marker} ";display:inline-block;min-width:1ch;color:${numberColor};}`,
      // Package hydrate marks highlighted before worker tokens land — force re-paint.
      onPostRender: pierreTokenPaintOnPostRender,
    }),
    [baseUnsafeCSS, lineBg, marker, numberColor, theme],
  );
  // Plain pre while layout springs open / recovery; promotes to Pierre once ready.
  const showPierre = pierreEnabled && !failedOpen;
  return (
    <div ref={hostRef} data-pierre-host="tool-pure-side">
      {showPierre ? (
        <File file={file} key={`pure-${remountKey}-${generation}`} options={options} />
      ) : (
        <ToolDiffPlainPre text={plainText} />
      )}
    </div>
  );
}

/** Official sx mixed diff branch (hh) — unified FileDiff. */
function OfficialToolUnifiedFileDiff({
  baseUnsafeCSS,
  diffMeta,
}: {
  baseUnsafeCSS: string;
  diffMeta: OfficialToolDiffMeta;
}) {
  const theme = useOfficialPierreTheme();
  const workerPool = useWorkerPool();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const layoutReady = usePierreLayoutMountReady(hostRef);
  const plainText =
    diffMeta.pureSide === "deletions" ? diffMeta.oldFile.contents : diffMeta.newFile.contents;
  const remountKey =
    diffMeta.fileDiff.cacheKey ??
    `${diffMeta.path}:${diffMeta.counts.additions}:${diffMeta.counts.deletions}`;
  const pierreEnabled = Boolean(workerPool) && layoutReady;
  const { failedOpen, generation } = usePierreEmptyRecovery(hostRef, pierreEnabled, remountKey);
  const options = useMemo(
    () => ({
      theme,
      diffStyle: "unified" as const,
      diffIndicators: "classic" as const,
      disableFileHeader: true,
      expandUnchanged: true,
      overflow: "wrap" as const,
      lineDiffType: "word-alt" as const,
      unsafeCSS: baseUnsafeCSS,
      onPostRender: pierreTokenPaintOnPostRender,
    }),
    [baseUnsafeCSS, theme],
  );
  const showPierre = pierreEnabled && !failedOpen;
  return (
    <div ref={hostRef} data-pierre-host="tool-unified">
      {showPierre ? (
        <FileDiff
          fileDiff={diffMeta.fileDiff}
          key={`unified-${remountKey}-${generation}`}
          metrics={TOOL_DIFF_METRICS}
          options={options}
        />
      ) : (
        <ToolDiffPlainPre text={plainText} />
      )}
    </div>
  );
}

/**
 * Official sx `"diff"===s.kind&&n` body:
 * group/body → bg-t1 rounded-r6 → path + copy → epitaxy-diff (pureSide File | FileDiff)
 */
export function OfficialToolDiffDetails({
  copySlot,
  diffMeta,
  onOpenPath,
}: {
  copySlot?: ReactNode;
  diffMeta: OfficialToolDiffMeta;
  onOpenPath?: (path: string) => void;
}) {
  const copyText =
    diffMeta.pureSide === "deletions" ? diffMeta.oldFile.contents : diffMeta.newFile.contents;
  return (
    <div className="group/body py-p6">
      <div className="bg-t1 rounded-r6 overflow-clip flex flex-col">
        <div className="flex items-center gap-g3 px-p6 py-p5">
          <ToolDiffPathButton onOpen={onOpenPath} path={diffMeta.path} />
          {copySlot ?? <ToolDiffCopyButton text={copyText} />}
        </div>
        <div className="epitaxy-diff">
          {diffMeta.pureSide != null ? (
            <OfficialToolPureSideFile baseUnsafeCSS={TOOL_DIFF_GAP_CSS} diffMeta={diffMeta} />
          ) : (
            <OfficialToolUnifiedFileDiff baseUnsafeCSS={TOOL_DIFF_GAP_CSS} diffMeta={diffMeta} />
          )}
        </div>
      </div>
    </div>
  );
}

/** Official sx file branch (Read): pierre `File` (iu) with disableFileHeader + wrap. */
export function OfficialToolReadFileDetails({
  contents,
  copySlot,
  onOpenPath,
  path,
}: {
  contents: string;
  copySlot?: ReactNode;
  onOpenPath?: (path: string) => void;
  path: string;
}) {
  const theme = useOfficialPierreTheme();
  const workerPool = useWorkerPool();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const layoutReady = usePierreLayoutMountReady(hostRef);
  const displayName = basename(path);
  const lang = officialPierreLangFromPath(displayName) as FileContents["lang"];
  // cacheKey enables worker LRU + stable highlight key (package getFileHighlightKey).
  const file = useMemo<FileContents>(() => {
    const body = ensureTrailingNewline(contents);
    return {
      name: displayName,
      contents: body,
      lang,
      cacheKey: `read:${displayName}:${lang}:${hashOfficialToolCacheKey(body)}:${body.length}`,
    };
  }, [contents, displayName, lang]);
  const remountKey = file.cacheKey ?? `read:${displayName}:${contents.length}`;
  const pierreEnabled = Boolean(workerPool) && layoutReady;
  const { failedOpen, generation } = usePierreEmptyRecovery(hostRef, pierreEnabled, remountKey);
  const options = useMemo(
    () => ({
      theme,
      disableFileHeader: true,
      overflow: "wrap" as const,
      unsafeCSS: TOOL_DIFF_GAP_CSS,
      onPostRender: pierreTokenPaintOnPostRender,
    }),
    [theme],
  );
  // Plain pre while collapse springs / pool missing / recovery; Pierre once layout-ready.
  const showPierre = pierreEnabled && !failedOpen;
  return (
    <div className="group/body py-p6">
      <div className="bg-t1 rounded-r6 overflow-clip flex flex-col">
        <div className="flex items-center gap-g3 px-p6 py-p5">
          <ToolDiffPathButton onOpen={onOpenPath} path={path} />
          {copySlot ?? <ToolDiffCopyButton text={contents} />}
        </div>
        <div className="epitaxy-diff" ref={hostRef} data-pierre-host="tool-read">
          {showPierre ? (
            <File file={file} key={`read-${remountKey}-${generation}`} options={options} />
          ) : (
            <ToolDiffPlainPre text={contents} />
          )}
        </div>
      </div>
    </div>
  );
}
