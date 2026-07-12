import { memo, type KeyboardEvent, type RefObject } from "react";
import { Icon } from "../../../shell/icons";
import {
  CoworkArrowRightGlyph,
  CoworkArrowUpGlyph,
  CoworkChevronLeftSmallGlyph,
  CoworkChevronRightSmallGlyph,
} from "../ui/CoworkOfficialGlyphs";
import { CoworkComposerButton } from "./CoworkComposerPrimitives";
import { CoworkAskUserQuestionCheckbox, CoworkAskUserQuestionOption } from "./CoworkAskUserQuestionOption";
import {
  type CoworkAskUserQuestion,
  type CoworkAskUserQuestionAnswer,
  type CoworkAskUserQuestionData,
} from "./coworkAskUserQuestionModel";
import { coworkNoPreference, useCoworkAskUserBanner } from "./useCoworkAskUserBanner";

export const CoworkAskUserQuestionBanner = memo(function CoworkAskUserQuestionBanner({ data, onDismiss, onSubmit }: {
  data: CoworkAskUserQuestionData;
  onDismiss: () => void;
  onSubmit: (answer: CoworkAskUserQuestionAnswer) => void;
}) {
  const controller = useCoworkAskUserBanner(data, onSubmit);
  if (!controller.question) return null;
  return <AskUserBannerFrame controller={controller} onDismiss={onDismiss} />;
});

type AskUserController = ReturnType<typeof useCoworkAskUserBanner> & { question: CoworkAskUserQuestion };

function AskUserBannerFrame({ controller, onDismiss }: { controller: AskUserController; onDismiss: () => void }) {
  const selected = controller.selections[controller.question.id] ?? [];
  const customText = controller.customTexts[controller.question.id] ?? "";
  const selectedCount = selected.length + (customText.trim() ? 1 : 0);
  return (
    <div
      className="!box-content flex flex-col bg-bg-000/90 backdrop-blur-md mx-2 md:mx-0 transition-all duration-200 relative z-10 rounded-2xl outline-none overflow-hidden pt-3 shadow-[0_0.25rem_1.25rem_hsl(var(--always-black)/7.5%),0_0_0_0.5px_hsla(var(--border-200)/0.3)]"
      data-ask-user-input-banner
      onKeyDown={(event) => handleBannerKey(event, {
        choose: controller.choose,
        customInputRef: controller.customInputRef,
        customText,
        dismiss: onDismiss,
        focused: controller.focusedOptionIndex,
        nextQuestion: controller.nextQuestion,
        previousQuestion: controller.previousQuestion,
        question: controller.question,
        questionCount: controller.questions.length,
        questionIndex: controller.questionIndex,
        setCustomText: controller.setCustomText,
        setFocused: controller.setFocusedOptionIndex,
        submitCustom: controller.lastQuestion ? () => controller.submit() : controller.nextQuestion,
      })}
      ref={controller.bannerRef}
      tabIndex={-1}
    >
      <QuestionHeader current={controller.questionIndex} onDismiss={onDismiss} onNext={controller.nextQuestion} onPrevious={controller.previousQuestion} question={controller.question.question} total={controller.questions.length} />
      <div key={controller.question.id} onAnimationEnd={controller.clearDirection} style={controller.navDirection ? { animation: `${controller.navDirection === "left" ? "slideInFromRight" : "slideInFromLeft"} 0.2s ease-out` } : undefined}>
        <QuestionOptions
          customInputRef={controller.customInputRef}
          customText={customText}
          focusedOptionIndex={controller.focusedOptionIndex}
          isLastQuestion={controller.lastQuestion}
          onChoose={controller.choose}
          onCustomText={controller.setCustomText}
          onCustomTextSubmit={controller.lastQuestion ? () => controller.submit() : controller.nextQuestion}
          onFocus={controller.setFocusedOptionIndex}
          onSkip={controller.skip}
          question={controller.question}
          selected={selected}
        />
      </div>
      {controller.question.multiSelect ? <MultiSelectFooter onSkip={controller.skip} onSubmit={() => controller.submit()} selectedCount={selectedCount} /> : null}
      <AskUserAnimationStyles />
    </div>
  );
}

