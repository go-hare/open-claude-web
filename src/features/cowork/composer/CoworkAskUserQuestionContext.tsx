import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import type { CoworkPermissionDecision } from "../session/coworkPermissionTypes";
import type { CoworkContentBlock } from "../session/transcript/coworkMessageTypes";
import { useCoworkMessageContext } from "../session/transcript/CoworkMessageContext";
import {
  coworkAskUserQuestionDecisionInput,
  findPendingCoworkAskUserQuestion,
  type CoworkAskUserQuestionAnswer,
  type CoworkAskUserQuestionData,
} from "./coworkAskUserQuestionModel";

type CoworkAskUserQuestionContextValue = {
  clear: () => void;
  data: CoworkAskUserQuestionData | null;
  dismiss: (() => void) | null;
  setData: (data: CoworkAskUserQuestionData | null) => void;
  setDismiss: (dismiss: (() => void) | null) => void;
  setSubmit: (submit: ((answer: CoworkAskUserQuestionAnswer) => void) | null) => void;
  submit: ((answer: CoworkAskUserQuestionAnswer) => void) | null;
};

const CoworkAskUserQuestionContext = createContext<CoworkAskUserQuestionContextValue | null>(null);

export function CoworkAskUserQuestionProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<CoworkAskUserQuestionData | null>(null);
  const [submit, setSubmitState] = useState<((answer: CoworkAskUserQuestionAnswer) => void) | null>(null);
  const [dismiss, setDismissState] = useState<(() => void) | null>(null);
  const clear = useCallback(() => { setData(null); setSubmitState(null); setDismissState(null); }, []);
  const setDismiss = useCallback((callback: (() => void) | null) => setDismissState(() => callback), []);
  const setSubmit = useCallback((callback: ((answer: CoworkAskUserQuestionAnswer) => void) | null) => setSubmitState(() => callback), []);
  const value = useMemo(() => ({
    clear,
    data,
    dismiss,
    setData,
    setDismiss,
    setSubmit,
    submit,
  }), [clear, data, dismiss, setDismiss, setSubmit, submit]);
  return <CoworkAskUserQuestionContext.Provider value={value}>{children}</CoworkAskUserQuestionContext.Provider>;
}

export function useCoworkAskUserQuestion() {
  const context = useContext(CoworkAskUserQuestionContext);
  if (!context) throw new Error("useCoworkAskUserQuestion must be used within CoworkAskUserQuestionProvider");
  return context;
}

export function useRegisterCoworkAskUserQuestion(blocks: CoworkContentBlock[], isLastMessage: boolean) {
  const { setData, setDismiss, setSubmit } = useCoworkAskUserQuestion();
  const messageContext = useCoworkMessageContext();
  const data = useMemo(
    () => findPendingCoworkAskUserQuestion(blocks, messageContext.toolPermissionRequests),
    [blocks, messageContext.toolPermissionRequests],
  );
  useLayoutEffect(
    () => registerQuestion({ setData, setDismiss, setSubmit }, messageContext.onToolDecision, data, isLastMessage),
    [data, isLastMessage, messageContext.onToolDecision, setData, setDismiss, setSubmit],
  );
}

function registerQuestion(
  ask: Pick<CoworkAskUserQuestionContextValue, "setData" | "setDismiss" | "setSubmit">,
  decide: ((requestId: string, blockId: string, input: Record<string, unknown>, decision: CoworkPermissionDecision) => void) | undefined,
  data: CoworkAskUserQuestionData | null,
  isLastMessage: boolean,
) {
  if (!isLastMessage || !data || !decide) {
    ask.setData(null);
    ask.setSubmit(null);
    ask.setDismiss(null);
    return;
  }
  ask.setData(data);
  ask.setSubmit((answer) => decide(data.requestId, data.blockId, coworkAskUserQuestionDecisionInput(data, answer), "once"));
  ask.setDismiss(() => decide(data.requestId, data.blockId, {}, "deny"));
}
