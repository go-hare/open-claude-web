/**
 * Pure residual helpers for official Code `mb` map (c11959232).
 * Kept free of React so unit tests can lock behavior without DOM.
 *
 * Official symbols:
 * - hb/bl urlTransform + scheme allowlist
 * - hu/du file-ref path + optional :line
 * - yl/BP string children `<br>` split
 */

/** Official mI / bl scheme allowlist (c5f4e1303). */
const OFFICIAL_URL_SCHEME_RE = /^(https?|ircs?|mailto|xmpp)$/i;

/**
 * Official hb(url, key, node):
 *   tagName === 'img' && key === 'src' → pass url
 *   else bl(url)
 *
 * Product signature for react-markdown urlTransform is (url, key, node?).
 * Local-path pass is a product bridge for db file open (relative / absolute / drive).
 */
export function officialMarkdownUrlTransform(
  url: string,
  key = "href",
  node?: { tagName?: string } | null,
): string {
  if (!url) return url;
  // Official hb: only img src bypasses bl; null/other nodes still sanitize.
  if (key === "src" && node?.tagName === "img") {
    return url;
  }
  return officialMarkdownSanitizeUrl(url);
}

/**
 * Official bl/_I: allow no-scheme or scheme in mI allowlist; else "".
 * Product bridge residual: also allow filesystem-looking relative/absolute paths
 * (no scheme) for db file-ref — still strip javascript:/vbscript:/etc.
 */
export function officialMarkdownSanitizeUrl(url: string): string {
  if (!url) return url;
  // Fragment-only anchors.
  if (url.startsWith("#")) return url;
  const schemeMatch = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(url);
  if (!schemeMatch) {
    // No scheme: official allows; includes relative + absolute paths.
    return url;
  }
  const scheme = schemeMatch[1] ?? "";
  if (OFFICIAL_URL_SCHEME_RE.test(scheme)) return url;
  // Dangerous / unknown schemes → empty (official bl).
  return "";
}

/**
 * Official du/hu path regex residual:
 * path with optional trailing :line (not matched as Windows drive alone).
 * Examples: `src/foo.ts`, `src/foo.ts:12`, `/abs/path`, `C:\x\y.ts:3`
 */
const OFFICIAL_FILE_REF_RE =
  /^(?<path>(?:[A-Za-z]:)?(?:\/|\\)?(?:[^:\n]+[/\\])+[^:\n]+|[^:\n]+\.[A-Za-z0-9]+)(?::(?<line>\d+))?$/;

export type OfficialFileRef = {
  path: string;
  line?: number;
};

/** Official hu: parse plain inline code as file ref when it matches path residual. */
export function parseOfficialFileRef(text: string): OfficialFileRef | null {
  const trimmed = text.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;
  // Reject pure scheme URLs.
  if (/^(https?|mailto|data|blob):/i.test(trimmed)) return null;
  const match = OFFICIAL_FILE_REF_RE.exec(trimmed);
  if (!match?.groups?.path) return null;
  const path = match.groups.path;
  // Reject bare words without path separator or extension (false positives).
  if (!path.includes("/") && !path.includes("\\") && !/\.[A-Za-z0-9]+$/.test(path)) {
    return null;
  }
  const lineRaw = match.groups.line;
  const line = lineRaw ? Number.parseInt(lineRaw, 10) : undefined;
  return {
    path,
    line: line !== undefined && Number.isFinite(line) ? line : undefined,
  };
}

/** Official looksLike path href for db (non-http local). */
export function looksLikeOfficialLocalPathHref(href: string): boolean {
  if (!href) return false;
  if (/^(https?:|mailto:|data:|blob:|#)/i.test(href)) return false;
  if (href.startsWith("/") || href.startsWith("./") || href.startsWith("../")) return true;
  if (/^[A-Za-z]:[\\/]/.test(href)) return true;
  return parseOfficialFileRef(href) !== null;
}

/**
 * Official yl/BP: split string children on literal `<br>` into React-ready parts.
 * Returns string parts and `{ br: true }` markers for the caller to map to <br/>.
 */
export function splitOfficialBrMarkers(children: unknown): Array<string | { br: true }> {
  if (typeof children !== "string") {
    if (children == null) return [];
    return [String(children)];
  }
  if (!children.includes("<br")) return [children];
  const parts = children.split(/(<br\s*\/?>)/i);
  const out: Array<string | { br: true }> = [];
  for (const part of parts) {
    if (!part) continue;
    if (/^<br\s*\/?>$/i.test(part)) out.push({ br: true });
    else out.push(part);
  }
  return out;
}

/** Convenience: whether children need yl transform. */
export function needsOfficialBrSplit(children: unknown): children is string {
  return typeof children === "string" && /<br\s*\/?>/i.test(children);
}
