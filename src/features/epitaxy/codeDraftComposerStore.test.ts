import { beforeEach, describe, expect, it, vi } from "vitest";

const { uuidRef } = vi.hoisted(() => ({
  uuidRef: { current: "acct-1" as string | undefined },
}));

vi.mock("./composer/usePermissionModeConfirm", () => ({
  bootstrapAccountUuidForStorage: () => uuidRef.current,
}));

import {
  epitaxyFolderPermissionModeStorageKey,
  getFolderPermissionMode,
  getLandingDraftPermissionMode,
  getLandingWorktreeEnabled,
  isSmPermissionMode,
  resetCodeDraftComposer,
  resolveDraftPermissionMode,
  setDraftPermissionMode,
  setLandingWorktreeEnabled,
  folderPermissionModeKey,
} from "./codeDraftComposerStore";

const mem = new Map<string, string>();

beforeEach(() => {
  mem.clear();
  uuidRef.current = "acct-1";
  resetCodeDraftComposer();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => {
      mem.set(k, v);
    },
    removeItem: (k: string) => {
      mem.delete(k);
    },
  });
});

describe("codeDraftComposerStore residual (c119 fc keys)", () => {
  it("Sm = auto|bypass only", () => {
    expect(isSmPermissionMode("auto")).toBe(true);
    expect(isSmPermissionMode("bypassPermissions")).toBe(true);
    expect(isSmPermissionMode("acceptEdits")).toBe(false);
    expect(isSmPermissionMode("default")).toBe(false);
    expect(isSmPermissionMode("plan")).toBe(false);
  });

  it("strips worktree suffix for folder key", () => {
    expect(folderPermissionModeKey("/repo/.claude/worktrees/foo")).toBe("/repo");
    expect(folderPermissionModeKey("/repo")).toBe("/repo");
  });

  it("landing default is acceptEdits when empty", () => {
    expect(getLandingDraftPermissionMode()).toBe("acceptEdits");
  });

  it("persist acceptEdits to landing + folder; remount resolves without override", () => {
    setDraftPermissionMode("acceptEdits", { cwd: "/repo" });
    resetCodeDraftComposer(); // leave/return / reset-draft clears only en
    expect(
      resolveDraftPermissionMode({
        cwd: "/repo",
        hostDefaultMode: "default",
        preferOverride: false,
      }),
    ).toBe("acceptEdits");
    expect(getFolderPermissionMode("/repo")).toBe("acceptEdits");
    expect(getLandingDraftPermissionMode()).toBe("acceptEdits");
  });

  it("bypass writes folder map but NOT landing sticky (official Sm)", () => {
    setDraftPermissionMode("acceptEdits", { cwd: "/repo" });
    setDraftPermissionMode("bypassPermissions", { cwd: "/repo" });
    resetCodeDraftComposer();
    // Folder map keeps bypass after remount.
    expect(
      resolveDraftPermissionMode({
        cwd: "/repo",
        hostDefaultMode: "default",
        preferOverride: false,
      }),
    ).toBe("bypassPermissions");
    // Landing stays previous non-Sm (acceptEdits), not bypass.
    expect(getLandingDraftPermissionMode()).toBe("acceptEdits");
  });

  it("folder map beats host defaultMode", () => {
    setDraftPermissionMode("plan", { cwd: "/repo" });
    resetCodeDraftComposer();
    expect(
      resolveDraftPermissionMode({
        cwd: "/repo",
        hostDefaultMode: "default",
        preferOverride: false,
      }),
    ).toBe("plan");
  });

  it("host default used only when no folder/landing preference beyond landing default", () => {
    // Fresh storage: landing default acceptEdits wins over host default when no folder —
    // official rn = en ?? Zs ?? Gs ?? $s → $s is acceptEdits so Gs only if $s missing.
    // Product mirrors: landing default is always present ($s), so host is only used when
    // landing was never written AND no folder — but official default $s is acceptEdits.
    // When host is auto and landing is still factory acceptEdits with no folder:
    // official still prefers $s (acceptEdits) over Gs unless user never had sticky…
    // Residual: rn = en ?? Zs ?? Gs ?? $s — Gs is checked BEFORE $s.
    expect(
      resolveDraftPermissionMode({
        cwd: "/other",
        hostDefaultMode: "auto",
        preferOverride: false,
      }),
    ).toBe("auto");
  });

  it("reset-draft does not wipe folder map", () => {
    setDraftPermissionMode("bypassPermissions", { cwd: "/repo" });
    resetCodeDraftComposer();
    expect(getFolderPermissionMode("/repo")).toBe("bypassPermissions");
  });

  it("folder map writes account-scoped key (official fc scope:account)", () => {
    setDraftPermissionMode("plan", { cwd: "/repo" });
    expect(epitaxyFolderPermissionModeStorageKey("acct-1")).toBe(
      "persisted.epitaxy-folder-permission-mode.acct-1",
    );
    expect(mem.get("persisted.epitaxy-folder-permission-mode.acct-1")).toContain("/repo");
    expect(mem.get("persisted.epitaxy-folder-permission-mode")).toBeUndefined();
  });

  it("account scope without uuid does not write folder map", () => {
    uuidRef.current = undefined;
    setDraftPermissionMode("plan", { cwd: "/repo" });
    expect(getFolderPermissionMode("/repo")).toBeUndefined();
    expect(mem.get("persisted.epitaxy-folder-permission-mode")).toBeUndefined();
    expect(mem.get("persisted.epitaxy-folder-permission-mode.acct-1")).toBeUndefined();
  });

  it("migrates legacy bare folder map into account-scoped key", () => {
    mem.set("persisted.epitaxy-folder-permission-mode", JSON.stringify({ "/repo": "plan" }));
    expect(getFolderPermissionMode("/repo")).toBe("plan");
    expect(mem.get("persisted.epitaxy-folder-permission-mode.acct-1")).toContain("/repo");
  });

  it("landing worktree sticky defaults true and persists", () => {
    expect(getLandingWorktreeEnabled()).toBe(true);
    setLandingWorktreeEnabled(false);
    expect(getLandingWorktreeEnabled()).toBe(false);
    expect(mem.get("persisted.cc-landing-worktree-enabled")).toBe("false");
    setLandingWorktreeEnabled(true);
    expect(getLandingWorktreeEnabled()).toBe(true);
  });
});
