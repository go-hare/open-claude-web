/**
 * Official plan comment UI (c11959232):
 * - VN: "Select any text to leave a comment for Claude"
 * - KN: selection → WN popover; marks hover/edit
 * - WN: Comment on selection portal
 * - Vk: inline comment list on ExitPlanMode revise
 */
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Icon } from "../../../shell/icons";
import { OfficialButton } from "../OfficialEpitaxyComponents";
import {
  mergeOfficialPlanCommentFeedback,
  officialPlanCommentsApi,
  useOfficialPlanCommentCount,
  useOfficialPlanComments,
  type OfficialPlanComment,
} from "../session/officialPlanCommentsStore";
import {
  OfficialPlanMarkContext,
  type OfficialPlanMarkContextValue,
} from "./officialPlanMarkContext";

const PLAN_SELECTION_HIGHLIGHT = "epitaxy-plan-selection";
const PLAN_COMMENT_SKIP_ATTR = "data-plan-comment-skip";

type SelectionDraft = {
  end: number;
  mode: "selection";
  range: Range;
  start: number;
  text: string;
};

type EditingDraft = {
  comment: OfficialPlanComment;
  mode: "editing";
  range: Range;
};

type IdleDraft = { mode: "idle" };
type DraftState = IdleDraft | SelectionDraft | EditingDraft;

/** Official VN hint above plan markdown. */
export function OfficialPlanCommentHint() {
  return (
    <div className="mb-[var(--chat-item-gap)] flex items-center gap-g3 text-caption text-t6">
      <Icon name="ChatFeedbackMessage" size="s" />
      <span>Select any text to leave a comment for Claude</span>
    </div>
  );
}

/**
 * Official Vk: list of inline comments shown on Wk revise when count > 0.
 */
export function OfficialPlanCommentsList({
  onOpenPlan,
  sessionId,
}: {
  onOpenPlan?: () => void;
  sessionId: string;
}) {
  const comments = useOfficialPlanComments(sessionId);
  if (comments.length === 0) return null;
  return (
    <ul className="flex max-h-[160px] flex-col gap-g3 overflow-y-auto">
      {comments.map((item) => (
        <li key={item.id}>
          <button
            className="flex w-full flex-col gap-g1 rounded-r4 bg-t1 p-p4 text-left hover:bg-t2"
            onClick={onOpenPlan}
            type="button"
          >
            <span className="flex items-center gap-g2 text-caption text-t6">
              <Icon name="ChatFeedbackMessage" size="s" />
              <span className="truncate">{item.selectedText}</span>
            </span>
            <span className="text-body text-t8">{item.comment}</span>
          </button>
        </li>
      ))}
      <li className="sr-only">
        {comments.length === 1
          ? "1 inline comment will be sent"
          : `${comments.length} inline comments will be sent`}
      </li>
    </ul>
  );
}

