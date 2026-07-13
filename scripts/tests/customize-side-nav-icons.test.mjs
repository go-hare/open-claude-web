import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

test("CustomizeSideNav Skills uses SkillDocumentIcon (Vv), not spark", () => {
  const src = readFileSync(join(root, "src/features/customize/CustomizeSideNav.tsx"), "utf8");
  assert.match(src, /SkillDocumentIcon/);
  assert.doesNotMatch(src, /icon=["']spark["']/);
  assert.doesNotMatch(src, /name=["']spark["']/);
});

test("SkillDocumentIcon contains official Vv path data", () => {
  const src = readFileSync(join(root, "src/features/customize/skills/SkillDocumentIcon.tsx"), "utf8");
  assert.match(src, /M13\.04 7\.304/);
  assert.match(src, /M14 3a2 2 0 0 1 2 2v8h1\.5/);
  assert.match(src, /viewBox="0 0 20 20"/);
});

test("PluginsSidebarSection exposes Create plugin when localPluginsVisible", () => {
  const src = readFileSync(join(root, "src/features/customize/plugins/PluginsSidebarSection.tsx"), "utf8");
  assert.match(src, /Create plugin/);
  assert.match(src, /localPluginsVisible/);
  const gates = readFileSync(join(root, "src/features/customize/customizeGates.ts"), "utf8");
  assert.match(gates, /LOCAL_PLUGINS_VISIBLE = true/);
});

test("CustomizeSideNav Code mode shows FolderPill / 选择文件夹", () => {
  const src = readFileSync(join(root, "src/features/customize/CustomizeSideNav.tsx"), "utf8");
  assert.match(src, /FolderPill/);
  assert.match(src, /选择文件夹/);
  assert.match(src, /isCodeMode/);
});

test("index Create new skills card uses SkillDocumentIcon not spark string", () => {
  const src = readFileSync(join(root, "src/features/customize/CustomizePage.tsx"), "utf8");
  assert.match(src, /Create new skills[\s\S]{0,200}SkillDocumentIcon|SkillDocumentIcon[\s\S]{0,200}Create new skills/);
  // no CustomizeOptionCard icon="spark"
  assert.doesNotMatch(src, /CustomizeOptionCard[\s\S]{0,80}icon=["']spark["']/);
});
