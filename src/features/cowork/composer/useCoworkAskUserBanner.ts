import { useEffect, useMemo, useRef, useState } from "react";
import {
  applyCoworkAskCustomText,
  applyCoworkAskOption,
  parseCoworkAskUserQuestions,
  type CoworkAskUserQuestion,
  type CoworkAskUserQuestionAnswer,
  type CoworkAskUserQuestionData,
} from "./coworkAskUserQuestionModel";

export const coworkNoPreference = "[No preference]";

export function useCoworkAskUserBanner(
  data: CoworkAskUserQuestionData,
  onSubmit: (answer: CoworkAskUserQuestionAnswer) => void,
) {
  const questions = useMemo(() => parseCoworkAskUserQuestions(data.input), [data.input]);
  const state = useQuestionState(data.blockId, questions);
  const question = questions[state.questionIndex];
  const lastQuestion = state.questionIndex === questions.length - 1;
  const submit = (selections = state.selections, customTexts = state.customTexts) => {
    onSubmit(buildAnswers(questions, selections, customTexts));
  };
  const setCustomText = (value: string) => {
    if (!question) return;
    const next = applyCoworkAskCustomText(state, question, value);
    state.setCustomTexts(next.customTexts);
    state.setSelections(next.selections);
  };
  const choose = (optionId: string) => {
    if (!question) return;
    const next = applyCoworkAskOption(state, question, optionId);
    state.setSelections(next.selections);
    state.setCustomTexts(next.customTexts);
    if (!question.multiSelect) lastQuestion ? submit(next.selections, next.customTexts) : window.setTimeout(state.nextQuestion, 150);
  };
  const skip = () => {
    if (!question) return;
    const next = { ...state.customTexts, [question.id]: coworkNoPreference };
    state.setCustomTexts(next);
    lastQuestion ? submit(state.selections, next) : state.nextQuestion();
  };
  return { ...state, choose, lastQuestion, question, questions, setCustomText, skip, submit };
}

function useQuestionState(blockId: string, questions: CoworkAskUserQuestion[]) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [customTexts, setCustomTexts] = useState<Record<string, string>>({});
  const [focusedOptionIndex, setFocusedOptionIndex] = useState(0);
  const [navDirection, setNavDirection] = useState<"left" | "right" | null>(null);
  const bannerRef = useRef<HTMLDivElement | null>(null);
  const customInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { setQuestionIndex(0); setSelections({}); setCustomTexts({}); setFocusedOptionIndex(0); }, [blockId]);
  useEffect(() => { bannerRef.current?.focus({ preventScroll: true }); }, [blockId]);
  const move = (delta: number) => {
    setNavDirection(delta > 0 ? "left" : "right");
    setQuestionIndex((value) => Math.max(0, Math.min(questions.length - 1, value + delta)));
    setFocusedOptionIndex(0);
  };
  return { bannerRef, clearDirection: () => setNavDirection(null), customInputRef, customTexts, focusedOptionIndex, navDirection, nextQuestion: () => move(1), previousQuestion: () => move(-1), questionIndex, selections, setCustomTexts, setFocusedOptionIndex, setSelections };
}

function buildAnswers(
  questions: CoworkAskUserQuestion[],
  selections: Record<string, string[]>,
  customTexts: Record<string, string>,
) {
  const answers: Record<string, string | string[]> = {};
  questions.forEach((question) => {
    const values = (selections[question.id] ?? []).map((id) => question.options.find((option) => option.id === id)?.label).filter((value): value is string => Boolean(value));
    const custom = customTexts[question.id]?.trim();
    if (custom) values.push(custom);
    if (values.length === 1) answers[question.question] = values[0];
    else if (values.length > 1) answers[question.question] = values;
  });
  return answers;
}