function QuestionHeader({ current, onDismiss, onNext, onPrevious, question, total }: {
  current: number; onDismiss: () => void; onNext: () => void; onPrevious: () => void; question: string; total: number;
}) {
  return (
    <div className="flex items-center gap-2 pl-4 pb-1.5" style={{ paddingRight: 12 }}>
      <span className="flex-1 text-text-100 font-claude-response">{question}</span>
      {total > 1 ? <QuestionNavigation current={current} onNext={onNext} onPrevious={onPrevious} total={total} /> : null}
      <CoworkComposerButton ariaLabel="Minimize" className="text-text-500 !size-5 shrink-0" dataWidgetAction onClick={onDismiss} size="icon-sm" variant="ghost"><Icon customSize={16} name="X" /></CoworkComposerButton>
    </div>
  );
}

function QuestionNavigation({ current, onNext, onPrevious, total }: { current: number; onNext: () => void; onPrevious: () => void; total: number }) {
  return (
    <div className="flex items-center gap-0.5 shrink-0">
      <CoworkComposerButton ariaLabel="Previous question" className="!size-6 text-text-500" dataWidgetAction disabled={current === 0} onClick={onPrevious} size="icon-sm" variant="ghost"><CoworkChevronLeftSmallGlyph size={14} /></CoworkComposerButton>
      <span className="text-sm text-text-500 opacity-50 tabular-nums">{current + 1} of {total}</span>
      <CoworkComposerButton ariaLabel="Next question" className="!size-6 text-text-500" dataWidgetAction disabled={current === total - 1} onClick={onNext} size="icon-sm" variant="ghost"><CoworkChevronRightSmallGlyph size={14} /></CoworkComposerButton>
    </div>
  );
}

function QuestionOptions({ customInputRef, customText, focusedOptionIndex, isLastQuestion, onChoose, onCustomText, onCustomTextSubmit, onFocus, onSkip, question, selected }: {
  customInputRef: RefObject<HTMLInputElement | null>; customText: string; focusedOptionIndex: number; isLastQuestion: boolean; onChoose: (id: string) => void; onCustomText: (value: string) => void; onCustomTextSubmit: () => void; onFocus: (index: number) => void; onSkip: () => void; question: CoworkAskUserQuestion; selected: string[];
}) {
  const customFocused = focusedOptionIndex === question.options.length;
  return (
    <div className="flex-1 p-1.5">
      <div aria-activedescendant={focusedOptionIndex < question.options.length ? `ask-user-option-${question.id}-${focusedOptionIndex}` : undefined} aria-label={question.question} aria-multiselectable={question.multiSelect} className={`flex flex-col outline-none transition-opacity duration-150 ${!question.multiSelect && customText.trim() && customFocused ? "opacity-40 pointer-events-none" : ""}`} role="listbox" tabIndex={0}>
        {question.options.map((option, index) => <QuestionOptionRow focusedOptionIndex={focusedOptionIndex} index={index} isLastQuestion={isLastQuestion} key={option.id} onChoose={onChoose} onFocus={onFocus} option={option} question={question} selected={selected.includes(option.id)} />)}
      </div>
      <div aria-hidden="true" className={`h-[0.5px] bg-border-300 mx-3 transition-opacity duration-150 ${focusedOptionIndex === question.options.length - 1 || customFocused ? "opacity-0" : ""}`} />
      <CustomAnswerRow customInputRef={customInputRef} customText={customText} focused={customFocused} isLastQuestion={isLastQuestion} multiSelect={question.multiSelect} onChange={onCustomText} onFocus={() => onFocus(question.options.length)} onSkip={onSkip} onSubmit={onCustomTextSubmit} />
    </div>
  );
}

