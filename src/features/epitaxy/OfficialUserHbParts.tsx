/**
 * Official c11959232 Hb user-entry helpers:
 * - Eb / Pb / Tb fence + "In `path` at line N" parse
 * - zb inline `code` + links (user bubble, not full markdown)
 * - Ob code/diff attachment card (Pierre File / PatchDiff — not parseDiffFromFile)
 */
import type { FileContents } from "@pierre/diffs";
import { File, PatchDiff } from "@pierre/diffs/react";
import { memo, useMemo, type ReactNode } from "react";
import { officialPierreLangFromPath } from "./diff/officialPierreLang";
import { useOfficialPierreTheme, useWorkerPool } from "./diff/OfficialPierreWorkerPool";
import { pierreTokenPaintOnPostRender } from "./diff/pierreTokenPaint";
import "./diff/ensurePierreDiffsContainer";

/** Official Eb: fenced code blocks in user text. */
const OFFICIAL_USER_FENCE_RE = /^(`{3,})(\S*)\n([\s\S]*?)\n\1[ \t]*$/gm;
/** Official Pb: path + start line before a fence. */
const OFFICIAL_USER_PATH_LINE_RE = /(?:^|\n)In `([^`\n]+)` at lines? (\d+)(?:-\d+)?(?: — review comment from @\S+)?:$/;
/** Official Tb: detect review-comment prefix so suggestion attaches to prior code. */
const OFFICIAL_USER_REVIEW_PREFIX_RE = /^In `[^`\n]+` at lines? \d+/m;
/** Official Fb: inline `code` spans in zb. */
const OFFICIAL_USER_INLINE_CODE_RE = /`([^`\n]+)`/g;
/** Official Rv-like links inside zb plaintext. */
const OFFICIAL_USER_LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
/** Official Ub: durable uuid enables fork/rewind. */
export const OFFICIAL_DURABLE_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Official Lb unsafe CSS for user Ob cards. */
const OFFICIAL_USER_OB_DIFF_CSS =
  "[data-line]:hover { background: transparent; } [data-code] { overflow-x: hidden; padding-bottom: var(--diffs-gap-block, var(--diffs-gap-fallback)); } [data-separator] { display: none; }";

const OFFICIAL_USER_INLINE_CODE_CLASS =
  "text-code px-p2 rounded-r2 bg-t1 [overflow-wrap:anywhere]";
const OFFICIAL_USER_INLINE_CODE_LINK_CLASS =
  `${OFFICIAL_USER_INLINE_CODE_CLASS} hover:bg-t2 cursor-pointer`;
const OFFICIAL_USER_LINK_CLASS =
  "text-accent-main-000 underline underline-offset-[3px] hover:text-accent-main-100";

export type OfficialUserTextSegment =
  | { kind: "text"; key: string; text: string }
  | {
    filePath?: string;
    key: string;
    kind: "code";
    lang?: string;
    startLine?: number;
    suggestion?: string;
    text: string;
  };

/**
 * Official Hb fence splitter (inline function inside Hb useMemo).
 * Splits user text into text / code segments; attaches trailing ```suggestion
 * fences onto the previous code segment when the preceding text is not a review prefix.
 */
export function parseOfficialUserTextSegments(text: string, keyPrefix: string): OfficialUserTextSegment[] {
  const segments: OfficialUserTextSegment[] = [];
  let cursor = 0;
  let partIndex = 0;
  const fenceRe = new RegExp(OFFICIAL_USER_FENCE_RE.source, OFFICIAL_USER_FENCE_RE.flags);
  for (const match of text.matchAll(fenceRe)) {
    const index = match.index ?? 0;
    const before = text.slice(cursor, index).trim();
    let filePath: string | undefined;
    let startLine: number | undefined;
    let plainBefore = before;
    const pathMatch = OFFICIAL_USER_PATH_LINE_RE.exec(plainBefore);
    if (pathMatch) {
      filePath = pathMatch[1];
      startLine = Number(pathMatch[2]);
      plainBefore = plainBefore.slice(0, pathMatch.index).trim();
    }
    if (plainBefore) {
      segments.push({ kind: "text", key: `${keyPrefix}:t${partIndex++}`, text: plainBefore });
    }
    const lang = match[2] || "text";
    const body = match[3] ?? "";
    let attachedSuggestion = false;
    if (lang === "suggestion" && !OFFICIAL_USER_REVIEW_PREFIX_RE.test(before)) {
      for (let i = segments.length - 1; i >= 0 && i >= segments.length - 2; i -= 1) {
        const prev = segments[i];
        if (prev?.kind === "code") {
          if (prev.filePath && prev.suggestion === undefined) {
            prev.suggestion = body;
            attachedSuggestion = true;
          }
          break;
        }
      }
    }
    if (!attachedSuggestion) {
      segments.push({
        kind: "code",
        key: `${keyPrefix}:c${partIndex++}`,
        text: body,
        lang,
        ...(filePath ? { filePath } : {}),
        ...(startLine !== undefined ? { startLine } : {}),
      });
    }
    cursor = index + match[0].length;
  }
  if (cursor === 0) return [{ kind: "text", key: `${keyPrefix}:t0`, text }];
  const tail = text.slice(cursor).trim();
  if (tail) segments.push({ kind: "text", key: `${keyPrefix}:t${partIndex++}`, text: tail });
  return segments;
}

/** Official zb: inline `code` + markdown links only (user bubble). */
export function renderOfficialUserInlineText(
  text: string,
  nonInteractive = false,
  onOpenPath?: (path: string) => void,
): ReactNode {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let key = 0;
  for (const match of text.matchAll(OFFICIAL_USER_INLINE_CODE_RE)) {
    const index = match.index ?? 0;
    if (index > cursor) nodes.push(...renderOfficialUserLinks(text.slice(cursor, index), `l${key++}`));
    nodes.push(
      <OfficialUserInlineCode
        key={`c${key++}`}
        nonInteractive={nonInteractive}
        onOpenPath={onOpenPath}
        text={match[1] ?? ""}
      />,
    );
    cursor = index + match[0].length;
  }
  if (cursor < text.length) nodes.push(...renderOfficialUserLinks(text.slice(cursor), `l${key++}`));
  return nodes.length > 0 ? nodes : text;
}

function renderOfficialUserLinks(text: string, keyPrefix: string): ReactNode[] {
  if (!text.includes("](")) return text ? [text] : [];
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let key = 0;
  for (const match of text.matchAll(OFFICIAL_USER_LINK_RE)) {
    const index = match.index ?? 0;
    if (index > cursor) nodes.push(text.slice(cursor, index));
    nodes.push(
      <a
        className={OFFICIAL_USER_LINK_CLASS}
        href={match[2]}
        key={`${keyPrefix}-a${key++}`}
        rel="noreferrer"
        target="_blank"
      >
        {match[1]}
      </a>,
    );
    cursor = index + match[0].length;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

function OfficialUserInlineCode({
  nonInteractive,
  onOpenPath,
  text,
}: {
  nonInteractive?: boolean;
  onOpenPath?: (path: string) => void;
  text: string;
}) {
  // Official Db + ru fileRef: when interactive and text looks like a path, open file; else plain code.
  if (nonInteractive || !looksLikeFileRef(text) || !onOpenPath) {
    return <code className={OFFICIAL_USER_INLINE_CODE_CLASS}>{text}</code>;
  }
  return (
    <button
      className={`${OFFICIAL_USER_INLINE_CODE_LINK_CLASS} border-0 p-0 m-0 bg-transparent`}
      data-official-source="c11959232-h_zsw3wI.js:Db+ru"
      onClick={() => onOpenPath(text)}
      type="button"
    >
      <code className={OFFICIAL_USER_INLINE_CODE_CLASS}>{text}</code>
    </button>
  );
}

function looksLikeFileRef(text: string) {
  return text.includes("/") || text.includes("\\") || /\.[A-Za-z0-9]+$/.test(text);
}

function resolveOfficialUserLang(lang?: string, filePath?: string): FileContents["lang"] {
  if (filePath) return officialPierreLangFromPath(filePath) as FileContents["lang"];
  if (lang && lang !== "text" && lang !== "suggestion") {
    return (officialPierreLangFromPath(`file.${lang}`) !== "text"
      ? officialPierreLangFromPath(`file.${lang}`)
      : lang) as FileContents["lang"];
  }
  return "text" as FileContents["lang"];
}

/**
 * Official Ob patch builder (c11959232):
 * when suggestion is set → deletion of `text` lines + addition of suggestion lines at startLine;
 * else → context-only hunk (space-prefixed) so PatchDiff shows real file line numbers.
 * parseDiffFromFile is wrong here — it always renumbers from 1 and drops startLine.
 */
function buildOfficialUserObPatch(
  filePath: string,
  startLine: number,
  text: string,
  suggestion?: string,
): string {
  const oldLines = text.split("\n");
  if (suggestion !== undefined) {
    const newLines = suggestion === "" ? [] : suggestion.split("\n");
    return [
      `--- a/${filePath}`,
      `+++ b/${filePath}`,
      `@@ -${startLine},${oldLines.length} +${startLine},${newLines.length} @@`,
      ...oldLines.map((line) => `-${line}`),
      ...newLines.map((line) => `+${line}`),
    ].join("\n");
  }
  const count = oldLines.length;
  return [
    `--- a/${filePath}`,
    `+++ b/${filePath}`,
    `@@ -${startLine},${count} +${startLine},${count} @@`,
    ...oldLines.map((line) => ` ${line}`),
  ].join("\n");
}

/** Official sb FNV-1a 32-bit — used for File cacheKey on Ob snippet / ib. */
function hashOfficialCacheKey(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Official ib command snippet (Pierre File) + plain output panel stays in Hb. */
export const OfficialUserBashCommand = memo(function OfficialUserBashCommand({
  command,
}: {
  command: string;
}) {
  const theme = useOfficialPierreTheme();
  const workerPool = useWorkerPool();
  const isShellLang = Boolean(command) && !/^\/[^/\s]+$/.test(command);
  const file = useMemo<FileContents>(() => ({
    name: "cmd",
    contents: command,
    lang: (isShellLang ? "bash" : "text") as FileContents["lang"],
    cacheKey: `bashrun:${hashOfficialCacheKey(command)}:${command.length}`,
  }), [command, isShellLang]);
  const options = useMemo(() => ({
    theme,
    disableFileHeader: true,
    disableLineNumbers: true,
    overflow: "wrap" as const,
    unsafeCSS: "[data-file] { padding: var(--p6) var(--p8); } [data-line]:hover { background: transparent; }",
    onPostRender: pierreTokenPaintOnPostRender,
  }), [theme]);
  return (
    <div className="epitaxy-diff rounded-r6 overflow-clip" data-official-source="c11959232-h_zsw3wI.js:ib command">
      {workerPool ? (
        <File file={file} options={options} />
      ) : (
        <pre className="m-0 p-[var(--p6)] px-[var(--p8)] text-code whitespace-pre-wrap break-all bg-t1">
          <code>{command}</code>
        </pre>
      )}
    </div>
  );
});

/**
 * Official Ob (c11959232):
 * - filePath + startLine → Pierre PatchDiff (`lu`) from hunk patch with real line numbers
 * - else → Pierre File snippet (`iu`, no line numbers / no header)
 */
export const OfficialUserCodeAttachment = memo(function OfficialUserCodeAttachment({
  filePath,
  lang,
  onOpenPath,
  startLine,
  suggestion,
  text,
}: {
  filePath?: string;
  lang?: string;
  onOpenPath?: (path: string) => void;
  startLine?: number;
  suggestion?: string;
  text: string;
}) {
  const theme = useOfficialPierreTheme();
  const workerPool = useWorkerPool();
  const resolvedLang = resolveOfficialUserLang(lang, filePath);

  // Official Ob: o = useMemo patch string when n && a !== undefined
  const patch = useMemo(() => {
    if (!filePath || startLine === undefined) return null;
    return buildOfficialUserObPatch(filePath, startLine, text, suggestion);
  }, [filePath, startLine, suggestion, text]);

  // Official: u = { name:"snippet", contents:t, lang:s, cacheKey:`user:${s}:${sb(t)}:${t.length}` }
  const snippetFile = useMemo<FileContents>(() => ({
    name: "snippet",
    contents: text,
    lang: resolvedLang,
    cacheKey: `user:${resolvedLang}:${hashOfficialCacheKey(text)}:${text.length}`,
  }), [resolvedLang, text]);

  // Official l: PatchDiff options (diffIndicators none — not classic/bars)
  const patchOptions = useMemo(() => ({
    theme,
    diffStyle: "unified" as const,
    diffIndicators: "none" as const,
    disableFileHeader: true,
    overflow: "wrap" as const,
    unsafeCSS: OFFICIAL_USER_OB_DIFF_CSS,
    onPostRender: pierreTokenPaintOnPostRender,
  }), [theme]);

  // Official d: File snippet options
  const fileOptions = useMemo(() => ({
    theme,
    disableFileHeader: true,
    disableLineNumbers: true,
    overflow: "wrap" as const,
    unsafeCSS: OFFICIAL_USER_OB_DIFF_CSS,
    onPostRender: pierreTokenPaintOnPostRender,
  }), [theme]);

  // Official: if (o && n) → path header + PatchDiff(lu); else File(iu)
  if (patch && filePath) {
    const pathButtonClass =
      "flex flex-1 min-w-0 text-left text-body text-assistant-secondary hover:underline underline-offset-[3px] outline-none hide-focus-ring ring-focus border-0 bg-transparent p-0 m-0 cursor-default";
    return (
      <div className="group/body bg-t1 rounded-r6 overflow-clip flex flex-col w-full" data-official-source="c11959232-h_zsw3wI.js:Ob filePath">
        <div className="flex items-center gap-g3 px-p6 py-p5">
          {onOpenPath ? (
            <button className={pathButtonClass} onClick={() => onOpenPath(filePath)} type="button">
              <span className="truncate">{filePath}</span>
            </button>
          ) : (
            <span className="flex flex-1 min-w-0 text-body text-assistant-secondary truncate">{filePath}</span>
          )}
          <button
            aria-label="Copy"
            className="group/btn relative isolate inline-flex items-center whitespace-nowrap border-0 cursor-default select-none outline-none hide-focus-ring text-uncontained-default hover:text-uncontained-hover ring-focus h-small text-footnote rounded-small justify-center aspect-square px-p3 shrink-0"
            onClick={() => { void navigator.clipboard?.writeText(text); }}
            type="button"
          >
            <span className="btn-squish absolute inset-0 -z-[1] rounded-[inherit] bg-[var(--fill-uncontained-default)] group-hover/btn:bg-[var(--fill-uncontained-hover)]" />
            <span className="relative text-[12px]" aria-hidden>⎘</span>
          </button>
        </div>
        <div className="epitaxy-diff">
          {workerPool ? (
            <PatchDiff options={patchOptions} patch={patch} />
          ) : (
            <pre className="m-0 p-p4 text-code whitespace-pre-wrap break-words">{text}</pre>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="epitaxy-diff rounded-r4 overflow-clip" data-official-source="c11959232-h_zsw3wI.js:Ob snippet">
      {workerPool ? (
        <File file={snippetFile} options={fileOptions} />
      ) : (
        <pre className="m-0 p-p4 text-code whitespace-pre-wrap break-words">{text}</pre>
      )}
    </div>
  );
});
