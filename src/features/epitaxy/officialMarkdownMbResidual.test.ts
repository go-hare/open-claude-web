import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  looksLikeOfficialLocalPathHref,
  needsOfficialBrSplit,
  officialMarkdownSanitizeUrl,
  officialMarkdownUrlTransform,
  parseOfficialFileRef,
  splitOfficialBrMarkers,
} from "./officialMarkdownMbResidual";

const here = path.dirname(fileURLToPath(import.meta.url));
const markdownSource = readFileSync(path.join(here, "OfficialCodeMarkdown.tsx"), "utf8");

describe("official mb residual helpers (c119 hb/ob/yl)", () => {
  it("urlTransform strips javascript: and unknown schemes (official bl)", () => {
    expect(officialMarkdownUrlTransform("javascript:alert(1)")).toBe("");
    expect(officialMarkdownUrlTransform("vbscript:x")).toBe("");
    expect(officialMarkdownSanitizeUrl("javascript:alert(1)")).toBe("");
  });

  it("urlTransform allows https/http/mailto/irc and fragments", () => {
    expect(officialMarkdownUrlTransform("https://example.com")).toBe("https://example.com");
    expect(officialMarkdownUrlTransform("http://example.com")).toBe("http://example.com");
    expect(officialMarkdownUrlTransform("mailto:a@b.c")).toBe("mailto:a@b.c");
    expect(officialMarkdownUrlTransform("#section")).toBe("#section");
  });

  it("urlTransform allows no-scheme paths for db file bridge", () => {
    expect(officialMarkdownUrlTransform("./src/foo.ts")).toBe("./src/foo.ts");
    expect(officialMarkdownUrlTransform("/abs/path.ts")).toBe("/abs/path.ts");
  });

  it("urlTransform passes img src data/blob/http only when node is img", () => {
    expect(
      officialMarkdownUrlTransform("data:image/png;base64,xx", "src", { tagName: "img" }),
    ).toBe("data:image/png;base64,xx");
    expect(
      officialMarkdownUrlTransform("blob:https://x/1", "src", { tagName: "img" }),
    ).toBe("blob:https://x/1");
    // Official hb does not bypass when node is null — still bl-sanitize.
    expect(officialMarkdownUrlTransform("javascript:alert(1)", "src", null)).toBe("");
    expect(officialMarkdownUrlTransform("javascript:alert(1)", "src")).toBe("");
  });

  it("parseOfficialFileRef matches path and optional :line", () => {
    expect(parseOfficialFileRef("src/foo.ts")).toEqual({ path: "src/foo.ts", line: undefined });
    expect(parseOfficialFileRef("src/foo.ts:12")).toEqual({ path: "src/foo.ts", line: 12 });
    expect(parseOfficialFileRef("not a path")).toBeNull();
    expect(parseOfficialFileRef("https://example.com")).toBeNull();
  });

  it("looksLikeOfficialLocalPathHref rejects remote schemes", () => {
    expect(looksLikeOfficialLocalPathHref("https://x")).toBe(false);
    expect(looksLikeOfficialLocalPathHref("src/a.ts")).toBe(true);
    expect(looksLikeOfficialLocalPathHref("./rel.ts")).toBe(true);
  });

  it("yl/BP splits literal <br> markers", () => {
    expect(needsOfficialBrSplit("a<br>b")).toBe(true);
    expect(splitOfficialBrMarkers("a<br>b")).toEqual(["a", { br: true }, "b"]);
    expect(splitOfficialBrMarkers("plain")).toEqual(["plain"]);
  });
});

describe("OfficialCodeMarkdown mb residual locks", () => {
  it("drops simplified claim and keeps official mb key set only", () => {
    expect(markdownSource).not.toMatch(/simplified for local bridges/);
    expect(markdownSource).toMatch(/Official mb component map \(c11959232\) keys only/);
    for (const key of ["code", "pre", "a", "img", "table", "th", "td", "li", "input"]) {
      expect(markdownSource).toMatch(new RegExp(`${key}:\\s*OfficialMarkdown`));
    }
  });

  it("jb path keeps GFM table residual (overflow-x-auto + th/td yl)", () => {
    // Official mb: table → div.overflow-x-auto > table; th/td pass style + yl(children).
    expect(markdownSource).toMatch(/function OfficialMarkdownTable/);
    expect(markdownSource).toMatch(/className="overflow-x-auto"/);
    expect(markdownSource).toMatch(/function OfficialMarkdownTh/);
    expect(markdownSource).toMatch(/function OfficialMarkdownTd/);
    expect(markdownSource).toMatch(/renderOfficialBrChildren/);
    // remark-gfm always on jb chunk path (tables).
    expect(markdownSource).toMatch(/remarkGfm/);
    // Alluvium gate is residual evaluate === true only — no invent default true.
    expect(markdownSource).toMatch(
      /evaluateCoworkMarkdownFeature\("claude_ai_alluvium_main"\) === true/,
    );
    // Inline code must not spread react-markdown `node` onto DOM.
    expect(markdownSource).toMatch(/node\?: unknown/);
    expect(markdownSource).not.toMatch(/<code className=\{OFFICIAL_INLINE_CODE_CLASS\} \{\.\.\.rest\}/);
  });

  it("pb uses official border residual not effect-contrast-stroke", () => {
    expect(markdownSource).toMatch(
      /block max-w-full h-auto rounded-r4 border border-\[var\(--border-default\)\]/,
    );
    expect(markdownSource).not.toMatch(/effect-contrast-stroke/);
  });

  it("ab cacheKey is undefined while streaming", () => {
    expect(markdownSource).toMatch(/cacheKey = isStreaming \? undefined/);
  });

  it("checkbox uses official size m", () => {
    expect(markdownSource).toMatch(/CheckSelection" size="m"/);
  });
});
