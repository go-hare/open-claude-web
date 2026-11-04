import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  OfficialAskUserTranscriptCard,
  OFFICIAL_ASK_USER_TIE_ANSWER,
  OFFICIAL_ASK_USER_TIE_PAIR,
  OFFICIAL_ASK_USER_TIE_QUESTION,
  OFFICIAL_ASK_USER_TIE_ROOT,
} from "./OfficialAskUserTranscriptCard";
import { officialAskUserTranscriptPairs } from "./officialAskUserQuestionModel";

const here = path.dirname(fileURLToPath(import.meta.url));
const cardSource = readFileSync(path.join(here, "OfficialAskUserTranscriptCard.tsx"), "utf8");
const modelSource = readFileSync(path.join(here, "officialAskUserQuestionModel.ts"), "utf8");

const questions = [
  {
    question: "Which stack?",
    options: [{ label: "React" }, { label: "Vue" }],
  },
  {
    question: "Pick extras?",
    multiSelect: true,
    options: [{ label: "Tests" }, { label: "Docs" }],
  },
];

describe("official AskUserQuestion transcript kQe card (cd5a31703 TIe / OQe / kQe)", () => {
  it("mentions cd5a31703 TIe OQe kQe and stays on OQe (no DQe engine)", () => {
    expect(cardSource).toMatch(/cd5a31703/);
    expect(cardSource).toMatch(/TIe/);
    expect(cardSource).toMatch(/OQe/);
    expect(cardSource).toMatch(/kQe/);
    expect(modelSource).toMatch(/cd5a31703/);
    expect(modelSource).toMatch(/TIe/);
    expect(modelSource).toMatch(/OQe/);
    expect(modelSource).toMatch(/kQe/);
    expect(cardSource).not.toMatch(/card-at-tail/);
    expect(cardSource).not.toMatch(/data-question-card-slot/);
    expect(cardSource).not.toMatch(/epitaxy-question-receipt-enter/);
  });

  it("locks TIe classNames", () => {
    expect(OFFICIAL_ASK_USER_TIE_ROOT).toBe(
      "flex flex-col gap-2.5 w-fit min-w-[min(100%,318px)] max-w-full epitaxy-card-outline-inset rounded-lg p-2.5 select-text",
    );
    expect(OFFICIAL_ASK_USER_TIE_ROOT).toContain("min-w-[min(100%,318px)]");
    expect(OFFICIAL_ASK_USER_TIE_PAIR).toBe("flex flex-col gap-0.75");
    expect(OFFICIAL_ASK_USER_TIE_QUESTION).toBe(
      "text-body text-secondary whitespace-pre-wrap [overflow-wrap:anywhere]",
    );
    expect(OFFICIAL_ASK_USER_TIE_ANSWER).toBe(
      "text-body text-primary whitespace-pre-wrap [overflow-wrap:anywhere]",
    );
    expect(cardSource).toContain(OFFICIAL_ASK_USER_TIE_ROOT);
    expect(cardSource).toContain(OFFICIAL_ASK_USER_TIE_PAIR);
    expect(cardSource).not.toMatch(/epitaxy-question-receipt/);
  });

  it("pairs from persisted input.answers (A2e) and joins array answers with comma", () => {
    const pairs = officialAskUserTranscriptPairs({
      name: "AskUserQuestion",
      input: {
        questions,
        answers: {
          "Which stack?": "React",
          "Pick extras?": ["Tests", "Docs"],
        },
      },
    });
    expect(pairs).toEqual([
      { question: "Which stack?", answer: "React" },
      { question: "Pick extras?", answer: "Tests, Docs" },
    ]);
  });

  it("falls back to tool.output JSON {answers} / {questions, answers}", () => {
    const fromAnswersOnly = officialAskUserTranscriptPairs({
      name: "AskUserQuestion",
      input: { questions },
      output: JSON.stringify({ answers: { "Which stack?": "Vue" } }),
    });
    expect(fromAnswersOnly).toEqual([{ question: "Which stack?", answer: "Vue" }]);

    const fromQuestionsAndAnswers = officialAskUserTranscriptPairs({
      name: "AskUserQuestion",
      output: JSON.stringify({
        questions: [{ question: "Ship tonight?", options: [{ label: "Yes" }] }],
        answers: { "Ship tonight?": "Yes" },
      }),
    });
    expect(fromQuestionsAndAnswers).toEqual([{ question: "Ship tonight?", answer: "Yes" }]);
  });

  it("empty → null (coordinator keeps Zg / pending overlay)", () => {
    expect(officialAskUserTranscriptPairs(null)).toBeNull();
    expect(officialAskUserTranscriptPairs({ name: "AskUserQuestion", input: { questions } })).toBeNull();
    expect(officialAskUserTranscriptPairs({
      name: "AskUserQuestion",
      input: { questions, answers: {} },
    })).toBeNull();
    expect(officialAskUserTranscriptPairs({
      name: "AskUserQuestion",
      output: "not-json",
    })).toBeNull();
    expect(OfficialAskUserTranscriptCard({
      tool: { name: "AskUserQuestion", input: { questions } },
    })).toBeNull();
  });

  it("paints TIe DOM without iframe or Spinner", () => {
    const html = renderToStaticMarkup(
      createElement(OfficialAskUserTranscriptCard, {
        tool: {
          name: "AskUserQuestion",
          input: {
            questions,
            answers: { "Which stack?": "React" },
          },
        },
      }),
    );
    expect(html).toContain(OFFICIAL_ASK_USER_TIE_ROOT);
    expect(html).toContain("Which stack?");
    expect(html).toContain("React");
    expect(html).not.toMatch(/iframe/i);
    expect(html).not.toMatch(/Spinner/);
    expect(cardSource).not.toMatch(/iframe/i);
    expect(cardSource).not.toMatch(/Spinner/);
    expect(cardSource).not.toMatch(/OfficialAskUserQuestionCard/);
  });

  it("TIe answers go through official _v inline (Ds/ys), not MarkdownContent", () => {
    expect(cardSource).toContain("officialInlineV");
    expect(cardSource).toContain('data-official-v="_v"');
    expect(cardSource).not.toMatch(/from ["'].*OfficialCodeMarkdown["']/);
    expect(cardSource).not.toContain("<MarkdownContent");
    const html = renderToStaticMarkup(
      createElement(OfficialAskUserTranscriptCard, {
        tool: {
          name: "AskUserQuestion",
          input: {
            questions: [{ question: "Path?", options: [{ label: "`src/a.ts`" }] }],
            answers: { "Path?": "`src/a.ts`" },
          },
        },
      }),
    );
    expect(html).toContain("src/a.ts");
    expect(html).toContain("text-code");
  });
});
