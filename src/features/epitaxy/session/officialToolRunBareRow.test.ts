import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  officialHcSameFileRun,
  officialRendersBareRow,
  officialSameFileCoalesceKey,
} from "./officialToolRunBareRow";

const here = path.dirname(fileURLToPath(import.meta.url));

function tool(name: string, input: Record<string, unknown> = {}, extra?: { precedingThinking?: string[] }) {
  return { id: `${name}-${JSON.stringify(input)}`, input, name, ...extra };
}

describe("official cd57 K / cd5a B1 bare-row (Ran 2 commands group)", () => {
  it("one Bash is a bare Zg row", () => {
    expect(officialRendersBareRow({ tools: [tool("Bash", { command: "ls" })] })).toBe(true);
  });

  it("two Bash tools are an o2e group, not coalesced standalone", () => {
    expect(
      officialRendersBareRow({
        tools: [
          tool("Bash", { command: "ls -la .claude/", description: "Listed parent directory of current working directory" }),
          tool("Bash", { command: "pwd", description: "Get current working directory" }),
        ],
      }),
    ).toBe(false);
  });

  it("two Reads of the same file coalesce (HC)", () => {
    const a = tool("Read", { file_path: "/tmp/a.ts" });
    const b = tool("Read", { file_path: "/tmp/a.ts", offset: 10, limit: 20 });
    expect(officialSameFileCoalesceKey(a)).toBe("Read /tmp/a.ts");
    expect(officialHcSameFileRun([a, b])).toBe(true);
    expect(officialRendersBareRow({ tools: [a, b] })).toBe(true);
  });

  it("two Reads of different files are a group", () => {
    expect(
      officialRendersBareRow({
        tools: [tool("Read", { file_path: "/tmp/a.ts" }), tool("Read", { file_path: "/tmp/b.ts" })],
      }),
    ).toBe(false);
  });

  it("memoryOps or taskEvents force a group card", () => {
    const one = [tool("Bash", { command: "ls" })];
    expect(officialRendersBareRow({ memoryOps: { read: 1, search: 0, write: 0 }, tools: one })).toBe(false);
    expect(officialRendersBareRow({ taskEvents: [{ at: 0 }], tools: one })).toBe(false);
  });

  it("thinking mode splits when a later tool has precedingThinking", () => {
    const same = [
      tool("Read", { file_path: "/tmp/a.ts" }),
      tool("Read", { file_path: "/tmp/a.ts" }, { precedingThinking: ["hmm"] }),
    ];
    expect(officialRendersBareRow({ tools: same })).toBe(true);
    expect(officialRendersBareRow({ showThinking: true, tools: same })).toBe(false);
  });
});