function QuestionOptionRow({ focusedOptionIndex, index, isLastQuestion, onChoose, onFocus, option, question, selected }: {
  focusedOptionIndex: number; index: number; isLastQuestion: boolean; onChoose: (id: string) => void; onFocus: (index: number) => void; option: CoworkAskUserQuestion["options"][number]; question: CoworkAskUserQuestion; selected: boolean;
}) {
  const focused = focusedOptionIndex === index;
  return (
    <div role="presentation">
      <CoworkAskUserQuestionOption focused={focused} id={`ask-user-option-${question.id}-${index}`} index={index} isLastQuestion={isLastQuestion} multiSelect={question.multiSelect} onClick={() => { onFocus(index); onChoose(option.id); }} onHover={focused ? undefined : () => onFocus(index)} option={option} selected={selected} />
      {index < question.options.length - 1 ? <div aria-hidden="true" className={`h-[0.5px] bg-border-300 mx-3 transition-opacity duration-150 ${focusedOptionIndex === index || focusedOptionIndex === index + 1 ? "opacity-0" : ""}`} /> : null}
    </div>
  );
}

function CustomAnswerRow({ customInputRef, customText, focused, isLastQuestion, multiSelect, onChange, onFocus, onSkip, onSubmit }: {
  customInputRef: RefObject<HTMLInputElement | null>; customText: string; focused: boolean; isLastQuestion: boolean; multiSelect: boolean; onChange: (value: string) => void; onFocus: () => void; onSkip: () => void; onSubmit: () => void;
}) {
  const hasText = Boolean(customText.trim());
  return (
    <div className={`group/row flex w-full items-center gap-2.5 h-11 px-2.5 text-left cursor-text rounded-xl ${focused ? "bg-bg-200" : ""}`} onClick={() => { customInputRef.current?.focus(); onFocus(); }} onMouseMove={focused ? undefined : onFocus}>
      {multiSelect ? <div className="flex size-7 shrink-0 items-center justify-center"><CoworkAskUserQuestionCheckbox checked={hasText} /></div> : <span className={`relative flex size-7 shrink-0 items-center justify-center rounded-lg overflow-hidden ${focused ? "bg-bg-400" : "bg-bg-300"}`}><Icon className={focused || hasText ? "text-text-100" : "text-text-300"} customSize={14} name="Edit" /></span>}
      <input aria-label="Something else" className="flex-1 min-w-0 bg-transparent text-sm text-text-100 placeholder:text-text-500 placeholder:opacity-60 outline-none ring-0 border-0 shadow-none focus:ring-0 focus:!outline-none focus:border-0 focus:shadow-none" onChange={(event) => onChange(event.target.value)} onFocus={onFocus} onKeyDown={(event) => handleCustomKey(event, hasText, onSubmit)} placeholder="Something else" ref={customInputRef} type="text" value={customText === coworkNoPreference ? "" : customText} />
      {!multiSelect && !hasText ? <CoworkComposerButton className="shrink-0 text-xs px-3 h-7" dataWidgetAction onClick={onSkip} size="sm" variant="secondary">Skip</CoworkComposerButton> : null}
      {!multiSelect && hasText ? <CoworkComposerButton ariaLabel={isLastQuestion ? "Submit" : "Next"} className="!rounded-lg !h-7 !w-7" dataWidgetAction onClick={onSubmit} size="icon-sm" variant={isLastQuestion ? "claude" : "primary"}>{isLastQuestion ? <CoworkArrowUpGlyph size={14} /> : <CoworkArrowRightGlyph size={14} />}</CoworkComposerButton> : null}
    </div>
  );
}

