import { describe, expect, it } from "vitest";
import { parseCoworkMarkdown, parseCoworkPipeTable } from "./CoworkMarkdown";

/**
 * Cowork non-alluvium StandardMarkdown residual: remark() has no GFM table kind,
 * so assistant paragraphs that look like pipe tables are recovered via parseTable
 * on the full paragraph source (including inline **bold** markers).
 *
 * Live bug (2026-08-03): singleTextValue-only gate dropped tables with **cells**
 * → final reply painted "| a | b |" as <p><br>.
 */
describe("CoworkMarkdown parseTable residual (non-alluvium final reply)", () => {
  it("plain pipe table is a single paragraph in remark AST (no table kind)", () => {
    const src = "| 项 | 值 |\n|----|-----|\n| Run | a |\n";
    const root = parseCoworkMarkdown(src);
    expect(root.children.every((n) => n.type !== "table")).toBe(true);
    expect(root.children.some((n) => n.type === "paragraph")).toBe(true);
    expect(parseCoworkPipeTable(src.trim())).toBeTruthy();
  });

  it("pipe table with bold cells still lands as one paragraph (mixed children)", () => {
    const src =
      "| 角色 | 身份 |\n|------|------|\n| 🐼 **熊猫** | 主助手 |\n| 🐰 **Picowhisk** | 伴聊 |\n";
    const root = parseCoworkMarkdown(src);
    const para = root.children.find((n) => n.type === "paragraph");
    expect(para?.type).toBe("paragraph");
    if (para?.type !== "paragraph") return;
    // Bold splits paragraph — not a single text node (the old singleTextValue gate).
    expect(para.children.some((c) => c.type === "strong")).toBe(true);
    expect(para.children.length).toBeGreaterThan(1);

    // Full source must still parse as a pipe table (fix path).
    const start = para.position?.start.offset ?? 0;
    const end = para.position?.end.offset ?? src.length;
    const recovered = src.slice(start, end);
    const table = parseCoworkPipeTable(recovered);
    expect(table).toBeTruthy();
    expect(table?.[0]).toEqual(["角色", "身份"]);
    expect(table?.length).toBe(4); // header + delimiter + 2 body rows
  });

  it("singleTextValue-only would miss bold tables; nodeSource recovers them", () => {
    const src =
      "| a | b |\n|---|---|\n| **x** | y |\n";
    const root = parseCoworkMarkdown(src);
    const para = root.children.find((n) => n.type === "paragraph");
    if (para?.type !== "paragraph") throw new Error("expected paragraph");
    const singleText =
      para.children.length === 1 && para.children[0].type === "text"
        ? para.children[0].value
        : undefined;
    expect(singleText).toBeUndefined(); // old gate fails
    const recovered = src.slice(para.position!.start.offset!, para.position!.end.offset!);
    expect(parseCoworkPipeTable(recovered)).toBeTruthy();
  });
});
