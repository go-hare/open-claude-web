import { describe, expect, it } from "vitest";
import {
  descriptionHasXmlTags,
  extractSkillArchiveFiles,
  formatSkillMarkdown,
  isSkillUploadName,
  parseSkillMarkdown,
  reservedWordInName,
  sanitizeSkillName,
  skillMdFromArchive,
} from "./skillMd";

describe("skillMd residual (c0659e756 F / c4101dbe9 J)", () => {
  it("sanitizes skill names and blocks reserved words", () => {
    expect(sanitizeSkillName("Weekly Status Report")).toBe("weekly-status-report");
    expect(reservedWordInName("claude-helper")).toBe("claude");
    expect(reservedWordInName("weekly-status-report")).toBe(null);
  });

  it("parses YAML frontmatter SKILL.md", () => {
    const parsed = parseSkillMarkdown(
      "---\nname: weekly-status-report\ndescription: Summarize work.\n---\nDo the thing.\n",
    );
    expect(parsed).toEqual({
      name: "weekly-status-report",
      description: "Summarize work.",
      instructions: "Do the thing.",
    });
  });

  it("folds YAML > description instead of storing the > marker", () => {
    const parsed = parseSkillMarkdown(
      "---\nname: teambition\ndescription: >\n  Teambition MCP helpers.\n  Use when asked about tasks.\n---\nCall the tools.\n",
    );
    expect(parsed).toMatchObject({
      name: "teambition",
      description: "Teambition MCP helpers. Use when asked about tasks.",
      instructions: "Call the tools.",
    });
  });

  it("rejects xml in description and wrong extensions", () => {
    expect(descriptionHasXmlTags("hello <tool> x")).toBe(true);
    expect(isSkillUploadName("foo.zip")).toBe(true);
    expect(isSkillUploadName("foo.plugin")).toBe(false);
  });

  it("extracts zip SKILL.md for overlay Jn preview", async () => {
    const body = "---\nname: weekly-status-report\ndescription: Summarize work.\n---\nDo the thing.\n";
    const bytes = new TextEncoder().encode(body);
    const name = "SKILL.md";
    const nameBytes = new TextEncoder().encode(name);
    const header = new Uint8Array(30 + nameBytes.length + bytes.length);
    header.set([0x50, 0x4b, 0x03, 0x04], 0);
    header[26] = nameBytes.length;
    header[27] = 0;
    header[18] = bytes.length;
    header[19] = 0;
    header[22] = bytes.length;
    header[23] = 0;
    header.set(nameBytes, 30);
    header.set(bytes, 30 + nameBytes.length);
    const file = new File([header], "weekly.zip", { type: "application/zip" });
    const files = await extractSkillArchiveFiles(file);
    expect("error" in files).toBe(false);
    if ("error" in files) return;
    expect(skillMdFromArchive(files)).toContain("weekly-status-report");
  });

  it("HLe formats SKILL.md for saveLocalSkill", () => {
    const md = formatSkillMarkdown("weekly-status-report", 'Say "hi"', "Do it.");
    expect(md).toContain('name: "weekly-status-report"');
    expect(md).toContain('description: "Say \\"hi\\""');
    expect(md).toContain("Do it.");
  });
});
