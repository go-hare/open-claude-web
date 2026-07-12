/**
 * Official Gzt / Dme local-session file-detail helpers (index-BELzQL5P.pretty.js).
 * Pure routing/title helpers live here so tests can load without desktopBridge.
 * Async load lives in loadCoworkFileDetail.ts (readLocalFile session signature).
 */

export type CoworkFileViewMode = "normal" | "raw";

export type CoworkFileDisplayType = "code" | "image" | "nonrenderable" | "rich";

export type CoworkFileDetailContent =
  | { kind: "text"; text: string }
  | { kind: "image"; dataUrl: string }
  | { kind: "empty" };

export type CoworkFileDetailState = {
  content?: CoworkFileDetailContent;
  error?: string;
  isLoading: boolean;
};

/** Official pzt / gzt SkillMdContent parsed frontmatter. */
export type CoworkSkillMdFrontmatter = {
  content: string;
  contentStartLine: number;
  description: string | null;
  frontmatterFieldLines: Record<string, number>;
  hasExtraFrontmatterFields: boolean;
  otherFields: Array<{ key: string; value: string }>;
};

/** Official jzt / Nzt: native preview candidates (Izt). */
export const COWORK_NATIVE_PREVIEW_EXT = /\.(html?|svg|pdf|docx?|pptx?)$/i;

/** Official Nzt(path) — extension gate only; Gzt also requires the async isEnabled gate. */
export function isCoworkNativePreviewPath(path: string): boolean {
  return COWORK_NATIVE_PREVIEW_EXT.test(path);
}

export const COWORK_OFFICE_NATIVE_PREVIEW_EXT = /\.(docx?|pptx?)$/i;

export function isCoworkOfficeNativePreviewPath(path: string): boolean {
  return COWORK_OFFICE_NATIVE_PREVIEW_EXT.test(path);
}

/** Official Izt path argument: strip computer:// before URI-component encoding. */
export function encodeCoworkNativePreviewPath(path: string): string {
  return encodeURIComponent(stripCoworkComputerPrefix(path));
}

export function coworkNativePreviewShowSucceeded(result: boolean | { ok: boolean }): boolean {
  return typeof result === "boolean" ? result : result.ok;
}

export function coworkNativePreviewShowPainted(result: boolean | { ok: boolean; painted?: boolean }): boolean {
  return typeof result === "boolean" ? result : result.ok && result.painted === true;
}

