import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Official $l empty Jl (c63a78ed4): Add skill → re → F(true) → Ol "New skill".
 * Directory `$T` remaps skills→plugins; empty Add skill must not openDirectory.
 */
const dir = dirname(fileURLToPath(import.meta.url));

function readSrc(name: string): string {
  return readFileSync(join(dir, name), "utf8");
}

describe("Skills empty Add skill residual (c63a78ed4 $l / Ol)", () => {
  it("empty Jl Add skill opens Ol, not Directory", () => {
    const route = readSrc("SkillsRoute.tsx");
    expect(route).toContain("onClick={openCreation}");
    expect(route).toContain("<NewSkillModal");
    expect(route).not.toMatch(/isGlobalEmpty[\s\S]*onClick=\{onBrowseSkills\}/);
  });

  it("Ol is New skill with zip/skill/md upload, not S7t plugin zip", () => {
    const modal = readSrc("NewSkillModal.tsx");
    expect(modal).toContain("New skill");
    expect(modal).toContain("Import a .zip, .skill, or .md file");
    expect(modal).not.toContain("uploadLocalPlugin");
    expect(modal).not.toContain("PluginUploadModal");
    const upload = readSrc("UploadSkillModal.tsx");
    expect(upload).toContain('accept=".zip,.skill,.md"');
    expect(upload).toContain("Upload skill");
    const write = readSrc("WriteSkillInstructionsModal.tsx");
    expect(write).toContain("Write skill instructions");
    const route = readSrc("SkillsRoute.tsx");
    expect(route).toContain("<WriteSkillInstructionsModal");
    expect(route).toContain("<UploadSkillModal");
    expect(route).toContain("onWriteFromModal");
    expect(route).toContain("onUploadFromModal");
    expect(route).not.toContain("openDirectory");
    expect(route).toContain("<UserSkillDetailPanel");
    expect(route).not.toContain("hideTryButton");
    const detail = readSrc("UserSkillDetailPanel.tsx");
    expect(detail).toContain("CoworkAssistantMarkdown");
    expect(detail).toContain("font-claude-response");
    expect(detail).toContain("SkillBodyPreview");
    expect(detail).toContain("isLoadingFiles");
    expect(detail).toContain("loadUserSkillFiles");
    expect(detail).not.toContain("{instructions.replace(/\\\\n/g, \"\\n\")}</p>");
  });

  it("Pe / Te: Enable + Try in chat + Edit + Replace + Uninstall", () => {
    const detail = readSrc("UserSkillDetailPanel.tsx");
    expect(detail).toContain("Enable skill");
    expect(detail).toContain("<SkillActionsDropdown");
    expect(detail).toContain("<OfficialSwitch");
    const te = readSrc("SkillActionsDropdown.tsx");
    expect(te).toContain("Try in chat");
    expect(te).toContain("Enable skill to try in chat");
    expect(te).toContain("Edit");
    expect(te).toContain("Replace");
    expect(te).toContain("Show in Folder");
    expect(te).toContain("Uninstall");
    expect(te).toContain("danger");
    const route = readSrc("SkillsRoute.tsx");
    expect(route).toContain("revealLocalSkill");
    expect(route).toContain("setUserSkillEnabled");
    expect(route).toContain("removeUserSkill");
    expect(route).toContain("Uninstall skill?");
    expect(route).toContain("You can always add this skill again later by re-uploading it.");
    expect(route).toContain("skillToEdit");
    const write = readSrc("WriteSkillInstructionsModal.tsx");
    expect(write).toContain("Edit skill instructions");
  });

  it("Bl Personal skills keeps disabled rows", () => {
    const sidebar = readSrc("SkillsPageSidebar.tsx");
    expect(sidebar).not.toContain("return skill.enabled");
    expect(sidebar).toContain("isEnabled={skill.enabled}");
    expect(sidebar).toContain("filteredUserSkills");
    expect(sidebar).toContain("OfficialTextInput");
    expect(sidebar).toContain('placeholder="搜索"');
  });

  it("PLe / HLe persist via listLocalSkills IPC, not localStorage", () => {
    const store = readSrc("userSkillsStore.ts");
    expect(store).toContain("listLocalSkills");
    expect(store).toContain("saveLocalSkill");
    expect(store).toContain("setLocalSkillEnabled");
    expect(store).toContain("deleteLocalSkill");
    expect(store).toContain("getLocalSkillFiles");
    expect(store).toContain("invalidateUserSkillFiles");
    expect(store).not.toContain("open-claude.customize.user-skills.v1");
  });
});
