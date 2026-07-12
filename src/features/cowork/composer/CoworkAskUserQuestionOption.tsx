import { memo } from "react";
import type { CoworkAskUserQuestionOption as Option } from "./coworkAskUserQuestionModel";

export const CoworkAskUserQuestionOption = memo(function CoworkAskUserQuestionOption({
  focused,
  id,
  index,
  isLastQuestion,
  multiSelect,
  onClick,
  onHover,
  option,
  selected,
}: {
  focused: boolean;
  id: string;
  index: number;
  isLastQuestion: boolean;
  multiSelect: boolean;
  onClick: () => void;
  onHover?: () => void;
  option: Option;
  selected: boolean;
}) {
  return (
    <button
      aria-selected={selected}
      className={`${optionRow(focused)} !outline-none transition-transform duration-100 active:scale-[0.99]`}
      id={id}
      onClick={onClick}
      onMouseMove={onHover}
      role="option"
      tabIndex={-1}
      type="button"
    >
      {multiSelect ? <OfficialCheckbox checked={selected} /> : <OptionNumber focused={focused} index={index} />}
      <span className={`flex-1 min-w-0 text-sm truncate ${focused ? "text-text-000" : "text-text-300"}`}>{option.label}</span>
      {focused && !multiSelect ? <span aria-hidden="true" className="text-text-100/50 text-sm shrink-0 mr-2">{isLastQuestion ? "⏎" : "→"}</span> : null}
    </button>
  );
});

export function CoworkAskUserQuestionCheckbox({ checked }: { checked: boolean }) {
  return (
    <label className="select-none flex flex-row gap-3 cursor-pointer text-left shrink-0 items-center">
      <input checked={checked} className="sr-only peer" onChange={() => {}} tabIndex={-1} type="checkbox" />
      <div className={`shrink-0 w-4 h-4 flex items-center justify-center border rounded transition-colors duration-100 ease-in-out peer-focus-visible:ring-1 ring-offset-2 ring-offset-bg-300 ring-accent-100/70 ${checked ? "bg-accent-100 border-accent-100" : "bg-bg-000 border-border-200 hover:border-border-100"} cursor-pointer !w-5 !h-5 pointer-events-none`}>
        {checked ? <CheckGlyph /> : null}
      </div>
      <span className="leading-none sr-only" />
    </label>
  );
}

function OfficialCheckbox({ checked }: { checked: boolean }) {
  return <div aria-hidden="true" className="flex size-[30px] shrink-0 items-center justify-center pointer-events-none"><CoworkAskUserQuestionCheckbox checked={checked} /></div>;
}

function OptionNumber({ focused, index }: { focused: boolean; index: number }) {
  return (
    <span className={`relative flex size-7 shrink-0 items-center justify-center rounded-lg overflow-hidden ${focused ? "bg-bg-400" : "bg-bg-300"}`}>
      <span className={`text-sm ${focused ? "text-text-100" : "text-text-500"}`}>{index + 1}</span>
    </span>
  );
}

function CheckGlyph() {
  return <svg className="text-oncolor-100 !w-3 !h-3" fill="none" height="10" viewBox="0 0 12 12" width="10"><path d="M2 6.5L4.5 9L10.5 3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" /></svg>;
}

function optionRow(focused: boolean) {
  const base = "group/row flex w-full items-center gap-2.5 h-11 px-2.5 text-left cursor-pointer rounded-xl";
  return focused ? `${base} bg-bg-200` : base;
}
