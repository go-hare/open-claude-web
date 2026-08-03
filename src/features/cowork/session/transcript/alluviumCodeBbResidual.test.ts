import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const alluviumSource = readFileSync(path.join(here, "AlluviumMarkdown.tsx"), "utf8");
const codeMdSource = readFileSync(
  path.resolve(here, "../../../epitaxy/OfficialCodeMarkdown.tsx"),
  "utf8",
);

describe("Code Alluvium bb residual (font + format)", () => {
  it("Code variant uses bare tags not Cowork font-claude-response-body", () => {
    expect(alluviumSource).toMatch(/function CodeAlluviumBlockView/);
    expect(alluviumSource).toMatch(/Official Code `bb`/);
    // Cowork ye keeps the Claude.ai body font class; Code bb must not apply it.
    const codeBlockStart = alluviumSource.indexOf("function CodeAlluviumBlockView");
    const codeBlockEnd = alluviumSource.indexOf("function CoworkAlluviumBlockView");
    expect(codeBlockStart).toBeGreaterThan(-1);
    expect(codeBlockEnd).toBeGreaterThan(codeBlockStart);
    const codeBlock = alluviumSource.slice(codeBlockStart, codeBlockEnd);
    expect(codeBlock).not.toMatch(/font-claude-response-body/);
    expect(codeBlock).not.toMatch(/leading-\[1\.7\]/);
    expect(codeBlock).toMatch(/case "paragraph":[\s\S]*?<p>/);
    expect(codeBlock).toMatch(/case "hr":[\s\S]*?<hr \/>/);
    // Official bb format residual: bare heading tags, bare ol/ul/li, bare blockquote.
    expect(codeBlock).toMatch(/CODE_HEADING_TAGS/);
    expect(codeBlock).toMatch(/case "list":[\s\S]*?<ol start=\{block\.start\}>[\s\S]*?<ul>/);
    expect(codeBlock).toMatch(/case "blockquote":[\s\S]*?<blockquote>[\s\S]*?<p>/);
    // Fence: empty pre while !langSettled; else renderFence inject (ab/Ex).
    expect(codeBlock).toMatch(/!block\.langSettled/);
    expect(codeBlock).toMatch(/renderFence\(block\)/);
  });

  it("OfficialCodeMarkdown Alluvium path forces variant=code + fence inject", () => {
    expect(codeMdSource).toMatch(/variant="code"/);
    expect(codeMdSource).toMatch(/renderFence=\{renderOfficialCodeAlluviumFence\}/);
    expect(codeMdSource).toMatch(/OfficialAssistantCodeFence/);
    expect(codeMdSource).toMatch(/--family-ui/);
    expect(codeMdSource).toMatch(/className="epitaxy-markdown"/);
    expect(codeMdSource).toMatch(/dataAlluvium/);
    // Font claim locked: NOT Cowork ye body font.
    expect(codeMdSource).toMatch(/NOT Cowork ye font-claude-response-body/);
  });

  it("bb block switch has no table case (GFM tables are jb residual)", () => {
    // Official function bb(switch e.kind): paragraph|heading|list|blockquote|fence|hr only.
    const codeBlockStart = alluviumSource.indexOf("function CodeAlluviumBlockView");
    const codeBlockEnd = alluviumSource.indexOf("function CoworkAlluviumBlockView");
    const codeBlock = alluviumSource.slice(codeBlockStart, codeBlockEnd);
    expect(codeBlock).not.toMatch(/case "table"/);
    expect(codeBlock).toMatch(/case "paragraph"/);
    expect(codeBlock).toMatch(/case "fence"/);
    expect(codeBlock).toMatch(/case "hr"/);
  });

  it("Code inline residual ports ob file-ref + db/pb classes", () => {
    expect(alluviumSource).toMatch(/parseOfficialFileRef/);
    expect(alluviumSource).toMatch(/c11959232-h_zsw3wI\.js:ob\+ru/);
    expect(alluviumSource).toMatch(/epitaxy-open-file/);
    expect(alluviumSource).toMatch(
      /block max-w-full h-auto rounded-r4 border border-\[var\(--border-default\)\]/,
    );
    expect(alluviumSource).toMatch(
      /text-\[var\(--accent\)\] hover:underline underline-offset-\[1px\]/,
    );
  });

  it("Cowork ye residual still has font-claude-response-body", () => {
    const coworkStart = alluviumSource.indexOf("function CoworkAlluviumBlockView");
    const coworkBlock = alluviumSource.slice(coworkStart, coworkStart + 2500);
    expect(coworkBlock).toMatch(/font-claude-response-body break-words whitespace-normal leading-\[1\.7\]/);
  });
});
