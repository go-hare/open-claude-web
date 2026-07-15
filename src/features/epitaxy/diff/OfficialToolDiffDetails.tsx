/**
 * Official c11959232 tool-row diff body (Zg diffMeta + sx diff branch + Xg badge).
 * - meta builder: Write/Edit/MultiEdit/NotebookEdit → parseDiffFromFile (su)
 * - pureSide new/deleted → pierre `File` (rx/iu) with green/pink line chrome
 * - mixed change → pierre `FileDiff` (hh) unified classic indicators
 * - row badge: Xg +N -M after settled
 */
import { parseDiffFromFile, type FileContents, type FileDiffMetadata } from "@pierre/diffs";
import { File, FileDiff } from "@pierre/diffs/react";
import { useMemo, type ReactNode } from "react";
import { officialPierreLangFromPath } from "./officialPierreLang";
import { useOfficialPierreTheme, useWorkerPool } from "./OfficialPierreWorkerPool";
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
  const oldFile: FileContents = { name: displayName, contents: oldContents, lang };
  const newFile: FileContents = { name: displayName, contents: newContents, lang };
  let fileDiff: FileDiffMetadata;
  try {
    fileDiff = parseDiffFromFile(oldFile, newFile);
  } catch {
    return null;
  }
  if (!fileDiff.lang) fileDiff.lang = lang;
  const additions = fileDiff.hunks.reduce((total, hunk) => total + (hunk.additionCount ?? 0), 0);
  const deletions = fileDiff.hunks.reduce((total, hunk) => total + (hunk.deletionCount ?? 0), 0);
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

function ToolDiffCopyButton({ text }: { text: string }) {
  return (
    <button
      aria-label="Copy"
      className="group/btn relative isolate inline-flex items-center whitespace-nowrap border-0 cursor-default select-none outline-none hide-focus-ring text-uncontained-default hover:text-uncontained-hover ring-focus h-small text-footnote rounded-small justify-center aspect-square px-p3 shrink-0"
      onClick={(event) => {
        event.stopPropagation();
        void navigator.clipboard?.writeText(text);
      }}
      type="button"
    >
      <span className="btn-squish absolute inset-0 -z-[1] rounded-[inherit] bg-[var(--fill-uncontained-default)] group-hover/btn:bg-[var(--fill-uncontained-hover)]" />
      <span className="relative text-[12px]" aria-hidden>
        ⎘
      </span>
    </button>
  );
}

/** Official sx pureSide branch (rx) — single-side File with tinted line chrome. */
function OfficialToolPureSideFile({
  baseUnsafeCSS,
  diffMeta,
}: {
  baseUnsafeCSS: string;
  diffMeta: OfficialToolDiffMeta;
}) {
  const theme = useOfficialPierreTheme();
  const workerPool = useWorkerPool();
  const isAdditions = diffMeta.pureSide === "additions";
  const file = isAdditions ? diffMeta.newFile : diffMeta.oldFile;
  const lineBg = isAdditions ? "var(--extended-20-green)" : "var(--extended-20-pink)";
  const numberColor = isAdditions ? "var(--extended-green)" : "var(--extended-pink)";
  const marker = isAdditions ? "+" : "−";
  const options = useMemo(
    () => ({
      theme,
      disableFileHeader: true,
      overflow: "wrap" as const,
      unsafeCSS:
        baseUnsafeCSS +
        `[data-line]{background:${lineBg};}[data-line-number]{background:${lineBg};color:${numberColor};}[data-line-number-content]::before{content:"${marker} ";display:inline-block;min-width:1ch;color:${numberColor};}`,
    }),
    [baseUnsafeCSS, lineBg, marker, numberColor, theme],
  );
  if (!workerPool) return null;
  return <File file={file} options={options} />;
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
    }),
    [baseUnsafeCSS, theme],
  );
  if (!workerPool) return null;
  return (
    <FileDiff
      fileDiff={diffMeta.fileDiff}
      metrics={TOOL_DIFF_METRICS}
      options={options}
    />
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
  const displayName = basename(path);
  const file = useMemo<FileContents>(() => ({
    name: displayName,
    contents: ensureTrailingNewline(contents),
    lang: officialPierreLangFromPath(displayName) as FileContents["lang"],
  }), [contents, displayName]);
  const options = useMemo(
    () => ({
      theme,
      disableFileHeader: true,
      overflow: "wrap" as const,
      unsafeCSS: TOOL_DIFF_GAP_CSS,
    }),
    [theme],
  );
  return (
    <div className="group/body py-p6">
      <div className="bg-t1 rounded-r6 overflow-clip flex flex-col">
        <div className="flex items-center gap-g3 px-p6 py-p5">
          <ToolDiffPathButton onOpen={onOpenPath} path={path} />
          {copySlot ?? <ToolDiffCopyButton text={contents} />}
        </div>
        <div className="epitaxy-diff">
          {workerPool ? <File file={file} options={options} /> : (
            <pre className="m-0 px-p6 pb-p8 text-code text-assistant-secondary whitespace-pre-wrap break-all">{contents}</pre>
          )}
        </div>
      </div>
    </div>
  );
}
