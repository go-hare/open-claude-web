import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  COWORK_ACTIVITY_CHROME_MESSAGES,
  buildCoworkActivityChromeText,
} from "./coworkActivityChromeMessages";

const here = path.dirname(fileURLToPath(import.meta.url));

describe("c21f activity empty / Instructions / Import Nt copy residual", () => {
  it("wires official p41Nenxyun / WXQkdiBWrh / Cntk+3fYyG", () => {
    expect(COWORK_ACTIVITY_CHROME_MESSAGES.artifactsEmpty.id).toBe("p41Nenxyun");
    expect(COWORK_ACTIVITY_CHROME_MESSAGES.contextEmpty.id).toBe("WXQkdiBWrh");
    expect(COWORK_ACTIVITY_CHROME_MESSAGES.instructions.id).toBe("Cntk+3fYyG");
    const zh = buildCoworkActivityChromeText({
      p41Nenxyun: "查看并打开此任务中创建的文件。",
      WXQkdiBWrh: "跟踪此任务使用的工具和引用的文件。",
      "Cntk+3fYyG": "说明",
    });
    expect(zh.artifactsEmpty).toBe("查看并打开此任务中创建的文件。");
    expect(zh.contextEmpty).toBe("跟踪此任务使用的工具和引用的文件。");
    expect(zh.instructions).toBe("说明");
  });

  it("activity empty states no longer hardcode EN copy", () => {
    const artifacts = readFileSync(path.join(here, "CoworkActivityContent.tsx"), "utf8");
    const context = readFileSync(path.join(here, "CoworkSuggestedConnectors.tsx"), "utf8");
    expect(artifacts).toMatch(/chromeText\.artifactsEmpty/);
    expect(artifacts).toMatch(/chromeText\.instructions/);
    expect(artifacts).not.toMatch(/>View and open files created during this task\.</);
    expect(artifacts).not.toMatch(/Instructions <span className="text-text-500">· CLAUDE\.md<\/span>/);
    expect(context).toMatch(/chromeText\.contextEmpty/);
    expect(context).not.toMatch(/>Track tools and referenced files used in this task\.</);
  });

  it("Import Nt keeps r3JVDltSqg and does not invent OAuth/zip arms", () => {
    const importSettings = readFileSync(
      path.join(here, "../../../settings/sections/ImportExportSettings.tsx"),
      "utf8",
    );
    expect(importSettings).toMatch(/id: "r3JVDltSqg"/);
    expect(importSettings).toMatch(/remotePull: false/);
    expect(importSettings).toMatch(/localZip: false/);
    expect(importSettings).toMatch(/sessionExport: false/);
    const overrides = JSON.parse(
      readFileSync(path.join(here, "../../../../../public/i18n/zh-CN.overrides.json"), "utf8"),
    ) as Record<string, string>;
    expect(overrides.p41Nenxyun).toMatch(/查看并打开/);
    expect(overrides.WXQkdiBWrh).toMatch(/跟踪此任务/);
    expect(overrides["Cntk+3fYyG"]).toBe("说明");
    expect(overrides.r3JVDltSqg).toMatch(/未启用导入/);
  });

  it("wires official instruction editor fy/py ids and drops hardcoded EN", () => {
    expect(COWORK_ACTIVITY_CHROME_MESSAGES.folderInstructions.id).toBe("dqW6sjmil4");
    expect(COWORK_ACTIVITY_CHROME_MESSAGES.folderInstructionsDescription.id).toBe("VOHzFFMkVd");
    expect(COWORK_ACTIVITY_CHROME_MESSAGES.folderInstructionsPlaceholder.id).toBe("RP0HgGFG5M");
    expect(COWORK_ACTIVITY_CHROME_MESSAGES.cancel.id).toBe("47FYwba+bI");
    expect(COWORK_ACTIVITY_CHROME_MESSAGES.save.id).toBe("jvo0vs3nF0");
    const editor = readFileSync(path.join(here, "CoworkInstructionEditorModal.tsx"), "utf8");
    expect(editor).toMatch(/chromeText\.folderInstructions/);
    expect(editor).toMatch(/chromeText\.folderInstructionsDescription/);
    expect(editor).toMatch(/chromeText\.folderInstructionsPlaceholder/);
    expect(editor).not.toMatch(/title="Folder instructions"/);
    expect(editor).not.toMatch(/Use this to give Claude instructions for working in this folder\./);
    const overrides = JSON.parse(
      readFileSync(path.join(here, "../../../../../public/i18n/zh-CN.overrides.json"), "utf8"),
    ) as Record<string, string>;
    expect(overrides.dqW6sjmil4).toBe("文件夹说明");
    expect(overrides.VOHzFFMkVd).toMatch(/此文件夹/);
    expect(overrides.RP0HgGFG5M).toMatch(/例如：/);
  });

  it("wires official aQt Suggested connectors + Xv Folder instructions ids", () => {
    expect(COWORK_ACTIVITY_CHROME_MESSAGES.suggestedConnectors.id).toBe("4lWgUGlrk4");
    expect(COWORK_ACTIVITY_CHROME_MESSAGES.dismissSuggestedConnectors.id).toBe("oTpBaPoiSn");
    expect(COWORK_ACTIVITY_CHROME_MESSAGES.coworkUsesConnectors.id).toBe("1m8v9zsHNC");
    expect(COWORK_ACTIVITY_CHROME_MESSAGES.seeAllConnectors.id).toBe("7fCBPXAUhO");
    expect(COWORK_ACTIVITY_CHROME_MESSAGES.globalInstructions.id).toBe("53DiPrdI5r");
    const connectors = readFileSync(path.join(here, "CoworkSuggestedConnectors.tsx"), "utf8");
    expect(connectors).toMatch(/chromeText\.suggestedConnectors/);
    expect(connectors).toMatch(/chromeText\.dismissSuggestedConnectors/);
    expect(connectors).toMatch(/chromeText\.coworkUsesConnectors/);
    expect(connectors).toMatch(/chromeText\.seeAllConnectors/);
    expect(connectors).not.toMatch(/>Suggested connectors</);
    expect(connectors).not.toMatch(/aria-label="Dismiss suggested connectors"/);
    const content = readFileSync(path.join(here, "CoworkActivityContent.tsx"), "utf8");
    expect(content).toMatch(/chromeText\.folderInstructions/);
    expect(content).not.toMatch(/return "Folder instructions"/);
    const model = readFileSync(path.join(here, "../transcript/coworkFileToolModel.ts"), "utf8");
    expect(model).toMatch(/labels\?\.folderInstructions/);
    const overrides = JSON.parse(
      readFileSync(path.join(here, "../../../../../public/i18n/zh-CN.overrides.json"), "utf8"),
    ) as Record<string, string>;
    expect(overrides.oTpBaPoiSn).toMatch(/关闭推荐连接器/);
  });
});