describe("official tool-group mount residual (cd5a B1)", () => {
  it("OfficialTranscript uses B1/HC, not 'any default run is t2e'", () => {
    const source = readFileSync(path.join(here, "OfficialTranscript.tsx"), "utf8");
    expect(source).toMatch(/officialRendersBareRow/);
    expect(source).toMatch(/cd5a31703-B4nKQMBN\.js:o2e/);
    expect(source).toContain("TOOL_GROUP_SUMMARY_MESSAGES");
    expect(source).toContain("text.ranACommand");
    expect(source).not.toMatch(/meta: officialCountNoun\(count, "command", "commands", "a"\)/);
    expect(source).not.toMatch(/function officialRunIsT2eHead/);
    expect(source).not.toMatch(/if \(!memoryOps && !\(taskEvents\?\.length\)\)/);
  });

  it("live 1→N follows official B1 (Zg→o2e wrap)", () => {
    const source = readFileSync(path.join(here, "OfficialTranscript.tsx"), "utf8");
    expect(source).toMatch(/const bare = officialRendersBareRow/);
    expect(source).not.toMatch(/!runLiveTail && officialRendersBareRow/);
    expect(source).not.toMatch(/!liveTail && officialRendersBareRow/);
    expect(source).toMatch(/key=\{run\.tools\[0\]\?\.id \?\? run\.id\}/);
    expect(source).toMatch(/morphKey=\{runningSummary \? "busy" : "settled"\}/);
    expect(source).not.toMatch(/morphKey=\{runningSummary \? debouncedRunningToolId : "settled"\}/);
    expect(source).toMatch(/!inGroup && nm\.marked && !nm\.parked && !tree/);
  });

  it("o2e chrome is pin c425 se + ue, not product c119 gap-g1 / bg-t1", () => {
    const source = readFileSync(path.join(here, "OfficialTranscript.tsx"), "utf8");
    expect(source).toMatch(/py-0 gap-0\.5 text-left focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus rounded-sm/);
    expect(source).toMatch(/flex flex-col epitaxy-card-outline-layer rounded-lg overflow-clip mt-pad-md divide-y/);
    expect(source).not.toMatch(/gap-g1 text-left outline-none hide-focus-ring focus:ring-focus rounded-r3/);
    expect(source).not.toMatch(/flex flex-col gap-g3 bg-t1 rounded-r6 p-p7 mt-\[var\(--p6\)\]/);
    expect(source).toMatch(/data-testid="counted-line-names"/);
    expect(source).toMatch(/className=\{piece\.isError \? "text-body text-danger" : "text-body"\}/);
    expect(source).not.toMatch(/renderToolSummaryPiece[\s\S]{0,400}text-assistant-secondary/);
    const css = readFileSync(path.join(here, "../../../styles/global.css"), "utf8");
    expect(css).toMatch(/\.epitaxy-root \.epitaxy-card-outline-layer/);
    expect(css).toContain("[\\&\\>\\*\\]\\:px-2\\.5");
    expect(css).toContain("[\\&\\>\\*\\]\\:py-md");
    expect(css).toMatch(/\[data-cds="AssistantMessage"\]\[data-turn-key\]/);
    expect(css).toMatch(/\[data-cds="UserMessage"\]\[data-turn-key\]/);
    expect(css).toMatch(/\[data-cds="TurnStatusStep"\]/);
  });

  it("o2e expand is cc6e9624e dS first-tool id, not toolsKey reset", () => {
    const source = readFileSync(path.join(here, "OfficialTranscript.tsx"), "utf8");
    expect(source).toMatch(/useOfficialToolGroupExpanded/);
    expect(source).not.toMatch(/const toolsKey = tools\.map/);
  });

  it("Jk leaving face uses Gk width 0 so chevron stays on incoming text", () => {
    const source = readFileSync(path.join(here, "OfficialTranscript.tsx"), "utf8");
    expect(source).toMatch(/w-0 overflow-hidden invisible/);
  });

  it("OfficialCollapse is pin c425 F hidden+epitaxy-expanding-body, not motion spring", () => {
    const source = readFileSync(path.join(here, "OfficialTranscript.tsx"), "utf8");
    expect(source).toMatch(/epitaxy-expanding-body flow-root/);
    expect(source).toMatch(/c425fb3cf-C8q5-d1_\.js:F/);
    expect(source).toMatch(/hidden=\{!expanded\}/);
    expect(source).not.toMatch(/height: \{ type: "spring", duration: 0\.35/);
  });

  it("Show more is pin Rs footnote muted, not OfficialButton", () => {
    const source = readFileSync(path.join(here, "OfficialTranscript.tsx"), "utf8");
    expect(source).toMatch(/self-start text-footnote text-muted/);
    expect(source).toMatch(/cd5a31703-B4nKQMBN\.js:Rs aWpBzjCXKS/);
    expect(source).not.toMatch(/ariaLabel=\{expanded \? "Show less" : "Show more"\}/);
    expect(source).toMatch(/gap-1 rounded-lg border border-alpha-2 bg-alpha-1 p-sm/);
    const working = readFileSync(path.join(here, "OfficialWorkingStatus.tsx"), "utf8");
    expect(working).toMatch(/text-footnote text-muted tabular-nums/);
    expect(working).not.toMatch(/text-assistant-secondary/);
    expect(working).not.toMatch(/focus:ring-focus rounded-r3/);
    const diff = readFileSync(path.join(here, "../diff/OfficialToolDiffDetails.tsx"), "utf8");
    expect(diff).not.toMatch(/text-assistant-secondary/);
    expect(diff).toMatch(/flex gap-0\.5 items-center text-body tabular-nums shrink-0/);
  });

  it("plan verbs and _B badge are pin c52 / cd5a", () => {
    const source = readFileSync(path.join(here, "OfficialTranscript.tsx"), "utf8");
    expect(source).toMatch(/verb: "Started planning"/);
    expect(source).toMatch(/runningVerb: "Making a plan"/);
    expect(source).toMatch(/failedVerb: "Failed to start planning"/);
    expect(source).toMatch(/failedVerb: "Failed to propose plan"/);
    expect(source).toMatch(/isError && summary\.failedVerb/);
    expect(source).not.toMatch(/Entered plan mode/);
    const diff = readFileSync(path.join(here, "../diff/OfficialToolDiffDetails.tsx"), "utf8");
    expect(diff).toMatch(/text-git-added/);
    expect(diff).toMatch(/text-git-removed/);
    expect(diff).toMatch(/flex items-center gap-0\.75 px-p6 py-p5/);
    expect(diff).not.toMatch(/text-extended-green/);
    expect(diff).not.toMatch(/gap-g3 px-p6 py-p5/);
    const css = readFileSync(path.join(here, "../../../styles/global.css"), "utf8");
    expect(css).toMatch(/\.text-git-added/);
    expect(css).toMatch(/--cds-text-git-added: #1e9e3c/);
  });
});

