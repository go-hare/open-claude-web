import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer } from "vite";

const vite = await createServer({
  appType: "custom",
  logLevel: "silent",
  root: process.cwd(),
  server: { middlewareMode: true },
});

const {
  COWORK_NATIVE_PREVIEW_EXT,
  coworkFileBasename,
  coworkFileDisplayParts,
  coworkFileSyntax,
  coworkNativePreviewShowPainted,
  coworkNativePreviewShowSucceeded,
  coworkSkillFrontmatterLabel,
  formatCoworkFileCodeContent,
  isCoworkNativePreviewPath,
  parseCoworkSkillMdFrontmatter,
  resolveCoworkFileDisplay,
  stripCoworkComputerPrefix,
} = await vite.ssrLoadModule("/src/features/cowork/session/coworkFileDetailModel.ts");
const { coworkComputerLinkPath } = await vite.ssrLoadModule("/src/features/cowork/session/transcript/coworkComputerLink.ts");
const {
  ELECTRON_WCV_OCCLUSION_SELECTOR,
  electronWebContentsViewOcclusionCount,
  occludeElectronWebContentsView,
} = await vite.ssrLoadModule("/src/features/cowork/session/electronWebContentsViewOcclusion.ts");

after(async () => {
  await vite.close();
});

test("ohe basename strips computer:// and path segments", () => {
  assert.equal(coworkFileBasename("computer:///tmp/foo/bar.md"), "bar.md");
  assert.equal(coworkFileBasename("/Users/a/b/report.pdf"), "report.pdf");
  assert.equal(stripCoworkComputerPrefix("computer:///tmp/x"), "/tmp/x");
});

test("q5e-like display parts title-case base and upper-case ext", () => {
  const parts = coworkFileDisplayParts("/tmp/my_report.md");
  assert.equal(parts.displayName, "My Report");
  assert.equal(parts.displayExt, "MD");
});

test("Dme-like routing for markdown/image/html/nonrenderable", () => {
  assert.equal(resolveCoworkFileDisplay("a.md").isMarkdown, true);
  assert.equal(resolveCoworkFileDisplay("a.md").showViewToggle, true);
  assert.equal(resolveCoworkFileDisplay("a.md").displayFileType, "code");
  assert.equal(resolveCoworkFileDisplay("a.md").fileSyntax, "markdown");
  assert.equal(resolveCoworkFileDisplay("pic.png").isImage, true);
  assert.equal(resolveCoworkFileDisplay("pic.png").displayFileType, "image");
  assert.equal(resolveCoworkFileDisplay("page.html").isHtml, true);
  assert.equal(resolveCoworkFileDisplay("page.html").displayFileType, "rich");
  assert.equal(resolveCoworkFileDisplay("archive.zip").displayFileType, "nonrenderable");
  // SKILL.md is markdown document (gzt), not bm.Skill package.
  assert.equal(resolveCoworkFileDisplay("/skills/demo/SKILL.md").isMarkdown, true);
  assert.equal(resolveCoworkFileDisplay("/skills/demo/SKILL.md").isSkill, false);
  assert.equal(resolveCoworkFileDisplay("/skills/demo/SKILL.md").displayFileType, "code");
  // renderAs markdown override (Gzt ke).
  assert.equal(resolveCoworkFileDisplay("notes.txt", "markdown").isMarkdown, true);
  assert.equal(resolveCoworkFileDisplay("notes.txt", "markdown").showViewToggle, true);
});

test("Lme syntax map and JSON pretty-print match wzt H()", () => {
  assert.equal(coworkFileSyntax("a.ts"), "typescript");
  assert.equal(coworkFileSyntax("a.json"), "json");
  assert.equal(formatCoworkFileCodeContent('{"a":1}', "json"), '{\n  "a": 1\n}');
  assert.equal(formatCoworkFileCodeContent("{not-json", "json"), "{not-json");
  assert.equal(formatCoworkFileCodeContent("plain", "typescript"), "plain");
});

