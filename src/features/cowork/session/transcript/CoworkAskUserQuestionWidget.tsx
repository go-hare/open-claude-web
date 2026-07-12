import { memo } from "react";
import type { CoworkContentBlock } from "./coworkMessageTypes";

export const CoworkAskUserQuestionWidget = memo(function CoworkAskUserQuestionWidget({ input, result }: { input?: Record<string, unknown>; result?: CoworkContentBlock }) {
  const questions = Array.isArray(input?.questions) ? input.questions : [];
  const persisted = persistedAnswers(input, result, questions);
  const annotations = persisted?.annotations;
  const responses = persisted?.answers ? questions.flatMap((question) => responseForQuestion(question, persisted.answers, annotations)) : [];
  if (responses.length === 0) return null;
  return (
    <div className="rounded-xl outline-none border border-border-300 border-0.5 p-4 my-4">
      <div className="flex flex-col gap-3">
        {responses.map((response, index) => (
          <div className="flex flex-col gap-1" key={index}>
            <div className="contents">
              <span className="text-text-300 font-base-bold font-claude-response-small-bold">{response.question}</span>
              <span className="text-text-500 font-base">{Array.isArray(response.response) ? response.response.join(", ") : String(response.response)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

type PersistedAnswers = { answers: Record<string, unknown>; annotations?: Record<string, { preview?: string }> };

function persistedAnswers(input: Record<string, unknown> | undefined, result: CoworkContentBlock | undefined, questions: unknown[]): PersistedAnswers | undefined {
  const fromInput = answerRecord(input);
  if (fromInput) return fromInput;
  const fromResult = answerRecord(result) ?? parseResultContent(result);
  if (fromResult) return fromResult;
  if (!result?.is_error) return undefined;
  const answers: Record<string, unknown> = {};
  for (const question of questions) {
    const text = questionText(question);
    if (text) answers[text] = "Dismissed";
  }
  return { answers };
}

function answerRecord(value?: Record<string, unknown>): PersistedAnswers | undefined {
  if (!value || typeof value.answers !== "object" || value.answers === null) return undefined;
  const answers = value.answers as Record<string, unknown>;
  if (Object.keys(answers).length === 0) return undefined;
  const annotations = typeof value.annotations === "object" && value.annotations !== null
    ? value.annotations as PersistedAnswers["annotations"]
    : undefined;
  return { annotations, answers };
}

function parseResultContent(result?: CoworkContentBlock): PersistedAnswers | undefined {
  const text = typeof result?.content === "string" ? result.content : Array.isArray(result?.content) && result.content[0]?.type === "text" ? result.content[0].text : undefined;
  if (!text) return undefined;
  try {
    return answerRecord(JSON.parse(text) as Record<string, unknown>);
  } catch {
    return undefined;
  }
}

function responseForQuestion(question: unknown, answers: Record<string, unknown>, annotations?: PersistedAnswers["annotations"]) {
  const text = questionText(question);
  return text ? [{ preview: annotations?.[text]?.preview, question: text, response: answers[text] ?? "" }] : [];
}

function questionText(question: unknown) {
  return question && typeof question === "object" && typeof (question as Record<string, unknown>).question === "string"
    ? String((question as Record<string, unknown>).question)
    : "";
}
