import assert from "node:assert/strict";
import test, { after } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const vite = await createServer({ appType: "custom", server: { middlewareMode: true } });
const { CoworkAskUserQuestionBanner } = await vite.ssrLoadModule(
  "/src/features/cowork/composer/CoworkAskUserQuestionBanner.tsx",
);
const {
  applyCoworkAskCustomText,
  applyCoworkAskOption,
  findPendingCoworkAskUserQuestion,
} = await vite.ssrLoadModule(
  "/src/features/cowork/composer/coworkAskUserQuestionModel.ts",
);

after(async () => {
  await vite.close();
});

test("finds the official pending AskUserQuestion from the last assistant blocks", () => {
  const block = {
    id: "tool-use-1",
    input: { questions: [question(false)] },
    name: "AskUserQuestion",
    type: "tool_use",
  };
  const request = {
    input: block.input,
    requestId: "permission-1",
    sessionId: "session-1",
    toolName: "AskUserQuestion",
    toolUseId: "permission-1",
  };

  assert.deepEqual(findPendingCoworkAskUserQuestion([block], [request]), {
    blockId: "tool-use-1",
    input: block.input,
    requestId: "permission-1",
  });
  assert.equal(findPendingCoworkAskUserQuestion([
    block,
    { tool_use_id: "tool-use-1", type: "tool_result" },
  ], [request]), null);
});

test("renders the official single-select AskUserQuestion banner structure", () => {
  const markup = renderToStaticMarkup(React.createElement(CoworkAskUserQuestionBanner, {
    data: askData(false),
    onDismiss: () => {},
    onSubmit: () => {},
  }));

  assert.match(markup, /data-ask-user-input-banner="true"/);
  assert.match(markup, /bg-bg-000\/90 backdrop-blur-md mx-2 md:mx-0/);
  assert.match(markup, /role="listbox"/);
  assert.match(markup, /aria-label="No package.json found"/);
  assert.match(markup, />OK</);
  assert.match(markup, />Search broader</);
  assert.match(markup, /Something else/);
  assert.match(markup, /aria-label="Minimize"/);
  assert.match(markup, /data-widget-action="true"/);
});

test("renders the official multi-select footer and checkbox semantics", () => {
  const markup = renderToStaticMarkup(React.createElement(CoworkAskUserQuestionBanner, {
    data: askData(true),
    onDismiss: () => {},
    onSubmit: () => {},
  }));

  assert.match(markup, /aria-multiselectable="true"/);
  assert.match(markup, /type="checkbox"/);
  assert.match(markup, /0 selected/);
  assert.match(markup, />Skip</);
  assert.match(markup, /aria-label="Submit"/);
  assert.match(markup, /M10 3a\.5\.5 0 0 1 \.354\.146l5 5/);
});

test("uses the official small navigation glyphs for multiple questions", () => {
  const first = question(false);
  const markup = renderToStaticMarkup(React.createElement(CoworkAskUserQuestionBanner, {
    data: {
      ...askData(false),
      input: { questions: [first, { ...first, question: "Second question" }] },
    },
    onDismiss: () => {},
    onSubmit: () => {},
  }));

  assert.match(markup, /M12\.247 5\.068a\.501\.501/);
  assert.match(markup, /M7\.128 5\.165a\.5\.5/);
});

test("keeps official AskUser single-select and custom-answer state mutually exclusive", () => {
  const parsedQuestion = { ...question(false), id: "q_0", options: [{ id: "opt_0_0", label: "OK" }] };
  const withOption = applyCoworkAskOption({ customTexts: { q_0: "typed" }, selections: {} }, parsedQuestion, "opt_0_0");
  const withCustom = applyCoworkAskCustomText(withOption, parsedQuestion, "other");

  assert.deepEqual(withOption, { customTexts: { q_0: "" }, selections: { q_0: ["opt_0_0"] } });
  assert.deepEqual(withCustom, { customTexts: { q_0: "other" }, selections: { q_0: [] } });
});

test("clears the official no-preference sentinel when selecting a multi-select option", () => {
  const parsedQuestion = { ...question(true), id: "q_0", options: [{ id: "opt_0_0", label: "OK" }] };
  const next = applyCoworkAskOption({ customTexts: { q_0: "[No preference]" }, selections: {} }, parsedQuestion, "opt_0_0");

  assert.deepEqual(next, { customTexts: { q_0: "" }, selections: { q_0: ["opt_0_0"] } });
});

function askData(multiSelect) {
  return {
    blockId: "tool-use-1",
    input: { questions: [question(multiSelect)] },
    requestId: "permission-1",
  };
}

function question(multiSelect) {
  return {
    header: "Result",
    multiSelect,
    options: [
      { description: "Acknowledged", label: "OK" },
      { description: "Search parent directories too", label: "Search broader" },
    ],
    question: "No package.json found",
  };
}
