import type { CoworkPermissionRequest } from "../session/coworkPermissionTypes";
import type { CoworkContentBlock } from "../session/transcript/coworkMessageTypes";

export type CoworkAskUserQuestionData = {
  blockId: string;
  input: Record<string, unknown>;
  requestId: string;
};

export type CoworkAskUserQuestion = {
  id: string;
  multiSelect: boolean;
  options: CoworkAskUserQuestionOption[];
  question: string;
};

export type CoworkAskUserQuestionOption = {
  id: string;
  label: string;
};

export type CoworkAskUserQuestionAnswer = string | Record<string, string | string[]>;

export type CoworkAskUserQuestionState = {
  customTexts: Record<string, string>;
  selections: Record<string, string[]>;
};

export function applyCoworkAskOption(
  state: CoworkAskUserQuestionState,
  question: CoworkAskUserQuestion,
  optionId: string,
): CoworkAskUserQuestionState {
  const selected = state.selections[question.id] ?? [];
  const nextSelected = question.multiSelect
    ? selected.includes(optionId) ? selected.filter((item) => item !== optionId) : [...selected, optionId]
    : [optionId];
  const customText = state.customTexts[question.id];
  return {
    customTexts: { ...state.customTexts, [question.id]: question.multiSelect && customText !== "[No preference]" ? customText ?? "" : "" },
    selections: { ...state.selections, [question.id]: nextSelected },
  };
}

export function applyCoworkAskCustomText(
  state: CoworkAskUserQuestionState,
  question: CoworkAskUserQuestion,
  value: string,
): CoworkAskUserQuestionState {
  return {
    customTexts: { ...state.customTexts, [question.id]: value },
    selections: !question.multiSelect && value.trim()
      ? { ...state.selections, [question.id]: [] }
      : state.selections,
  };
}

export function findPendingCoworkAskUserQuestion(
  blocks: CoworkContentBlock[],
  requests: CoworkPermissionRequest[],
): CoworkAskUserQuestionData | null {
  const block = blocks.find((candidate) => isUnansweredAskUserQuestion(candidate, blocks));
  const request = requests.find((candidate) => candidate.toolName === "AskUserQuestion");
  if (!block?.id || !request || parseCoworkAskUserQuestions(block.input ?? {}).length === 0) return null;
  return { blockId: block.id, input: block.input ?? {}, requestId: request.requestId };
}

export function parseCoworkAskUserQuestions(input: Record<string, unknown>): CoworkAskUserQuestion[] {
  if (!Array.isArray(input.questions)) return [];
  return input.questions.flatMap((question, questionIndex) => {
    const raw = record(question);
    const prompt = text(raw.question);
    if (!prompt || !Array.isArray(raw.options)) return [];
    const options = raw.options.flatMap((option, optionIndex) => {
      const label = text(record(option).label);
      return label ? [{ id: `opt_${questionIndex}_${optionIndex}`, label }] : [];
    });
    if (options.length < 2) return [];
    return [{ id: `q_${questionIndex}`, multiSelect: raw.multiSelect === true, options, question: prompt }];
  });
}

export function coworkAskUserQuestionDecisionInput(
  data: CoworkAskUserQuestionData,
  answer: CoworkAskUserQuestionAnswer,
) {
  const response = typeof answer === "string" ? { response: answer } : { answers: answer };
  return { questions: data.input.questions, ...response, _toolUseBlockId: data.blockId };
}

function isUnansweredAskUserQuestion(block: CoworkContentBlock, blocks: CoworkContentBlock[]) {
  return block.type === "tool_use"
    && block.name === "AskUserQuestion"
    && Boolean(block.id)
    && !blocks.some((candidate) => candidate.type === "tool_result" && candidate.tool_use_id === block.id);
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}
