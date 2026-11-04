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
    expect(write).toContain("Create a skill");
    expect(write).toContain('variant?: "page" | "overlay"');
    expect(upload).toContain("Add to library");
    expect(upload).toContain("extractSkillArchiveFiles");
    expect(upload).toContain("Review the skill contents before adding to your library.");
    expect(upload).toContain('data-cds="Dialog"');
    expect(upload).toContain("max-w-[520px]");
    expect(upload).toContain("border-strong");
    expect(upload).toContain("p-xl");
    expect(upload).not.toContain("<OfficialModal");
    expect(upload).not.toContain('from "../../shared/OfficialModal"');
    const add = readSrc("AddSkillDropdown.tsx");
    expect(add).toContain("CREATE_SKILL_WITH_CLAUDE_ENABLED");
    expect(add).toContain("h-control");
    expect(add).toContain("bg-fill-primary");
    expect(add).toContain("data-cds-part=\"paint\"");
    expect(add).not.toContain("officialButtonClass");
    const content = readSrc("../../settings/PersonalSettingsContent.tsx");
    expect(content).toContain("Let's create a skill together using your skill-creator skill");
    const route = readSrc("SkillsRoute.tsx");
    expect(route).toContain("<WriteSkillInstructionsModal");
    expect(route).toContain("<UploadSkillModal");
    expect(route).toContain("<UploadSkillPage");
    expect(route).toContain("onWriteFromModal");
    expect(route).toContain("onUploadFromModal");
    const page = readSrc("UploadSkillPage.tsx");
    expect(page).toContain("Add a skill to your workspace.");
    expect(page).toContain("Choose a file to continue.");
    expect(page).toContain("Drag and drop skill files here, or browse");
    expect(page).toContain('data-testid="skill-upload"');
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

  it("overlay Ar: title-only header, search n3VpmrDQYa, primary Add, first-run $e, no builtins", () => {
    const sidebar = readSrc("SkillsPageSidebar.tsx");
    expect(sidebar).toContain('layout === "overlay"');
    expect(sidebar).toContain('placeholder="Search skills and plugins"');
    expect(sidebar).toContain("w-full max-w-md");
    expect(sidebar).toContain("variant=\"overlay\"");
    expect(sidebar).toContain("Add your first skills");
    expect(sidebar).toContain("Skills teach Claude how you work.");
    expect(sidebar).toContain('data-testid="tabbed-list-first-run"');
    expect(sidebar).toContain("ObjectPaperAirplane");
    expect(sidebar).toContain("overlayMineEmpty");
    expect(sidebar).toContain("hasBuiltIns && userSkills.length > 0");
    const overlayBlock = sidebar.slice(sidebar.indexOf("if (layout === \"overlay\")"));
    const headerOpen = overlayBlock.indexOf("<header");
    const headerClose = overlayBlock.indexOf("</header>");
    expect(headerOpen).toBeGreaterThan(-1);
    expect(headerClose).toBeGreaterThan(headerOpen);
    const header = overlayBlock.slice(headerOpen, headerClose);
    expect(header).toContain("justify-center");
    expect(header).toContain("flex-1");
    expect(header).toContain("max-w-md");
    expect(header).toContain("Search skills and plugins");
    expect(header).not.toContain("ml-auto");
    expect(header).not.toContain("Tabs.Root");
    expect(header).not.toContain("skills-tabbed-list-tab-mine");
    expect(overlayBlock.slice(headerClose)).toContain("skills-tabbed-list-tab-mine");
    expect(overlayBlock.slice(headerClose)).toContain("OVERLAY_SKILLS_TAB_CLASS");
    expect(sidebar).toContain("bg-fill-ghost-hover");
    const add = readSrc("AddSkillDropdown.tsx");
    expect(add).toContain('variant?: "page" | "overlay"');
    expect(add).toContain("Upload skill");
    expect(add).toContain("Create a skill");
    expect(add).toContain("Create with Claude");
    expect(add).toContain("alWu/MbgXB");
    const plane = readSrc("ObjectPaperAirplane.tsx");
    expect(plane).toContain("cde885a6d");
    expect(plane).toContain("m248.78 342.979");
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
