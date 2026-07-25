import { describe, expect, it } from "vitest";
import {
  codeModelSelectorItems,
  coworkModelSelectorItems,
  formatCoworkModelDisplayName,
  normalizeSelectorModelValue,
  resolveCoworkModelsConfig,
} from "./useCoworkModelOptions";

describe("formatCoworkModelDisplayName (Fee/Hee residual)", () => {
  it("formats claude opus ids", () => {
    expect(formatCoworkModelDisplayName("claude-opus-4-20250514")).toBe("Opus 4");
  });

  it("formats deepseek bag model ids", () => {
    expect(formatCoworkModelDisplayName("deepseek-v4-pro")).toBe("Deepseek 4 Pro");
  });
});

describe("resolveCoworkModelsConfig (u2/ote residual)", () => {
  it("reads claude_ai_bootstrap_models_config from account membership org", () => {
    const bootstrap = {
      account: {
        memberships: [
          {
            organization: {
              claude_ai_bootstrap_models_config: [
                { model: "deepseek-v4-pro", name: "deepseek-v4-pro" },
              ],
            },
          },
        ],
      },
      growthbook: {
        features: {
          cowork_model: {
            defaultValue: {
              // Official modelFeatureConfig includes both base and `${id}[1m]` in allowed_models.
              allowed_models: ["deepseek-v4-pro", "deepseek-v4-pro[1m]"],
              model: "deepseek-v4-pro",
              supports_1m_context: ["deepseek-v4-pro"],
              synthetic_allowed_models: {},
            },
          },
        },
      },
    };
    const config = resolveCoworkModelsConfig(bootstrap);
    expect(config.defaultModel).toBe("deepseek-v4-pro");
    expect(config.allModelOptions.map((item) => item.model)).toEqual([
      "deepseek-v4-pro",
      "deepseek-v4-pro[1m]",
    ]);
    const items = coworkModelSelectorItems(config);
    expect(items[0]).toEqual({ value: "default", label: "Default model" });
    expect(items.some((item) => item.value === "deepseek-v4-pro")).toBe(true);
    // Fee/Hee residual: raw bag name===id still displays as Deepseek 4 Pro, not raw id / Opus.
    expect(items.find((item) => item.value === "deepseek-v4-pro")?.label).toBe("Deepseek 4 Pro");
    expect(items.find((item) => item.value === "deepseek-v4-pro[1m]")?.label).toBe("Deepseek 4 Pro 1M");
    expect(items.some((item) => item.value === "claude-opus-4")).toBe(false);
  });

  it("does not invent Anthropic Sonnet/Opus when bootstrap empty", () => {
    const config = resolveCoworkModelsConfig({});
    expect(config.allModelOptions).toEqual([]);
    expect(coworkModelSelectorItems(config)).toEqual([
      { value: "default", label: "Default model" },
    ]);
  });

  it("code Models menu uses Default label + bag models via ccr_model (Ye residual)", () => {
    const bootstrap = {
      account: {
        memberships: [
          {
            organization: {
              claude_ai_bootstrap_models_config: [
                { model: "deepseek-v4-pro", name: "deepseek-v4-pro" },
              ],
            },
          },
        ],
      },
      growthbook: {
        features: {
          ccr_model: {
            defaultValue: {
              allowed_models: ["deepseek-v4-pro", "deepseek-v4-pro[1m]"],
              model: "deepseek-v4-pro",
              supports_1m_context: ["deepseek-v4-pro"],
              synthetic_allowed_models: {},
            },
          },
        },
      },
    };
    const config = resolveCoworkModelsConfig(bootstrap, ["ccr_model", "cowork_model"]);
    const items = codeModelSelectorItems(config);
    expect(items[0]).toEqual({ value: "default", label: "Default" });
    expect(items.map((item) => item.label)).toEqual([
      "Default",
      "Deepseek 4 Pro",
      "Deepseek 4 Pro 1M",
    ]);
    expect(items.some((item) => item.label === "Sonnet" || item.label === "Opus")).toBe(false);
  });
});

describe("normalizeSelectorModelValue", () => {
  it("maps shell-leaked grok/kimi to default when bag list present", () => {
    expect(normalizeSelectorModelValue("grok-4.5", ["default", "deepseek-v4-pro"])).toBe("default");
    expect(normalizeSelectorModelValue("kimi-k3", ["default", "deepseek-v4-pro"])).toBe("default");
    expect(normalizeSelectorModelValue("sonnet", ["default", "deepseek-v4-pro"])).toBe("default");
    expect(normalizeSelectorModelValue("deepseek-v4-pro", ["default", "deepseek-v4-pro"])).toBe(
      "deepseek-v4-pro",
    );
  });
});