/** Official KN: wrap plan markdown; mouseup selection → comment popover. */
export function OfficialPlanCommentSelection({
  children,
  sessionId,
}: {
  children: ReactNode;
  sessionId: string;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState<DraftState>({ mode: "idle" });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const multiClickTimerRef = useRef<number | null>(null);

  const dismiss = useCallback(() => {
    setDraft({ mode: "idle" });
    window.getSelection()?.removeAllRanges();
  }, []);

  const readFlatSelection = useCallback((container: HTMLElement, range: Range) => {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const parent = (node as Text).parentElement;
        if (parent?.closest(`[${PLAN_COMMENT_SKIP_ATTR}]`)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const nodes: Array<{ flatStart: number; node: Text }> = [];
    let flatLen = 0;
    for (let current = walker.nextNode(); current; current = walker.nextNode()) {
      const textNode = current as Text;
      nodes.push({ node: textNode, flatStart: flatLen });
      flatLen += textNode.data.length;
    }
    const offsetOf = (target: Node, offset: number): number => {
      for (const entry of nodes) {
        if (entry.node === target) return entry.flatStart + offset;
      }
      const probe = document.createRange();
      probe.setEnd(target, offset);
      probe.collapse(false);
      for (const entry of nodes) {
        if (probe.comparePoint(entry.node, 0) >= 0) return entry.flatStart;
      }
      return flatLen;
    };
    const start = offsetOf(range.startContainer, range.startOffset);
    const end = offsetOf(range.endContainer, range.endOffset);
    if (end <= start) return null;
    let selectedText = "";
    for (const entry of nodes) {
      const localStart = Math.max(0, start - entry.flatStart);
      const localEnd = Math.min(entry.node.data.length, end - entry.flatStart);
      if (localEnd > localStart) selectedText += entry.node.data.slice(localStart, localEnd);
    }
    return { start, end, selectedText };
  }, []);

  const captureSelection = useCallback(() => {
    const selection = window.getSelection();
    const root = rootRef.current;
    if (!selection || selection.isCollapsed || !root) return;
    const range = selection.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) return;
    const flat = readFlatSelection(root, range);
    if (!flat || !flat.selectedText.trim()) return;
    if (officialPlanCommentsApi.rangesOverlap(sessionId, flat.start, flat.end)) return;
    setDraft({
      mode: "selection",
      range: range.cloneRange(),
      text: flat.selectedText,
      start: flat.start,
      end: flat.end,
    });
  }, [readFlatSelection, sessionId]);

  const onMouseUp = useCallback(
    (event: ReactMouseEvent) => {
      if (multiClickTimerRef.current != null) {
        window.clearTimeout(multiClickTimerRef.current);
        multiClickTimerRef.current = null;
      }
      // Official: double-click waits 250ms so word selection settles.
      if (event.detail >= 2) {
        multiClickTimerRef.current = window.setTimeout(() => {
          multiClickTimerRef.current = null;
          captureSelection();
        }, 250);
        return;
      }
      captureSelection();
    },
    [captureSelection],
  );

  useEffect(
    () => () => {
      if (multiClickTimerRef.current != null) window.clearTimeout(multiClickTimerRef.current);
    },
    [],
  );

  const onMarkClick = useCallback(
    (id: string, el: HTMLElement) => {
      const comment = officialPlanCommentsApi.get(sessionId).find((item) => item.id === id);
      if (!comment) return;
      window.getSelection()?.removeAllRanges();
      const range = document.createRange();
      range.selectNodeContents(el);
      setDraft({ mode: "editing", range, comment });
    },
    [sessionId],
  );

  const onSubmit = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (draft.mode === "selection") {
        if (trimmed) {
          officialPlanCommentsApi.add(sessionId, {
            selectedText: draft.text,
            startOffset: draft.start,
            endOffset: draft.end,
            comment: trimmed,
          });
        }
      } else if (draft.mode === "editing") {
        if (trimmed) officialPlanCommentsApi.update(sessionId, draft.comment.id, trimmed);
        else officialPlanCommentsApi.remove(sessionId, draft.comment.id);
      }
      dismiss();
    },
    [dismiss, draft, sessionId],
  );

  const onDelete = useCallback(() => {
    if (draft.mode === "editing") officialPlanCommentsApi.remove(sessionId, draft.comment.id);
    dismiss();
  }, [dismiss, draft, sessionId]);

  // Official qN provider for BN mark components from ON rehype.
  const markCtx = useMemo<OfficialPlanMarkContextValue>(
    () => ({
      hoveredId,
      onMarkHover: setHoveredId,
      onMarkClick,
    }),
    [hoveredId, onMarkClick],
  );

  // Official KN remount key: editing ? comment.id : "selection"
  const popoverKey = draft.mode === "editing" ? draft.comment.id : draft.mode === "selection" ? "selection" : null;

  return (
    <OfficialPlanMarkContext.Provider value={markCtx}>
      <div ref={rootRef} onMouseUp={onMouseUp}>
        {children}
      </div>
      {draft.mode !== "idle" && popoverKey ? (
        <OfficialPlanCommentPopover
          key={popoverKey}
          initialValue={draft.mode === "editing" ? draft.comment.comment : ""}
          isEditing={draft.mode === "editing"}
          onDelete={onDelete}
          onDismiss={dismiss}
          onSubmit={onSubmit}
          range={draft.range}
        />
      ) : null}
    </OfficialPlanMarkContext.Provider>
  );
}

/** Official zw: Comment ⏎ caption keycap. */
function OfficialPlanCommentKeycap({ children }: { children: ReactNode }) {
  return <kbd className="text-caption opacity-60 shrink-0">{children}</kbd>;
}

/** Official k_e Surface elevation:"popover" (index-BELzQL5P w_e). */
function OfficialPlanCommentSurface() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-[1] rounded-[inherit] bg-surface-popover effect-stroke-shadow"
      data-surface="popover"
    />
  );
}

