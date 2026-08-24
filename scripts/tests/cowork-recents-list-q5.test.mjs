import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

test("G4: session onEvent dispatches Q5 n6, not full list() reload", () => {
  const hook = read("src/features/cowork/sidebar/useCoworkSidebarData.ts");
  const dispatcher = read("src/features/cowork/sidebar/officialCoworkRecentsList.ts");

  assert.match(hook, /applyOfficialCoworkRecentsListEvent/);
  assert.match(hook, /toCoworkListRow/);
  assert.match(hook, /LocalAgentModeSessions\.getSession\(sessionId\)/);
  assert.match(hook, /reloadSessions/);
  assert.doesNotMatch(hook, /LocalAgentModeSessions\.onEvent\?\. \(\(\) => \{ void load\(\); \}\)/);

  assert.match(dispatcher, /Q5_META_UPSERT_TYPES/);
  assert.match(dispatcher, /hT\.getSession\(id, \{skipReplay:true\}\)/);
  assert.match(dispatcher, /always e6\(sessionId\)/);
  assert.doesNotMatch(dispatcher, /mergeOfficialRecentsSessionPatch/);
  assert.doesNotMatch(dispatcher, /"cleared"/);
  assert.doesNotMatch(dispatcher, /"unarchived"/);
  assert.doesNotMatch(dispatcher, /"stopped"/);
  assert.doesNotMatch(dispatcher, /"paused"/);
});

test("G4: scheduled/spaces onEvent reload their own stores, not sessions list", () => {
  const hook = read("src/features/cowork/sidebar/useCoworkSidebarData.ts");
  assert.match(hook, /reloadScheduled/);
  assert.match(hook, /reloadSpaces/);
  assert.match(hook, /CoworkScheduledTasks\?\.onEvent/);
  assert.match(hook, /CoworkSpaces\?\.onEvent/);
  const dispatcher = read("src/features/cowork/sidebar/officialCoworkRecentsList.ts");
  assert.match(dispatcher, /type === "initialized"/);
});

test("G5: Recents scheduled header uses catalog cXAlMRerxW, not hard-coded CN", () => {
  const section = read("src/features/cowork/sidebar/CoworkScheduledSection.tsx");
  const catalog = read("src/i18n/shellMessages.ts");
  assert.match(section, /useShellText/);
  assert.match(section, /\{text\.scheduledTasks\}/);
  assert.doesNotMatch(section, />定时任务</);
  assert.match(catalog, /scheduledTasks: \{ defaultMessage: "Scheduled tasks", id: "cXAlMRerxW"/);
});

test("G6: unused Cowork group-by invent is gone", () => {
  assert.equal(existsSync(join(root, "src/features/cowork/sidebar/coworkRecentGroups.ts")), false);
  assert.equal(existsSync(join(root, "src/features/cowork/sidebar/CoworkGroupHeader.tsx")), false);
  const recents = read("src/features/cowork/sidebar/CoworkRecentsSection.tsx");
  assert.doesNotMatch(recents, /buildCoworkRecentGroups/);
  assert.doesNotMatch(recents, /CoworkGroupHeader/);
});
