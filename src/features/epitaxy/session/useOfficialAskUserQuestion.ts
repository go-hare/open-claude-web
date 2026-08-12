/**
 * Official AskUserQuestion state machine — index-BELzQL5P R2e residual.
 * Code composer path always uses disableAutoSkip=true (c11959232 Ow).
 */
import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from "react";
import {
  OFFICIAL_ASK_USER_NO_PREFERENCE,
  OFFICIAL_ASK_USER_OTHER_INDEX,
  officialAskUserDisplayFromPersisted,
  officialAskUserHasPreview,
  type OfficialAskUserParsedInput,
  type OfficialAskUserQuestion,
  type OfficialAskUserStoredResponse,
  type OfficialAskUserSubmitPayload,
} from "./officialAskUserQuestionModel";

type PersistedAnswers = {
  annotations?: Record<string, { preview?: string }>;
  answers?: Record<string, string | string[]>;
};

export type OfficialAskUserController = {
  containerRef: RefObject<HTMLDivElement | null>;
  currentQuestionIndex: number;
  handleBack: () => void;
  handleKeyDown: (event: ReactKeyboardEvent) => void;
  handleOptionClick: (index: number) => void;
  handleSkip: () => void;
  handleSubmit: () => void;
  highlightedIndex: number | null;
  otherInputRef: RefObject<HTMLTextAreaElement | null>;
  otherText: string;
  selectedIndices: Set<number>;
  setOtherText: (value: string) => void;
  showSubmitted: boolean;
  displayResponses: OfficialAskUserStoredResponse[];
};

