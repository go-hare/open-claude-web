/**
 * Official c9a932a07 `_c` — draft / saved annotation card.
 * PR cards (`Ec`) stay unwired until getPrReviewComments hydrate is used.
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Icon } from "../../../shell/icons";
import {
  officialDiffAnnotationsApi,
  type OfficialDiffAnnotation,
  type OfficialDiffDraft,
} from "./officialDiffAnnotationsStore";

const FIELD_SIZING: CSSProperties = { fieldSizing: "content" };

export function OfficialDiffAnnotationCard({
  annotation,
  cardKey,
  draft,
  filePath,
  isActive,
  sessionId,
}: {
  annotation?: OfficialDiffAnnotation;
  cardKey: string;
  draft?: OfficialDiffDraft;
  filePath: string;
  isActive: boolean;
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
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    }
  }, [body, cancel, save]);

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
