/**
 * Official file/preview read helpers (c11959232 vN / epitaxy-file).
 * Shared by OfficialFilePane + OfficialPreviewPane.
 */
import type { ReactNode } from "react";
import { desktopBridge } from "../../../adapters/desktopBridge";
import type { LocalSessionsBridge } from "../../../adapters/desktopBridge/types";

/** Official vN empty body when `!ee` / no readable contents. */
export const OFFICIAL_FILE_UNREADABLE_MESSAGE =
  "File could not be read. It may have been deleted or moved, or it lives outside the session folder.";

/** Official c119 `lN` — pane subheader shell (sticky optional). */
export function OfficialPaneSubheader({
  children,
  role,
  sticky = false,
}: {
  children: ReactNode;
  role?: string;
  sticky?: boolean;
}) {
  return (
    <div role={role} className={sticky ? "epitaxy-pane-subheader sticky top-0 z-[4]" : "epitaxy-pane-subheader"}>
      {children}
    </div>
  );
}

/**
 * Official epitaxy-file query: null / no contents → unreadable empty state.
 * Directory / missing / outside session folder all map to the same soft empty body.
 * Always attach sha256 hash (desktop or client) so c119 F (Pencil) can enable.
 */
export async function readPreviewText(
  bridge: LocalSessionsBridge,
  sessionId: string,
  filePath: string,
): Promise<{ absPath?: string; hash?: string; text?: string; unreadable?: boolean }> {
  const withHash = async (parsed: { absPath?: string; hash?: string; text: string | null }) => {
    if (parsed.text === null) return null;
    const hash = parsed.hash && parsed.hash.length > 0 ? parsed.hash : await sha256Text(parsed.text);
    return { text: parsed.text, hash, absPath: parsed.absPath };
  };

  try {
    const sessionValue = await bridge.readSessionFile?.(sessionId, filePath);
    const sessionParsed = previewPayloadFromBridgeValue(sessionValue);
    const sessionOk = await withHash(sessionParsed);
    if (sessionOk) return sessionOk;
    if (isUnreadableFilePayload(sessionValue)) return { unreadable: true };
  } catch (error) {
    const normalized = previewReadError(error, filePath);
    if (normalized.unreadable) return { unreadable: true };
    throw new Error(normalized.message);
  }

  try {
    const localValue = await desktopBridge.FileSystem.readLocalFile?.(filePath);
    const localParsed = previewPayloadFromBridgeValue(localValue);
    const localOk = await withHash(localParsed);
    if (localOk) return localOk;
    if (isUnreadableFilePayload(localValue)) return { unreadable: true };
  } catch (error) {
    const normalized = previewReadError(error, filePath);
    if (normalized.unreadable) return { unreadable: true };
    throw new Error(normalized.message);
  }

  try {
    const cwdResult = await bridge.readFileAtCwd?.(sessionId, filePath);
    const cwdParsed = previewPayloadFromBridgeValue(cwdResult);
    const cwdOk = await withHash(cwdParsed);
    if (cwdOk) return cwdOk;
    if (isUnreadableFilePayload(cwdResult)) return { unreadable: true };
    const raw = asRecord(cwdResult);
    if (raw.ok === false) {
      const err = stringValue(raw.error) ?? stringValue(raw.stderr) ?? "Failed to read file";
      if (isSoftUnreadableMessage(err)) return { unreadable: true };
      throw new Error(err);
    }
  } catch (error) {
    const normalized = previewReadError(error, filePath);
    if (normalized.unreadable) return { unreadable: true };
    throw new Error(normalized.message);
  }

  return { unreadable: true };
}

/**
 * Official epitaxy-file payload: contents + hash (+ absPath).
 * F (Pencil) needs hash; session/cwd/local reads should return sha256 hex from desktop.
 * If hash is missing, readPreviewText fills it via sha256Text().
 */
export function previewPayloadFromBridgeValue(value: unknown): { absPath?: string; hash?: string; text: string | null } {
  if (typeof value === "string") return { text: value };
  if (value == null) return { text: null };
  const raw = asRecord(value);
  if (raw.isDirectory === true || raw.tooLarge === true) return { text: null };
  if (stringValue(raw.error) && raw.contents == null && raw.content == null && raw.stdout == null && raw.text == null) {
    return { text: null };
  }
  // Session read: contents; FileSystem.readLocalFile: content.
  const text = stringValue(raw.contents) ?? stringValue(raw.content) ?? stringValue(raw.stdout) ?? stringValue(raw.text);
  return {
    text: text ?? null,
    hash: stringValue(raw.hash),
    absPath: stringValue(raw.absPath) ?? stringValue(raw.path),
  };
}

export function previewTextFromBridgeValue(value: unknown): string | null {
  return previewPayloadFromBridgeValue(value).text;
}

/** Desktop contentHash: sha256 hex of utf8 contents (official Edit/conflict gate). */
export async function sha256Text(contents: string): Promise<string> {
  const data = new TextEncoder().encode(contents);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function isUnreadableFilePayload(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string") return false;
  const raw = asRecord(value);
  return (
    raw.isDirectory === true ||
    raw.tooLarge === true ||
    (Boolean(stringValue(raw.error)) &&
      raw.contents == null &&
      raw.content == null &&
      raw.stdout == null &&
      raw.text == null)
  );
}

export function isSoftUnreadableMessage(message: string) {
  return /EISDIR|illegal operation on a directory|is a directory|Cannot preview a directory|ENOENT|no such file|Not a regular file|too large/i.test(
    message,
  );
}

/** Collapse Node EISDIR / remote IPC noise; soft failures → official unreadable empty state. */
export function previewReadError(error: unknown, _filePath: string): { message: string; unreadable: boolean } {
  const message = error instanceof Error ? error.message : String(error ?? "Failed to read file");
  if (isSoftUnreadableMessage(message)) {
    return { message: OFFICIAL_FILE_UNREADABLE_MESSAGE, unreadable: true };
  }
  const remote = message.match(/Error invoking remote method '[^']+':\s*(?:Error:\s*)?(.*)$/i);
  const cleaned = remote?.[1]?.trim() || message;
  if (isSoftUnreadableMessage(cleaned)) {
    return { message: OFFICIAL_FILE_UNREADABLE_MESSAGE, unreadable: true };
  }
  return { message: cleaned, unreadable: false };
}

export function isPreviewImagePath(filePath: string) {
  return /\.(?:apng|avif|gif|jpe?g|png|svg|webp)$/i.test(filePath);
}

export function isHtmlPreviewPath(filePath: string) {
  return /\.(?:html?|svg)$/i.test(filePath);
}

export function isMarkdownPreviewPath(filePath: string) {
  return /\.(?:md|mdx|markdown)$/i.test(filePath);
}

/** Official platform label for reveal-in-folder actions (Show in Finder / Explorer / file manager). */
export function officialShowInFolderLabel() {
  if (typeof navigator === "undefined") return "Show in file manager";
  const ua = navigator.userAgent;
  if (/\bMac OS X\b|\bMacintosh\b/.test(ua)) return "Show in Finder";
  if (/\bWindows\b/.test(ua)) return "Show in Explorer";
  return "Show in file manager";
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}
