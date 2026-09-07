/**
 * Official Qj / uy / wv residual (c11959232 + index-BELzQL5P):
 *   local (Ps) non-image drop → addFileAttachments(uy(files, io))
 *   io = r2 = window.claudeAppSettings.filePickers.getPathForFile
 *   uy: relativePath = io(file) ?? file.name  (native path as-is, no UM)
 *   send f(): files.map(e => `@${e.relativePath}`).join(" ") + " "
 *   Cv file pill: label = relativePath || fileName
 *
 * UM is the file-browser helper (path under cwd → relative). Drop mentions
 * do not go through UM — cwd-outside files stay the native absolute path.
 */
import { COWORK_IMAGE_MIME_TYPES } from "../../cowork/composer/coworkComposerStagedImages";

export const OFFICIAL_COMPOSER_FILE_ATTACHMENT_MAX = 5;

export type StagedComposerFileAttachment = {
  id: string;
  fileName: string;
  relativePath: string;
  isDirectory: boolean;
};

export function officialFileExtensionLabel(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  return lastDot > 0 ? fileName.slice(lastDot + 1).toLowerCase() : "";
}

export function isOfficialComposerImageFile(file: File): boolean {
  return (COWORK_IMAGE_MIME_TYPES as readonly string[]).includes(file.type);
}

export function splitOfficialComposerDropFiles(files: File[]): {
  images: File[];
  other: File[];
} {
  const images: File[] = [];
  const other: File[] = [];
  for (const file of files) {
    if (isOfficialComposerImageFile(file)) images.push(file);
    else other.push(file);
  }
  return { images, other };
}

/** Official index r2 / a2 — Electron webUtils.getPathForFile via preload. */
export function officialNativeFilePath(file: File): string | null {
  if (typeof window !== "undefined") {
    try {
      const getPath = window.claudeAppSettings?.filePickers?.getPathForFile;
      if (typeof getPath === "function") {
        const native = getPath(file);
        if (typeof native === "string" && native.length > 0) return native;
      }
    } catch {
      /* official r2: catch → null */
    }
  }
  const legacy = (file as File & { path?: unknown }).path;
  return typeof legacy === "string" && legacy.length > 0 ? legacy : null;
}

/** Official uy: `relativePath: io(file) ?? file.name`. cwd is unused (io is native). */
export function officialComposerRelativePath(file: File, _cwd?: string | null): string {
  void _cwd;
  return officialNativeFilePath(file) ?? file.name;
}

/** Official uy(files, io, isDirectory=false). */
export function officialComposerFileAttachmentsFromFiles(
  files: File[],
  cwd?: string | null,
  isDirectory = false,
): StagedComposerFileAttachment[] {
  const now = Date.now();
  return files.map((file, index) => ({
    id: `file-${file.name}-${now}-${index}`,
    fileName: file.name,
    relativePath: officialComposerRelativePath(file, cwd),
    isDirectory,
  }));
}

export function officialComposerFileMentionPrefix(
  files: readonly StagedComposerFileAttachment[],
): string {
  if (files.length === 0) return "";
  return `${files.map((file) => `@${file.relativePath}`).join(" ")} `;
}

export function capOfficialComposerFileAttachments(
  current: readonly StagedComposerFileAttachment[],
  incoming: readonly StagedComposerFileAttachment[],
): StagedComposerFileAttachment[] {
  const room = Math.max(0, OFFICIAL_COMPOSER_FILE_ATTACHMENT_MAX - current.length);
  if (room <= 0) return [...current];
  const seen = new Set(current.map((file) => file.relativePath));
  const extra: StagedComposerFileAttachment[] = [];
  for (const file of incoming) {
    if (extra.length >= room) break;
    if (seen.has(file.relativePath)) continue;
    seen.add(file.relativePath);
    extra.push(file);
  }
  return [...current, ...extra];
}
