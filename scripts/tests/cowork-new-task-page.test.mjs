import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

test("CoworkHeader uses official c621 ir/gn polish + v1 message ids", () => {
  const header = read("src/features/cowork/newTask/CoworkHeader.tsx");
  const messages = read("src/features/cowork/newTask/coworkNewTaskMessages.ts");
  assert.match(messages, /NUs72amU1j/);
  assert.match(messages, /mWPGSbK6BB/);
  assert.match(messages, /Cxr7ieOSct/);
  assert.match(messages, /ocNaWcgW5X/);
  assert.match(messages, /tV2NkM49Bx/);
  assert.match(messages, /OSqbaQv7nr/);
  assert.match(header, /resolveCoworkHeaderTitle/);
  assert.match(header, /useCoworkNewTaskText/);
  assert.match(header, /resolveCoworkHomeGreetingPolish|polish/);
  assert.match(header, /c62135ccf-Dn28vJ3V\.js:ir\/gn/);
  assert.match(header, /OfficialSparkIdle/);
  assert.match(header, /h-\[0\.8em\] w-\[0\.8em\]/);
  assert.match(header, /size=\{28\}/);
  assert.match(header, /CoworkOrgChip|c62135ccf-Dn28vJ3V\.js:dr/);
  assert.match(header, /isRaven/);
  assert.doesNotMatch(header, /cd02a42d9/);
  assert.doesNotMatch(messages, /CJsWpnmYD4/);
  assert.doesNotMatch(messages, /XLcM6WHfQR/);
  assert.doesNotMatch(messages, /jGTFVKPV2/);
  assert.doesNotMatch(messages, /huISnRRpZW/);
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

test("CoworkPromptBox onpage placeholder uses official tV2NkM49Bx (no XLc/jGT carousel)", () => {
  const box = read("src/features/cowork/composer/CoworkPromptBox.tsx");
  const messages = read("src/features/cowork/newTask/coworkNewTaskMessages.ts");
  assert.match(messages, /tV2NkM49Bx/);
  assert.match(box, /composerPlaceholder/);
  assert.match(box, /c62135ccf-Dn28vJ3V\.js:w6t\/\$4t CAt onpage/);
  assert.doesNotMatch(messages, /XLcM6WHfQR/);
  assert.doesNotMatch(box, /composerPlaceholderSkills/);
  assert.doesNotMatch(box, /今天我可以帮助你做什么？/);
});

test("Cowork chrome Add+/folder chin ids retargeted to shared-8", () => {
  const chrome = read("src/features/cowork/composer/coworkChromeMessages.ts");
  assert.match(chrome, /OnsnuZtVJO/);
  assert.match(chrome, /eTP2WIUJLu/);
  assert.doesNotMatch(chrome, /ITCmbu5TgN/);
  assert.doesNotMatch(chrome, /bNgYGVAxfX/);
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
  assert.match(menu, /Add plugins/);
  assert.match(menu, /Add connectors/);
  assert.match(menu, /add-menu-upload-file/);
  assert.match(menu, /const modeItems = isAgentRoute\s*\?\s*\[\]/);
  assert.match(menu, /if \(!isAgentRoute\)/);

  assert.match(box, /isAgentRoute: true/);
  assert.match(box, /includeAddFolder: false/);
  assert.match(dropdown, /isValidElement\(icon\)/);
  assert.match(dropdown, /role="menu"/);
  assert.doesNotMatch(menu, /icon: "FileAdd"/);
  assert.doesNotMatch(menu, /icon: "Folder1"/);
});

test("official zh-CN has polish header and onpage placeholder ids", () => {
  const zh = JSON.parse(read("public/i18n/zh-CN.json"));
  assert.equal(zh.NUs72amU1j, "来把待办清掉吧。");
  assert.equal(zh.OnaQpdV9zK, "随便挑个任务开始吧");
  assert.equal(zh.ov1AuKcjep, "优化我的一周");
  assert.equal(zh.R9OYtL0hxN, "整理我的截图");
  assert.equal(zh.JDTaxC6dOy, "从文件中发现洞察");
  assert.equal(zh.tV2NkM49Bx, "描述一个任务，从快速修复到多步骤工作。");
  assert.equal(zh.Cxr7ieOSct, "了解如何安全使用协作");
  assert.equal(zh.i2yl4bVuRw, "用插件自定义");
  assert.equal(zh.OnsnuZtVJO, "添加文件、连接器等");
  assert.equal(zh.eTP2WIUJLu, "在项目或文件夹中工作");
  assert.equal(zh.OSqbaQv7nr, "为接下来做计划");
});

test("zh-CN.overrides does not stomp spa polish home copy with EN", () => {
  const zh = JSON.parse(read("public/i18n/zh-CN.json"));
  const overrides = JSON.parse(read("public/i18n/zh-CN.overrides.json"));
  for (const id of ["NUs72amU1j", "tV2NkM49Bx", "OnsnuZtVJO", "eTP2WIUJLu", "OSqbaQv7nr"]) {
    assert.equal(overrides[id], zh[id]);
    assert.doesNotMatch(overrides[id], /Let's knock|Let’s knock|Describe a task|Add files, connectors|Work in a project/);
  }
});
