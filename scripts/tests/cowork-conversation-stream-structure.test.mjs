import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

test("xQt always mounts Progress + Working folder; never hides the rail when empty", () => {
  const panel = read("src/features/cowork/session/activity/CoworkSessionActivityPanel.tsx");
  const progress = read("src/features/cowork/session/activity/CoworkProgressSection.tsx");
  const shell = read("src/features/cowork/session/activity/CoworkActivityPanelShell.tsx");

  assert.doesNotMatch(panel, /hasCoworkActivity/);
  assert.doesNotMatch(panel, /if \(!hasActivity\) return null/);
  assert.match(panel, /<CoworkActivityPanelShell isFileDrawerOpen=\{isFileDrawerOpen\} sessionId=\{sessionId\}>/);
  assert.match(panel, /<CoworkProgressSection /);
  assert.match(panel, /<CoworkActivitySection[\s\S]*title=\{coworkFolderSectionTitle\(folders\)\}/);
  assert.match(panel, /title="上下文"/);

  assert.match(progress, /CoworkEmptyProgressState/);
  assert.match(progress, /See task progress for longer tasks\./);
  assert.match(progress, /index-BELzQL5P\.js:pQt/);

  assert.match(shell, /aria-label="Session activity panel"/);
  assert.match(shell, /data-cowork-session-activity-panel/);
  assert.match(shell, /xQt Session activity panel aside/);
  assert.match(shell, /expanded && !isFileDrawerOpen/);
  assert.match(panel, /hasExpandableActivity/);
  assert.match(panel, /setActivityExpanded\(true\)/);
});

test("S3t mounts xQt as sibling of the chat column, not yUt rightSidebar", () => {
  const view = read("src/features/cowork/session/CoworkSessionView.tsx");
  const layout = read("src/features/cowork/session/CoworkSessionFileDrawerLayout.tsx");

  assert.match(view, /data-official-source="index-BELzQL5P\.js:S3t relative flex h-full"/);
  assert.match(view, /data-official-source="index-BELzQL5P\.js:S3t chat column relative flex-1 min-w-0 flex flex-col"/);
  assert.match(view, /<CoworkSessionFileDrawerLayout/);
  assert.match(view, /<CoworkSessionActivityPanel/);
  assert.doesNotMatch(view, /rightSidebar=\{/);

  const activityIdx = view.indexOf("<CoworkSessionActivityPanel");
  const drawerCloseIdx = view.indexOf("</CoworkSessionFileDrawerLayout>");
  assert.ok(activityIdx > drawerCloseIdx, "xQt must be a sibling after yUt, matching S3t not yUt.c");

  assert.match(layout, /\{rightSidebar\}/);
  assert.match(layout, /index-BELzQL5P\.js:yUt outer flex shell/);
});

test("unused tiles-shell CoworkSessionLayout invent is gone", () => {
  assert.equal(
    existsSync(join(root, "src/features/cowork/session/CoworkSessionLayout.tsx")),
    false,
  );
  const view = read("src/features/cowork/session/CoworkSessionView.tsx");
  assert.doesNotMatch(view, /tiles-shell/);
  assert.doesNotMatch(view, /CoworkSessionLayout/);
});
