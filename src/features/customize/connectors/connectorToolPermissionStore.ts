/**
 * Official index-BELzQL5P SXt / bXt / vXt / _G / MG.
 * Persist `enabled_mcp_tools` locally (no account BFF in this shell).
 */

export type ToolPermission = "allow" | "ask" | "blocked";

export const TOOL_PERMISSIONS: ToolPermission[] = ["allow", "ask", "blocked"];

export const TOOL_PERMISSION_LABELS: Record<ToolPermission | "custom", string> = {
  allow: "Always allow",
  ask: "Needs approval",
  blocked: "Blocked",
  custom: "Custom",
};

export const TOOL_PERMISSION_ICONS: Record<ToolPermission, "CheckCircle" | "Hand" | "Prohibit"> = {
  allow: "CheckCircle",
  ask: "Hand",
  blocked: "Prohibit",
};

export const GROUP_PERMISSION_ICONS: Record<
  ToolPermission | "custom",
  "CheckCircle" | "Hand" | "Prohibit" | "DotsHorizontal"
> = {
  ...TOOL_PERMISSION_ICONS,
  custom: "DotsHorizontal",
};

const STORAGE_KEY = "open-claude.customize.enabled-mcp-tools.v1";
const FLUSH_MS = 500;

export type ConnectorToolRef = {
  description?: string;
  displayName?: string;
  name: string;
  serverName: string;
};

type PermissionBag = Record<string, boolean>;

function readBag(): PermissionBag {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const bag: PermissionBag = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "boolean") bag[key] = value;
    }
    return bag;
  } catch {
    return {};
  }
}

function writeBag(bag: PermissionBag): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bag));
  } catch {
    /* quota */
  }
}

let bag: PermissionBag = readBag();
const listeners = new Set<() => void>();
let pending: PermissionBag = {};
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function emit(): void {
  for (const listener of listeners) listener();
}

function flush(): void {
  flushTimer = null;
  const patch = pending;
  pending = {};
  if (Object.keys(patch).length === 0) return;
  bag = { ...bag, ...patch };
  writeBag(bag);
}

function scheduleFlush(patch: PermissionBag): void {
  Object.assign(pending, patch);
  bag = { ...bag, ...patch };
  emit();
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(flush, FLUSH_MS);
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flush();
    }
  });
}

