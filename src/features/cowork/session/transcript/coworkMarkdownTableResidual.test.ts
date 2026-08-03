import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseCoworkMarkdown, parseCoworkPipeTable } from "./CoworkMarkdown";

const here = path.dirname(fileURLToPath(import.meta.url));
const markdownSource = readFileSync(path.join(here, "CoworkMarkdown.tsx"), "utf8");

/**
 * Cowork non-alluvium StandardMarkdown residual (official c5f4e1303 BD + c93 _e):
 * - remark() product path has no GFM table kind → parseTable recovers pipes
 * - DOM must match official table/th/td residual (overflow-x-auto wrapper + classes)
 *
 * Live bug (2026-08-03): singleTextValue-only gate dropped tables with **cells**
 * → final reply painted "| a | b |" as <p><br>.
 */
describe("CoworkMarkdown parseTable residual (non-alluvium final reply)", () => {
  it("locks official StandardMarkDown table shell classes (c5f4)", () => {
    expect(markdownSource).toMatch(/overflow-x-auto w-full px-2 mb-6/);
    expect(markdownSource).toMatch(
      /min-w-full border-collapse text-sm leading-\[1\.7\] whitespace-normal/,
    );
    expect(markdownSource).toMatch(
      /text-text-100 border-b-0\.5 border-border-300\/60 py-2 pr-4 align-top font-bold/,
    );
    expect(markdownSource).toMatch(
      /border-b-0\.5 border-border-300\/30 py-2 pr-4 align-top/,
    );
    expect(markdownSource).toMatch(/thead className="text-left"/);
    expect(markdownSource).toMatch(/scope="col"/);
  });

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
