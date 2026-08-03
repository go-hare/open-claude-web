import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { hasPendingCoworkToolPermission } from "./CoworkMessageContext";

const here = path.dirname(fileURLToPath(import.meta.url));
const rendererSource = readFileSync(path.join(here, "CoworkOfficialToolRenderer.tsx"), "utf8");
const contextSource = readFileSync(path.join(here, "CoworkMessageContext.tsx"), "utf8");

describe("O5e shell residual (permission null + inject)", () => {
  it("hides pending non-AskUserQuestion tools", () => {
    expect(
      hasPendingCoworkToolPermission(
        [{ toolUseId: "tu1", toolName: "Bash", requestId: "r1" } as never],
        "tu1",
      ),
    ).toBe(true);
  });

  it("keeps AskUserQuestion visible while pending", () => {
    expect(
      hasPendingCoworkToolPermission(
        [{ toolUseId: "tu2", toolName: "AskUserQuestion", requestId: "r2" } as never],
        "tu2",
      ),
    ).toBe(false);
  });

  it("shell documents O5e residual not Local stand-in", () => {
    expect(rendererSource).not.toMatch(/Local stand-in/);
    expect(rendererSource).toMatch(/Official O5e ToolUse shell/);
    expect(rendererSource).toMatch(/data-official-source="index-BELzQL5P\.js:O5e"/);
    expect(rendererSource).toMatch(/renderCoworkToolUseCell/);
    expect(rendererSource).toMatch(/renderToolUseCell \?\? renderCoworkToolUseCell/);
  });

  it("context exposes optional renderToolUseCell inject (c2e residual)", () => {
    expect(contextSource).toMatch(/renderToolUseCell\?:/);
    expect(contextSource).toMatch(/CoworkRenderToolUseCell/);
  });

  it("residual tct subset keeps specialized cells (no invent-only empty dispatch)", () => {
    for (const name of [
      "CoworkBashToolCell",
      "CoworkWebSearchToolCell",
      "CoworkWebFetchToolCell",
      "CoworkFileToolCell",
      "CoworkGenericToolCell",
      "CoworkTaskToolCell",
      "CoworkAskUserQuestionWidget",
    ]) {
      expect(rendererSource).toContain(name);
    }
  });
});