export function subscribeConnectorToolPermissions(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getConnectorToolPermissionBag(): PermissionBag {
  return bag;
}

/** Official _G(server, name) */
export function enabledKeyFor(tool: ConnectorToolRef): string {
  return `${tool.serverName}:${tool.name}`;
}

/**
 * Official MG: `${enabledKey}-${md5(description:schemaFlat)}`.
 * Direct MCP status tools have no inputSchema — schemaFlat is empty.
 */
export function alwaysApprovedKeyFor(tool: ConnectorToolRef): string {
  const enabledKey = enabledKeyFor(tool);
  const description = tool.description ?? "";
  return `${enabledKey}-${md5Hex(`${description}:`)}`;
}

/** Official bXt / vXt */
export function permissionForTool(tool: ConnectorToolRef): ToolPermission {
  if (bag[enabledKeyFor(tool)] === false) return "blocked";
  if (bag[alwaysApprovedKeyFor(tool)] === true) return "allow";
  return "ask";
}

/** Official CXt — mixed → custom. */
export function groupPermissionForTools(tools: ConnectorToolRef[]): ToolPermission | "custom" {
  if (tools.length === 0) return "ask";
  const values = new Set(tools.map(permissionForTool));
  if (values.size === 1) return [...values][0] ?? "allow";
  return "custom";
}

/** Official SXt write: enabledKey = blocked!==s; alwaysApprovedKey = allow===s */
export function setToolsPermission(tools: ConnectorToolRef[], permission: ToolPermission): void {
  const patch: PermissionBag = {};
  for (const tool of tools) {
    patch[enabledKeyFor(tool)] = permission !== "blocked";
    patch[alwaysApprovedKeyFor(tool)] = permission === "allow";
  }
  scheduleFlush(patch);
}

/** Compact MD5 (official MG hash). */
function md5Hex(message: string): string {
  const bytes = encodeUtf8(message);
  const words = bytesToWords(bytes);
  let a0 = 1732584193;
  let b0 = -271733879;
  let c0 = -1732584194;
  let d0 = 271733878;
  for (let i = 0; i < words.length; i += 16) {
    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;
    a = ff(a, b, c, d, words[i], 7, -680876936);
    d = ff(d, a, b, c, words[i + 1], 12, -389564586);
    c = ff(c, d, a, b, words[i + 2], 17, 606105819);
    b = ff(b, c, d, a, words[i + 3], 22, -1044525330);
    a = ff(a, b, c, d, words[i + 4], 7, -176418897);
    d = ff(d, a, b, c, words[i + 5], 12, 1200080426);
    c = ff(c, d, a, b, words[i + 6], 17, -1473231341);
    b = ff(b, c, d, a, words[i + 7], 22, -45705983);
    a = ff(a, b, c, d, words[i + 8], 7, 1770035416);
    d = ff(d, a, b, c, words[i + 9], 12, -1958414417);
    c = ff(c, d, a, b, words[i + 10], 17, -42063);
    b = ff(b, c, d, a, words[i + 11], 22, -1990404162);
    a = ff(a, b, c, d, words[i + 12], 7, 1804603682);
    d = ff(d, a, b, c, words[i + 13], 12, -40341101);
    c = ff(c, d, a, b, words[i + 14], 17, -1502002290);
    b = ff(b, c, d, a, words[i + 15], 22, 1236535329);
    a = gg(a, b, c, d, words[i + 1], 5, -165796510);
    d = gg(d, a, b, c, words[i + 6], 9, -1069501632);
    c = gg(c, d, a, b, words[i + 11], 14, 643717713);
    b = gg(b, c, d, a, words[i], 20, -373897302);
    a = gg(a, b, c, d, words[i + 5], 5, -701558691);
    d = gg(d, a, b, c, words[i + 10], 9, 38016083);
    c = gg(c, d, a, b, words[i + 15], 14, -660478335);
    b = gg(b, c, d, a, words[i + 4], 20, -405537848);
    a = gg(a, b, c, d, words[i + 9], 5, 568446438);
    d = gg(d, a, b, c, words[i + 14], 9, -1019803690);
    c = gg(c, d, a, b, words[i + 3], 14, -187363961);
    b = gg(b, c, d, a, words[i + 8], 20, 1163531501);
    a = gg(a, b, c, d, words[i + 13], 5, -1444681467);
    d = gg(d, a, b, c, words[i + 2], 9, -51403784);
    c = gg(c, d, a, b, words[i + 7], 14, 1735328473);
    b = gg(b, c, d, a, words[i + 12], 20, -1926607734);
    a = hh(a, b, c, d, words[i + 5], 4, -378558);
    d = hh(d, a, b, c, words[i + 8], 11, -2022574463);
    c = hh(c, d, a, b, words[i + 11], 16, 1839030562);
    b = hh(b, c, d, a, words[i + 14], 23, -35309556);
    a = hh(a, b, c, d, words[i + 1], 4, -1530992060);
    d = hh(d, a, b, c, words[i + 4], 11, 1272893353);
    c = hh(c, d, a, b, words[i + 7], 16, -155497632);
    b = hh(b, c, d, a, words[i + 10], 23, -1094730640);
    a = hh(a, b, c, d, words[i + 13], 4, 681279174);
    d = hh(d, a, b, c, words[i], 11, -358537222);
    c = hh(c, d, a, b, words[i + 3], 16, -722521979);
    b = hh(b, c, d, a, words[i + 6], 23, 76029189);
    a = hh(a, b, c, d, words[i + 9], 4, -640364487);
    d = hh(d, a, b, c, words[i + 12], 11, -421815835);
    c = hh(c, d, a, b, words[i + 15], 16, 530742520);
    b = hh(b, c, d, a, words[i + 2], 23, -995338651);
    a = ii(a, b, c, d, words[i], 6, -198630844);
    d = ii(d, a, b, c, words[i + 7], 10, 1126891415);
    c = ii(c, d, a, b, words[i + 14], 15, -1416354905);
    b = ii(b, c, d, a, words[i + 5], 21, -57434055);
    a = ii(a, b, c, d, words[i + 12], 6, 1700485571);
    d = ii(d, a, b, c, words[i + 3], 10, -1894986606);
    c = ii(c, d, a, b, words[i + 10], 15, -1051523);
    b = ii(b, c, d, a, words[i + 1], 21, -2054922799);
    a = ii(a, b, c, d, words[i + 8], 6, 1873313359);
    d = ii(d, a, b, c, words[i + 15], 10, -30611744);
    c = ii(c, d, a, b, words[i + 6], 15, -1560198380);
    b = ii(b, c, d, a, words[i + 13], 21, 1309151649);
    a = ii(a, b, c, d, words[i + 4], 6, -145523070);
    d = ii(d, a, b, c, words[i + 11], 10, -1120210379);
    c = ii(c, d, a, b, words[i + 2], 15, 718787259);
    b = ii(b, c, d, a, words[i + 9], 21, -343485551);
    a0 = (a0 + a) | 0;
    b0 = (b0 + b) | 0;
    c0 = (c0 + c) | 0;
    d0 = (d0 + d) | 0;
  }
  return toHex(a0) + toHex(b0) + toHex(c0) + toHex(d0);
}

function cmn(q: number, a: number, b: number, x: number, s: number, t: number): number {
  const n = (((a + q) | 0) + ((x + t) | 0)) | 0;
  return (((n << s) | (n >>> (32 - s))) + b) | 0;
}
function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
  return cmn((b & c) | (~b & d), a, b, x, s, t);
}
function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
  return cmn((b & d) | (c & ~d), a, b, x, s, t);
}
function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
  return cmn(b ^ c ^ d, a, b, x, s, t);
}
function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
  return cmn(c ^ (b | ~d), a, b, x, s, t);
}

function encodeUtf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function bytesToWords(bytes: Uint8Array): number[] {
  const length = bytes.length;
  const bitLen = length * 8;
  const padded = (((length + 8) >>> 6) + 1) * 16;
  const words = new Array<number>(padded).fill(0);
  for (let i = 0; i < length; i++) {
    words[i >> 2] |= bytes[i]! << ((i % 4) * 8);
  }
  words[length >> 2] |= 0x80 << ((length % 4) * 8);
  words[padded - 2] = bitLen;
  words[padded - 1] = 0;
  return words;
}

function toHex(value: number): string {
  let hex = "";
  for (let i = 0; i < 4; i++) {
    const byte = (value >>> (i * 8)) & 255;
    hex += (byte < 16 ? "0" : "") + byte.toString(16);
  }
  return hex;
}
