/**
 * Official claudeusercontent sandbox constants from residual:
 *   index-BELzQL5P A4e / U4e / userContentRendererUrl
 *   c5f4e1303 zL / xm MIME enum
 *
 * Shared by eit MermaidIframe and g6e RichSandbox — no product invent.
 */

/** Official config userContentRendererUrl (index-BELzQL5P). */
export const OFFICIAL_USER_CONTENT_RENDERER_URL =
  "https://www.claudeusercontent.com";

/** Official A4e (index-BELzQL5P). */
export const OFFICIAL_SANDBOX = {
  ReadyForContent: "anthropic.claude.usercontent.sandbox.ReadyForContent",
  SetContent: "anthropic.claude.usercontent.sandbox.SetContent",
  GetFile: "anthropic.claude.usercontent.sandbox.GetFile",
  SendConversationMessage:
    "anthropic.claude.usercontent.sandbox.SendConversationMessage",
  RunCode: "anthropic.claude.usercontent.sandbox.RunCode",
  ClaudeCompletion: "anthropic.claude.usercontent.sandbox.ClaudeCompletion",
  ReportError: "anthropic.claude.usercontent.sandbox.ReportError",
  GetScreenshot: "anthropic.claude.usercontent.sandbox.GetScreenshot",
  BroadcastContentSize:
    "anthropic.claude.usercontent.sandbox.BroadcastContentSize",
  OpenExternal: "anthropic.claude.usercontent.sandbox.OpenExternal",
  DownloadFile: "anthropic.claude.usercontent.sandbox.DownloadFile",
  CopyHtmlContent: "anthropic.claude.usercontent.sandbox.CopyHtmlContent",
  TrackInteraction: "anthropic.claude.usercontent.sandbox.TrackInteraction",
  DOMContentLoaded: "anthropic.claude.usercontent.sandbox.DOMContentLoaded",
  StorageGet: "anthropic.claude.usercontent.sandbox.StorageGet",
  StorageSet: "anthropic.claude.usercontent.sandbox.StorageSet",
  GetDOMSnapshot: "anthropic.claude.usercontent.sandbox.GetDOMSnapshot",
} as const;

/** Official I4e empty protobuf residual. */
export const OFFICIAL_EMPTY_PAYLOAD = {
  "@type": "type.googleapis.com/google.protobuf.Empty",
} as const;

export const OFFICIAL_SANDBOX_CONTENT_TYPE =
  "type.googleapis.com/anthropic.claude.usercontent.sandbox.SandboxContent";

/**
 * Official U4e alwaysPermitted methods (D4e residual).
 * Host accepts these without permission UI.
 */
export const OFFICIAL_ALWAYS_PERMITTED = new Set<string>([
  OFFICIAL_SANDBOX.ReadyForContent,
  OFFICIAL_SANDBOX.ReportError,
  OFFICIAL_SANDBOX.OpenExternal,
  OFFICIAL_SANDBOX.DownloadFile,
  OFFICIAL_SANDBOX.TrackInteraction,
  OFFICIAL_SANDBOX.DOMContentLoaded,
  OFFICIAL_SANDBOX.BroadcastContentSize,
  OFFICIAL_SANDBOX.GetScreenshot,
  OFFICIAL_SANDBOX.CopyHtmlContent,
  OFFICIAL_SANDBOX.GetDOMSnapshot,
]);

/**
 * Official zL / xm MIME (c5f4e1303-CSqThUeQ.js).
 * b6e: type !== Code && type !== Markdown → rich g6e path.
 */
export const OFFICIAL_XM = {
  Text: "text/plain",
  Markdown: "text/markdown",
  Html: "text/html",
  Code: "application/vnd.ant.code",
  Svg: "image/svg+xml",
  Mermaid: "application/vnd.ant.mermaid",
  React: "application/vnd.ant.react",
} as const;

export type OfficialXmType = (typeof OFFICIAL_XM)[keyof typeof OFFICIAL_XM];

const RICH_TYPES = new Set<string>([
  OFFICIAL_XM.Html,
  OFFICIAL_XM.Svg,
  OFFICIAL_XM.Mermaid,
  OFFICIAL_XM.React,
]);

/**
 * Residual b6e rich gate for Chat g6e path (this product slice):
 * Html | Svg | Mermaid | React only.
 * Residual isRichType also includes Pdf/Office/Csv — those stay out of this slice
 * (no invent local preview; do not treat every application/vnd.ant.* as g6e).
 */
export function isOfficialRichSandboxType(type: string | undefined): boolean {
  if (!type) return false;
  return RICH_TYPES.has(type);
}

/**
 * Map artifact `type` strings from antArtifact / artifacts tool to residual xm.
 * Accepts full MIME or short residual aliases (html, react, mermaid, …).
 */
export function normalizeOfficialArtifactType(
  type: string | undefined | null,
): OfficialXmType | string | undefined {
  if (!type) return undefined;
  const raw = type.trim();
  if (!raw) return undefined;
  const lower = raw.toLowerCase();
  const aliases: Record<string, OfficialXmType> = {
    "text/plain": OFFICIAL_XM.Text,
    text: OFFICIAL_XM.Text,
    plain: OFFICIAL_XM.Text,
    "text/markdown": OFFICIAL_XM.Markdown,
    markdown: OFFICIAL_XM.Markdown,
    md: OFFICIAL_XM.Markdown,
    "text/html": OFFICIAL_XM.Html,
    html: OFFICIAL_XM.Html,
    "application/vnd.ant.code": OFFICIAL_XM.Code,
    code: OFFICIAL_XM.Code,
    "image/svg+xml": OFFICIAL_XM.Svg,
    svg: OFFICIAL_XM.Svg,
    "application/vnd.ant.mermaid": OFFICIAL_XM.Mermaid,
    mermaid: OFFICIAL_XM.Mermaid,
    mmd: OFFICIAL_XM.Mermaid,
    "application/vnd.ant.react": OFFICIAL_XM.React,
    react: OFFICIAL_XM.React,
  };
  return aliases[lower] ?? raw;
}

/** Build residual g6e / eit iframe src query. */
export function buildOfficialSandboxIframeSrc(options?: {
  theme?: "dark" | "light";
  /** g6e sets formattedSpreadsheets=true; eit mermaid does not. */
  formattedSpreadsheets?: boolean;
  publishedArtifactUuid?: string;
}): string {
  const base = options?.publishedArtifactUuid
    ? `${OFFICIAL_USER_CONTENT_RENDERER_URL}/artifact/${options.publishedArtifactUuid}`
    : OFFICIAL_USER_CONTENT_RENDERER_URL;
  const params = new URLSearchParams();
  const domain =
    typeof window !== "undefined" ? window.location.hostname : "";
  params.set("domain", domain);
  if (options?.theme) {
    params.set("theme", options.theme);
  }
  if (typeof window !== "undefined") {
    params.set("parentOrigin", window.location.origin);
  }
  if (options?.formattedSpreadsheets) {
    params.set("formattedSpreadsheets", "true");
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function resolveOfficialTheme(): "dark" | "light" {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}
