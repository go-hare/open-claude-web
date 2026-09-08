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

test("PluginsSidebarSection exposes Create plugin when host JZ APIs exist", () => {
  const src = readFileSync(join(root, "src/features/customize/plugins/PluginsSidebarSection.tsx"), "utf8");
  assert.match(src, /localPluginsHostVisible/);
  assert.match(src, /localPluginsVisible/);
  assert.match(src, /createPlugin/);
  const query = readFileSync(join(root, "src/features/customize/plugins/localPluginsQuery.ts"), "utf8");
  assert.match(query, /fetchLocalPlugins/);
  assert.match(query, /getLocalPlugins\(\)\?\.getPlugins/);
});

test("CustomizeSideNav Code mode shows FolderPill / selectFolder", () => {
  const src = readFileSync(join(root, "src/features/customize/CustomizeSideNav.tsx"), "utf8");
  assert.match(src, /FolderPill/);
  assert.match(src, /text\.selectFolder/);
  assert.match(src, /isCodeMode/);
});

test("index Create new skills card uses SkillDocumentIcon not spark string", () => {
  const src = readFileSync(join(root, "src/features/customize/CustomizePage.tsx"), "utf8");
  assert.match(src, /SkillDocumentIcon[\s\S]{0,400}text\.createNewSkills|text\.createNewSkills[\s\S]{0,400}SkillDocumentIcon/);
  // no CustomizeOptionCard icon="spark"
  assert.doesNotMatch(src, /CustomizeOptionCard[\s\S]{0,80}icon=["']spark["']/);
});
