import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const listMock = vi.fn();
const saveMock = vi.fn();
const filesMock = vi.fn();
const enabledMock = vi.fn();
const deleteMock = vi.fn();

vi.mock("../../../adapters/desktopBridge", () => ({
  desktopBridge: {
    LocalAgentModeSessions: {
      listLocalSkills: (...args: unknown[]) => listMock(...args),
      saveLocalSkill: (...args: unknown[]) => saveMock(...args),
      getLocalSkillFiles: (...args: unknown[]) => filesMock(...args),
      setLocalSkillEnabled: (...args: unknown[]) => enabledMock(...args),
      deleteLocalSkill: (...args: unknown[]) => deleteMock(...args),
    },
  },
}));

import {
  getUserSkillFiles,
  hydrateUserSkills,
  invalidateUserSkillFiles,
  isUserSkillFilesLoading,
  loadUserSkillFiles,
  loadUserSkillInstructions,
  resetUserSkillsStoreForTests,
  upsertUserSkill,
} from "./userSkillsStore";

const SKILL_MD = `---
name: "teambition"
description: "Teambition MCP"
---

Call the tools.
`;

describe("YLe files query vs PLe list hydrate (index-BELzQL5P)", () => {
  beforeEach(() => {
    resetUserSkillsStoreForTests();
    listMock.mockReset();
    saveMock.mockReset();
    filesMock.mockReset();
    enabledMock.mockReset();
    deleteMock.mockReset();
    listMock.mockResolvedValue([
      {
        skillId: "teambition",
        name: "teambition",
        description: "Teambition MCP",
        enabled: true,
      },
    ]);
    saveMock.mockResolvedValue({ ok: true });
    filesMock.mockResolvedValue([{ path: "SKILL.md", content: SKILL_MD }]);
  });

  afterEach(() => {
    resetUserSkillsStoreForTests();
  });

  it("list hydrate does not wipe SKILL.md files cache", async () => {
    await loadUserSkillFiles("teambition");
    expect(getUserSkillFiles("teambition")[0]?.content).toContain("Call the tools.");
    await hydrateUserSkills();
    expect(getUserSkillFiles("teambition")[0]?.content).toContain("Call the tools.");
    expect(filesMock).toHaveBeenCalledTimes(1);
  });

  it("upsert invalidates files so a later getLocalSkillFiles fills the body", async () => {
    let resolveFiles: (value: unknown) => void = () => {};
    filesMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFiles = resolve;
        }),
    );
    const saved = await upsertUserSkill({
      skillName: "teambition",
      description: "Teambition MCP",
      instructions: "Call the tools.",
    });
    expect(saved.skillId).toBe("teambition");
    expect(isUserSkillFilesLoading("teambition")).toBe(true);
    expect(getUserSkillFiles("teambition")).toEqual([]);
    resolveFiles([{ path: "SKILL.md", content: SKILL_MD }]);
    await loadUserSkillFiles("teambition");
    expect(isUserSkillFilesLoading("teambition")).toBe(false);
    expect(await loadUserSkillInstructions("teambition")).toBe("Call the tools.");
  });

  it("invalidate after hydrate still refetches files (ULe / QLe)", async () => {
    await loadUserSkillFiles("teambition");
    filesMock.mockClear();
    filesMock.mockResolvedValue([
      { path: "SKILL.md", content: SKILL_MD.replace("Call the tools.", "Updated body.") },
    ]);
    await hydrateUserSkills();
    invalidateUserSkillFiles("teambition");
    await loadUserSkillFiles("teambition");
    expect(filesMock).toHaveBeenCalled();
    expect(await loadUserSkillInstructions("teambition")).toBe("Updated body.");
  });
});
