import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

test("CoworkHeader uses official y6t control message id CJsWpnmYD4 via messages module", () => {
  const header = read("src/features/cowork/newTask/CoworkHeader.tsx");
  const messages = read("src/features/cowork/newTask/coworkNewTaskMessages.ts");
  assert.match(messages, /CJsWpnmYD4/);
  assert.match(messages, /mWPGSbK6BB/);
  assert.match(messages, /Cxr7ieOSct/);
  assert.match(messages, /ocNaWcgW5X/);
  assert.match(header, /resolveCoworkHeaderTitle/);
  assert.match(header, /useCoworkNewTaskText/);
  assert.doesNotMatch(header, /Let's knock something off your list/);
});

test("CoworkSuggestions builds official s6t catalog with shuffle categories", () => {
  const src = read("src/features/cowork/newTask/CoworkSuggestions.tsx");
  assert.match(src, /buildCoworkSuggestionCategories/);
  assert.match(src, /initial-1/);
  assert.match(src, /organize-downloads/);
  assert.match(src, /prep-meeting/);
  assert.match(src, /data-slack/);
  assert.match(src, /hover:bg-bg-300/);
  assert.match(src, /font-base text-text-200/);
  assert.match(src, /dismissCoworkSuggestions/);
  assert.match(src, /onCustomizeWithPlugins/);
  assert.doesNotMatch(src, /优化我的一周/);
});

test("CoworkPromptBox placeholder uses official XLcM6WHfQR", () => {
  const box = read("src/features/cowork/composer/CoworkPromptBox.tsx");
  const messages = read("src/features/cowork/newTask/coworkNewTaskMessages.ts");
  assert.match(messages, /XLcM6WHfQR/);
  assert.match(box, /composerPlaceholder/);
  assert.doesNotMatch(box, /今天我可以帮助你做什么？/);
});

test("CoworkNewTaskPage wires suggestions customize to /customize", () => {
  const page = read("src/features/cowork/newTask/CoworkNewTaskPage.tsx");
  assert.match(page, /onCustomizeWithPlugins=\{\(\) => onNavigate\("\/customize"\)\}/);
});

test("Cowork add menu follows official cwt agent route structure and ion icons", () => {
  const menu = read("src/features/cowork/newTask/CoworkAddMenuItems.ts");
  const icons = read("src/features/cowork/newTask/CoworkAddMenuIcons.tsx");
  const box = read("src/features/cowork/composer/CoworkPromptBox.tsx");
  const dropdown = read("src/features/cowork/ui/CoworkDropdownButton.tsx");

  // Official gy / cv / Vv / Ky / Dv path data from index-BELzQL5P
  assert.match(icons, /M6\.068 2\.161a2\.72 2\.72 0 0 1 3\.524 1\.533/);
  assert.match(icons, /M10\.5 10\.5H13v1h-2\.5V14h-1v-2\.5H7v-1h2\.5V8h1z/);
  assert.match(icons, /M13\.04 7\.304a\.5\.5 0 0 1 \.92\.392/);
  assert.match(icons, /M8 6a1 1 0 0 1 1 \.999V11h4a1 1 0 0 1 1 1v4/);
  assert.match(icons, /M13\.147 3\.147a\.5\.5 0 1 1 \.707\.707/);
  assert.match(icons, /viewBox="0 0 20 20"/);

  assert.match(menu, /isAgentRoute/);
  assert.match(menu, /CoworkAddMenuPaperclipIcon/);
  assert.match(menu, /CoworkAddMenuFolderAddIcon/);
  assert.match(menu, /CoworkAddMenuConnectorsIcon/);
  assert.match(menu, /CoworkAddMenuPluginsIcon/);
  assert.match(menu, /Add plugins\.\.\./);
  assert.match(menu, /Add connectors/);
  // Agent route must not always inject chat-only modes/project rows
  assert.match(menu, /const modeItems = isAgentRoute\s*\?\s*\[\]/);
  assert.match(menu, /if \(!isAgentRoute\)/);

  assert.match(box, /isAgentRoute: true/);
  assert.match(box, /includeAddFolder: true/);
  assert.match(dropdown, /isValidElement\(icon\)/);
  assert.doesNotMatch(menu, /icon: "FileAdd"/);
  assert.doesNotMatch(menu, /icon: "Folder1"/);
});

test("official zh-CN has control header and initial suggestion labels", () => {
  const zh = JSON.parse(read("public/i18n/zh-CN.json"));
  assert.equal(zh.CJsWpnmYD4, "来把待办清掉吧");
  assert.equal(zh.OnaQpdV9zK, "随便挑个任务开始吧");
  assert.equal(zh.ov1AuKcjep, "优化我的一周");
  assert.equal(zh.R9OYtL0hxN, "整理我的截图");
  assert.equal(zh.JDTaxC6dOy, "从文件中发现洞察");
  assert.equal(zh.XLcM6WHfQR, "今天我可以帮你做什么？");
  assert.equal(zh.Cxr7ieOSct, "了解如何安全使用协作");
  assert.equal(zh.i2yl4bVuRw, "用插件自定义");
});
