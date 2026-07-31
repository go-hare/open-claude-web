import { afterEach, describe, expect, it, vi } from "vitest";
import {
  configureCoworkMarkdownFeatureEvaluator,
  evaluateCoworkMarkdownFeature,
} from "./CoworkAssistantMarkdown";

function stubWindow(partial: Record<string, unknown>) {
  vi.stubGlobal("window", {
    location: { search: "" },
    localStorage: {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
    },
    ...partial,
  });
}

describe("evaluateCoworkMarkdownFeature residual gates", () => {
  afterEach(() => {
    configureCoworkMarkdownFeatureEvaluator(undefined);
    vi.unstubAllGlobals();
  });

  it("prefers injected evaluator over bootstrap", () => {
    configureCoworkMarkdownFeatureEvaluator((feature) => feature === "claude_ai_alluvium_main");
    expect(evaluateCoworkMarkdownFeature("claude_ai_alluvium_main")).toBe(true);
    expect(evaluateCoworkMarkdownFeature("claudeai_streaming_fade_in_main")).toBe(false);
  });

  it("reads gb_local_overrides when no inject", () => {
    stubWindow({
      localStorage: {
        getItem: (key: string) =>
          key === "gb_local_overrides"
            ? JSON.stringify({ claude_ai_alluvium_main: true })
            : null,
        setItem: () => undefined,
        removeItem: () => undefined,
      },
    });
    expect(evaluateCoworkMarkdownFeature("claude_ai_alluvium_main")).toBe(true);
  });

  it("reads bootstrap feature_flags residual", () => {
    stubWindow({
      __CLAUDE_BOOTSTRAP__: {
        feature_flags: {
          claude_ai_alluvium_main: true,
          claudeai_streaming_fade_in_main: false,
        },
      },
    });
    expect(evaluateCoworkMarkdownFeature("claude_ai_alluvium_main")).toBe(true);
    expect(evaluateCoworkMarkdownFeature("claudeai_streaming_fade_in_main")).toBe(false);
  });

  it("reads growthbook defaultValue bag residual", () => {
    stubWindow({
      __bootstrap: {
        growthbook: {
          features: {
            claude_ai_alluvium_main: { defaultValue: true },
          },
        },
      },
    });
    expect(evaluateCoworkMarkdownFeature("claude_ai_alluvium_main")).toBe(true);
  });

  it("returns undefined when no residual source", () => {
    stubWindow({
      __CLAUDE_BOOTSTRAP__: {},
      __bootstrap: undefined,
    });
    expect(evaluateCoworkMarkdownFeature("claude_ai_alluvium_main")).toBeUndefined();
  });
});
