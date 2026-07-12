/**
 * Official Gzt local_session load path (index-BELzQL5P.pretty.js):
 *   path = file.path.replace("computer://", "")
 *   result = FileSystem.readLocalFile(sessionId, encodeURIComponent(path))
 *   if (result.encoding === "base64") → binary/image branch; else text = result.content
 * Also: streamingFile?.content short-circuits disk read (g?.content in Gzt).
 * Fallback chain for host paths that only resolve via session/cwd bridges.
 */

import { desktopBridge } from "../../../adapters/desktopBridge";
import type { LocalFileReadResult } from "../../../adapters/desktopBridge/types";
import {
  coworkFileBasename,
  resolveCoworkFileDisplay,
  stripCoworkComputerPrefix,
  type CoworkFileDetailContent,
} from "./coworkFileDetailModel";
import { coworkSessionsBridge } from "./coworkSessionBridge";
import { asRecord, numberValue, stringValue } from "./recordUtils";

export async function loadCoworkFileDetail(
  sessionId: string,
  filePath: string,
  inlineText?: string,
): Promise<CoworkFileDetailContent> {
  const path = stripCoworkComputerPrefix(filePath);
  const meta = resolveCoworkFileDisplay(path);

  // Official Gzt: void 0 !== g?.content ? M(g.content) : fs()
  if (typeof inlineText === "string") {
    if (meta.isImage && inlineText.startsWith("data:")) return { kind: "image", dataUrl: inlineText };
    return { kind: "text", text: inlineText };
  }

  if (meta.isImage) {
    const dataUrl = await loadImageDataUrl(sessionId, path);
    if (dataUrl) return { kind: "image", dataUrl };
    throw new Error("Unable to read local file.");
  }

  const text = await loadTextContent(sessionId, path);
  if (text === null) throw new Error("Unable to read local file.");
  return { kind: "text", text };
}

async function loadTextContent(sessionId: string, path: string): Promise<string | null> {
  // Official local_session primary: readLocalFile(sessionId, encodeURIComponent(path)).
  const local = await desktopBridge.FileSystem.readLocalFile?.(sessionId, encodeURIComponent(path)).catch(() => null);
  const fromLocal = textFromLocalRead(local);
  if (fromLocal !== null) return fromLocal;

  // Absolute host path without session signature.
  const absolute = await desktopBridge.FileSystem.readLocalFile?.(path).catch(() => null);
  const fromAbsolute = textFromLocalRead(absolute);
  if (fromAbsolute !== null) return fromAbsolute;

  const sessionValue = await coworkSessionsBridge.readSessionFile?.(sessionId, path).catch(() => null);
  const fromSession = textFromUnknown(sessionValue);
  if (fromSession !== null) return fromSession;

  const cwdResult = await coworkSessionsBridge.readFileAtCwd?.(sessionId, path).catch(() => null);
  if (cwdResult == null) return null;
  if (typeof cwdResult === "string") return cwdResult;
  if (typeof cwdResult === "object") {
    const record = asRecord(cwdResult);
    // Missing bridge methods normalize to null above; only throw on explicit failure.
    if (record.ok === false) {
      throw new Error(stringValue(record.error) ?? stringValue(record.stderr) ?? "Failed to read file");
    }
    return (
      stringValue(record.stdout)
      ?? stringValue(record.content)
      ?? stringValue(record.text)
      ?? (record.ok === true || record.success === true ? "" : null)
    );
  }
  return null;
}

async function loadImageDataUrl(sessionId: string, path: string): Promise<string | null> {
  if (coworkSessionsBridge.readSessionImageAsDataUrl) {
    const sessionImage = await coworkSessionsBridge.readSessionImageAsDataUrl(sessionId, path).catch(() => null);
    if (typeof sessionImage === "string" && sessionImage.startsWith("data:")) return sessionImage;
  }
  const local = await desktopBridge.FileSystem.readLocalFile?.(sessionId, encodeURIComponent(path), { encoding: "base64" }).catch(() => null);
  const base64 = base64FromLocalRead(local);
  if (base64) {
    const mime = mimeFromLocalRead(local) ?? mimeForPath(path);
    return `data:${mime};base64,${base64}`;
  }
  const absolute = await desktopBridge.FileSystem.readLocalFile?.(path, undefined, { encoding: "base64" }).catch(() => null);
  const absoluteBase64 = base64FromLocalRead(absolute);
  if (absoluteBase64) {
    const mime = mimeFromLocalRead(absolute) ?? mimeForPath(path);
    return `data:${mime};base64,${absoluteBase64}`;
  }
  return null;
}

function textFromLocalRead(value: LocalFileReadResult | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (value.tooLarge === true) throw new Error(`File is too large to preview (${value.size ?? "?"} bytes).`);
  // Official Gzt: if encoding === "base64" treat as binary (not text content).
  if (value.encoding === "base64") return null;
  if (typeof value.content === "string") return value.content;
  return null;
}

function base64FromLocalRead(value: LocalFileReadResult | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    if (value.startsWith("data:")) {
      const comma = value.indexOf(",");
      return comma >= 0 ? value.slice(comma + 1) : null;
    }
    return value;
  }
  if (typeof value.content === "string") return value.content;
  return null;
}

function mimeFromLocalRead(value: LocalFileReadResult | null | undefined): string | null {
  if (!value || typeof value === "string") return null;
  return typeof value.mimeType === "string" ? value.mimeType : null;
}

function textFromUnknown(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  const raw = asRecord(value);
  if (raw.tooLarge === true) throw new Error(`File is too large to preview (${numberValue(raw.size)} bytes).`);
  return stringValue(raw.stdout) ?? stringValue(raw.contents) ?? stringValue(raw.content) ?? stringValue(raw.text) ?? null;
}

function mimeForPath(path: string): string {
  const ext = coworkFileBasename(path).split(".").pop()?.toLowerCase() ?? "";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "gif") return "image/gif";
  if (ext === "webp") return "image/webp";
  if (ext === "bmp") return "image/bmp";
  if (ext === "svg") return "image/svg+xml";
  return "application/octet-stream";
}
