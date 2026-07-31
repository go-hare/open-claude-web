import { describe, expect, it, vi } from "vitest";
import {
  buildOfficialEffortMenuItems,
  catalogTopEffort,
  clampEffortToCatalog,
  cliEffortLevelsForModel,
  normalizeEffortValue,
  resolveDisplayEffortLevels,
} from "./officialComposerOptions";

describe("cliEffortLevelsForModel / resolveDisplayEffortLevels", () => {
  it("grok → low medium high (CLI catalog residual)", () => {
    expect(cliEffortLevelsForModel("grok-4.5")).toEqual(["low", "medium", "high"]);
  });

  it("deepseek → high max", () => {
    expect(cliEffortLevelsForModel("deepseek-v4-pro")).toEqual(["high", "max"]);
  });

  it("CLI applied list wins over model provisional", () => {
    expect(
      resolveDisplayEffortLevels(["high", "max"], "grok-4.5"),
    ).toEqual(["high", "max"]);
  });

  it("null CLI list uses model provisional — not invent 5-stop", () => {
    expect(resolveDisplayEffortLevels(null, "grok-4.5")).toEqual([
      "low",
      "medium",
      "high",
    ]);
    expect(resolveDisplayEffortLevels(null, "default")).toEqual([
      "low",
      "medium",
      "high",
    ]);
  });
});

describe("buildOfficialEffortMenuItems", () => {
  it("null effortLevels + grok model: 3 stops only (no Extra high flash)", () => {
    const items = buildOfficialEffortMenuItems({
      current: "medium",
      ultracode: false,
      effortLevels: null,
      model: "grok-4.5",
      onSelect: () => undefined,
    });
    expect(items.map((item) => item.value)).toEqual([
      "low",
      "medium",
      "high",
      "ultra",
    ]);
  });

  it("CLI full ladder when provided", () => {
    const onSelect = vi.fn();
    const items = buildOfficialEffortMenuItems({
      current: "high",
      ultracode: false,
      effortLevels: ["low", "medium", "high", "xhigh", "max"],
      model: "claude-opus-4-7",
      onSelect,
    });
    expect(items.map((item) => item.value)).toEqual([
      "low",
      "medium",
      "high",
      "xhigh",
      "max",
      "ultra",
    ]);
  });

  it("ultracode selects catalog top (full ladder → max)", () => {
    const onSelect = vi.fn();
    const items = buildOfficialEffortMenuItems({
      current: "xhigh",
      ultracode: true,
      effortLevels: ["low", "medium", "high", "xhigh", "max"],
      onSelect,
    });
    items.find((item) => item.value === "ultra")?.onSelect();
    expect(onSelect).toHaveBeenCalledWith("max", true);
  });

  it("grok Ultracode → high (not xhigh)", () => {
    const onSelect = vi.fn();
    const items = buildOfficialEffortMenuItems({
      current: "xhigh",
      ultracode: false,
      effortLevels: ["low", "medium", "high"],
      model: "grok-4.5",
      onSelect,
    });
    expect(items.find((item) => item.value === "high")?.checked).toBe(true);
    items.find((item) => item.value === "ultra")?.onSelect();
    expect(onSelect).toHaveBeenCalledWith("high", true);
  });

  it("can hide ultracode stop", () => {
    const items = buildOfficialEffortMenuItems({
      current: "medium",
      ultracode: false,
      showUltracode: false,
      effortLevels: ["low", "medium", "high"],
      onSelect: () => undefined,
    });
    expect(items.some((item) => item.value === "ultra")).toBe(false);
  });
});

describe("normalizeEffortValue / clamp / catalogTop", () => {
  it("maps ultracode wire value to xhigh ladder id (wire normalize only)", () => {
    expect(normalizeEffortValue("ultracode")).toBe("xhigh");
  });

  it("clamps xhigh to high for grok catalog", () => {
    expect(clampEffortToCatalog("xhigh", ["low", "medium", "high"])).toBe("high");
    expect(clampEffortToCatalog("max", ["low", "medium", "high"])).toBe("high");
    expect(clampEffortToCatalog("medium", ["low", "medium", "high"])).toBe("medium");
  });

  it("catalogTopEffort is last CLI stop", () => {
    expect(catalogTopEffort(["low", "medium", "high"])).toBe("high");
    expect(catalogTopEffort(["high", "max"])).toBe("max");
    expect(catalogTopEffort(null)).toBe("high");
  });
});