export function coworkFileBasename(path: string): string {
  const normalized = path.replace(/^computer:\/\//, "");
  const parts = normalized.split(/[/\\]/).filter(Boolean);
  return parts.at(-1) || normalized || path;
}

/** Official q5e displayName/displayExt for file header title. */
export function coworkFileDisplayParts(path: string): { displayExt: string | null; displayName: string } {
  const name = coworkFileBasename(path);
  if (/\.(skill|plugin)$/i.test(name)) {
    return { displayExt: null, displayName: name.replace(/\.(skill|plugin)$/i, "") };
  }
  const segments = name.split(".");
  if (segments.length <= 1) return { displayExt: null, displayName: titleCaseWords(name.replaceAll(/[_-]/g, " ")) };
  const ext = segments.at(-1) ?? "";
  const base = segments.slice(0, -1).join(".").replaceAll(/[_-]/g, " ");
  return { displayExt: ext ? ext.toUpperCase() : null, displayName: titleCaseWords(base) };
}

/** Official Lme / Tme subset — syntax id for wzt code branch. */
const COWORK_FILE_SYNTAX_BY_EXT: Record<string, string> = {
  html: "html",
  htm: "html",
  xhtml: "html",
  css: "css",
  scss: "scss",
  sass: "sass",
  less: "less",
  js: "javascript",
  jsx: "jsx",
  ts: "typescript",
  tsx: "tsx",
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  xml: "xml",
  svg: "svg",
  py: "python",
  rb: "ruby",
  php: "php",
  java: "java",
  c: "c",
  h: "c",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  cs: "csharp",
  go: "go",
  rs: "rust",
  swift: "swift",
  kt: "kotlin",
  scala: "scala",
  dart: "dart",
  lua: "lua",
  pl: "perl",
  r: "r",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  fish: "fish",
  bat: "batch",
  cmd: "batch",
  ps1: "powershell",
  md: "markdown",
  mdx: "markdown",
  markdown: "markdown",
  skill: "skill",
  mermaid: "mermaid",
  mmd: "mermaid",
  tex: "latex",
  rst: "restructuredtext",
  asciidoc: "asciidoc",
  adoc: "asciidoc",
  csv: "csv",
  tsv: "tsv",
  toml: "toml",
  ini: "ini",
  conf: "ini",
  cfg: "ini",
  sql: "sql",
  graphql: "graphql",
  gql: "graphql",
  dockerfile: "dockerfile",
  dockerignore: "docker",
  gitignore: "git",
  gitattributes: "git",
  editorconfig: "editorconfig",
  diff: "diff",
  patch: "diff",
  nginx: "nginx",
  htaccess: "apacheconf",
};

/** Official Ame + Lme. */
export function coworkFileSyntax(path: string, syntaxOverride?: string): string {
  if (syntaxOverride) return syntaxOverride;
  const ext = coworkFileExtension(path);
  return COWORK_FILE_SYNTAX_BY_EXT[ext] || "plaintext";
}

export function coworkFileExtension(path: string): string {
  return coworkFileBasename(path).split(".").pop()?.toLowerCase() || "";
}

/** Official Dme subset for local_session preview routing. Optional syntaxOverride = g?.renderAs path. */
export function resolveCoworkFileDisplay(path: string, syntaxOverride?: string): {
  displayFileType: CoworkFileDisplayType;
  fileSyntax: string;
  isHtml: boolean;
  isImage: boolean;
  isMarkdown: boolean;
  isSkill: boolean;
  isTextContent: boolean;
  showViewToggle: boolean;
} {
  const name = coworkFileBasename(path);
  const fileSyntax = coworkFileSyntax(path, syntaxOverride);
  const isImage = /\.(png|jpg|jpeg|gif|bmp|webp)$/i.test(name);
  const isMarkdown = fileSyntax === "markdown" || /\.(md|mdx|markdown)$/i.test(name);
  const isHtml = fileSyntax === "html" || /\.html?$/i.test(name);
  const isSvg = fileSyntax === "svg" || /\.svg$/i.test(name);
  const isPdf = /\.pdf$/i.test(name);
  const isCsv = fileSyntax === "csv" || /\.csv$/i.test(name);
  const isTsv = fileSyntax === "tsv" || /\.tsv$/i.test(name);
  const isMermaid = fileSyntax === "mermaid" || /\.(mermaid|mmd)$/i.test(name);
  // Official bm.Skill / bm.Plugin are package extensions — SKILL.md stays markdown (gzt).
  const isSkill = fileSyntax === "skill" || /\.skill$/i.test(name);
  const isPlugin = /\.plugin$/i.test(name);
  const isOfficeDocument = /\.(docx?|pptx?)$/i.test(name);
  const isSpreadsheet = /\.(xlsx?|xls)$/i.test(name);
  const isBinaryNonPreviewable = /\.(zip|tar|gz|tgz|rar|7z|exe|dmg|pkg|app|wasm|bin|iso)$/i.test(name);
  const isVideo = /\.(mp4|webm|mov|m4v|avi|mkv)$/i.test(name);
  // Official Dme isRichType: html|svg|react|mermaid|pdf|office|spreadsheet|csv|tsv
  const isRich = isHtml || isSvg || isMermaid || isPdf || isCsv || isTsv || isOfficeDocument || isSpreadsheet;
  // Official isRichTypeWithPlaintext (showViewToggle companions): html|svg|react|mermaid|csv|tsv
  const isRichTypeWithPlaintext = isHtml || isSvg || isMermaid || isCsv || isTsv;
  // Official Dme: isTextContent excludes image/video/skill/plugin/pdf/office/spreadsheet/binary.
  const isTextContent = !(
    isImage ||
    isVideo ||
    isSkill ||
    isPlugin ||
    isPdf ||
    isOfficeDocument ||
    isSpreadsheet ||
    isBinaryNonPreviewable
  );
  return {
    displayFileType: isImage
      ? "image"
      : isVideo || isBinaryNonPreviewable
        ? "nonrenderable"
        : isRich
          ? "rich"
          : isTextContent
            ? "code"
            : "nonrenderable",
    fileSyntax,
    isHtml: isHtml || isSvg,
    isImage,
    isMarkdown,
    isSkill,
    isTextContent,
    showViewToggle: isMarkdown || isRichTypeWithPlaintext,
  };
}

export function stripCoworkComputerPrefix(path: string): string {
  return path.replace(/^computer:\/\//, "");
}

/**
 * Official wzt H(content, language): pretty-print JSON when language is json.
 * Invalid JSON falls back to original text.
 */
export function formatCoworkFileCodeContent(content: string, language: string): string {
  if (language !== "json" || !content) return content;
  try {
    return JSON.stringify(JSON.parse(content), null, 2);
  } catch {
    return content;
  }
}

/**
 * Official pzt(e) for SKILL.md / markdown frontmatter (index-BELzQL5P ~213719).
 * Simple key:value YAML only (WPt-compatible subset for local skill files).
 */
export function parseCoworkSkillMdFrontmatter(source: string): CoworkSkillMdFrontmatter {
  const match = source.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return {
      description: null,
      otherFields: [],
      hasExtraFrontmatterFields: false,
      content: source,
      contentStartLine: 1,
      frontmatterFieldLines: {},
    };
  }
  const frontmatterRaw = match[1] ?? "";
  const body = (match[2] ?? "").trim();
  const bodyStart = source.length - (match[2] ?? "").trimStart().length;
  const contentStartLine = source.slice(0, bodyStart).split("\n").length;
  let parsed: Record<string, unknown>;
  try {
    parsed = parseSimpleYamlMap(frontmatterRaw);
  } catch {
    return {
      description: null,
      otherFields: [],
      hasExtraFrontmatterFields: true,
      content: body,
      contentStartLine,
      frontmatterFieldLines: {},
    };
  }
  const fields = flattenYamlFields(parsed);
  const frontmatterFieldLines: Record<string, number> = {};
  for (const { key } of fields) {
    const line = frontmatterFieldLine(frontmatterRaw, key);
    frontmatterFieldLines[key] = line ?? 2;
  }
  const description = fields.find((field) => field.key === "description")?.value ?? null;
  const otherFields = fields.filter(
    (field) =>
      field.key !== "description" &&
      field.key !== "name" &&
      field.key !== "user-invocable" &&
      field.key !== "argument-hint",
  );
  return {
    description,
    otherFields,
    hasExtraFrontmatterFields: Object.keys(parsed).some((key) => key !== "name" && key !== "description"),
    content: body,
    contentStartLine,
    frontmatterFieldLines,
  };
}

/** Official fzt: title-case hyphenated frontmatter keys for SkillMdContent labels. */
export function coworkSkillFrontmatterLabel(key: string): string {
  return key
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function titleCaseWords(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Minimal YAML map parser for SKILL.md frontmatter (flat + nested maps/scalars). */
function parseSimpleYamlMap(source: string): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  const stack: Array<{ indent: number; map: Record<string, unknown> }> = [{ indent: -1, map: root }];
  for (const rawLine of source.split("\n")) {
    if (!rawLine.trim() || rawLine.trimStart().startsWith("#")) continue;
    const indent = rawLine.match(/^\s*/)?.[0].length ?? 0;
    const line = rawLine.trim();
    const match = /^([^:#]+):\s*(.*)$/.exec(line);
    if (!match) continue;
    const key = match[1].trim();
    let value: unknown = match[2].trim();
    if (value === "" || value === "|" || value === ">") {
      value = {};
    } else if (
      (typeof value === "string" && value.startsWith('"') && value.endsWith('"')) ||
      (typeof value === "string" && value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
    const parent = stack[stack.length - 1].map;
    parent[key] = value;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      stack.push({ indent, map: value as Record<string, unknown> });
    }
  }
  return root;
}

/** Official dzt: flatten nested maps to {key,value} leaf list. */
function flattenYamlFields(value: Record<string, unknown>, out: Array<{ key: string; value: string }> = []) {
  for (const [key, entry] of Object.entries(value)) {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      if (entry != null) {
        const text = String(entry).trim();
        if (text) out.push({ key, value: text });
      }
    } else {
      flattenYamlFields(entry as Record<string, unknown>, out);
    }
  }
  return out;
}

/** Official uzt: 1-based line of `key:` in frontmatter block. */
function frontmatterFieldLine(frontmatterRaw: string, key: string): number | null {
  const escaped = key.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  const pattern = new RegExp(`^\\s*${escaped}\\s*:`);
  const lines = frontmatterRaw.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    if (pattern.test(lines[index])) return index + 1;
  }
  return null;
}
