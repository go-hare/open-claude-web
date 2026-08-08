/**
 * Official claudeusercontent sandbox constants from residual:
 *   index-BELzQL5P A4e / U4e / userContentRendererUrl
 *   c5f4e1303 zL / xm MIME enum
 *
 * Product decision C: C-slice paint (Html|Svg|Mermaid|React) runs on
 * product-local `/sandbox-runtime` with residual p6e/A4e protocol.
 * Remote claudeusercontent.com is residual production URL; product uses local.
 */

/** Residual config userContentRendererUrl (index-BELzQL5P) — remote official. */
export const OFFICIAL_REMOTE_USER_CONTENT_RENDERER_URL =
  "https://www.claudeusercontent.com";

/**
 * Product-local sandbox frame base (same residual handshake/MIME).
 * Served from Vite `public/sandbox-runtime` and packaged `product-web/sandbox-runtime`.
 */
export const PRODUCT_LOCAL_SANDBOX_RUNTIME_PATH = "/sandbox-runtime/frame.html";

/**
 * Active iframe origin base for eit/g6e.
 * Product: local runtime. Residual remote kept as OFFICIAL_REMOTE_* for docs/bridges.
 */
export function resolveOfficialUserContentRendererUrl(): string {
  if (typeof window === "undefined") {
    return PRODUCT_LOCAL_SANDBOX_RUNTIME_PATH;
  }
  // Same-origin path so parentOrigin + frame origin match residual handshake rules.
  return new URL(
    PRODUCT_LOCAL_SANDBOX_RUNTIME_PATH,
    window.location.origin,
  ).href.replace(/\/frame\.html$/, "");
}

/** @deprecated use resolveOfficialUserContentRendererUrl — kept as absolute path base for allowedOrigin */
export const OFFICIAL_USER_CONTENT_RENDERER_URL =
  typeof window !== "undefined"
    ? `${window.location.origin}/sandbox-runtime`
    : "/sandbox-runtime";

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
 * Official U4e alwaysPermitted methods (D4e residual, alwaysPermitted:!0 only):
 *   ReadyForContent, ReportError, OpenExternal, DownloadFile,
 *   TrackInteraction, DOMContentLoaded
 * NOT always permitted (residual !1): BroadcastContentSize, GetScreenshot,
 * CopyHtmlContent, GetDOMSnapshot, SetContent, GetFile, Storage*, ProxyFetch, …
 */
export const OFFICIAL_ALWAYS_PERMITTED = new Set<string>([
  OFFICIAL_SANDBOX.ReadyForContent,
  OFFICIAL_SANDBOX.ReportError,
  OFFICIAL_SANDBOX.OpenExternal,
  OFFICIAL_SANDBOX.DownloadFile,
  OFFICIAL_SANDBOX.TrackInteraction,
  OFFICIAL_SANDBOX.DOMContentLoaded,
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
 */
export function isOfficialRichSandboxType(type: string | undefined): boolean {
  if (!type) return false;
  return RICH_TYPES.has(type);
}

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

/**
 * Build residual g6e / eit iframe src query.
 * Product base = local /sandbox-runtime (frame.html).
 * Residual remote used same query: domain + theme + parentOrigin [+ formattedSpreadsheets].
 */
export function buildOfficialSandboxIframeSrc(options?: {
  theme?: "dark" | "light";
  /** g6e sets formattedSpreadsheets=true; eit mermaid does not. */
  formattedSpreadsheets?: boolean;
  publishedArtifactUuid?: string;
}): string {
  if (typeof window === "undefined") {
    return PRODUCT_LOCAL_SANDBOX_RUNTIME_PATH;
  }

  // Local frame path (product). published artifact UUID residual path is remote-only;
  // product C-slice always paints via SetContent, not published UUID route.
  const base = new URL(
    PRODUCT_LOCAL_SANDBOX_RUNTIME_PATH,
    window.location.origin,
  ).href;

  const params = new URLSearchParams();
  params.set("domain", window.location.hostname);
  if (options?.theme) {
    params.set("theme", options.theme);
  }
  params.set("parentOrigin", window.location.origin);
  if (options?.formattedSpreadsheets) {
    params.set("formattedSpreadsheets", "true");
  }
  // Keep residual query shape; local frame ignores unknown flags.
  if (options?.publishedArtifactUuid) {
    params.set("publishedArtifactUuid", options.publishedArtifactUuid);
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/** allowedOrigin for p6e — must match iframe contentWindow origin. */
export function resolveOfficialSandboxAllowedOrigin(): string {
  if (typeof window === "undefined") return "null";
  // sandbox="allow-scripts allow-same-origin" → iframe origin = parent origin for same-origin src
  return window.location.origin;
}

export function resolveOfficialTheme(): "dark" | "light" {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}
