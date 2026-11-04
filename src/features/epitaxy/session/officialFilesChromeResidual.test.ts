import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { fileTabBasename, readOfficialFilesWordWrap } from "./officialFilesWordWrap";

const here = path.dirname(fileURLToPath(import.meta.url));

describe("official Files chrome residual (cccc Db / mb / cb)", () => {
  it("header is Db tabs + ListBullet, not basename File title", () => {
    const source = readFileSync(path.join(here, "EpitaxySidePanes.tsx"), "utf8");
    expect(source).toMatch(/OfficialFilesHeaderTabs/);
    expect(source).toMatch(/fileTabs/);
    expect(source).toMatch(/label: chromeText\.wordWrap/);
    expect(source).toMatch(/label: chromeText\.showFileTree/);
    expect(source).toMatch(/label: chromeText\.previewTabs/);
    expect(source).toMatch(/label: chromeText\.autoSave/);
    expect(source).toMatch(/min-w-0 flex-1 flex-col/);
    expect(source).toMatch(/OFFICIAL_FILES_TREE_CAN_FIT/);
    expect(source).toMatch(/filesTreeCanFit/);
    expect(source).toMatch(/pickFileInTree/);
    expect(source).toMatch(/flex min-h-0 flex-1 flex-col overflow-hidden rounded-b-r6/);
    expect(source).toMatch(/@container\/files-body flex h-full min-h-0 flex-1/);
    expect(source).toMatch(/relative flex min-h-0 shrink-0 flex-col border-r/);
    expect(source).not.toMatch(/hasOpenFile \? viewsText\.file : viewsText\.files/);
    const css = readFileSync(path.join(here, "../../../styles/global.css"), "utf8");
    expect(css).toMatch(/html:where\(\.cds-root\)/);
    expect(css).toMatch(/--cds-border: var\(--cds-alpha-2\)/);
    expect(css).toMatch(/border-color: var\(--cds-border\)/);
  });

  it("Pierre Yu wrap default is cb true and jr is the vertical scroller", () => {
    const pane = readFileSync(path.join(here, "OfficialFilePane.tsx"), "utf8");
    expect(pane).toMatch(/wordWrap: _wordWrap = true/);
    expect(pane).toMatch(/h-full overflow-y-auto select-text/);
    expect(pane).toMatch(/epitaxy-diff flex-1 min-h-0/);
    expect(pane).not.toMatch(/epitaxy-diff flex-1 min-h-0 overflow-hidden/);
    expect(pane).not.toMatch(/\[contain:strict\]/);
    expect(pane).not.toMatch(/<PierreFile[\s\S]*className="h-full"/);
    expect(readOfficialFilesWordWrap()).toBe(true);
  });

  it("popout Files tile keeps data-top-left (c563 isTopLeft:!0)", () => {
    const tile = readFileSync(path.join(here, "../EpitaxySessionTile.tsx"), "utf8");
    expect(tile).toMatch(/isTopLeft=\{\(hostedPopoutPane \|\| isTopLeft\) && columnIndex === 0\}/);
    expect(tile).not.toMatch(/isTopLeft=\{!hostedPopoutPane && isTopLeft/);
  });

  it("popout host is c563: XO payload + hideCloseButton", () => {
    const tile = readFileSync(path.join(here, "../EpitaxySessionTile.tsx"), "utf8");
    const panes = readFileSync(path.join(here, "EpitaxySidePanes.tsx"), "utf8");
    const popout = readFileSync(path.join(here, "epitaxyPopoutWindow.ts"), "utf8");
    expect(tile).toMatch(/hideCloseButton=\{Boolean\(hostedPopoutPane\)\}/);
    expect(tile).toMatch(/onPopOut=\{hostedPopoutPane \? undefined : popOutSidePane\}/);
    expect(tile).toMatch(/onDock=\{hostedPopoutPane \? dockPopoutToMain : undefined\}/);
    expect(tile).toMatch(/showExpand=\{!hostedPopoutPane\}/);
    expect(tile).toMatch(/if \(opened && !hostedPopoutPane\) closeSidePane/);
    expect(panes).toMatch(/icon="WindowNew"/);
    expect(panes).toMatch(/icon="ArrowInSquare"/);
    expect(panes).toMatch(/icon=\{popoutAlwaysOnTop \? "PinFilled" : "Pin"\}/);
    expect(panes).toMatch(/icon=\{paneExpanded \? "Collapse" : "Expand"\}/);
    expect(panes).toMatch(/ariaLabel=\{chromeText\.openInMainWindow\}/);
    expect(panes).toMatch(/tooltipSide="bottom"/);
    expect(panes).toMatch(/preferFont/);
    expect(tile).toMatch(/fileTabs: view === "file" \? tabs : undefined/);
    expect(tile).toMatch(/fileView: view === "file" && fileView \? fileView : undefined/);
    expect(panes).toMatch(/hideCloseButton \? null/);
    expect(panes).toMatch(/paneSettings/);
    expect(tile).toMatch(/applyPopoutHydration/);
    expect(tile).toMatch(/onEpitaxyPopoutDocked/);
    expect(tile).toMatch(/setSidePane\(pane\)/);
    expect(popout).toMatch(/readEpitaxyPopoutHydration/);
  });

  it("tree rows use c280 Ac file-type icon, not generic File", () => {
    const tree = readFileSync(path.join(here, "OfficialFilesBrowserPane.tsx"), "utf8");
    expect(tree).toMatch(/OfficialFileTypeIcon/);
    expect(tree).toMatch(/fileName=\{entry\.name\}/);
    expect(tree).toMatch(/data-cds="TextInput"/);
    expect(tree).toMatch(/bg-fill-field/);
    expect(tree).toMatch(/shadow-field-ring/);
    expect(tree).not.toMatch(/bg-fill-contained-default effect-contained-default/);
    expect(tree).not.toMatch(/iconName = entry\.isDirectory \? "CaretRight" : "File"/);
    const tabs = readFileSync(path.join(here, "OfficialFilesHeaderTabs.tsx"), "utf8");
    expect(tabs).not.toMatch(/preferFont/);
    expect(tabs).toMatch(/variant="ghost"/);
  });

  it("fileTabBasename is the last path segment", () => {
    expect(fileTabBasename("/Users/me/model_omni.py")).toBe("model_omni.py");
    expect(fileTabBasename("src/app.ts")).toBe("app.ts");
  });
});

describe("official Diff empty residual (cb61 ze)", () => {
  it("getGitDiff null is No changes / git repo empty, not Failed to load diff", () => {
    const pane = readFileSync(path.join(here, "../OfficialDiffPane.tsx"), "utf8");
    const messages = readFileSync(path.join(here, "../officialCodeChromeMessages.ts"), "utf8");
    expect(messages).toMatch(/id: "nM04gPHngB"/);
    expect(messages).toMatch(/id: "Hvf2wzumza"/);
    expect(messages).toMatch(/id: "ZSmll0R5ni"/);
    expect(pane).toMatch(/chrome\.noChangesToShow/);
    expect(pane).toMatch(/chrome\.couldntLoadTheChanges/);
    expect(pane).toMatch(/chrome\.changesNeedAGitRepository/);
    expect(pane).toMatch(/noRepo: !comparison && gitInfoRaw == null/);
    expect(pane).not.toMatch(/Failed to load diff/);
  });
});

describe("official $x CodeStats residual", () => {
  it("null getCodeStats paints empty $x, not throw-into-skeleton", () => {
    const card = readFileSync(path.join(here, "../CodeStatsCard.tsx"), "utf8");
    expect(card).toMatch(/EMPTY_CODE_STATS/);
    expect(card).toMatch(/next \?\? EMPTY_CODE_STATS/);
    expect(card).not.toMatch(/getCodeStats returned null/);
    expect(card).toMatch(/statsQuery\.isError && !statsQuery\.data/);
  });
});

describe("official Views overflow residual (c593 hm / ca80 p4)", () => {
  it("p4 overflow is Files / Background tasks / Plan; hm inline is Terminal Changes Preview", () => {
    const chrome = readFileSync(path.join(here, "../OfficialEpitaxyComponents.tsx"), "utf8");
    expect(chrome).toMatch(/OfficialTitlebarPaneButtons/);
    expect(chrome).toMatch(/icon: "CommandLinePrompt"/);
    expect(chrome).toMatch(/icon: "ChangesPlusMinus"/);
    expect(chrome).toMatch(/icon: "Play"/);
    expect(chrome).toMatch(/icon: "Folder1"/);
    expect(chrome).toMatch(/icon: "Blocks"/);
    expect(chrome).toMatch(/label: text\.backgroundTasks/);
    expect(chrome).toMatch(/label: text\.plan/);
    expect(chrome).toMatch(/showTasks = hasRunningTasks \|\| isOpen\("tasks"\)/);
    expect(chrome).toMatch(/officialKpKeepAwake/);
    expect(chrome).toMatch(/officialKeepAwakeMenuItem/);
    expect(chrome).toMatch(/checkedRole: "checkbox"/);
    expect(chrome).toMatch(/menuitemcheckbox/);
    expect(chrome).toMatch(/showFiles = canOpenFiles \|\| isOpen\("file"\) \|\| Boolean\(localOnlyTooltip\)/);
    expect(chrome).toMatch(/onlyAvailableInLocalSessions/);
    expect(chrome).toMatch(/DotsVertical/);
    expect(chrome).toMatch(/showPlan = hasPlan \|\| isOpen\("plan"\) \|\| Boolean\(sessionRef\)/);
    expect(chrome).not.toMatch(/OfficialSessionToolbar/);
    const messages = readFileSync(path.join(here, "../officialCodeChromeMessages.ts"), "utf8");
    expect(messages).toMatch(/id: "CapHOIPauL"/);
    expect(messages).toMatch(/id: "SWSZIzLoC3"/);
  });

  it("titlebar hm is CommandLinePrompt / ChangesPlusMinus / Play at Rl 18", () => {
    const chrome = readFileSync(path.join(here, "../OfficialEpitaxyComponents.tsx"), "utf8");
    expect(chrome).toMatch(/OfficialTitlebarPaneButtons/);
    expect(chrome).toMatch(/icon: "CommandLinePrompt"/);
    expect(chrome).toMatch(/customSize=\{18\}/);
    expect(chrome).not.toMatch(/OfficialSessionToolbar/);
  });
});


describe("official Preview empty residual (cf580 gr / Or)", () => {
  it("no-config is Globe browse empty, not live toolbar without a URL", () => {
    const pane = readFileSync(path.join(here, "OfficialPreviewPane.tsx"), "utf8");
    expect(pane).toMatch(/browseWithClaude/);
    expect(pane).toMatch(/detectDevServer/);
    expect(pane).toMatch(/name="Globe"/);
    expect(pane).toMatch(/if \(previewUrl && !startError\)/);
    expect(pane).toMatch(/typeof url === "string" && url\.length > 0/);
    expect(pane).toMatch(/do not auto startFromConfig/);
    expect(pane).not.toMatch(/if \(\(previewUrl \|\| liveServerId\) && !startError\)/);
    expect(pane).not.toMatch(/url != null \|\| typeof launch\?\.showPreview === "function"/);
    const chrome = readFileSync(path.join(here, "EpitaxySidePanes.tsx"), "utf8");
    expect(chrome).toMatch(/OfficialPreviewAddressBar/);
    expect(chrome).toMatch(/OfficialPreviewTrailingChrome/);
    expect(chrome).toMatch(/relative flex items-center justify-between gap-g6 h-\[32px\] pl-\[8px\] pr-\[4px\] shrink-0/);
    expect(chrome).toMatch(/flex min-w-0 flex-1 items-center overflow-hidden draggable-none/);
    expect(chrome).toMatch(/sessionLoadText\.close/);
    expect(chrome).not.toMatch(/preview \? "gap-1"/);
    expect(chrome).not.toMatch(/ariaLabel="Close"/);
    const header = readFileSync(path.join(here, "OfficialPreviewHeaderChrome.tsx"), "utf8");
    expect(header).toMatch(/icon="Globe"/);
    expect(header).toMatch(/icon="ArrowClockwise"/);
    expect(header).toMatch(/data-preview-settings-menu=""/);
    expect(header).not.toMatch(/icon="Reload"/);
    expect(header).toMatch(/flex shrink-0 items-center gap-1/);
    expect(header).toMatch(/mr-\[calc\(1\.5rem\*var\(--cds-rem-scale,1\)\)\]/);
    expect(header).not.toMatch(/onToggleExpand/);
    expect(header).toMatch(/revealChevron="never"/);
    expect(header).toMatch(/live\.onNavigate/);
    expect(header).toMatch(/\$\{chrome\.pageUrl\}: \$\{display\}/);
    expect(header).not.toMatch(/Page URL: \$\{display\}/);
    expect(header).toMatch(/chrome\.copyUrl/);
    expect(header).toMatch(/chrome\.screenshot/);
    expect(header).toMatch(/chrome\.openHtmlFile/);
    expect(header).toMatch(/chrome\.viewport/);
    expect(pane).toMatch(/openPreviewInBrowser/);
    expect(pane).toMatch(/exportPreview/);
    expect(pane).toMatch(/OFFICIAL_PREVIEW_ADD_SERVER_PROMPT/);
    expect(pane).toMatch(/OfficialPreviewLogsPanel/);
    expect(pane).toMatch(/OfficialPreviewTranscriptLinksModal/);
    expect(pane).not.toMatch(/window\.open/);
    expect(pane).not.toMatch(/SystemComputerLaptopMacbook/);
    expect(header).toMatch(/chrome\.addServer/);
    expect(header).toMatch(/chrome\.export/);
    expect(header).toMatch(/chrome\.setLinkDestination/);
    expect(header).toMatch(/chrome\.hideDevServerLogs/);
    expect(header).toMatch(/chrome\.openLinksInPreview/);
    expect(header).toMatch(/chrome\.keepCookies/);
    expect(header).toMatch(/chrome\.clearBrowsingData/);
    expect(header).toMatch(/chrome\.exportHtml/);
    expect(pane).toMatch(/clearPreviewBrowsingData/);
    expect(pane).toMatch(/exportPreview\?\.\(id, "file"\)/);
    const messages = readFileSync(path.join(here, "../officialCodeChromeMessages.ts"), "utf8");
    expect(messages).toMatch(/id: "pOeEMxHCXp"/);
    expect(messages).toMatch(/id: "SVwJTM5AmL"/);
    expect(messages).toMatch(/id: "dyp4qWSjux"/);
    expect(messages).not.toMatch(/id: "Nr.add"/);
    expect(messages).not.toMatch(/id: "fdCS5Open"/);
  });

  it("Code Fu sizer is wse/cr rocksteady, not invented spacer silhouettes", () => {
    const transcript = readFileSync(path.join(here, "OfficialTranscript.tsx"), "utf8");
    const css = readFileSync(path.join(here, "../../../styles/global.css"), "utf8");
    expect(transcript).toMatch(/useOfficialTranscriptFu/);
    expect(transcript).toMatch(/data-rocksteady-sizer/);
    expect(transcript).toMatch(/data-testid="transcript-sizer"/);
    expect(transcript).not.toMatch(/OfficialTranscriptOlderChrome/);
    expect(transcript).not.toMatch(/OfficialTranscriptGapSilhouettes/);
    expect(css).toMatch(/--chat-body: calc\(0\.875rem \* var\(--cds-rem-scale, 1\)\)/);
    expect(css).toMatch(/--cds-font-size-body: calc\(0\.8125rem \* var\(--cds-rem-scale, 1\)\)/);
    expect(css).toMatch(/--cds-font-sans: var\(--font-anthropic-sans/);
    expect(transcript).not.toMatch(/data-code-own-row=""/);
    expect(transcript).not.toMatch(/data-transcript-row=""/);
    expect(transcript).toMatch(/data-cds="UserMessage"/);
    expect(transcript).toMatch(/officialUserBubbleProseClass/);
    expect(transcript).toMatch(/officialUserBubbleTextClass/);
    expect(css).toMatch(/--cds-font-size-prose: 0\.875rem/);
    expect(css).toMatch(/\.text-prose/);
    expect(css).toMatch(/\[data-text-size="lg"\]/);
    expect(css).toMatch(/--cds-font-size-prose: 0\.9375rem/);
    expect(transcript).toMatch(/data-author="self"/);
    expect(transcript).toMatch(/data-text-size=\{cdsTextSize\}/);
    expect(transcript).toMatch(/OfficialUserMessageCollapsibleBody/);
    expect(transcript).toMatch(/expandPrompts=\{expandPrompts\}/);
    expect(css).toMatch(/\.scroll-fade-strip-top/);
    expect(css).toMatch(/\.scroll-fade-strip-bottom/);
    const chrome = readFileSync(path.join(here, "../OfficialEpitaxyComponents.tsx"), "utf8");
    expect(chrome).toMatch(/epitaxy-bubble-prose/);
    expect(chrome).toMatch(/text-prose whitespace-pre-wrap/);
    expect(chrome).toMatch(/data-cds="AssistantMessage"/);
    expect(chrome).toMatch(/group\/message-row/);
    expect(chrome).toMatch(/data-text-size=\{textSize\}/);
    expect(transcript).toMatch(/officialSettledToolVerbClass/);
    expect(transcript).toMatch(/text-muted group-hover\/tool:text-secondary/);
    expect(transcript).toMatch(/name="CaretRight"/);
    expect(transcript).toMatch(/customSize=\{14\}/);
    expect(transcript).toMatch(/gap-0\.75/);
    expect(transcript).not.toMatch(/ToolChevron expanded=\{isExpanded\} \/>/);
    expect(chrome).toMatch(/cd5a31703-B4nKQMBN.js:GNe/);
    expect(chrome).toMatch(/cd5a31703-B4nKQMBN.js:zI shared-2:oW/);
    expect(chrome).toMatch(/icon=\{copied \? "Check" : "Copy"\}/);
    expect(chrome).toMatch(/icon="ArrowSplitRight"/);
    expect(chrome).toMatch(/rewindIcon = "ArrowCounterClockwise"/);
    expect(chrome).toMatch(/role="toolbar"/);
    expect(chrome).toMatch(/actionsText\.messageActions/);
    expect(chrome).toMatch(/layout="pretty"/);
    expect(chrome).toMatch(/data-cds="MessageActions"/);
    expect(chrome).toMatch(/\[&_button\]:text-muted/);
    expect(transcript).toMatch(/layout="pretty"/);
    const messages = readFileSync(path.join(here, "../officialCodeChromeMessages.ts"), "utf8");
    expect(messages).toMatch(/id: "8FU11i4S5Z"/);
    expect(chrome).toMatch(/\[&_\[data-cds=Button\]:not\(\[aria-pressed=true\]\)\]:text-muted/);
    expect(chrome).toMatch(/flex gap-0\.75 pt-\[4px\]/);
    expect(chrome).toMatch(/text-body text-muted tabular-nums flex min-h-control/);
    expect(chrome).toMatch(/first:ps-0 last:pe-0 text-caption/);
    expect(chrome).toMatch(/data-cds="RelativeTime"/);
    expect(chrome).toMatch(/timestampPlacement="end"/);
    expect(chrome).toMatch(/\["week", 604_800\]/);
    expect(chrome).not.toMatch(/CopySquareBehind/);
    expect(chrome).not.toMatch(/icon="GitBranch"/);
    expect(chrome).not.toMatch(/ArrowUndoUp/);
    expect(transcript).not.toMatch(/buttonVariant="link"/);
    expect(transcript).not.toMatch(/-mt-\[8px\]/);
    expect(transcript).toMatch(/data-find-omitted/);
    expect(transcript).toMatch(/cd5a31703-B4nKQMBN.js:Y1/);
    expect(transcript).toMatch(/cd5a31703-B4nKQMBN.js:XX/);
    expect(transcript).toMatch(/cd5a31703-B4nKQMBN.js:X1/);
    expect(transcript).toMatch(/cd5a31703-B4nKQMBN.js:vB coalescedRun/);
    expect(transcript).toMatch(/cd5a31703-B4nKQMBN.js:aM/);
    expect(transcript).toMatch(/data-live-tail=\{tailHeld \? "" : undefined\}/);
    expect(transcript).toMatch(/officialNmMark/);
    expect(transcript).toMatch(/OfficialTurnLiveProvider/);
    expect(transcript).toMatch(/cd5a31703-B4nKQMBN.js:Yj/);
    expect(transcript).toMatch(/cd5a31703-B4nKQMBN.js:Nj/);
    expect(transcript).toMatch(/cd5a31703-B4nKQMBN.js:Mj/);
    expect(transcript).toMatch(/officialEvEmptyBody/);
    expect(transcript).toMatch(/officialEvShowsLine/);
    expect(transcript).toMatch(/kind === "hook_notice"/);
    expect(transcript).toMatch(/cd5a31703-B4nKQMBN.js:Jz RM hook_notice/);
    expect(transcript).toMatch(/cd5a31703-B4nKQMBN.js:YX/);
    const step = readFileSync(path.join(here, "OfficialTurnStatusStep.tsx"), "utf8");
    expect(step).toMatch(/data-cds="TurnStatusStep"/);
    // Official c734 uses Base UI Collapsible. Product uses native details because
    // Vite prebundles a second React into @base-ui-components/react/collapsible.
    expect(step).toMatch(/<details/);
    expect(step).not.toMatch(/from ["']@base-ui-components\/react\/collapsible["']/);
    expect(step).toMatch(/data-cds-row=""/);
    expect(readFileSync(path.join(here, "officialTurnLiveStore.ts"), "utf8")).toMatch(/turnLive/);
    expect(messages).toMatch(/id: "4Zkm5mSVWS"/);
    expect(messages).toMatch(/id: "FnKhqMbHN5"/);
    expect(messages).toMatch(/id: "k0\/cAE4jdO"/);
    expect(transcript).toMatch(/cd5a31703-B4nKQMBN.js:ZX/);
    expect(transcript).not.toMatch(/cd5a31703-B4nKQMBN.js:qIe turnMark.tail/);
    expect(transcript).toMatch(/officialSxGenericKeys/);
    expect(messages).toMatch(/id: "GWEGVdQi8W"/);
    expect(messages).toMatch(/id: "zl6fNbo7RW"/);
    expect(messages).toMatch(/id: "l7c01euK\+q"/);
    expect(messages).toMatch(/id: "HKBIcgP7KE"/);
    expect(messages).toMatch(/id: "D4ZSZJLOdx"/);
    expect(transcript).not.toMatch(/CopySquareBehind/);
    const icons = readFileSync(path.join(here, "../../../shell/icons.tsx"), "utf8");
    expect(icons).toMatch(/ArrowCounterClockwise: 57630/);
    expect(css).toMatch("text-muted [data-cds=Button]:not([aria-pressed=true])");
    expect(css).toMatch(".pl-1\\.25");
    expect(css).toMatch("text-muted button");
    expect(css).toMatch(".pe-md");
    expect(css).toMatch(".first\\:ps-0:first-child");
  });

  it("Globe Add server is ca80 Oq, not the long JSON template", () => {
    const extras = readFileSync(path.join(here, "OfficialPreviewXrExtras.tsx"), "utf8");
    expect(extras).toMatch(
      /Detect this project's dev servers, write them to \.claude\/launch\.json, then call preview_start\./,
    );
    const pane = readFileSync(path.join(here, "OfficialPreviewPane.tsx"), "utf8");
    expect(pane).toMatch(/OFFICIAL_PREVIEW_SETUP_PROMPT = OFFICIAL_PREVIEW_ADD_SERVER_PROMPT/);
    expect(pane).not.toMatch(/runtimeExecutable/);
  });

  it("officialPreviewIsHttpUrl matches Mi / ja residual", async () => {
    const { officialPreviewIsHttpUrl, officialPreviewNavigateUrl } = await import("./officialPreviewChrome");
    expect(officialPreviewIsHttpUrl("http://127.0.0.1:5173")).toBe(true);
    expect(officialPreviewIsHttpUrl("https://example.com")).toBe(true);
    expect(officialPreviewIsHttpUrl("file:///tmp/a.html")).toBe(false);
    expect(officialPreviewIsHttpUrl("about:blank")).toBe(false);
    expect(officialPreviewNavigateUrl("localhost:3000")).toBe("http://localhost:3000");
    expect(officialPreviewNavigateUrl("example.com")).toBe("https://example.com");
    const { officialNavigatePreviewSucceeded } = await import("./officialPreviewChrome");
    expect(officialNavigatePreviewSucceeded({ ok: true, navigated: true }, true)).toBe(true);
    expect(officialNavigatePreviewSucceeded({ ok: true, navigated: false }, true)).toBe(false);
    expect(officialNavigatePreviewSucceeded(true, true)).toBe(true);
    expect(officialNavigatePreviewSucceeded(undefined, false)).toBe(true);
  });

  it("titlebar Preview waits for navigatePreview before host chrome", () => {
    const pane = readFileSync(path.join(here, "OfficialPreviewPane.tsx"), "utf8");
    expect(pane).toMatch(/officialNavigatePreviewSucceeded/);
    expect(pane).toMatch(/await launch\.navigatePreview\(id, url\)/);
    expect(pane).toMatch(/if \(!navigated\) return/);
    const overrides = readFileSync(path.join(here, "../../../../public/i18n/zh-CN.overrides.json"), "utf8");
    expect(overrides).toMatch(/"r11KJ1wrVP"/);
    expect(overrides).toMatch(/"MHl4RB\/0yg"/);
    expect(overrides).toMatch(/"LDxqrSbuPU"/);
    expect(overrides).toMatch(/"qSE8DDhMi7"/);
    expect(overrides).toMatch(/"zVs93Lbt2D"/);
    expect(overrides).toMatch(/"nSRxtmI8pK"/);
    expect(overrides).toMatch(/"KumhrXhE\/V"/);
    expect(overrides).toMatch(/"fdCS5\/bISp"/);
    expect(overrides).toMatch(/"1B2oJwBn8a"/);
    expect(overrides).toMatch(/"0v5PlsRKXz"/);
    expect(overrides).toMatch(/"b5wi\/TtdZW"/);
  });

  it("cf580 Fn eligible is local && !html-preview- && !design-preview-", async () => {
    const { officialChromeImportFnEligible, officialChromeImportPreviewId } = await import("./officialPreviewChrome");
    expect(officialChromeImportFnEligible({ sessionType: "local" })).toBe(true);
    expect(officialChromeImportFnEligible({ sessionType: "remote" })).toBe(false);
    expect(officialChromeImportFnEligible({ sessionType: "bridge" })).toBe(false);
    expect(officialChromeImportFnEligible({ sessionType: "local", previewId: "html-preview-abc" })).toBe(false);
    expect(officialChromeImportFnEligible({ sessionType: "local", previewId: "design-preview-https://x" })).toBe(false);
    expect(officialChromeImportPreviewId({
      eligible: true,
      liveServerId: null,
      browseId: "browse_code_1",
      httpPage: false,
    })).toBeNull();
    expect(officialChromeImportPreviewId({
      eligible: true,
      liveServerId: "srv:1",
      browseId: "browse_code_1",
      httpPage: false,
    })).toBe("srv:1");
    expect(officialChromeImportPreviewId({
      eligible: true,
      liveServerId: null,
      browseId: "browse_code_1",
      httpPage: true,
    })).toBe("browse_code_1");
    expect(officialChromeImportPreviewId({
      eligible: false,
      liveServerId: "srv:1",
      browseId: "browse_code_1",
      httpPage: true,
    })).toBeNull();
  });

  it("Preview overflow Import cookies is c224 B / c887 Oe", () => {
    const header = readFileSync(path.join(here, "OfficialPreviewHeaderChrome.tsx"), "utf8");
    const pane = readFileSync(path.join(here, "OfficialPreviewPane.tsx"), "utf8");
    const modal = readFileSync(path.join(here, "OfficialChromeImport.tsx"), "utf8");
    const messages = readFileSync(path.join(here, "../officialCodeChromeMessages.ts"), "utf8");
    expect(header).toMatch(/chrome\.importCookies/);
    expect(header).toMatch(/chrome\.useImportedCookies/);
    expect(header).toMatch(/live\.onImportChromeLogins/);
    expect(pane).toMatch(/useOfficialChromeImport/);
    expect(pane).toMatch(/officialChromeImportFnEligible/);
    expect(pane).toMatch(/sessionType: sessionRef\?\.type/);
    expect(pane).toMatch(/officialChromeImportPreviewId/);
    expect(pane).toMatch(/chromeImportEligible/);
    expect(pane).toMatch(/getChromeImportAvailability/);
    expect(modal).toMatch(/listChromeImportSites/);
    expect(modal).toMatch(/importChromeLogins/);
    expect(messages).toMatch(/id: "j\/cnWEhAUx"/);
    expect(messages).toMatch(/id: "ObIsrYl\/hv"/);
    expect(messages).toMatch(/id: "pbp6J1NBUW"/);
    expect(messages).toMatch(/id: "Epnzgt0uKT"/);
    expect(pane).toMatch(/chromeImport\.prompt/);
    expect(modal).toMatch(/getChromeImportSharedOffer/);
    expect(modal).toMatch(/acceptChromeImportSharedOffer/);
    expect(modal).toMatch(/variant: "shared"/);
    expect(modal).toMatch(/onMenuUseImported = anyOffer/);
    expect(modal).toMatch(/\/images\/browser-logos\/\$\{browser\}\.svg/);
    expect(modal).toMatch(/data-cds="TextLink"/);
    expect(modal).toMatch(/officialChromeImportPromptBrowsers/);
    expect(modal).toMatch(/c224804cc-Cihs1Tbi.js:ae/);
    expect(messages).toMatch(/id: "7O4ejXSumQ"/);
    expect(messages).toMatch(/id: "MWjOMpKsd7"/);
    expect(messages).toMatch(/id: "hZaDU7GBba"/);
    expect(messages).toMatch(/\{others, plural, one \{# other site\} other \{# other sites\}\}/);
    expect(messages).toMatch(/id: "Ayx9qWb2Pk"/);
    expect(messages).toMatch(/id: "ydrhToQu\/y"/);
    expect(messages).toMatch(/id: "8DbsasU3Hw"/);
    expect(modal).toMatch(/formatOfficialIcu/);
    expect(modal).toMatch(/setPresence\("asking"\)/);
    expect(modal).toMatch(/prefsHydrated/);
    expect(modal).toMatch(/c887e9f0f-CLUwu5T9.js:Te/);
    expect(modal).toMatch(/officialChromeImportIsWindows/);
    expect(messages).toMatch(/id: "DdO9T4OTtK"/);
    expect(messages).toMatch(/id: "8DUof\/fSOX"/);
    expect(modal).toMatch(/officialChromeImportErrorCopy/);
    expect(modal).toMatch(/c887e9f0f-CLUwu5T9.js:Ce/);
    expect(modal).not.toMatch(/\{chrome\.importCookiesFailed\}/);
    const listSitesBlock = modal.slice(modal.indexOf("const listSites"), modal.indexOf("const runImport"));
    expect(listSitesBlock).toMatch(/setPresence\("asking"\)/);
    expect(modal).not.toMatch(/confirmChromeImportPresence/);
    const native = readFileSync(
      path.join(here, "../../../../../open-claude-desktop/electron/main/services/launch/chromeImport.ts"),
      "utf8",
    );
    const handlers = readFileSync(
      path.join(here, "../../../../../open-claude-desktop/electron/main/ipc/featureHandlers.ts"),
      "utf8",
    );
    const preload = readFileSync(
      path.join(here, "../../../../../open-claude-desktop/electron/preload/bridges/webBridge.ts"),
      "utf8",
    );
    expect(native).toMatch(/getBuiltinModule/);
    expect(native).toMatch(/getBuiltin\?\.\("node:sqlite"\)/);
    expect(native).toMatch(/\$\{src\}-wal/);
    expect(native).not.toMatch(/\$\{src\}-shm/);
    expect(native).toMatch(/SQLITE_FILE_MODE = 0o600/);
    expect(native).toMatch(/loadClaudeSwiftKeychain/);
    expect(native).toMatch(/keychain_item_missing/);
    expect(native).toMatch(/CHROME_IMPORT_SHARED_ID = "shared"/);
    expect(native).toMatch(/chrome-import-sites\.json/);
    expect(native).toMatch(/export async function getChromeImportSharedOffer/);
    expect(native).toMatch(/export async function acceptChromeImportSharedOffer/);
    expect(native).toMatch(/sharedSession/);
    expect(native).toMatch(/cookieHostSet/);
    expect(handlers).toMatch(/getChromeImportSharedOffer: async \(_event, previewId, anySite\)/);
    expect(handlers).toMatch(/acceptChromeImportSharedOffer: async \(_event, previewId, keepSignedIn\)/);
    expect(preload).toMatch(/"getChromeImportSharedOffer"/);
    expect(preload).toMatch(/"acceptChromeImportSharedOffer"/);
  });

  it("Files editor is pin vN textarea, not CodeMirror", () => {
    const pane = readFileSync(path.join(here, "OfficialFilePane.tsx"), "utf8");
    expect(pane).toMatch(/<textarea/);
    expect(pane).toMatch(/chrome\.editFileContents/);
    expect(pane).not.toMatch(/OfficialEpitaxyCodeMirrorFile/);
    const messages = readFileSync(path.join(here, "../officialCodeChromeMessages.ts"), "utf8");
    expect(messages).toMatch(/id: "q3agrjpNe5"/);
    // Pin vN: markdown S + Pierre iu. No html srcDoc, csv table, or c6e1 native On.
    expect(pane).not.toMatch(/data-testid="file-sandboxed-preview"/);
    expect(pane).not.toMatch(/srcDoc/);
    expect(pane).not.toMatch(/OfficialEpitaxyCsvPreview/);
    expect(pane).not.toMatch(/CoworkNativeFilePreview/);
    expect(pane).toMatch(/isn.t valid UTF-8/);
    const panes = readFileSync(path.join(here, "EpitaxySidePanes.tsx"), "utf8");
    expect(panes).toMatch(/epitaxy-popout-files-tree-shown/);
    expect(panes).toMatch(/isEpitaxyPopoutWindow/);
    expect(pane).toMatch(/!looksBinary && officialFileInvalidUtf8/);
    expect(pane).toMatch(/!editing && invalidUtf8/);
    expect(pane).not.toMatch(/!nativePreview && invalidUtf8/);
    expect(pane).not.toMatch(/setNativePreviewFailed/);
    expect(pane).not.toMatch(/csvPreview/);
    expect(pane).not.toMatch(/csvDelimiter/);
    expect(pane).not.toMatch(/nativePreview/);
    expect(pane).not.toMatch(/c6e1d8764/);
    expect(pane).not.toMatch(/OfficialEpitaxyCsvPreview/);
    expect(pane).not.toMatch(/CoworkNativeFilePreview/);
    expect(pane).toMatch(/overflow: "wrap" as const/);
    expect(pane).not.toMatch(/unsafeCSS/);
    expect(pane).not.toMatch(/onPostRender/);
    expect(pane).toMatch(/<textarea/);
    expect(pane).toMatch(/whitespace-pre/);
    expect(messages).toMatch(/id: "q3agrjpNe5"/);
    expect(pane).toMatch(/isMarkdownPreviewPath\(fileView\?\.path/);
    expect(pane).not.toMatch(/filePath=\{state\.absPath \?\? filePath\}/);
    const nativeViewer = readFileSync(path.join(here, "../../cowork/session/CoworkFileViewer.tsx"), "utf8");
    expect(nativeViewer).toMatch(/data-testid="native-file-preview-error"/);
    expect(nativeViewer).toMatch(/previewUnavailable/);
    // Official Izt C() always jkA, including 0×0 (c6e1). Skipping 0×0 parks WCV over chat.
    expect(nativeViewer).not.toMatch(/zero-size:/);
    expect(nativeViewer).toMatch(/ResizeObserver\(scheduleShow\)/);
    expect(nativeViewer).toMatch(/parkApi\(captureBounds\)/);
    const popout = readFileSync(
      path.join(here, "../../../../../open-claude-desktop/electron/main/windows/epitaxyPopoutWindows.ts"),
      "utf8",
    );
    expect(popout).toMatch(/coworkFilePreviewFor/);
    expect(popout).toMatch(/new CoworkFilePreviewManager\(window/);
    const handlers = readFileSync(
      path.join(here, "../../../../../open-claude-desktop/electron/main/ipc/featureHandlers.ts"),
      "utf8",
    );
    expect(handlers).toMatch(/filePreviewForEvent\(event\)\.show/);
    const preview = readFileSync(
      path.join(here, "../../../../../open-claude-desktop/electron/main/windows/coworkFilePreviewManager.ts"),
      "utf8",
    );
    expect(preview).toMatch(/path\.isAbsolute\(sourcePath\)/);
    expect(preview).toMatch(/path\.resolve\(root, sourcePath\)/);
  });
});

describe("c887 Chrome Import pick + cc432 VY origin", () => {
  it("pick is Choose sites + Select all De, import has no asking presence", () => {
    const chrome = readFileSync(path.join(here, "OfficialChromeImport.tsx"), "utf8");
    const messages = readFileSync(path.join(here, "../officialCodeChromeMessages.ts"), "utf8");
    expect(messages).toMatch(/id: "F6ekpMXFUR"/);
    expect(messages).toMatch(/id: "94Fg25VD0N"/);
    expect(chrome).toMatch(/chrome\.chooseSitesToBringOver/);
    expect(chrome).toMatch(/c887e9f0f-CLUwu5T9.js:De/);
    expect(chrome).toMatch(/OfficialChromeImportSelectAll/);
    expect(chrome).toMatch(/hover:bg-fill-ghost-hover/);
    const runImport = chrome.slice(chrome.indexOf("const runImport"));
    expect(runImport.slice(0, 1800)).toMatch(/importChromeLogins/);
    expect(runImport.slice(0, 1800)).not.toMatch(/setPresence\("asking"\)/);
    expect(runImport).toMatch(/all_failed/);
    expect(runImport).toMatch(/importedCount === 0 && failedCount > 0/);
    expect(messages).toMatch(/id: "tOh8Hmi0l5"/);
    expect(chrome).toMatch(/setPresence\("asking"\)/);
    const handlers = readFileSync(
      path.join(here, "../../../../../open-claude-desktop/electron/main/ipc/featureHandlers.ts"),
      "utf8",
    );
    const importBlock = handlers.slice(handlers.indexOf("importChromeLogins:"));
    expect(importBlock.slice(0, 1200)).toMatch(/runChromeImport/);
    expect(importBlock.slice(0, 1200)).not.toMatch(/confirmChromeImportPresence/);
  });

  it("origin env pill is c119 YM contained + Folder1 size s", () => {
    const pill = readFileSync(path.join(here, "../OfficialComposerPills.tsx"), "utf8");
    const local = readFileSync(path.join(here, "../composer/LocalEnvironmentPill.tsx"), "utf8");
    const chrome = readFileSync(path.join(here, "../OfficialEpitaxyComponents.tsx"), "utf8");
    expect(chrome).toMatch(/officialComposerPillClass = "relative inline-flex items-center gap-g5 h-\[24px\] px-p5 rounded-r5 bg-fill-contained-default/);
    expect(chrome).toMatch(/effect-contained-default/);
    expect(pill).toMatch(/truncate max-w-\[200px\]/);
    expect(local).toMatch(/truncate max-w-\[200px\]/);
    expect(chrome).toMatch(/truncate max-w-\[160px\]/);
    const checkbox = readFileSync(path.join(here, "../../shared/OfficialCheckbox.tsx"), "utf8");
    expect(checkbox).toMatch(/indeterminate/);
    const importUi = readFileSync(path.join(here, "OfficialChromeImport.tsx"), "utf8");
    expect(importUi).toMatch(/indeterminate=\{selectedVisible > 0 && !allVisible\}/);
    expect(pill).toMatch(/name=\{icon\} size="s"/);
    expect(local).toMatch(/name=\{envIcon\} size="s"/);
    expect(chrome).toMatch(/name="Folder1" size="s"/);
    expect(pill).toMatch(/name="Folder1" size="s"/);
    expect(chrome).toMatch(/truncate max-w-\[160px\]/);
    expect(chrome).not.toMatch(/bg-fill-secondary text-secondary text-body shadow-field/);
    expect(chrome).not.toMatch(/name="Folder" preferFont size="sm"/);
    expect(local).toMatch(/COMPOSER_ORIGIN_MESSAGES/);
    expect(local).toMatch(/origin\.local/);
    expect(local).toMatch(/SystemComputerLaptopMacbook/);
    expect(local).toMatch(/ConsoleTerminal/);
    expect(local).not.toMatch(/envIcon = isSsh \? "CommandLine" : "Laptop"/);
    expect(pill).toMatch(/local: "SystemComputerLaptopMacbook"/);
    expect(pill).toMatch(/ssh: "ConsoleTerminal"/);
    expect(pill).toMatch(/name="SystemComputerLaptopMacbook"/);
    expect(pill).toMatch(/FolderAddRight/);
    expect(pill).toMatch(/rounded-r5 bg-fill-contained-default effect-contained-default/);
    expect(pill).toMatch(/gap-g5 px-p5/);
    expect(pill).toMatch(/gitText\.worktree/);
    expect(pill).toMatch(/workInIsolatedCopy/);
    const workspace = readFileSync(path.join(here, "../composer/OfficialWorkspaceControls.tsx"), "utf8");
    expect(workspace).toMatch(/OfficialComposerBranchGroup/);
    expect(workspace).toMatch(/OfficialComposerAddFolderButton/);
    expect(workspace).toMatch(/gap-g5 pb-p3 pr-\[96px\]/);
    expect(workspace).toMatch(/selectFolderForLocalSession/);
    expect(workspace).toMatch(/addFolderToSession/);
    expect(workspace).not.toMatch(/bg-fill-secondary shadow-field/);
    expect(workspace).not.toMatch(/FolderPlus/);
    expect(workspace).not.toMatch(/<span>worktree<\/span>/);
    expect(readFileSync(path.join(here, "../officialCodeChromeMessages.ts"), "utf8")).toMatch(/id: "X\+EIjDhedR"/);
    expect(readFileSync(path.join(here, "../officialCodeChromeMessages.ts"), "utf8")).toMatch(/id: "f\/RPdup9RQ"/);
    expect(chrome).toMatch(/gitText\.selectFolderEllipsis/);
    expect(chrome).toMatch(/gitText\.workingDirectory/);
    expect(chrome).toMatch(/gitText\.recent/);
    expect(chrome).toMatch(/gitText\.browseRemoteFolder/);
    expect(chrome).toMatch(/gitText\.openFolderEllipsis/);
    expect(chrome).not.toMatch(/OfficialMenuHeader>Recent</);
    expect(chrome).not.toMatch(/Browse remote folder…" : "Open folder…/);
    expect(readFileSync(path.join(here, "../officialCodeChromeMessages.ts"), "utf8")).toMatch(/id: "iXpep1vGVo"/);
    expect(readFileSync(path.join(here, "../officialCodeChromeMessages.ts"), "utf8")).toMatch(/id: "YzhKoa\+aW\/"/);
    expect(readFileSync(path.join(here, "../officialCodeChromeMessages.ts"), "utf8")).toMatch(/id: "W4SaxYXWRk"/);
    expect(readFileSync(path.join(here, "../officialCodeChromeMessages.ts"), "utf8")).toMatch(/id: "hG0uP4177X"/);
    expect(readFileSync(path.join(here, "../officialCodeChromeMessages.ts"), "utf8")).toMatch(/id: "ge\+adwsPfE"/);
    expect(readFileSync(path.join(here, "../officialCodeChromeMessages.ts"), "utf8")).toMatch(/id: "MpsZ34EpZH"/);
    expect(pill).toMatch(/origin\.desktopOnly/);
    expect(pill).not.toMatch(/>Desktop only</);
    expect(local).toMatch(/origin\.ssh/);
    expect(local).not.toMatch(/>SSH</);
  });
});
