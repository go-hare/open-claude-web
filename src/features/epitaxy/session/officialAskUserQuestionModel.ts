/**
 * Official AskUserQuestion residual helpers (c11959232 Ow + cd5a31703 R2e / vv / TIe).
 * Shared pure types/constants — no UI.
 *
 * Transcript receipt pairs: cd5a31703 `kQe` → local Code has no `p_()` epitaxy-engine,
 * so product uses `OQe` → `vv(tool)` → `TIe({pairs})`. Do not invent `DQe` / `SQe`.
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

/** cd5a31703 `TIe` pair — question + answered text. */
export type OfficialAskUserTranscriptPair = {
  answer: string;
  question: string;
};

/** Tool-shaped input for `OQe`/`vv` pair extraction (completed receipt, not Ow overlay). */
export type OfficialAskUserTranscriptTool = {
  input?: Record<string, unknown> | null;
  isError?: boolean;
  name?: string;
  output?: unknown;
  status?: string;
  toolUseResult?: unknown;
};

/**
 * Official `cb6930dae` `hi` as cd5a `vv`: answered AskUserQuestion pairs for `TIe`.
 * Prefer persisted `input.answers` via `officialAskUserDisplayFromPersisted`;
 * else JSON `tool.output` / `toolUseResult` `{answers}` / `{questions, answers}`.
 * Empty → null so the coordinator keeps generic Zg / pending Ow overlay.
 */
export function officialAskUserTranscriptPairs(
  tool: OfficialAskUserTranscriptTool | null | undefined,
): OfficialAskUserTranscriptPair[] | null {
  if (!tool) return null;
  const input = parseOfficialAskUserInput(asRecord(tool.input));
  const fromInput = pairsFromAnswers(input.answers, input.questions);
  if (fromInput) return fromInput;

  const resultRecord = asRecord(tool.toolUseResult);
  const fromResult = pairsFromParsedRecord(resultRecord, input.questions);
  if (fromResult) return fromResult;

  const outputRecord = parseJsonObject(tool.output);
  if (!outputRecord) return null;
  return pairsFromParsedRecord(outputRecord, input.questions);
}

function pairsFromParsedRecord(
  record: Record<string, unknown>,
  fallbackQuestions: OfficialAskUserQuestion[],
): OfficialAskUserTranscriptPair[] | null {
  const parsed = parseOfficialAskUserInput({
    answers: record.answers,
    questions: Array.isArray(record.questions) ? record.questions : fallbackQuestions,
  });
  const questions = parsed.questions.length > 0 ? parsed.questions : fallbackQuestions;
  return pairsFromAnswers(parsed.answers, questions);
}

function pairsFromAnswers(
  answers: Record<string, string | string[]> | undefined,
  questions: OfficialAskUserQuestion[],
): OfficialAskUserTranscriptPair[] | null {
  if (!answers || Object.keys(answers).length === 0) return null;
  const persisted = officialAskUserDisplayFromPersisted({ answers }, questions.length > 0 ? questions : undefined);
  if (persisted) {
    const pairs = persisted.flatMap((row) => {
      if (!Object.prototype.hasOwnProperty.call(answers, row.question)) return [];
      return [{ question: row.question, answer: formatAskUserAnswer(row.response) }];
    });
    return pairs.length > 0 ? pairs : null;
  }
  const pairs = Object.entries(answers).map(([question, answer]) => ({
    question,
    answer: formatAskUserAnswer(answer),
  }));
  return pairs.length > 0 ? pairs : null;
}

function formatAskUserAnswer(value: string | string[]): string {
  return Array.isArray(value) ? value.join(", ") : value;
}

function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }
  return null;
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
