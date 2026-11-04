import { describe, expect, it } from "vitest";
import { officialCodeComposerDictationEnabled } from "./officialCodeComposerDictation";

describe("officialCodeComposerDictationEnabled (c119 Jr / rbt)", () => {
  it("3p bootstrap without dictation flags is hidden", () => {
    expect(
      officialCodeComposerDictationEnabled(
        { growthbook: { features: { claudeai_skills: { defaultValue: true } } } },
        { desktop: true, pcm: true },
      ),
    ).toBe(false);
  });

  it("desktop needs desktop_dictation_voice", () => {
    expect(
      officialCodeComposerDictationEnabled(
        { growthbook: { features: { desktop_dictation_voice: { defaultValue: true } } } },
        { desktop: true, pcm: true },
      ),
    ).toBe(true);
    expect(
      officialCodeComposerDictationEnabled(
        { growthbook: { features: { desktop_dictation_voice: { defaultValue: true } } } },
        { desktop: true, pcm: false },
      ),
    ).toBe(false);
  });

  it("does not invent cai_voice_dictation_parity as Code desktop gate", () => {
    expect(
      officialCodeComposerDictationEnabled(
        { growthbook: { features: { cai_voice_dictation_parity: { defaultValue: true } } } },
        { desktop: true, pcm: true },
      ),
    ).toBe(false);
  });
});
