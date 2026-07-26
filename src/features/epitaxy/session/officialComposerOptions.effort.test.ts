import { describe, expect, it, vi } from "vitest";
import { buildOfficialEffortMenuItems, normalizeEffortValue } from "./officialComposerOptions";

describe("buildOfficialEffortMenuItems", () => {
  it("checks ladder level when not ultracode", () => {
    const onSelect = vi.fn();
    const items = buildOfficialEffortMenuItems({ current: "high", ultracode: false, onSelect });
    expect(items.map((item) => item.value)).toEqual(["low", "medium", "high", "xhigh", "max", "ultra"]);
    expect(items.find((item) => item.value === "high")?.checked).toBe(true);
    expect(items.find((item) => item.value === "ultra")?.checked).toBe(false);
    expect(items.find((item) => item.value === "ultra")?.accent).toBe(true);
  });

  it("checks ultracode stop and selects xhigh+ultracode", () => {
    const onSelect = vi.fn();
    const items = buildOfficialEffortMenuItems({ current: "xhigh", ultracode: true, onSelect });
    const ultra = items.find((item) => item.value === "ultra");
    expect(ultra?.checked).toBe(true);
    expect(items.filter((item) => item.checked)).toHaveLength(1);
    ultra?.onSelect();
    expect(onSelect).toHaveBeenCalledWith("xhigh", true);
  });

  it("can hide ultracode stop", () => {
    const items = buildOfficialEffortMenuItems({
      current: "medium",
      ultracode: false,
      showUltracode: false,
      onSelect: () => undefined,
    });
    expect(items.some((item) => item.value === "ultra")).toBe(false);
  });

  it("filters ladder to CLI applied.effortLevels (deepseek-v4-pro high|max)", () => {
    const items = buildOfficialEffortMenuItems({
      current: "high",
      ultracode: false,
      effortLevels: ["high", "max"],
      onSelect: () => undefined,
    });
    expect(items.map((item) => item.value)).toEqual(["high", "max", "ultra"]);
    expect(items.find((item) => item.value === "high")?.checked).toBe(true);
  });

  it("keeps full ladder when effortLevels null (CLI not reported)", () => {
    const items = buildOfficialEffortMenuItems({
      current: "low",
      ultracode: false,
      effortLevels: null,
      onSelect: () => undefined,
    });
    expect(items.map((item) => item.value)).toEqual(["low", "medium", "high", "xhigh", "max", "ultra"]);
  });
});

describe("normalizeEffortValue", () => {
  it("maps ultracode wire value to xhigh ladder", () => {
    expect(normalizeEffortValue("ultracode")).toBe("xhigh");
  });
});
