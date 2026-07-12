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
const { CoworkConversation } = await vite.ssrLoadModule(
  "/src/features/cowork/session/transcript/CoworkConversation.tsx",
);
const { CoworkArtifactApproval, CoworkSaveSkillApproval, CoworkScheduledTaskApproval } = await vite.ssrLoadModule(
  "/src/features/cowork/composer/CoworkPermissionContentApprovals.tsx",
);
const { CoworkGenericPermissionApproval } = await vite.ssrLoadModule(
  "/src/features/cowork/composer/CoworkGenericPermissionApproval.tsx",
);
const { CoworkBrowserApproval } = await vite.ssrLoadModule(
  "/src/features/cowork/composer/CoworkPermissionStandardApprovals.tsx",
);

after(async () => {
  await vite.close();
});

function renderConversation() {
  return renderToStaticMarkup(React.createElement(CoworkConversation, {
    composer: null,
    composerRef: { current: null },
    isResponding: false,
    messageUuids: [],
    onScrollState: () => {},
    permissionApprovals: React.createElement("div", { "data-testid": "permission-approval" }),
    permissionRequests: [],
    scrollRef: { current: null },
    status: null,
    streamingMessageId: null,
  }));
}

test("renders permission approvals when the transcript has no message chains", () => {
  const markup = renderConversation();

  assert.match(markup, /data-testid="permission-approval"/);
  assert.equal(markup.match(/data-testid="permission-approval"/g)?.length, 1);
});

test("renders SaveSkillApproval with the official skill glyph and expandable state", () => {
  const markup = renderToStaticMarkup(React.createElement(CoworkSaveSkillApproval, {
    busy: false,
    onDecide: () => {},
    request: permission("save_skill", { content: "# Release review", description: "Review each launch", name: "release-review" }),
  }));

  assert.match(markup, /Save skill/);
  assert.match(markup, /release-review/);
  assert.match(markup, /M13\.04 7\.304/);
  assert.match(markup, /M7\.128 5\.165/);
  assert.match(markup, /aria-expanded="false"/);
});

test("renders SetScheduledTaskApproval with the official clock glyph and shortcut policy", () => {
  const markup = renderToStaticMarkup(React.createElement(CoworkScheduledTaskApproval, {
    busy: false,
    disableKeyboardShortcuts: true,
    onDecide: () => {},
    request: permission("create_scheduled_task", { cronExpression: "0 9 * * 1", description: "Review risks", prompt: "Review launch risks", taskId: "review-launch-risks" }),
  }));

  assert.match(markup, /Schedule task/);
  assert.match(markup, /Review launch risks/);
  assert.match(markup, /M10 2\.5a7\.5 7\.5/);
  assert.match(markup, /M7\.128 5\.165/);
  assert.equal(markup.includes("aria-expanded"), false);
  assert.equal(markup.includes("<kbd"), false);
});

test("renders generic approval through the official expanded tool-cell structure", () => {
  const markup = renderToStaticMarkup(React.createElement(CoworkGenericPermissionApproval, {
    busy: false,
    onDecide: () => {},
    request: permission("Write", { content: "hello", file_path: "/tmp/a.txt" }),
  }));

  assert.match(markup, /min-h-\[2\.625rem\] overflow-hidden border-0\.5 border-border-300 rounded-lg/);
  assert.match(markup, /h-\[2\.625rem\] py-2 px-3 cursor-default/);
  assert.match(markup, /flex flex-col gap-3 p-3 bg-bg-100 rounded-md/);
  assert.match(markup, />Always allow/);
  assert.match(markup, />Deny/);
  assert.equal(markup.includes(">Allow once<"), false);
});

test("keeps plugin-shim approval on Allow once without official suggestions", () => {
  const markup = renderToStaticMarkup(React.createElement(CoworkGenericPermissionApproval, {
    busy: false,
    onDecide: () => {},
    request: permission("plugin-shim:github:issues:create_issue", { command: "create issue" }),
  }));

  assert.match(markup, />Allow once/);
  assert.equal(markup.includes(">Always allow<"), false);
});

test("renders browser approval with the official browser split-button classes", () => {
  const markup = renderToStaticMarkup(React.createElement(CoworkBrowserApproval, {
    busy: false,
    duplicateCount: 2,
    isScheduledTask: false,
    onDecide: () => {},
    request: permission("browser:navigate", { domain: "example.com" }),
  }));

  assert.match(markup, /Allow Claude to use the browser on/);
  assert.match(markup, /Allow for this website/);
  assert.match(markup, /!border-r-oncolor-100\/25/);
  assert.match(markup, /!text-bg-000/);
  assert.match(markup, /\(2 requests\)/);
});

test("renders artifact approval with the official description and shortcut branches", () => {
  const markup = renderToStaticMarkup(React.createElement(CoworkArtifactApproval, {
    busy: false,
    disableKeyboardShortcuts: true,
    isScheduledTask: false,
    onDecide: () => {},
    request: permission("mcp__cowork__update_artifact", { id: "report", update_summary: "Updated totals" }),
  }));

  assert.match(markup, /pl-\[34px\] font-base text-text-200/);
  assert.equal(markup.includes("<kbd"), false);
});

function permission(toolName, input) {
  return { input, requestId: `${toolName}-request`, sessionId: "session-1", toolName, toolUseId: `${toolName}-use` };
}
