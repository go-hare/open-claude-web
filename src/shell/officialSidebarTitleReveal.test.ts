import { describe, expect, it } from "vitest";
import {
  isOfficialSidebarTitlePending,
  OFFICIAL_SIDEBAR_TITLE_REVEAL_HOLD_MS,
  TITLE_REVEAL_HOLD_MS,
} from "./officialSidebarTitleReveal";

describe("officialSidebarTitleReveal", () => {
  it("matches residual Ja hold (1500ms)", () => {
    expect(TITLE_REVEAL_HOLD_MS).toBe(1500);
    expect(OFFICIAL_SIDEBAR_TITLE_REVEAL_HOLD_MS).toBe(TITLE_REVEAL_HOLD_MS);
  });

  it("treats coding placeholders as pending (Ht product map)", () => {
    expect(isOfficialSidebarTitlePending("General coding session")).toBe(true);
    expect(isOfficialSidebarTitlePending("Coding session")).toBe(true);
    expect(isOfficialSidebarTitlePending("Untitled")).toBe(true);
    expect(isOfficialSidebarTitlePending("Untitled session")).toBe(true);
    expect(isOfficialSidebarTitlePending("New session")).toBe(true);
    expect(isOfficialSidebarTitlePending("")).toBe(true);
    expect(isOfficialSidebarTitlePending(null)).toBe(true);
    expect(isOfficialSidebarTitlePending(undefined)).toBe(true);
  });

  it("does not treat real auto/user titles as pending", () => {
    expect(isOfficialSidebarTitlePending("Fix login redirect")).toBe(false);
    expect(isOfficialSidebarTitlePending("1")).toBe(false);
    expect(isOfficialSidebarTitlePending("Refactor sidebar title typewriter")).toBe(false);
  });
});
