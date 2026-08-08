/**
 * Official assistant markdown pipeline from c11959232:
 * - kb: claude_ai_alluvium_main → wb (data-alluvium + vd committed/frontier);
 *       else structure-tracker streaming chunks (xd) + search_tree preprocess (ks)
 * - Jv.Provider value:isStreaming around both paths
 * - jb: react-markdown + remark-gfm + mb component map
 * - ab: Pierre File fence + copy (+ optional shell run hook later)
 * - ob/db: inline code / links
 */
import {
  Children,
  createContext,
  Fragment,
  isValidElement,
  memo,
  useContext,
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
import { evaluateCoworkMarkdownFeature } from "../cowork/session/transcript/CoworkAssistantMarkdown";
import {
  AlluviumMarkdown,
  type AlluviumFenceBlock,
} from "../cowork/session/transcript/AlluviumMarkdown";
import { Icon } from "../../shell/icons";
import { OfficialButton } from "./OfficialEpitaxyComponents";
import { isOfficialMermaidMarkdownLanguage, OfficialMermaidHit } from "./OfficialMermaidDiagramCard";
import { OfficialSearchTree, officialSearchTreeLanguage } from "./OfficialSearchTree";
import {
  looksLikeOfficialLocalPathHref,
  needsOfficialBrSplit,
  parseOfficialFileRef,
  splitOfficialBrMarkers,
  officialMarkdownUrlTransform as residualUrlTransform,
} from "./officialMarkdownMbResidual";
import { officialPierreLangFromPath } from "./diff/officialPierreLang";
import { useOfficialPierreTheme, useWorkerPool } from "./diff/OfficialPierreWorkerPool";
import { pierreTokenPaintOnPostRender } from "./diff/pierreTokenPaint";
import "./diff/ensurePierreDiffsContainer";
import "katex/dist/katex.min.css";

/**
 * Official c119 bb fence residual:
 *   langSettled already gated by Alluvium code variant;
 *   search_tree → Ex; else ab (Pierre) / mermaid product delta.
 */
function renderOfficialCodeAlluviumFence(block: AlluviumFenceBlock) {
  const lang = block.lang
    ? (OFFICIAL_MD_LANG_ALIAS[block.lang.toLowerCase()] ?? block.lang)
    : "text";
  if (lang === officialSearchTreeLanguage || block.lang === officialSearchTreeLanguage) {
    return <OfficialSearchTree content={block.code} />;
  }
  // Residual hit: div.mb-2 > eit (OfficialMermaidHit).
  if (isOfficialMermaidMarkdownLanguage(lang)) {
    return <OfficialMermaidHit source={block.code} />;
  }
  return <OfficialAssistantCodeFence language={lang} text={block.code} />;
}

/**
 * Official Jv (c11959232) — streaming context for markdown tree.
 * `createContext(false)`; kb wraps children in Jv.Provider value:isStreaming.
 */
export const OfficialCodeMarkdownStreamingContext = createContext(false);

export function useOfficialCodeMarkdownStreaming(): boolean {
  return useContext(OfficialCodeMarkdownStreamingContext);
}

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
 *   n = el("claude_ai_alluvium_main")
 *   a = ks(children)
 *   {completedChunks, streamingChunk} = xd(a, isStreaming && !n)
 *   if (n) return Jv.Provider + epitaxy-markdown + wb({isStreaming, children:a})
 *   else map jb chunks + frontier
 *
 * Product: AlluviumMarkdown residual engine = official vd/ae (c93fb40ec) used by
 * c119 wb path; wrap with data-alluvium + contents to match c119 wb DOM.
 */
export function OfficialCodeMarkdown({ isStreaming = false, text }: { isStreaming?: boolean; text: string }) {
  const normalized = useMemo(() => preprocessOfficialCodeMarkdown(text), [text]);
  // Official el("claude_ai_alluvium_main") each render — missing/false → xd path.
  const alluviumEnabled = evaluateCoworkMarkdownFeature("claude_ai_alluvium_main") === true;
  // Official xd only when streaming && !alluvium.
  const { completedChunks, streamingChunk } = useOfficialCodeMarkdownChunks(
    normalized,
    isStreaming && !alluviumEnabled,
  );
  // Official: o = r || (0 === i.length ? a : "")
  const frontier = streamingChunk || (completedChunks.length === 0 ? normalized : "");

  if (alluviumEnabled) {
    return (
      <OfficialCodeMarkdownStreamingContext.Provider value={isStreaming}>
        <div className="epitaxy-markdown" data-official-source="c11959232-h_zsw3wI.js:kb+wb">
          {/*
            Official wb → bb (c119): bare tags under .epitaxy-markdown for UI font
            (--family-ui / --text-body). NOT Cowork ye font-claude-response-body.
            Fence inject = ab / search_tree (official bb case"fence").
          */}
          <AlluviumMarkdown
            className="contents"
            dataAlluvium
            isStreaming={isStreaming}
            renderFence={renderOfficialCodeAlluviumFence}
            text={normalized}
            variant="code"
          />
        </div>
      </OfficialCodeMarkdownStreamingContext.Provider>
    );
  }

  return (
    <OfficialCodeMarkdownStreamingContext.Provider value={isStreaming}>
      <div className="epitaxy-markdown" data-official-source="c11959232-h_zsw3wI.js:kb+xd">
        {completedChunks.map((chunk, index) => (
          <OfficialCodeMarkdownChunk chunk={chunk} key={`c${index}`} />
        ))}
        {frontier ? <OfficialCodeMarkdownChunk chunk={frontier} key={`s${completedChunks.length}`} /> : null}
      </div>
    </OfficialCodeMarkdownStreamingContext.Provider>
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

/**
 * Official mb component map (c11959232) keys only:
 * code, pre, li, input, a, img, table, th, td.
 * (No p/h1–h6/ul/ol/blockquote/hr — react-markdown defaults + .epitaxy-markdown CSS.)
 * Product bridges: CustomEvent open-file for ru/mu; optional mermaid pre branch (index residual, not c119 mb).
 */
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

function OfficialMarkdownInlineCode({
  children,
  className,
}: ComponentPropsWithoutRef<"code"> & { node?: unknown }) {
  // Do not spread react-markdown's `node` AST (leaks node="[object Object]" on DOM).
  // Fenced blocks: className language-* lives on code inside pre — handled by pre.
  if (className?.includes("language-")) {
    return <code className={className}>{children}</code>;
  }
  // Official ob: string child only → hu file-ref → ru wrapper (product: CustomEvent open).
  const text = typeof children === "string" ? children : null;
  const fileRef = text ? parseOfficialFileRef(text) : null;
  if (fileRef) {
    return (
      <button
        className={`${OFFICIAL_INLINE_CODE_CLASS} border-0 p-0 m-0 bg-transparent cursor-pointer`}
        data-official-source="c11959232-h_zsw3wI.js:ob+ru"
        onClick={() => {
          window.dispatchEvent(
            new CustomEvent("epitaxy-open-file", {
              detail: { path: fileRef.path, line: fileRef.line },
            }),
          );
        }}
        type="button"
      >
        {/* Official: rb on ru wrapper; bare <code> inside */}
        <code>{text}</code>
      </button>
    );
  }
  return <code className={OFFICIAL_INLINE_CODE_CLASS}>{children}</code>;
}

function OfficialMarkdownPre({ children }: { children?: ReactNode }) {
  // Official mb.pre: Jv streaming + empty → <pre />; else lang → Ex/ab.
  const isStreaming = useOfficialCodeMarkdownStreaming();
  if (isValidElement(children)) {
    const props = children.props as { children?: ReactNode; className?: string };
    const raw = typeof props.children === "string" ? props.children.replace(/\n$/, "") : "";
    if (isStreaming && raw === "") {
      return <pre data-official-source="c11959232-h_zsw3wI.js:mb.pre empty" />;
    }
    const lang = props.className
      ? parseLanguageClass(props.className)
      : "text";
    // Residual index hit (not c119 mb): mermaid → div.mb-2 > eit.
    if (isOfficialMermaidMarkdownLanguage(lang)) {
      return <OfficialMermaidHit source={raw} />;
    }
    if (lang === officialSearchTreeLanguage) {
      return <OfficialSearchTree content={raw} />;
    }
    return <OfficialAssistantCodeFence language={lang} text={raw} />;
  }
  return <>{children}</>;
}

function OfficialMarkdownAnchor({ href, children }: { href?: string; children?: ReactNode }) {
  // Official db: decodeURI-safe path / external; product bridge CustomEvent for local paths.
  let resolvedHref = href;
  if (resolvedHref) {
    try {
      resolvedHref = decodeURI(resolvedHref);
    } catch {
      // keep raw
    }
  }
  if (resolvedHref && looksLikeOfficialLocalPathHref(resolvedHref)) {
    const fileRef = parseOfficialFileRef(resolvedHref);
    return (
      <button
        className={OFFICIAL_MD_LINK_CLASS}
        data-official-source="c11959232-h_zsw3wI.js:db file"
        onClick={() => {
          window.dispatchEvent(
            new CustomEvent("epitaxy-open-file", {
              detail: {
                path: fileRef?.path ?? resolvedHref,
                line: fileRef?.line,
              },
            }),
          );
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
  // Official pb classes (c119): block max-w-full h-auto rounded-r4 border border-[var(--border-default)]
  return (
    <img
      alt={props.alt ?? ""}
      className="block max-w-full h-auto rounded-r4 border border-[var(--border-default)]"
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

function renderOfficialBrChildren(children: ReactNode): ReactNode {
  if (!needsOfficialBrSplit(children)) return children;
  return splitOfficialBrMarkers(children).map((part, index) =>
    typeof part === "string" ? (
      <Fragment key={index}>{part}</Fragment>
    ) : (
      <br key={index} />
    ),
  );
}

function OfficialMarkdownTh({ children, style }: { children?: ReactNode; style?: CSSProperties }) {
  // Official th: style + yl(children)
  return <th style={style}>{renderOfficialBrChildren(children)}</th>;
}

function OfficialMarkdownTd({ children, style }: { children?: ReactNode; style?: CSSProperties }) {
  // Official td: style + yl(children)
  return <td style={style}>{renderOfficialBrChildren(children)}</td>;
}

function OfficialMarkdownListItem({ children, className }: { children?: ReactNode; className?: string }) {
  // Official li: non-task drops className; task-list-item flex layout.
  if (!className?.includes("task-list-item")) {
    return <li>{children}</li>;
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
  // Official input: disabled checkbox → done / not-done glyphs; CheckSelection size "m".
  if (type !== "checkbox" || !disabled) {
    return <input checked={checked} disabled={disabled} readOnly type={type} />;
  }
  const box = "shrink-0 size-[16px] mt-[1px] flex items-center justify-center";
  if (checked) {
    return (
      <span className={`${box} text-assistant-primary`} data-done>
        <Icon name="CheckSelection" size="m" />
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

/**
 * Official hb urlTransform — re-export residual with react-markdown signature.
 * Strips javascript: etc.; img src pass; no-scheme paths allowed for db bridge.
 */
export function officialMarkdownUrlTransform(
  url: string,
  key?: string,
  node?: { tagName?: string } | null,
): string {
  return residualUrlTransform(url, key ?? "href", node);
}

function parseLanguageClass(className: string) {
  const match = /language-(\S+)/.exec(className);
  const raw = match?.[1] ?? "text";
  return OFFICIAL_MD_LANG_ALIAS[raw.toLowerCase()] ?? raw;
}

function resolveMarkdownLang(language?: string) {
  if (!language) return "text";
  const mapped = officialPierreLangFromPath(`file.${language}`);
  return mapped !== "text" ? mapped : language;
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
  // Official ab reads Jv streaming: cacheKey undefined while streaming.
  const isStreaming = useOfficialCodeMarkdownStreaming();
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
  // Official ab: cacheKey undefined while streaming (Jv); else `${lang}:${sb(text)}:${text.length}`.
  const cacheKey = isStreaming ? undefined : `${lang}:${hashCodeCacheKey(text)}:${text.length}`;
  const file = useMemo<FileContents>(() => ({
    name: "code",
    // Official contents = raw text (no ensureTrailingNewline in residual paint path).
    contents: text,
    lang: lang as FileContents["lang"],
    ...(cacheKey ? { cacheKey } : {}),
  }), [cacheKey, lang, text]);
  const options = useMemo(() => ({
    theme,
    disableFileHeader: true,
    disableLineNumbers: true,
    overflow: "wrap" as const,
    unsafeCSS: `[data-file] { padding: var(--p6) ${rightPad} var(--p6) var(--p8); } [data-line]:hover { background: transparent; }`,
    // Product paint assist (not c119 ab) — keep for local Pierre token fidelity.
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
