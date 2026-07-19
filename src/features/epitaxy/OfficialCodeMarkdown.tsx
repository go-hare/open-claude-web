/**
 * Official assistant markdown pipeline from c11959232:
 * - kb: structure-tracker streaming chunks (xd) + search_tree preprocess (ks)
 * - jb: react-markdown + remark-gfm + mb component map
 * - ab: Pierre File fence + copy (+ optional shell run hook later)
 * - ob/db: inline code / links
 */
import {
  Children,
  isValidElement,
  memo,
  useId,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { FileContents } from "@pierre/diffs";
import { File } from "@pierre/diffs/react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { Icon } from "../../shell/icons";
import { OfficialButton } from "./OfficialEpitaxyComponents";
import { isOfficialMermaidMarkdownLanguage, OfficialMermaidDiagramCard } from "./OfficialMermaidDiagramCard";
import { OfficialSearchTree, officialSearchTreeLanguage } from "./OfficialSearchTree";
import { officialPierreLangFromPath } from "./diff/officialPierreLang";
import { useOfficialPierreTheme, useWorkerPool } from "./diff/OfficialPierreWorkerPool";
import { pierreTokenPaintOnPostRender } from "./diff/pierreTokenPaint";
import "./diff/ensurePierreDiffsContainer";
import "katex/dist/katex.min.css";

/** Official tb lang aliases. */
const OFFICIAL_MD_LANG_ALIAS: Record<string, string> = {
  env: "dotenv",
  vba: "vb",
};

/** Official rb inline code ring. */
const OFFICIAL_INLINE_CODE_CLASS = "rounded-[4px] outline-none hide-focus-ring ring-focus";
/** Official cb link class. */
const OFFICIAL_MD_LINK_CLASS =
  "text-[var(--accent)] hover:underline underline-offset-[1px] outline-none hide-focus-ring ring-focus rounded-r2";
/** Official nb shell langs for ab run affordance. */
const OFFICIAL_SHELL_LANGS = new Set(["bash", "sh", "shell", "zsh"]);

const OFFICIAL_SEARCH_TREE_BLOCK_RE = /<search_tree>([\s\S]*?)<\/search_tree>/g;

/**
 * Official kb (c11959232):
 * - preprocess (search_tree → fence)
 * - structure-tracker chunks while streaming (xd)
 * - each completed chunk + streaming frontier is its own jb markdown root
 */
export function OfficialCodeMarkdown({ isStreaming = false, text }: { isStreaming?: boolean; text: string }) {
  const normalized = useMemo(() => preprocessOfficialCodeMarkdown(text), [text]);
  const { completedChunks, streamingChunk } = useOfficialCodeMarkdownChunks(normalized, isStreaming);
  // Official: o = r || (0 === i.length ? a : "")
  const frontier = streamingChunk || (completedChunks.length === 0 ? normalized : "");
  return (
    <div className="epitaxy-markdown" data-official-source="c11959232-h_zsw3wI.js:kb">
      {completedChunks.map((chunk, index) => (
        <OfficialCodeMarkdownChunk chunk={chunk} key={`c${index}`} />
      ))}
      {frontier ? <OfficialCodeMarkdownChunk chunk={frontier} key={`s${completedChunks.length}`} /> : null}
    </div>
  );
}

/** Non-streaming / secondary surfaces (file viewer, task result) share the same jb root. */
export function MarkdownContent({ isStreaming = false, text }: { isStreaming?: boolean; text: string }) {
  return <OfficialCodeMarkdown isStreaming={isStreaming} text={text} />;
}

/** Official jb (memoized react-markdown root) + eb plugins (gfm always; math/katex when `$`). */
const OfficialCodeMarkdownChunk = memo(function OfficialCodeMarkdownChunk({ chunk }: { chunk: string }) {
  const hasMath = chunk.includes("$");
  const remarkPlugins = useMemo(
    () => (hasMath ? [remarkMath, remarkGfm] : [remarkGfm]),
    [hasMath],
  );
  const rehypePlugins = useMemo(
    () => (hasMath
      ? [[rehypeKatex, { errorColor: "inherit", output: "htmlAndMathml", strict: false }] as const]
      : []),
    [hasMath],
  );
  return (
    <ReactMarkdown
      components={officialMarkdownComponents}
      rehypePlugins={rehypePlugins as never}
      remarkPlugins={remarkPlugins}
      urlTransform={officialMarkdownUrlTransform}
    >
      {chunk}
    </ReactMarkdown>
  );
}, (previous, next) => previous.chunk === next.chunk);

/** Official mb component map (c11959232) — simplified for local bridges. */
const officialMarkdownComponents = {
  code: OfficialMarkdownInlineCode,
  pre: OfficialMarkdownPre,
  a: OfficialMarkdownAnchor,
  img: OfficialMarkdownImage,
  table: OfficialMarkdownTable,
  th: OfficialMarkdownTh,
  td: OfficialMarkdownTd,
  li: OfficialMarkdownListItem,
  input: OfficialMarkdownInput,
};

/** Exported for official YN plan markdown (JN): spreads mb + mark/pre overrides. */
export const officialMarkdownComponentsBase = officialMarkdownComponents;

function OfficialMarkdownInlineCode({ children, className, ...rest }: ComponentPropsWithoutRef<"code">) {
  // Fenced blocks: className language-* lives on code inside pre — handled by pre.
  if (className?.includes("language-")) {
    return (
      <code className={className} {...rest}>
        {children}
      </code>
    );
  }
  // Official ob: plain inline code (file-ref bridge optional via looksLikePath + custom event).
  const text = typeof children === "string" ? children : Array.isArray(children) ? children.join("") : null;
  if (text && looksLikeFileRef(text)) {
    return (
      <button
        className={`${OFFICIAL_INLINE_CODE_CLASS} border-0 p-0 m-0 bg-transparent cursor-pointer`}
        data-official-source="c11959232-h_zsw3wI.js:ob+ru"
        onClick={() => {
          window.dispatchEvent(new CustomEvent("epitaxy-open-file", { detail: { path: text } }));
        }}
        type="button"
      >
        <code>{children}</code>
      </button>
    );
  }
  return (
    <code className={OFFICIAL_INLINE_CODE_CLASS} {...rest}>
      {children}
    </code>
  );
}

function OfficialMarkdownPre({ children }: { children?: ReactNode }) {
  // Official pre: extract language + text, then ab or mermaid/search_tree.
  if (isValidElement(children)) {
    const props = children.props as { children?: ReactNode; className?: string };
    const raw = typeof props.children === "string" ? props.children.replace(/\n$/, "") : "";
    const lang = props.className
      ? parseLanguageClass(props.className)
      : "text";
    if (isOfficialMermaidMarkdownLanguage(lang)) {
      return <OfficialMermaidDiagramCard source={raw} />;
    }
    if (lang === officialSearchTreeLanguage) {
      return <OfficialSearchTree content={raw} />;
    }
    return <OfficialAssistantCodeFence language={lang} text={raw} />;
  }
  return <>{children}</>;
}

function OfficialMarkdownAnchor({ href, children }: { href?: string; children?: ReactNode }) {
  // Official db simplified: external link chrome; file-path open via custom event when path-like.
  if (href && looksLikeLocalPathHref(href)) {
    return (
      <button
        className={OFFICIAL_MD_LINK_CLASS}
        data-official-source="c11959232-h_zsw3wI.js:db file"
        onClick={() => {
          window.dispatchEvent(new CustomEvent("epitaxy-open-file", { detail: { path: href } }));
        }}
        type="button"
      >
        {children}
      </button>
    );
  }
  return (
    <a className={OFFICIAL_MD_LINK_CLASS} href={href} rel="noreferrer" target="_blank">
      {children}
    </a>
  );
}

function OfficialMarkdownImage(props: ComponentPropsWithoutRef<"img">) {
  const src = typeof props.src === "string" ? props.src : undefined;
  if (!src) return null;
  return (
    <img
      alt={props.alt ?? ""}
      className="max-w-full rounded-r4 effect-contrast-stroke"
      data-official-source="c11959232-h_zsw3wI.js:pb"
      src={src}
    />
  );
}

function OfficialMarkdownTable({ children }: { children?: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table>{children}</table>
    </div>
  );
}

function OfficialMarkdownTh({ children, style }: { children?: ReactNode; style?: CSSProperties }) {
  return <th style={style}>{children}</th>;
}

function OfficialMarkdownTd({ children, style }: { children?: ReactNode; style?: CSSProperties }) {
  return <td style={style}>{children}</td>;
}

function OfficialMarkdownListItem({ children, className }: { children?: ReactNode; className?: string }) {
  // Official li: task-list-item flex layout.
  if (!className?.includes("task-list-item")) {
    return <li className={className}>{children}</li>;
  }
  const parts = Children.toArray(children);
  return (
    <li
      className="flex items-start gap-g3 decoration-1 [&:has(>[data-done])]:line-through [&:has(>[data-done])]:text-[var(--t5)]"
    >
      {parts[0]}
      <span className="flex-1 min-w-0">{parts.slice(1)}</span>
    </li>
  );
}

function OfficialMarkdownInput({
  type,
  checked,
  disabled,
}: {
  type?: string;
  checked?: boolean;
  disabled?: boolean;
}) {
  // Official input: disabled checkbox → done / not-done glyphs.
  if (type !== "checkbox" || !disabled) {
    return <input checked={checked} disabled={disabled} readOnly type={type} />;
  }
  const box = "shrink-0 size-[16px] mt-[1px] flex items-center justify-center";
  if (checked) {
    return (
      <span className={`${box} text-assistant-primary`} data-done>
        <Icon name="CheckSelection" size="sm" />
        <span className="sr-only">done</span>
      </span>
    );
  }
  return (
    <span className={box}>
      <span aria-hidden className="block w-[12px] h-[12px] rounded-full border border-[var(--t5)]" />
      <span className="sr-only">not done</span>
    </span>
  );
}

/** Official hb urlTransform: allow img src, sanitize others. */
export function officialMarkdownUrlTransform(url: string): string {
  if (!url) return url;
  if (/^(https?:|mailto:|data:|blob:|#)/i.test(url)) return url;
  // Allow relative / absolute filesystem-looking paths for db file bridge.
  if (url.startsWith("/") || url.startsWith("./") || url.startsWith("../") || /^[A-Za-z]:[\\/]/.test(url)) {
    return url;
  }
  return url;
}

function parseLanguageClass(className: string) {
  const match = /language-(\S+)/.exec(className);
  const raw = match?.[1] ?? "text";
  return OFFICIAL_MD_LANG_ALIAS[raw.toLowerCase()] ?? raw;
}

function looksLikeFileRef(text: string) {
  return text.includes("/") || text.includes("\\") || /\.[A-Za-z0-9]+$/.test(text);
}

function looksLikeLocalPathHref(href: string) {
  if (/^(https?:|mailto:|data:|blob:|#)/i.test(href)) return false;
  return looksLikeFileRef(href) || href.startsWith("/") || href.startsWith("./");
}

function resolveMarkdownLang(language?: string) {
  if (!language) return "text";
  const mapped = officialPierreLangFromPath(`file.${language}`);
  return mapped !== "text" ? mapped : language;
}

function ensureTrailingNewline(value: string) {
  return value === "" || value.endsWith("\n") ? value : `${value}\n`;
}

function hashCodeCacheKey(value: string) {
  // Official sb FNV-1a 32-bit.
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Official ab (c11959232):
 * Pierre File fence + copy button; shell run affordance when single-line bash/! prefix
 * (run bridge optional — shows button only when epitaxy-run-inline event is handled later).
 */
export function OfficialAssistantCodeFence({ language, text }: { language?: string; text: string }) {
  const theme = useOfficialPierreTheme();
  const workerPool = useWorkerPool();
  const [copied, setCopied] = useState(false);
  const runId = useId();
  const trimmed = text.trimEnd();
  const isTextLang = !language || language === "text";
  const withoutBang = isTextLang ? trimmed.replace(/^![ \t]*/, "") : trimmed;
  const bangShell = withoutBang !== trimmed;
  const isSingleLine = !/[\r\n]/.test(withoutBang);
  const canRunShell = (OFFICIAL_SHELL_LANGS.has((language ?? "").toLowerCase()) || bangShell) && isSingleLine;
  const lang = resolveMarkdownLang(language);
  // Official padding: extra right when run button present.
  const rightPad = canRunShell
    ? "calc(var(--h3)*2 + var(--p2) + var(--p3)*2)"
    : "calc(var(--h3) + var(--p3)*2)";
  // Official ab: cacheKey `${lang}:${sb(text)}:${text.length}` so worker LRU can reuse AST.
  const cacheKey = `${lang}:${hashCodeCacheKey(text)}:${text.length}`;
  const file = useMemo<FileContents>(() => ({
    name: "code",
    contents: ensureTrailingNewline(text),
    lang: lang as FileContents["lang"],
    cacheKey,
  }), [cacheKey, lang, text]);
  const options = useMemo(() => ({
    theme,
    disableFileHeader: true,
    disableLineNumbers: true,
    overflow: "wrap" as const,
    unsafeCSS: `[data-file] { padding: var(--p6) ${rightPad} var(--p6) var(--p8); } [data-line]:hover { background: transparent; }`,
    onPostRender: pierreTokenPaintOnPostRender,
  }), [rightPad, theme]);
  void runId;

  return (
    <div className="relative max-w-full w-fit" data-official-source="c11959232-h_zsw3wI.js:ab">
      <div className="relative">
        <div className="epitaxy-diff rounded-r6 overflow-clip">
          {workerPool ? (
            <File file={file} options={options} />
          ) : (
            <pre className="m-0 p-[var(--p6)] pr-[var(--p12)] pl-[var(--p8)] text-code whitespace-pre-wrap break-all bg-t1">
              <code className={language ? `language-${language}` : undefined}>{text}</code>
            </pre>
          )}
        </div>
        <div
          className={`absolute right-[var(--p4)] flex gap-[var(--p2)] ${isSingleLine ? "top-1/2 -translate-y-1/2" : "top-[var(--p4)]"}`}
        >
          {canRunShell ? (
            <OfficialButton
              ariaLabel="Run in terminal"
              icon="Play"
              onClick={() => {
                window.dispatchEvent(new CustomEvent("epitaxy-run-inline", {
                  detail: { command: withoutBang, id: runId },
                }));
              }}
              size="small"
              variant="uncontained"
            />
          ) : null}
          <OfficialButton
            ariaLabel={copied ? "Copied" : "Copy code"}
            icon={copied ? "CheckSelection" : "CopySquareBehind"}
            onClick={() => {
              void navigator.clipboard?.writeText(text).then(() => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1200);
              }).catch(() => undefined);
            }}
            size="small"
            variant="uncontained"
          />
        </div>
      </div>
    </div>
  );
}

/** Official ks: search_tree tags → fenced search_tree. */
function preprocessOfficialCodeMarkdown(text: string) {
  return text.includes("<search_tree>")
    ? text.replace(OFFICIAL_SEARCH_TREE_BLOCK_RE, (_match, body: string) => `\n\n\`\`\`search_tree\n${body.trim()}\n\`\`\`\n\n`)
    : text;
}

/**
 * Official xd / Oe structure-tracker streaming chunks (c93fb40ec Oe + c119 kb).
 * Completes a chunk when a structure closes or a blank line ends a paragraph.
 *
 * CRITICAL: compute synchronously on text change (useMemo), not via useEffect.
 * useEffect lagged one paint behind zE 60fps ticks → frontier jumped in chunks
 * (looked like whole-message dump even when smoother was gradual).
 */
function useOfficialCodeMarkdownChunks(text: string, isStreaming: boolean) {
  return useMemo(() => {
    if (!isStreaming) return { completedChunks: text ? [text] : [], streamingChunk: "" };
    if (!text) return { completedChunks: [], streamingChunk: "" };
    const tracker = new OfficialMarkdownStructureTracker();
    const lines = text.split("\n");
    const completedChunks: string[] = [];
    let pendingLines: string[] = [];
    let completedThrough = -1;
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] ?? "";
      const { insideStructure, previousLineWasEmpty, structureJustClosed } = tracker.processLine(line);
      pendingLines.push(line);
      if (
        structureJustClosed
        || (!insideStructure && line.trim() === "" && pendingLines.length > 1 && !previousLineWasEmpty)
      ) {
        while (pendingLines.length > 0 && (pendingLines[pendingLines.length - 1] ?? "").trim() === "") {
          pendingLines.pop();
        }
        if (pendingLines.length > 0) {
          completedChunks.push(pendingLines.join("\n"));
          completedThrough = index;
          pendingLines = [];
        }
      }
    }
    return {
      completedChunks,
      streamingChunk: lines.slice(completedThrough + 1).join("\n"),
    };
  }, [isStreaming, text]);
}

/** Official structure tracker used by xd chunking. */
class OfficialMarkdownStructureTracker {
  private codeBlockDelimiter = "";
  private inBlockquote = false;
  private inCodeBlock = false;
  private inList = false;
  private inMathBlock = false;
  private inTable = false;
  private lastLineWasEmpty = true;

  reset() {
    this.inBlockquote = false;
    this.inCodeBlock = false;
    this.codeBlockDelimiter = "";
    this.inList = false;
    this.inMathBlock = false;
    this.inTable = false;
    this.lastLineWasEmpty = true;
  }

  processLine(line: string) {
    const trimmed = line.trim();
    const wasInsideStructure = this.isInsideStructure();
    if ((trimmed.startsWith("```") || trimmed.startsWith("~~~")) && !this.inMathBlock) {
      if (this.inCodeBlock) {
        if (trimmed.startsWith(this.codeBlockDelimiter)) {
          this.inCodeBlock = false;
          this.codeBlockDelimiter = "";
        }
      } else {
        this.inCodeBlock = true;
        this.codeBlockDelimiter = trimmed.substring(0, 3);
      }
    }
    if (trimmed === "$$" && !this.inCodeBlock) this.inMathBlock = !this.inMathBlock;
    const inCodeOrMath = this.inCodeBlock || this.inMathBlock;
    if (/^[-*+]|\d+\./.test(trimmed) && !inCodeOrMath) this.inList = true;
    else if (this.inList && trimmed === "") this.inList = false;
    if (line.includes("|") && !inCodeOrMath) this.inTable = true;
    else if (this.inTable && trimmed === "") this.inTable = false;
    const isBlockquoteLine = trimmed.startsWith(">");
    if (isBlockquoteLine && !inCodeOrMath) this.inBlockquote = true;
    else if (this.inBlockquote && trimmed === "" && !isBlockquoteLine) this.inBlockquote = false;
    const previousLineWasEmpty = this.lastLineWasEmpty;
    this.lastLineWasEmpty = trimmed === "";
    return {
      insideStructure: this.isInsideStructure(),
      previousLineWasEmpty,
      structureJustClosed: wasInsideStructure && !this.isInsideStructure(),
    };
  }

  private isInsideStructure() {
    return this.inBlockquote || this.inCodeBlock || this.inList || this.inMathBlock || this.inTable;
  }
}
