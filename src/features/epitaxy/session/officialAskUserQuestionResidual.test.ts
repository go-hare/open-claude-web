import { describe, expect, it } from "vitest";
import {
  isOfficialAskUserQuestionTool,
  OFFICIAL_ASK_USER_NO_PREFERENCE,
  OFFICIAL_ASK_USER_OTHER_INDEX,
  parseOfficialAskUserInput,
  officialAskUserDisplayFromPersisted,
  officialAskUserHasPreview,
} from "./officialAskUserQuestionModel";
import { buildOfficialAskUserSubmitPayload } from "./useOfficialAskUserQuestion";

describe("official AskUserQuestion residual (Ow / R2e)", () => {
  it("matches tool name residual including mcp suffix base", () => {
    expect(isOfficialAskUserQuestionTool("AskUserQuestion")).toBe(true);
    expect(isOfficialAskUserQuestionTool("mcp__x__AskUserQuestion")).toBe(true);
    expect(isOfficialAskUserQuestionTool("Bash")).toBe(false);
  });

  it("parses questions/options like CLI tool input (screenshot payload)", () => {
    const parsed = parseOfficialAskUserInput({
      questions: [
        {
          question: "请选择一个测试选项？",
          header: "测试选项",
          options: [
            { label: "1", description: "选项 1" },
            { label: "2", description: "选项 2" },
          ],
        },
      ],
    });
    expect(parsed.questions).toHaveLength(1);
    expect(parsed.questions[0].question).toBe("请选择一个测试选项？");
    expect(parsed.questions[0].header).toBe("测试选项");
    expect(parsed.questions[0].options).toEqual([
      { label: "1", description: "选项 1", preview: undefined },
      { label: "2", description: "选项 2", preview: undefined },
    ]);
    expect(officialAskUserHasPreview(parsed.questions[0])).toBe(false);
  });

  it("maps persisted answers to display rows (A2e)", () => {
    const questions = parseOfficialAskUserInput({
      questions: [{ question: "Q?", options: [{ label: "A" }, { label: "B" }] }],
    }).questions;
    const rows = officialAskUserDisplayFromPersisted(
      { answers: { "Q?": "A" } },
      questions,
    );
    expect(rows).toEqual([{ question: "Q?", response: "A", preview: undefined }]);
  });

  it("builds once-submit payload with questions + answers (+ annotations)", () => {
    const input = parseOfficialAskUserInput({
      questions: [{ question: "Q?", options: [{ label: "1" }, { label: "2" }] }],
    });
    const payload = buildOfficialAskUserSubmitPayload(
      { "Q?": "1" },
      input,
      { "Q?": { preview: "<p>x</p>" } },
    );
    expect(payload).toEqual({
      questions: input.questions,
      answers: { "Q?": "1" },
      annotations: { "Q?": { preview: "<p>x</p>" } },
    });
    const noAnno = buildOfficialAskUserSubmitPayload({ "Q?": OFFICIAL_ASK_USER_NO_PREFERENCE }, input, {});
    expect(noAnno.annotations).toBeUndefined();
    expect(OFFICIAL_ASK_USER_OTHER_INDEX).toBe(-1);
  });
});