test("pzt SKILL.md frontmatter parse + fzt labels", () => {
  const parsed = parseCoworkSkillMdFrontmatter(
    "---\nname: demo\ndescription: Does things\nlicense: MIT\n---\n\n# Body\n\nHello",
  );
  assert.equal(parsed.description, "Does things");
  assert.equal(parsed.content.includes("# Body"), true);
  assert.deepEqual(
    parsed.otherFields.map((field) => field.key),
    ["license"],
  );
  assert.equal(parsed.hasExtraFrontmatterFields, true);
  assert.equal(coworkSkillFrontmatterLabel("argument-hint"), "Argument Hint");
  const plain = parseCoworkSkillMdFrontmatter("# just markdown");
  assert.equal(plain.description, null);
  assert.equal(plain.content, "# just markdown");
});

test("Nzt native preview extension set matches official jzt subset", () => {
  assert.equal(COWORK_NATIVE_PREVIEW_EXT.test("doc.pdf"), true);
  assert.equal(COWORK_NATIVE_PREVIEW_EXT.test("x.html"), true);
  assert.equal(COWORK_NATIVE_PREVIEW_EXT.test("x.docx"), true);
  assert.equal(COWORK_NATIVE_PREVIEW_EXT.test("x.md"), false);
  assert.equal(isCoworkNativePreviewPath("/tmp/x.pdf"), true);
  assert.equal(coworkNativePreviewShowSucceeded(true), true);
  assert.equal(coworkNativePreviewShowSucceeded({ ok: true }), true);
  assert.equal(coworkNativePreviewShowSucceeded({ ok: false }), false);
  // Official Izt keeps native on ok alone; parked success must not be treated as decline.
  assert.equal(coworkNativePreviewShowSucceeded({ ok: true, painted: false }), true);
  assert.equal(coworkNativePreviewShowPainted(true), true);
  assert.equal(coworkNativePreviewShowPainted({ ok: true, painted: true }), true);
  assert.equal(coworkNativePreviewShowPainted({ ok: true, painted: false }), false);
  assert.equal(coworkNativePreviewShowPainted({ ok: false, painted: true }), false);
});

test("official Gzt body is exclusive native-or-content", () => {
  // Mirrors Gzt ~216565: yt && viewing !== "raw" returns only Izt; otherwise content path.
  const chooseBody = ({ enabled, failed, viewing }) =>
    enabled && !failed && viewing === "normal" ? "native" : "content";
  assert.equal(chooseBody({ enabled: true, failed: false, viewing: "normal" }), "native");
  assert.equal(chooseBody({ enabled: true, failed: true, viewing: "normal" }), "content");
  assert.equal(chooseBody({ enabled: true, failed: false, viewing: "raw" }), "content");
  assert.equal(chooseBody({ enabled: false, failed: false, viewing: "normal" }), "content");
});

test("computer:// link path decodes like official SELECT_FILE handler", () => {
  assert.equal(coworkComputerLinkPath("computer:///tmp/foo%20bar.md"), "/tmp/foo bar.md");
  assert.equal(coworkComputerLinkPath("https://example.com"), null);
});

test("CRt selector matches official native WebContentsView occluders", () => {
  assert.equal(
    ELECTRON_WCV_OCCLUSION_SELECTOR,
    '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [data-occludes-electron-wcv]',
  );
});

test("xRt-like occlusion counter increments and releases once", () => {
  assert.equal(electronWebContentsViewOcclusionCount(), 0);
  const releaseFirst = occludeElectronWebContentsView();
  const releaseSecond = occludeElectronWebContentsView();
  assert.equal(electronWebContentsViewOcclusionCount(), 2);
  releaseFirst();
  releaseFirst();
  assert.equal(electronWebContentsViewOcclusionCount(), 1);
  releaseSecond();
  assert.equal(electronWebContentsViewOcclusionCount(), 0);
});

test("loadCoworkFileDetail prefers official inline streamingFile content", async () => {
  // desktopBridge index reads window at module init; stub for SSR unit test.
  globalThis.window ??= {
    claudeDesktopBridge: undefined,
    process: undefined,
  };
  const { loadCoworkFileDetail } = await vite.ssrLoadModule("/src/features/cowork/session/loadCoworkFileDetail.ts");
  const content = await loadCoworkFileDetail("local_session", "/tmp/missing-on-disk.md", "# hello inline");
  assert.deepEqual(content, { kind: "text", text: "# hello inline" });
});
