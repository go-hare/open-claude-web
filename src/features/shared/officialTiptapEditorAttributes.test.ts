import { describe, expect, it } from "vitest";
import { officialTiptapEditorAttributes } from "./officialTiptapEditorAttributes";

describe("officialTiptapEditorAttributes", () => {
  it("injects TipTap createView default role=textbox", () => {
    expect(
      officialTiptapEditorAttributes({
        "aria-label": "Prompt",
        class: "tiptap",
        enterkeyhint: "enter",
      }),
    ).toEqual({
      role: "textbox",
      "aria-label": "Prompt",
      class: "tiptap",
      enterkeyhint: "enter",
    });
  });

  it("lets extra attributes override role (createView merge order)", () => {
    expect(officialTiptapEditorAttributes({ role: "combobox" })).toEqual({
      role: "combobox",
    });
  });
});
