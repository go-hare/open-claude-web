/**
 * Official AskUserQuestion residual helpers (c11959232 Ow + index-BELzQL5P R2e).
 * Shared pure types/constants — no UI.
 */

export const OFFICIAL_ASK_USER_OTHER_INDEX = -1;
/** Official uRe — skip / no-selection response token. */
export const OFFICIAL_ASK_USER_NO_PREFERENCE = "[No preference]";

export type OfficialAskUserOption = {
  description?: string;
  label: string;
  preview?: string;
};

export type OfficialAskUserQuestion = {
  header?: string;
  multiSelect?: boolean;
  options: OfficialAskUserOption[];
  question: string;
};

export type OfficialAskUserParsedInput = {
  answers?: Record<string, string | string[]>;
  annotations?: Record<string, { preview?: string }>;
  questions: OfficialAskUserQuestion[];
};

export type OfficialAskUserStoredResponse = {
  preview?: string;
  question: string;
  response: string | string[];
};

export type OfficialAskUserSubmitPayload = {
  annotations?: Record<string, { preview?: string }>;
  answers: Record<string, string | string[]>;
  questions: OfficialAskUserQuestion[];
};

export function isOfficialAskUserQuestionTool(toolName: string | undefined | null): boolean {
  if (!toolName) return false;
  const base = toolName.split("__").pop() ?? toolName;
  return base === "AskUserQuestion";
}

export function parseOfficialAskUserInput(input: Record<string, unknown> | undefined | null): OfficialAskUserParsedInput {
  const record = input && typeof input === "object" ? input : {};
  const rawQuestions = Array.isArray(record.questions) ? record.questions : [];
  const questions: OfficialAskUserQuestion[] = rawQuestions.map((item) => {
    const q = asRecord(item);
    const optionsRaw = Array.isArray(q.options) ? q.options : [];
    const options: OfficialAskUserOption[] = optionsRaw.map((option) => {
      const o = asRecord(option);
      return {
        label: typeof o.label === "string" ? o.label : "",
        description: typeof o.description === "string" ? o.description : undefined,
        preview: typeof o.preview === "string" ? o.preview : undefined,
      };
    });
    return {
      question: typeof q.question === "string" ? q.question : "",
      header: typeof q.header === "string" ? q.header : undefined,
      multiSelect: q.multiSelect === true,
      options,
    };
  });
  const answers = asStringMap(record.answers);
  const annotations = asAnnotationMap(record.annotations);
  return {
    questions,
    ...(answers ? { answers } : {}),
    ...(annotations ? { annotations } : {}),
  };
}

/** Official L2e: question has any option.preview. */
export function officialAskUserHasPreview(question: OfficialAskUserQuestion | undefined): boolean {
  return question?.options.some((option) => option.preview !== undefined) ?? false;
}

/** Official A2e: persisted answers → displayResponses. */
export function officialAskUserDisplayFromPersisted(
  persisted: { answers?: Record<string, string | string[]>; annotations?: Record<string, { preview?: string }> } | null | undefined,
  questions: OfficialAskUserQuestion[] | undefined,
): OfficialAskUserStoredResponse[] | null {
  if (!persisted || !questions) return null;
  const answers = persisted.answers;
  if (!answers || Object.keys(answers).length === 0) return null;
  const annotations = persisted.annotations;
  return questions.map((question) => ({
    question: question.question,
    response: answers[question.question] ?? "",
    preview: annotations?.[question.question]?.preview,
  }));
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asStringMap(value: unknown): Record<string, string | string[]> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const out: Record<string, string | string[]> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === "string") out[key] = entry;
    else if (Array.isArray(entry) && entry.every((item) => typeof item === "string")) out[key] = entry as string[];
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function asAnnotationMap(value: unknown): Record<string, { preview?: string }> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const out: Record<string, { preview?: string }> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    const record = asRecord(entry);
    if (typeof record.preview === "string") out[key] = { preview: record.preview };
    else out[key] = {};
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