/** Official WN portal popover. */
const OfficialPlanCommentPopover = memo(function OfficialPlanCommentPopover({
  initialValue,
  isEditing,
  onDelete,
  onDismiss,
  onSubmit,
  range,
}: {
  initialValue: string;
  isEditing: boolean;
  onDelete: () => void;
  onDismiss: () => void;
  onSubmit: (value: string) => void;
  range: Range;
}) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [value, setValue] = useState(initialValue);
  // Keep latest value for submit so IME compositionend → Enter / button click never
  // races a stale closure (selection draft often opens mid-composition on CJK).
  const valueRef = useRef(value);
  valueRef.current = value;

  const submitLatest = useCallback(() => {
    onSubmit(valueRef.current);
  }, [onSubmit]);

  useLayoutEffect(() => {
    if (isEditing || typeof Highlight === "undefined" || !CSS.highlights) return;
    const style = document.createElement("style");
    style.textContent = `::highlight(${PLAN_SELECTION_HIGHLIGHT}) { background-color: var(--accent-20); }`;
    document.head.appendChild(style);
    CSS.highlights.set(PLAN_SELECTION_HIGHLIGHT, new Highlight(range));
    return () => {
      CSS.highlights.delete(PLAN_SELECTION_HIGHLIGHT);
      style.remove();
    };
  }, [isEditing, range]);

  useLayoutEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    let raf: number | null = null;
    const place = () => {
      // Detached / zero-rect ranges (scrolled-away selection) still get a stable HUD slot.
      const rect = range.getBoundingClientRect();
      const box = el.getBoundingClientRect();
      const hasBox = rect.width > 0 || rect.height > 0 || rect.top !== 0 || rect.left !== 0;
      const anchorLeft = hasBox ? rect.left + rect.width / 2 : window.innerWidth / 2;
      const x = Math.min(
        Math.max(anchorLeft, box.width / 2 + 8),
        window.innerWidth - box.width / 2 - 8,
      );
      const below = (hasBox ? rect.bottom : window.innerHeight / 2) + 8;
      const above = (hasBox ? rect.top : window.innerHeight / 2) - 8 - box.height;
      const maxTop = window.innerHeight - box.height - 8;
      const y = Math.min(Math.max(below + box.height > window.innerHeight ? above : below, 8), maxTop);
      el.style.transform = `translate(${x}px, ${y}px) translateX(-50%)`;
    };
    const onScrollOrResize = () => {
      if (raf != null) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        place();
      });
    };
    place();
    document.addEventListener("scroll", onScrollOrResize, { capture: true, passive: true });
    window.addEventListener("resize", onScrollOrResize);
    const ro = new ResizeObserver(onScrollOrResize);
    ro.observe(el);
    return () => {
      document.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
      ro.disconnect();
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, [range]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (shellRef.current && !shellRef.current.contains(event.target as Node)) onDismiss();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // Match epitaxy IME: don't treat composition Escape as dismiss.
        if (event.isComposing || event.keyCode === 229) return;
        event.preventDefault();
        event.stopPropagation();
        onDismiss();
      }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [onDismiss]);

  // Official WN class string is on the fixed shell. ion-dist utilities are
  // `.epitaxy-root :is(.p-p4|.rounded-r6|…)` — self-class on the same node as
  // `epitaxy-root` does not match, so portal must wrap an outer epitaxy-root
  // (same pattern as OfficialModal) for padding/radius/textarea theme to apply.
  return createPortal(
    <div className="epitaxy-root">
      <div
        aria-label="Comment on selection"
        className="draggable-none fixed left-0 top-0 isolate z-[90] w-[320px] rounded-r6 p-p4"
        data-plan-comment-popover=""
        ref={shellRef}
        role="dialog"
        style={{ willChange: "transform" }}
      >
        <OfficialPlanCommentSurface />
        <textarea
          aria-label="Plan comment"
          className="epitaxy-textarea w-full resize-none"
          onChange={(event) => {
            const next = event.target.value;
            // Sync ref immediately so Comment/Enter never read a pre-render stale value
            // (official WN closes over state `f`, but fiber/test paths can click same tick).
            valueRef.current = next;
            setValue(next);
          }}
          onKeyDown={(event) => {
            // CJK IME: Enter confirms composition (isComposing / keyCode 229) — must not submit.
            if (event.nativeEvent.isComposing || event.keyCode === 229) return;
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.stopPropagation();
              submitLatest();
            }
          }}
          placeholder="Leave a comment for Claude…"
          ref={textareaRef}
          rows={2}
          style={{ fieldSizing: "content", maxHeight: "8lh" } as CSSProperties}
          value={value}
        />
        {/*
          Official WN class is `mt-g3 flex …` but ion-dist has no `.mt-g3` rule
          (only gap-g3 / mt-3 / mt-[Npx]). Use marginTop: var(--g3) so the token
          matches official intent (4px) without inventing a new spacing scale.
        */}
        <div
          className="flex items-center justify-between gap-g3"
          style={{ marginTop: "var(--g3)" }}
        >
          {isEditing ? (
            <OfficialButton ariaLabel="Delete" onClick={onDelete} size="small" variant="uncontained">
              <Icon name="TrashCanRound" size="s" />
              Delete
            </OfficialButton>
          ) : (
            <span />
          )}
          <OfficialButton ariaLabel="Comment" onClick={submitLatest} size="small" variant="primary">
            Comment
            <OfficialPlanCommentKeycap>⏎</OfficialPlanCommentKeycap>
          </OfficialButton>
        </div>
      </div>
    </div>,
    document.body,
  );
});

export { mergeOfficialPlanCommentFeedback, useOfficialPlanCommentCount };
