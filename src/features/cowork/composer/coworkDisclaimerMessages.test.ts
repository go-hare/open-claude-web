import { describe, expect, it } from "vitest";
import {
  buildCoworkDisclaimerText,
  splitDisclaimerFeedbackTemplate,
} from "./coworkDisclaimerMessages";

describe("buildCoworkDisclaimerText", () => {
  it("uses catalog ids when present", () => {
    const text = buildCoworkDisclaimerText({
      Hz3uf5n9Ga: "Claude 是 AI，可能会出错。请务必再次核对回复内容。",
      JyEEg0ExZX: "Claude 是 AI，可能会出错。请务必再次核对回复内容。{giveFeedback}",
      "aQPexOUJ+Y": "向我们反馈",
    });
    expect(text.base).toContain("可能会出错");
    expect(text.withFeedback).toContain("{giveFeedback}");
    expect(text.giveFeedback).toBe("向我们反馈");
  });

  it("falls back to English defaultMessage when catalog missing", () => {
    const text = buildCoworkDisclaimerText({});
    expect(text.base).toMatch(/can make mistakes/);
    expect(text.giveFeedback).toBe("Give us feedback");
  });
});

describe("splitDisclaimerFeedbackTemplate", () => {
  it("splits ICU placeholder for embedded CTA", () => {
    const parts = splitDisclaimerFeedbackTemplate(
      "Claude 是 AI，可能会出错。请务必再次核对回复内容。{giveFeedback}",
    );
    expect(parts.before).toBe("Claude 是 AI，可能会出错。请务必再次核对回复内容。");
    expect(parts.after).toBe("");
  });

  it("keeps trailing text after CTA token", () => {
    const parts = splitDisclaimerFeedbackTemplate("A {giveFeedback} B");
    expect(parts.before).toBe("A ");
    expect(parts.after).toBe(" B");
  });

  it("appends space when catalog omits placeholder", () => {
    const parts = splitDisclaimerFeedbackTemplate("Base only.");
    expect(parts.before).toBe("Base only. ");
    expect(parts.after).toBe("");
  });
});