function MultiSelectFooter({ onSkip, onSubmit, selectedCount }: { onSkip: () => void; onSubmit: () => void; selectedCount: number }) {
  return (
    <>
      <div className="h-[0.5px] bg-border-300 mx-0" />
      <div className="flex items-center justify-between gap-1 pl-5 pr-4 py-1.5 font-small text-text-500 min-h-[48px]">
        <span>{selectedCount} selected</span>
        <div className="flex items-center gap-2"><CoworkComposerButton className="text-xs px-3 h-7" dataWidgetAction onClick={onSkip} size="sm" variant="secondary">Skip</CoworkComposerButton><CoworkComposerButton ariaLabel="Submit" className="!rounded-lg !h-8 !w-8" dataWidgetAction disabled={selectedCount === 0} onClick={onSubmit} size="icon-sm" variant="claude"><CoworkArrowUpGlyph size={16} /></CoworkComposerButton></div>
      </div>
    </>
  );
}

function AskUserAnimationStyles() {
  return <style>{`
    @keyframes slideInFromRight {
      from { transform: translateX(12px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideInFromLeft {
      from { transform: translateX(-12px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `}</style>;
}

type BannerKeyInput = {
  choose: (id: string) => void;
  customInputRef: RefObject<HTMLInputElement | null>;
  customText: string;
  dismiss: () => void;
  focused: number;
  nextQuestion: () => void;
  previousQuestion: () => void;
  question: CoworkAskUserQuestion;
  questionCount: number;
  questionIndex: number;
  setCustomText: (value: string) => void;
  setFocused: (index: number) => void;
  submitCustom: () => void;
};

function handleBannerKey(event: KeyboardEvent<HTMLDivElement>, input: BannerKeyInput) {
  if (event.nativeEvent.isComposing) return;
  const plainEnter = event.key === "Enter" && !event.metaKey && !event.ctrlKey;
  if ((event.key === " " || plainEnter) && (event.target as Element).closest?.("[data-widget-action]")) return;
  const max = input.question.options.length;
  if (event.key === "Escape") return dismissBanner(event, input.dismiss);
  if (event.key === "ArrowUp" || event.key === "ArrowDown") {
    event.preventDefault();
    input.setFocused(event.key === "ArrowDown" ? input.focused >= max ? 0 : input.focused + 1 : input.focused <= 0 ? max : input.focused - 1);
    return;
  }
  if (event.key === "ArrowLeft" && input.questionIndex > 0) return navigateQuestion(event, input.previousQuestion);
  if (event.key === "ArrowRight" && input.questionIndex < input.questionCount - 1) return navigateQuestion(event, input.nextQuestion);
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    if (input.focused < max) input.choose(input.question.options[input.focused].id);
    else if (event.key === "Enter" && input.customText.trim() && !input.question.multiSelect) input.submitCustom();
    return;
  }
  const numeric = Number.parseInt(event.key, 10);
  if (!Number.isNaN(numeric) && numeric >= 1 && numeric <= max) {
    event.preventDefault();
    input.setFocused(numeric - 1);
    input.choose(input.question.options[numeric - 1].id);
  } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
    event.preventDefault();
    input.setCustomText(input.customText + event.key);
    input.setFocused(max);
    input.customInputRef.current?.focus();
  }
}

function handleCustomKey(event: KeyboardEvent<HTMLInputElement>, hasText: boolean, submit: () => void) {
  if (event.nativeEvent.isComposing) { event.stopPropagation(); return; }
  if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && hasText) { event.preventDefault(); event.stopPropagation(); submit(); return; }
  if (["ArrowUp", "ArrowDown", "Enter"].includes(event.key)) event.preventDefault();
  else if (["ArrowLeft", "ArrowRight"].includes(event.key) || (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey)) event.stopPropagation();
}

function dismissBanner(event: KeyboardEvent<HTMLDivElement>, dismiss: () => void) {
  event.preventDefault();
  event.stopPropagation();
  dismiss();
}

function navigateQuestion(event: KeyboardEvent<HTMLDivElement>, navigate: () => void) {
  event.preventDefault();
  navigate();
}