export function useOfficialAskUserQuestion({
  disableAutoSkip = true,
  onAnswersSubmit,
  parsedInput,
  persistedAnswers,
}: {
  disableAutoSkip?: boolean;
  onAnswersSubmit?: (answers: Record<string, string | string[]>, input: OfficialAskUserParsedInput, annotations: Record<string, { preview?: string }>) => void;
  parsedInput: OfficialAskUserParsedInput;
  persistedAnswers?: PersistedAnswers | null;
}): OfficialAskUserController {
  const initialDisplay = officialAskUserDisplayFromPersisted(persistedAnswers, parsedInput.questions);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(() => new Set());
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(() => (
    officialAskUserHasPreview(parsedInput.questions[0]) ? 0 : null
  ));
  const [otherText, setOtherTextState] = useState("");
  const [storedResponses, setStoredResponses] = useState<OfficialAskUserStoredResponse[]>(() => initialDisplay ?? []);
  const [showSubmittedFromStore, setShowSubmittedFromStore] = useState(() => Boolean(initialDisplay && initialDisplay.length > 0));
  const [timerPaused, setTimerPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const otherInputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!persistedAnswers || showSubmittedFromStore) return;
    const next = officialAskUserDisplayFromPersisted(persistedAnswers, parsedInput.questions);
    if (next && next.length > 0) {
      setStoredResponses(next);
      setShowSubmittedFromStore(true);
    }
  }, [persistedAnswers, parsedInput.questions, showSubmittedFromStore]);

  const questions = parsedInput.questions ?? [];
  const inputAnswers = parsedInput.answers;
  const currentQuestion = questions[currentQuestionIndex];
  const isLast = currentQuestionIndex === questions.length - 1;
  const hasInputAnswers = Boolean(inputAnswers && Object.keys(inputAnswers).length > 0);
  const showSubmitted = showSubmittedFromStore || hasInputAnswers;
  const displayResponses: OfficialAskUserStoredResponse[] = hasInputAnswers
    ? questions.map((question) => ({
      question: question.question,
      response: inputAnswers?.[question.question] ?? "",
      preview: parsedInput.annotations?.[question.question]?.preview,
    }))
    : storedResponses;
  const multiSelect = currentQuestion?.multiSelect ?? false;

  const toggleIndex = useCallback((index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const restoreStored = useCallback((question: OfficialAskUserQuestion, stored: OfficialAskUserStoredResponse) => {
    const responses = Array.isArray(stored.response) ? stored.response : [stored.response];
    const next = new Set<number>();
    let other = "";
    for (const response of responses) {
      const optionIndex = question.options.findIndex((option) => option.label === response);
      if (optionIndex >= 0) next.add(optionIndex);
      else if (response && response !== OFFICIAL_ASK_USER_NO_PREFERENCE) {
        next.add(OFFICIAL_ASK_USER_OTHER_INDEX);
        other = response;
      }
    }
    setSelectedIndices(next);
    setOtherTextState(other);
    const first = next.values().next().value;
    setHighlightedIndex(first ?? (officialAskUserHasPreview(question) ? 0 : null));
  }, []);

  const commitResponse = useCallback((entry: OfficialAskUserStoredResponse) => {
    const next = [...storedResponses];
    next[currentQuestionIndex] = entry;
    setStoredResponses(next);
    if (isLast) {
      setShowSubmittedFromStore(true);
      const answers: Record<string, string | string[]> = {};
      const annotations: Record<string, { preview?: string }> = {};
      for (const item of next) {
        answers[item.question] = item.response;
        if (item.preview !== undefined) annotations[item.question] = { preview: item.preview };
      }
      onAnswersSubmit?.(answers, parsedInput, annotations);
    } else {
      setCurrentQuestionIndex((index) => index + 1);
      const nextQuestion = parsedInput.questions[currentQuestionIndex + 1];
      const nextStored = next[currentQuestionIndex + 1];
      if (nextQuestion && nextStored) {
        restoreStored(nextQuestion, nextStored);
        setTimerPaused(true);
      } else {
        setSelectedIndices(new Set());
        setHighlightedIndex(officialAskUserHasPreview(nextQuestion) ? 0 : null);
        setOtherTextState("");
        setTimerPaused(false);
      }
    }
  }, [currentQuestionIndex, isLast, onAnswersSubmit, parsedInput, restoreStored, storedResponses]);

  const handleBack = useCallback(() => {
    if (currentQuestionIndex === 0) return;
    const prevIndex = currentQuestionIndex - 1;
    const prevQuestion = parsedInput.questions[prevIndex];
    const prevStored = storedResponses[prevIndex];
    if (prevQuestion && prevStored) restoreStored(prevQuestion, prevStored);
    else {
      setSelectedIndices(new Set());
      setOtherTextState("");
      setHighlightedIndex(officialAskUserHasPreview(prevQuestion) ? 0 : null);
    }
    setCurrentQuestionIndex(prevIndex);
    setTimerPaused(false);
  }, [currentQuestionIndex, parsedInput.questions, restoreStored, storedResponses]);

  const buildResponseValue = useCallback(() => {
    if (!currentQuestion) return "";
    const ordered = Array.from(selectedIndices).sort((a, b) => a - b);
    const values: string[] = [];
    for (const index of ordered) {
      if (index === OFFICIAL_ASK_USER_OTHER_INDEX) values.push(otherText.trim() || "Something else");
      else values.push(currentQuestion.options[index]?.label ?? "");
    }
    return multiSelect ? values : values[0];
  }, [currentQuestion, multiSelect, otherText, selectedIndices]);

  const selectedPreview = useCallback(() => {
    if (!currentQuestion || multiSelect) return undefined;
    for (const index of selectedIndices) {
      if (index !== OFFICIAL_ASK_USER_OTHER_INDEX) return currentQuestion.options[index]?.preview;
    }
    return undefined;
  }, [currentQuestion, multiSelect, selectedIndices]);

  const pauseTimer = useCallback(() => {
    setTimerPaused(true);
  }, []);

  const setOtherText = useCallback((value: string) => {
    pauseTimer();
    setOtherTextState(value);
  }, [pauseTimer]);

  const handleSkip = useCallback(() => {
    if (!currentQuestion) return;
    if (selectedIndices.size > 0) {
      commitResponse({
        question: currentQuestion.question,
        response: buildResponseValue(),
        preview: selectedPreview(),
      });
      return;
    }
    commitResponse({ question: currentQuestion.question, response: OFFICIAL_ASK_USER_NO_PREFERENCE });
  }, [buildResponseValue, commitResponse, currentQuestion, selectedIndices.size, selectedPreview]);

  const handleSubmit = useCallback(() => {
    if (!currentQuestion || selectedIndices.size === 0) return;
    commitResponse({
      question: currentQuestion.question,
      response: buildResponseValue(),
      preview: selectedPreview(),
    });
  }, [buildResponseValue, commitResponse, currentQuestion, selectedIndices.size, selectedPreview]);

  const handleOptionClick = useCallback((index: number) => {
    if (!currentQuestion) return;
    pauseTimer();
    if (multiSelect) {
      toggleIndex(index);
      setHighlightedIndex(index);
      return;
    }
    if (index === OFFICIAL_ASK_USER_OTHER_INDEX) {
      setSelectedIndices(new Set([OFFICIAL_ASK_USER_OTHER_INDEX]));
      setHighlightedIndex(OFFICIAL_ASK_USER_OTHER_INDEX);
      return;
    }
    if (officialAskUserHasPreview(currentQuestion)) {
      setSelectedIndices(new Set([index]));
      setHighlightedIndex(index);
      return;
    }
    const option = currentQuestion.options[index];
    commitResponse({
      question: currentQuestion.question,
      response: option.label,
      preview: option.preview,
    });
  }, [commitResponse, currentQuestion, multiSelect, pauseTimer, toggleIndex]);

  const handleKeyDown = useCallback((event: ReactKeyboardEvent) => {
    if (!currentQuestion || showSubmitted) return;
    if (event.target instanceof HTMLButtonElement || event.target instanceof HTMLAnchorElement) return;
    const inOther = event.target === otherInputRef.current;
    const optionCount = currentQuestion.options.length;
    const otherKey = optionCount + 1;
    const digit = Number.parseInt(event.key, 10);
    if (!inOther && digit >= 1 && digit <= optionCount) {
      event.preventDefault();
      event.stopPropagation();
      event.nativeEvent.stopImmediatePropagation();
      pauseTimer();
      if (multiSelect) toggleIndex(digit - 1);
      else setSelectedIndices(new Set([digit - 1]));
      setHighlightedIndex(digit - 1);
      return;
    }
    if (!inOther && digit === otherKey) {
      event.preventDefault();
      event.stopPropagation();
      event.nativeEvent.stopImmediatePropagation();
      pauseTimer();
      if (multiSelect) toggleIndex(OFFICIAL_ASK_USER_OTHER_INDEX);
      else setSelectedIndices(new Set([OFFICIAL_ASK_USER_OTHER_INDEX]));
      setHighlightedIndex(OFFICIAL_ASK_USER_OTHER_INDEX);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();
      event.nativeEvent.stopImmediatePropagation();
      pauseTimer();
      let next: number | null = null;
      if (optionCount === 0) next = OFFICIAL_ASK_USER_OTHER_INDEX;
      else if (event.key === "ArrowDown") {
        if (highlightedIndex === null || highlightedIndex === OFFICIAL_ASK_USER_OTHER_INDEX) next = 0;
        else if (highlightedIndex === optionCount - 1) next = OFFICIAL_ASK_USER_OTHER_INDEX;
        else next = highlightedIndex + 1;
      } else if (highlightedIndex === null) next = OFFICIAL_ASK_USER_OTHER_INDEX;
      else if (highlightedIndex === OFFICIAL_ASK_USER_OTHER_INDEX) next = optionCount - 1;
      else if (highlightedIndex === 0) next = OFFICIAL_ASK_USER_OTHER_INDEX;
      else next = highlightedIndex - 1;
      setHighlightedIndex(next);
      if (!multiSelect && next !== null) setSelectedIndices(new Set([next]));
      if (next !== OFFICIAL_ASK_USER_OTHER_INDEX) containerRef.current?.focus();
      return;
    }
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    if (multiSelect) {
      if ((event.metaKey || event.ctrlKey) && selectedIndices.size > 0) {
        event.preventDefault();
        event.stopPropagation();
        event.nativeEvent.stopImmediatePropagation();
        handleSubmit();
      } else if (!inOther && !event.metaKey && !event.ctrlKey && highlightedIndex !== null) {
        event.preventDefault();
        event.stopPropagation();
        event.nativeEvent.stopImmediatePropagation();
        pauseTimer();
        toggleIndex(highlightedIndex);
      }
      return;
    }
    if (selectedIndices.size > 0) {
      event.preventDefault();
      event.stopPropagation();
      event.nativeEvent.stopImmediatePropagation();
      handleSubmit();
    }
  }, [
    currentQuestion,
    handleSubmit,
    highlightedIndex,
    multiSelect,
    pauseTimer,
    selectedIndices.size,
    showSubmitted,
    toggleIndex,
  ]);

  // Official auto-skip timer is disabled for Code Ow (disableAutoSkip: true).
  void disableAutoSkip;
  void timerPaused;

  useEffect(() => {
    if (!showSubmitted) containerRef.current?.focus({ preventScroll: true });
  }, [showSubmitted, currentQuestionIndex]);

  useEffect(() => {
    if (selectedIndices.has(OFFICIAL_ASK_USER_OTHER_INDEX)) otherInputRef.current?.focus();
  }, [selectedIndices]);

  return {
    containerRef,
    otherInputRef,
    currentQuestionIndex,
    selectedIndices,
    highlightedIndex,
    otherText,
    showSubmitted,
    displayResponses,
    setOtherText,
    handleSubmit,
    handleOptionClick,
    handleKeyDown,
    handleSkip,
    handleBack,
  };
}

export function buildOfficialAskUserSubmitPayload(
  answers: Record<string, string | string[]>,
  input: OfficialAskUserParsedInput,
  annotations: Record<string, { preview?: string }>,
): OfficialAskUserSubmitPayload {
  const payload: OfficialAskUserSubmitPayload = {
    questions: input.questions,
    answers,
  };
  if (Object.keys(annotations).length > 0) payload.annotations = annotations;
  return payload;
}
