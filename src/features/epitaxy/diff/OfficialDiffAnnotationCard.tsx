/**
 * Official c9a932a07 `_c` — draft / saved annotation card.
 * Official `Ec` — read-only PR review comment card (Open in GitHub / Send to Claude).
 * Send to Claude is `kc`/`wc` only — onAnnotationSaved is `_c` Enter, not Ec.
 */
import { processFile } from "@pierre/diffs";
import { File, FileDiff } from "@pierre/diffs/react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Icon } from "../../../shell/icons";
import {
  parseOfficialPrCommentBody,
  type OfficialPrCommentSegment,
} from "./officialDiffPrCommentResidual";
import {
  officialDiffAnnotationsApi,
  type OfficialDiffAnnotation,
  type OfficialDiffDraft,
  type OfficialDiffPrComment,
} from "./officialDiffAnnotationsStore";
import { officialPierreLangFromPath } from "./officialPierreLang";
import { useOfficialPierreTheme } from "./OfficialPierreWorkerPool";
import "./ensurePierreDiffsContainer";

const FIELD_SIZING: CSSProperties = { fieldSizing: "content" };

export function OfficialDiffAnnotationCard({
  annotation,
  cardKey,
  draft,
  filePath,
  isActive,
  onSaved,
  sessionId,
}: {
  annotation?: OfficialDiffAnnotation;
  cardKey: string;
  draft?: OfficialDiffDraft;
  filePath: string;
  isActive: boolean;
  /** Official `_c` onSaved — rN requestComposerAction({submit}). */
  onSaved?: (payload: { submit: boolean }) => void;
  sessionId: string;
}) {
  const [body, setBody] = useState(annotation?.body ?? draft?.body ?? "");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef(body);
  useLayoutEffect(() => {
    bodyRef.current = body;
  }, [body]);

  useEffect(() => {
    if (annotation) return undefined;
    return () => {
      officialDiffAnnotationsApi.syncDraftBody(sessionId, filePath, cardKey, bodyRef.current);
    };
  }, [annotation, cardKey, filePath, sessionId]);

  useEffect(() => {
    if (isActive) textareaRef.current?.focus();
  }, [isActive]);

  useEffect(() => {
    if (isActive && annotation) setBody(annotation.body);
  }, [annotation, isActive]);

  const source = annotation ?? draft;
  const lineLabel = source
    ? source.startLine !== source.endLine
      ? `Lines ${source.startLine}–${source.endLine}`
      : `Line ${source.endLine}`
    : null;

  const save = useCallback((next: string) => {
    if (annotation) {
      officialDiffAnnotationsApi.updateAnnotation(sessionId, filePath, annotation.id, next);
      officialDiffAnnotationsApi.setActive(sessionId, null);
      return;
    }
    if (draft) {
      officialDiffAnnotationsApi.addAnnotation(sessionId, { ...draft, body: next });
      officialDiffAnnotationsApi.clearDraft(sessionId, filePath, cardKey);
    }
  }, [annotation, cardKey, draft, filePath, sessionId]);

  const cancel = useCallback(() => {
    if (annotation) officialDiffAnnotationsApi.setActive(sessionId, null);
    else officialDiffAnnotationsApi.clearDraft(sessionId, filePath, cardKey);
  }, [annotation, cardKey, filePath, sessionId]);

  const activate = useCallback(() => {
    officialDiffAnnotationsApi.setActive(sessionId, { filePath, key: cardKey });
  }, [cardKey, filePath, sessionId]);

  const remove = annotation
    ? () => officialDiffAnnotationsApi.removeAnnotation(sessionId, filePath, annotation.id)
    : undefined;

  const onKeyDown = useCallback((event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const trimmed = body.trim();
      if (!trimmed) return;
      save(trimmed);
      onSaved?.({ submit: event.metaKey || event.ctrlKey });
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    }
  }, [body, cancel, onSaved, save]);

  const onBlur = useCallback((event: { relatedTarget: EventTarget | null }) => {
    if (annotation) return;
    const next = event.relatedTarget;
    if (next && rootRef.current?.contains(next as Node)) return;
    requestAnimationFrame(() => {
      if (textareaRef.current && !textareaRef.current.value.trim()) cancel();
    });
  }, [annotation, cancel]);

  const editing = isActive || !annotation;

  return (
    <div className="px-p6 py-p3">
      <div
        ref={rootRef}
        className={`flex flex-col gap-g1 rounded-r4 border border-[var(--border-default)] bg-z1 px-p5 py-p3${editing ? "" : " cursor-text"}`}
        onClick={editing ? undefined : activate}
      >
        {lineLabel ? <div className="text-footnote text-t5">{lineLabel}</div> : null}
        <div className="flex items-center gap-g3">
          {editing ? (
            <textarea
              ref={textareaRef}
              className="epitaxy-prompt-input flex-1 min-w-0 resize-none border-none bg-transparent text-body text-t8 placeholder:text-t5"
              onBlur={onBlur}
              onChange={(event) => setBody(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Add a comment"
              rows={1}
              style={FIELD_SIZING}
              value={body}
            />
          ) : (
            <p className="flex-1 min-w-0 whitespace-pre-wrap break-words text-body text-t8">
              {annotation?.body}
            </p>
          )}
          <div className="shrink-0 w-[24px] h-[24px] flex items-center justify-center">
            {editing ? (
              <button
                aria-label="Save comment"
                className="rounded-r3 p-p2 text-t6 hover:bg-t2 hover:text-t8 disabled:opacity-40"
                disabled={!body.trim()}
                onClick={() => {
                  const trimmed = body.trim();
                  if (trimmed) save(trimmed);
                }}
                type="button"
              >
                <Icon name="Check" customSize={16} />
              </button>
            ) : remove ? (
              <button
                aria-label="Delete comment"
                className="rounded-r3 p-p2 text-t5 opacity-0 transition-opacity hover:bg-t2 hover:text-extended-pink group-hover/card:opacity-100"
                onClick={(event) => {
                  event.stopPropagation();
                  remove();
                }}
                type="button"
              >
                <Icon name="Trash" customSize={14} />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

const EC_BLOCK_GAP = "mb-[var(--g6)] last:mb-0";
const EC_HEADING = `text-body-medium text-t9 mt-[var(--g6)] first:mt-0 ${EC_BLOCK_GAP}`;
const EC_SUGGESTION_UNSAFE_CSS =
  "[data-file], [data-diff] { --diffs-bg: var(--t1); } [data-separator] { display: none; }";

const EC_MARKDOWN_COMPONENTS = {
  p: ({ children }: { children?: ReactNode }) => (
    <p className={`break-words text-body text-t8 ${EC_BLOCK_GAP}`}>{children}</p>
  ),
  strong: ({ children }: { children?: ReactNode }) => (
    <strong className="text-body-medium text-t9">{children}</strong>
  ),
  em: ({ children }: { children?: ReactNode }) => <em className="italic">{children}</em>,
  code: ({ children }: { children?: ReactNode }) => (
    <code className="rounded-r2 bg-t1 px-p2 text-code text-t9">{children}</code>
  ),
  pre: ({ children }: { children?: ReactNode }) => {
    if (typeof children === "object" && children && "props" in children) {
      const props = (children as { props?: { children?: unknown; className?: string } }).props;
      const text = typeof props?.children === "string" ? props.children.replace(/\n$/, "") : "";
      const lang = /language-(\S+)/.exec(props?.className ?? "")?.[1];
      return <OfficialEcFence lang={lang} text={text} />;
    }
    return <>{children}</>;
  },
  a: ({ children, href }: { children?: ReactNode; href?: string }) => (
    <a
      className="text-t9 underline decoration-t4 underline-offset-[3px] hover:decoration-t7"
      href={href}
      rel="noopener noreferrer nofollow"
      target="_blank"
    >
      {children}
    </a>
  ),
  ul: ({ children }: { children?: ReactNode }) => (
    <ul className={`list-disc pl-[20px] text-body text-t8 ${EC_BLOCK_GAP}`}>{children}</ul>
  ),
  ol: ({ children, start }: { children?: ReactNode; start?: number }) => (
    <ol className={`list-decimal pl-[20px] text-body text-t8 ${EC_BLOCK_GAP}`} start={start}>{children}</ol>
  ),
  li: ({ children }: { children?: ReactNode }) => (
    <li className="mb-[var(--p2)]">{children}</li>
  ),
  h1: ({ children }: { children?: ReactNode }) => <h1 className={EC_HEADING}>{children}</h1>,
  h2: ({ children }: { children?: ReactNode }) => <h2 className={EC_HEADING}>{children}</h2>,
  h3: ({ children }: { children?: ReactNode }) => <h3 className={EC_HEADING}>{children}</h3>,
  h4: ({ children }: { children?: ReactNode }) => <h4 className={EC_HEADING}>{children}</h4>,
  h5: ({ children }: { children?: ReactNode }) => <h5 className={EC_HEADING}>{children}</h5>,
  h6: ({ children }: { children?: ReactNode }) => <h6 className={EC_HEADING}>{children}</h6>,
  blockquote: ({ children }: { children?: ReactNode }) => (
    <blockquote className={`border-l-2 border-t4 pl-p5 text-t6 ${EC_BLOCK_GAP}`}>{children}</blockquote>
  ),
  hr: () => <hr className="my-[var(--g3)] border-t border-[var(--border-default)]" />,
};

/** Official c9a `Pc`. */
function OfficialEcMarkdown({ children }: { children: string }) {
  return (
    <div className="text-body text-t8 [&_p:last-child]:mb-0">
      <ReactMarkdown components={EC_MARKDOWN_COMPONENTS} remarkPlugins={[remarkGfm]} skipHtml>
        {children}
      </ReactMarkdown>
    </div>
  );
}

/** Official c9a `Rc`. */
function OfficialEcDetails({ body, summary }: { body: string; summary: string }) {
  return (
    <details className="group rounded-r3 border border-[var(--border-default)]">
      <summary className="flex cursor-pointer list-none select-none items-center gap-g3 rounded-r3 bg-t1 px-p4 py-p3 text-footnote text-t6 hover:text-t8 group-open:rounded-b-none [&::-webkit-details-marker]:hidden">
        <span aria-hidden className="text-t5 transition-transform group-open:rotate-90">▸</span>
        <span className="truncate">{summary}</span>
      </summary>
      <div className="border-t border-[var(--border-default)] px-p4 py-p4">
        <OfficialEcMarkdown>{body}</OfficialEcMarkdown>
      </div>
    </details>
  );
}

/** Official c9a `Mc`. */
function OfficialEcFence({ lang, text }: { lang?: string; text: string }) {
  const theme = useOfficialPierreTheme();
  const file = useMemo(() => ({
    cacheKey: text,
    contents: text,
    lang: officialPierreLangFromPath(lang ? `f.${lang}` : "f.txt"),
    name: lang ? `snippet.${lang}` : "snippet",
  }), [lang, text]);
  const options = useMemo(() => ({
    disableFileHeader: true,
    disableLineNumbers: true,
    overflow: "wrap" as const,
    theme,
    unsafeCSS: "[data-file] { --diffs-bg: var(--t1); }",
  }), [theme]);
  return (
    <div className={`epitaxy-diff overflow-clip rounded-r3 text-code ${EC_BLOCK_GAP}`}>
      <File file={file} options={options} />
    </div>
  );
}

/** Official c9a `Oc`. */
function OfficialEcSuggestion({
  file,
  patch,
}: {
  file: { cacheKey: string; contents: string; lang: string; name: string };
  patch: string | null;
}) {
  const theme = useOfficialPierreTheme();
  const patchOptions = useMemo(() => ({
    diffIndicators: "none" as const,
    diffStyle: "unified" as const,
    disableFileHeader: true,
    overflow: "wrap" as const,
    theme,
    unsafeCSS: EC_SUGGESTION_UNSAFE_CSS,
  }), [theme]);
  const fileOptions = useMemo(() => ({
    disableFileHeader: true,
    disableLineNumbers: true,
    overflow: "wrap" as const,
    theme,
    unsafeCSS: EC_SUGGESTION_UNSAFE_CSS,
  }), [theme]);
  const fileDiff = useMemo(
    () => (patch ? processFile(patch, { cacheKey: patch }) : null),
    [patch],
  );
  return (
    <div className="epitaxy-diff overflow-clip rounded-r3 text-code">
      <div className="bg-t1 px-p4 py-p2 text-footnote text-t6">Suggested change</div>
      {fileDiff ? (
        <FileDiff fileDiff={fileDiff} options={patchOptions} />
      ) : (
        <File file={file} options={fileOptions} />
      )}
    </div>
  );
}

function OfficialEcSegment({ segment }: { segment: OfficialPrCommentSegment }) {
  if (segment.kind === "details") {
    return <OfficialEcDetails body={segment.body} summary={segment.summary} />;
  }
  if (segment.kind === "suggestion") {
    return <OfficialEcSuggestion file={segment.file} patch={segment.patch} />;
  }
  return <OfficialEcMarkdown>{segment.text}</OfficialEcMarkdown>;
}

/**
 * Official c9a `Ec` — PR review comment (read-only). No GitHub POST.
 * Send to Claude: `kc` stage / `wc` unstage. Composer prepend is `ic` on submit.
 */
export function OfficialDiffPrCommentCard({
  comment,
  filePath,
  isSent,
  isStaged,
  original,
  sessionId,
}: {
  comment: OfficialDiffPrComment;
  filePath: string;
  isSent: boolean;
  isStaged: boolean;
  original?: string;
  sessionId: string;
}) {
  const [forceExpanded, setForceExpanded] = useState(false);
  const isResolved = comment.resolved ?? false;
  const collapsed = (isResolved || isSent) && !isStaged && !forceExpanded;
  const lang = useMemo(() => officialPierreLangFromPath(filePath), [filePath]);
  const segments = useMemo(
    () => parseOfficialPrCommentBody(comment.body, filePath, comment.startLine, original, lang),
    [comment.body, comment.startLine, filePath, lang, original],
  );
  const lineLabel = comment.startLine !== comment.endLine
    ? `Lines ${comment.startLine}–${comment.endLine}`
    : `Line ${comment.endLine}`;
  const onSend = useCallback(() => {
    if (isStaged) {
      officialDiffAnnotationsApi.removeAnnotation(sessionId, filePath, comment.id);
      return;
    }
    officialDiffAnnotationsApi.stagePrComment(sessionId, {
      ...comment,
      lang,
      snippet: original,
    });
  }, [comment, filePath, isStaged, lang, original, sessionId]);

  if (collapsed) {
    return (
      <div className="px-p6 py-p3">
        <button
          aria-expanded={false}
          className="flex w-full items-baseline justify-between gap-g3 rounded-r4 border border-[var(--border-default)] bg-z1 px-p5 py-p3 text-left text-footnote text-t5 hover:bg-t1"
          onClick={() => setForceExpanded(true)}
          type="button"
        >
          <span>{lineLabel}</span>
          <span className="flex items-baseline gap-g3">
            {comment.author ? <span>{`@${comment.author}`}</span> : null}
            {isResolved ? (
              <span className="text-t6">Resolved</span>
            ) : (
              <span className="text-extended-green">Sent</span>
            )}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="px-p6 py-p3">
      <div className="flex flex-col gap-g3 rounded-r4 border border-[var(--border-default)] bg-z1 px-p5 py-p4">
        <div className="flex items-baseline justify-between gap-g3 text-footnote text-t5">
          <span>{lineLabel}</span>
          {comment.author ? <span>{`@${comment.author}`}</span> : null}
        </div>
        {segments.map((segment, index) => (
          <OfficialEcSegment key={index} segment={segment} />
        ))}
        <div className="flex items-center justify-end gap-g3 pt-p2">
          {comment.url ? (
            <button
              className="rounded-r3 px-p3 py-p2 text-footnote text-t6 hover:bg-t2 hover:text-t8"
              onClick={() => window.open(comment.url, "_blank", "noopener")}
              type="button"
            >
              Open in GitHub
            </button>
          ) : null}
          <button
            aria-pressed={isStaged}
            className={`rounded-r3 border px-p4 py-p2 text-footnote-medium ${
              isStaged
                ? "border-transparent bg-extended-10-green text-extended-green"
                : "border-[var(--border-default)] text-t7 hover:bg-t2 hover:text-t9"
            }`}
            onClick={onSend}
            type="button"
          >
            {isStaged ? "Queued" : "Send to Claude"}
          </button>
        </div>
      </div>
    </div>
  );
}
