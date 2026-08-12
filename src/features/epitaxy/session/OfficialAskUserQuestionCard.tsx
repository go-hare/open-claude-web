/**
 * Official c11959232 `Ow` — Code AskUserQuestion interactive approval card.
 * Not the generic tool permission card (nI) and not Cowork banner chrome.
 */
import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { OfficialButton } from "../OfficialEpitaxyComponents";
import {
  OFFICIAL_ASK_USER_OTHER_INDEX,
  parseOfficialAskUserInput,
  type OfficialAskUserParsedInput,
  type OfficialAskUserSubmitPayload,
} from "./officialAskUserQuestionModel";
import { buildOfficialAskUserSubmitPayload, useOfficialAskUserQuestion } from "./useOfficialAskUserQuestion";

export const OfficialAskUserQuestionCard = memo(function OfficialAskUserQuestionCard({
  busy,
  children,
  isPanelActive = true,
  onSubmit,
  queueDepth = 0,
  toolInput,
}: {
  busy?: boolean;
  children?: ReactNode;
  isPanelActive?: boolean;
  onSubmit: (payload: OfficialAskUserSubmitPayload) => void;
  queueDepth?: number;
  toolInput: Record<string, unknown>;
}) {
  const parsed = parseOfficialAskUserInput(toolInput);
  const submittedRef = useRef(false);

  const onAnswersSubmit = useCallback((
    answers: Record<string, string | string[]>,
    input: OfficialAskUserParsedInput,
    annotations: Record<string, { preview?: string }>,
  ) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    onSubmit(buildOfficialAskUserSubmitPayload(answers, input, annotations));
  }, [onSubmit]);

  const controller = useOfficialAskUserQuestion({
    parsedInput: parsed,
    onAnswersSubmit,
    disableAutoSkip: true,
  });

  const questions = parsed.questions;
  const empty = questions.length === 0;
  useEffect(() => {
    if (!empty || submittedRef.current) return;
    submittedRef.current = true;
    onSubmit({ questions: [], answers: {} });
  }, [empty, onSubmit]);

  useEffect(() => {
    if (!isPanelActive) return;
    const frame = requestAnimationFrame(() => {
      controller.containerRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [controller.containerRef, controller.currentQuestionIndex, isPanelActive]);

  const [otherFocused, setOtherFocused] = useState(false);
  const current = questions[controller.currentQuestionIndex];
  if (!current) return null;

  const multiSelect = current.multiSelect === true;
  const isLast = controller.currentQuestionIndex === questions.length - 1;
  const hasSelection = controller.selectedIndices.size > 0;
  const otherSelected = controller.selectedIndices.has(OFFICIAL_ASK_USER_OTHER_INDEX);
  const otherHighlighted = multiSelect && controller.highlightedIndex === OFFICIAL_ASK_USER_OTHER_INDEX;
  const optionCountWithOther = current.options.length + 1;
  const ghostCount = Math.min(queueDepth, 2);

  const stopBubble = useCallback((event: { stopPropagation: () => void }) => {
    event.stopPropagation();
  }, []);

  const stopArrowBubble = useCallback((event: ReactKeyboardEvent) => {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") event.stopPropagation();
  }, []);

  const onSkip = useCallback(() => {
    if (busy || submittedRef.current) return;
    controller.handleSkip();
  }, [busy, controller]);

  return (
    <div
      className="epitaxy-approval-card outline-none"
      onClick={stopBubble}
      onKeyDown={isPanelActive && !busy ? controller.handleKeyDown : undefined}
      ref={controller.containerRef}
      tabIndex={0}
    >
      {Array.from({ length: ghostCount }, (_, index) => {
        const layer = index + 1;
        return (
          <div
            aria-hidden
            className="absolute inset-0 rounded-r7 bg-surface-primary-elevated epitaxy-approval-ghost"
            key={layer}
            style={{
              opacity: 1 - 0.25 * layer,
              transform: `translateY(-${6 * layer}px) scale(${1 - 0.03 * layer})`,
              zIndex: -layer,
            }}
          />
        );
      })}
      <OfficialAskUserSurface />
      <OfficialAskUserHeader
        trailing={questions.length > 1 ? (
          <span className="text-caption text-t6 tabular-nums shrink-0 pr-p6">
            {controller.currentQuestionIndex + 1}/{questions.length}
          </span>
        ) : undefined}
      >
        <span className="select-text">{current.question}</span>
      </OfficialAskUserHeader>

      <div className="flex flex-col gap-g2">
        {current.options.map((option, index) => {
          const selected = controller.selectedIndices.has(index);
          const highlighted = multiSelect && controller.highlightedIndex === index;
          return (
            <button
              aria-pressed={multiSelect ? selected : undefined}
              className={`flex items-center gap-g6 rounded-r4 px-p6 py-p6 text-left outline-none hide-focus-ring ring-focus transition-[background-color,opacity] ${otherFocused && !selected ? "opacity-40" : ""} ${selected ? "bg-[var(--ui-segment-selected)] effect-segment-selected" : highlighted ? "bg-t2" : "bg-t1 hover:bg-t2"}`}
              disabled={busy}
              key={`${index}-${option.label}`}
              onClick={() => controller.handleOptionClick(index)}
              type="button"
            >
              <div className="flex flex-col gap-g1 min-w-0 flex-1">
                <div className="text-body text-t9">{option.label}</div>
                {option.description ? <div className="text-footnote text-t6">{option.description}</div> : null}
              </div>
              {multiSelect ? (
                <OfficialAskUserCheckbox checked={selected} />
              ) : (
                <span className="pointer-events-none">
                  <OfficialKeyBadge keys={String(index + 1)} />
                </span>
              )}
            </button>
          );
        })}

        <div
          className={`flex flex-col gap-[12px] rounded-r4 px-p6 py-p6 ${otherSelected ? "bg-[var(--ui-segment-selected)] effect-segment-selected" : otherHighlighted ? "bg-t2" : "bg-t1 hover:bg-t2"}`}
        >
          <button
            aria-pressed={multiSelect ? otherSelected : undefined}
            className="flex items-center gap-g6 text-body text-t9 text-left outline-none hide-focus-ring ring-focus"
            disabled={busy}
            onClick={() => {
              controller.handleOptionClick(OFFICIAL_ASK_USER_OTHER_INDEX);
              if (multiSelect && otherSelected) controller.containerRef.current?.focus();
            }}
            type="button"
          >
            <span className="flex-1">Other</span>
            {multiSelect ? (
              <OfficialAskUserCheckbox checked={otherSelected} />
            ) : (
              <span className="pointer-events-none">
                <OfficialKeyBadge keys={String(optionCountWithOther)} />
              </span>
            )}
          </button>
          <textarea
            aria-label="Other option"
            className="epitaxy-textarea w-full"
            disabled={busy}
            onBlur={() => setOtherFocused(false)}
            onChange={(event) => {
              if (!otherSelected) controller.handleOptionClick(OFFICIAL_ASK_USER_OTHER_INDEX);
              controller.setOtherText(event.target.value);
            }}
            onClick={stopBubble}
            onFocus={() => setOtherFocused(true)}
            onKeyDown={stopArrowBubble}
            placeholder="Type your own answer here"
            ref={controller.otherInputRef}
            rows={1}
            style={{ fieldSizing: "content", maxHeight: "calc(4lh + 2 * var(--p5))" } as CSSProperties}
            tabIndex={otherSelected ? 0 : -1}
            value={controller.otherText}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-[8px]">
        {controller.currentQuestionIndex > 0 ? (
          <OfficialButton className="mr-auto" disabled={busy} onClick={controller.handleBack} size="base" variant="contained">
            Back
          </OfficialButton>
        ) : null}
        <OfficialButton disabled={busy} onClick={onSkip} size="base" variant="contained">
          Skip
        </OfficialButton>
        <OfficialButton
          disabled={busy || !hasSelection}
          onClick={controller.handleSubmit}
          size="base"
          variant="primary"
        >
          {isLast ? "Submit" : "Next"}
          <OfficialApprovalShortcut>{multiSelect ? "⌘⏎" : "⏎"}</OfficialApprovalShortcut>
        </OfficialButton>
      </div>
      {children}
    </div>
  );
});

/** Official Ah header with awaiting yellow dot (c11959232). */
function OfficialAskUserHeader({ children, trailing }: { children: ReactNode; trailing?: ReactNode }) {
  return (
    <div className="text-body-semibold text-t9 min-h-[24px] flex items-center gap-1 pb-p6">
      <span className="flex flex-1 min-w-0 flex-col gap-[2px]">
        <span className="flex items-center gap-g3 min-w-0">
          <span aria-hidden className="grid size-[20px] shrink-0 place-items-center">
            <span className="size-[6px] rounded-full bg-extended-yellow" />
          </span>
          <span className="min-w-0 break-words">{children}</span>
        </span>
      </span>
      {trailing ? <span className="shrink-0 self-center">{trailing}</span> : null}
    </div>
  );
}

/** Official Nn elevation="sidebar" surface under the card. */
function OfficialAskUserSurface() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-primary-elevated effect-primary-elevated"
      data-surface="sidebar"
    />
  );
}

/** Official Lw multiSelect checkbox. */
function OfficialAskUserCheckbox({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className="inline-flex items-center justify-center size-[16px] shrink-0 p-[2.4px]"
    >
      <span
        className={`flex items-center justify-center size-full rounded-[2.4px] ${checked ? "bg-[var(--accent)]" : "bg-[var(--ui-switch-off-background)]"}`}
      >
        {checked ? (
          <svg className="text-[var(--core-white)]" fill="none" height="5" viewBox="0 0 5.875 5.375" width="6">
            <path
              d="M0.500014 2.75004L2.25001 4.87504L5.37501 0.500039"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </span>
    </span>
  );
}

/** Official Kj/zu key badge — number shortcuts on single-select options. */
function OfficialKeyBadge({ keys }: { keys: string }) {
  return (
    <span className="inline-flex items-center gap-[1px] text-body text-[var(--ui-tooltip-text)] opacity-70">
      <kbd className="inline-flex items-center justify-center h-h2 font-ui">{keys}</kbd>
    </span>
  );
}

function OfficialApprovalShortcut({ children }: { children: ReactNode }) {
  return <kbd className="text-caption opacity-60 shrink-0">{children}</kbd>;
}
