import assert from "node:assert/strict";
import { after, test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const vite = await createServer({
  appType: "custom",
  logLevel: "silent",
  root: process.cwd(),
  server: { middlewareMode: true },
});
const {
  COWORK_ONBOARDING_SPACER_ADDITIONAL_BUFFER_PX,
  COWORK_TOOL_LOADING_FALLBACK,
  coworkStandbyWaitingMessage,
  extractCoworkToolLoadingMessages,
  extractCoworkLoadingMessagesFromMessages,
  resolveCoworkOnboardingAdditionalBuffer,
  shouldShowCoworkWaitingText,
} = await vite.ssrLoadModule(
  "/src/features/cowork/session/activity/coworkStatusChannels.ts",
);
const {
  COWORK_ONBOARDING_SPACER_ADDITIONAL_BUFFER_PX: spacer220,
} = await vite.ssrLoadModule(
  "/src/features/cowork/session/transcript/CoworkConversationBottomSpacer.tsx",
);
const {
  measureCoworkChatInputTopToViewportBottom,
  coworkChatLayoutStore,
} = await vite.ssrLoadModule(
  "/src/features/cowork/session/transcript/coworkChatLayoutStore.ts",
);
const { CoworkConversationStatus, parseCoworkConversationStatus } = await vite.ssrLoadModule(
  "/src/features/cowork/session/activity/CoworkConversationStatus.tsx",
);
const { CoworkTimelineStatusVisibilityProvider } = await vite.ssrLoadModule(
  "/src/features/cowork/session/transcript/CoworkTimelineStatusVisibility.tsx",
);

after(async () => {
  await vite.close();
});

test("ns gate matches official shouldShowWaitingText", () => {
  assert.equal(shouldShowCoworkWaitingText({ isStreaming: false, messageCount: 2 }), false);
  assert.equal(shouldShowCoworkWaitingText({ isStreaming: true, messageCount: 2 }), true);
  assert.equal(shouldShowCoworkWaitingText({ isStreaming: true, messageCount: 4, retryCount: 1 }), true);
  assert.equal(shouldShowCoworkWaitingText({ isStreaming: true, messageCount: 4, isCompacting: true }), true);
  assert.equal(shouldShowCoworkWaitingText({ isStreaming: true, messageCount: 4, apiRetryActive: true }), true);
  assert.equal(shouldShowCoworkWaitingText({ isStreaming: true, messageCount: 4 }), false);
});

test("extracts tool loading_messages only before input keys settle", () => {
  // Official: s = block.input has keys → hide; Qp reads partial_json while streaming.
  const pending = extractCoworkToolLoadingMessages([
    {
      type: "tool_use",
      name: "SomeTool",
      input: {},
      partial_json: '{"loading_messages":["Warming up...","Almost ready..."]}',
    },
  ]);
  assert.deepEqual(pending, ["Warming up..."]);

  const settled = extractCoworkToolLoadingMessages([
    {
      type: "tool_use",
      name: "SomeTool",
      input: { loading_messages: ["Warming up...", "Almost ready..."], path: "/tmp" },
    },
  ]);
  assert.equal(settled, undefined);
});

test("maps show_widget without input to visualize loading fallback", () => {
  assert.equal(
    extractCoworkToolLoadingMessages([{ type: "tool_use", name: "show_widget", input: {} }]),
    COWORK_TOOL_LOADING_FALLBACK,
  );
});

test("standby timed copy matches official h$t thresholds", () => {
  assert.equal(coworkStandbyWaitingMessage(4), undefined);
  assert.match(coworkStandbyWaitingMessage(5, 0) ?? "", /stand by|be right there/);
  assert.equal(coworkStandbyWaitingMessage(15), "Still working on it, stand by...");
  assert.equal(coworkStandbyWaitingMessage(30), "A bit longer, thanks for your patience...");
});

test("Je.show additionalBuffer is 220 and agent default is undefined", () => {
  assert.equal(COWORK_ONBOARDING_SPACER_ADDITIONAL_BUFFER_PX, 220);
  assert.equal(spacer220, 220);
  assert.equal(resolveCoworkOnboardingAdditionalBuffer(true), 220);
  assert.equal(resolveCoworkOnboardingAdditionalBuffer(false), undefined);
});

test("chat layout store holds chatInputTopToViewportBottom", () => {
  coworkChatLayoutStore.getState().setChatInputTopToViewportBottom(321);
  assert.equal(coworkChatLayoutStore.getState().chatInputTopToViewportBottom, 321);
  assert.equal(typeof measureCoworkChatInputTopToViewportBottom, "function");
});

test("parse attaches loadingMessages while working", () => {
  const messages = [
    {
      createdAt: "2026-07-12T00:00:00.000Z",
      id: "a1",
      role: "assistant",
      text: "",
      raw: {
        type: "assistant",
        content: [
          {
            type: "tool_use",
            name: "Widget",
            input: {},
            partial_json: '{"loading_messages":["Spinning up...","Hang tight..."]}',
          },
        ],
      },
    },
  ];
  const status = parseCoworkConversationStatus(messages, null, null, true, null, {
    messageCount: 2,
  });
  assert.deepEqual(status.loadingMessages, ["Spinning up..."]);
  assert.equal(status.messageCount, 2);
});

test("g$t dual residual renders loading_messages italic channel when streaming", () => {
  const html = renderToStaticMarkup(React.createElement(
    CoworkTimelineStatusVisibilityProvider,
    null,
    React.createElement(CoworkConversationStatus, {
      isWorking: true,
      status: {
        loadingMessages: ["Warming up..."],
        messageCount: 4,
        statusMessage: undefined,
      },
    }),
  ));
  assert.match(html, /Warming up\.\.\./);
  assert.match(html, /font-claude-response text-text-300 ml-2 pb-1\.5 text-sm italic/);
});

test("extracts loading messages from chat-shaped assistant content", () => {
  const found = extractCoworkLoadingMessagesFromMessages([
    {
      sender: "assistant",
      content: [
        {
          type: "tool_use",
          name: "x",
          input: {},
          partial_json: '{"loading_messages":["A","B"]}',
        },
      ],
    },
  ]);
  assert.deepEqual(found, ["A"]);
});
