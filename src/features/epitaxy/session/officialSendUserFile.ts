/**
 * Official SendUserFile card model (ion-dist pin 2.31226.1).
 *
 * Parser residual:
 * - `cda39216a-D3Qyl2y1.js` `d` = "SendUserFile", `k()` maps tool_result
 *   attachments / file_deliveries → `{ path, deliveryKind:"attachment", fileUuid,
 *   display, previewUrl, thumbnailUrl, sizeBytes, unavailableText }`
 * - `c289d7154-CGSq4xLv.js` `o()` / `O` sanitizes attachments (`path`, `size`,
 *   `isImage`, `file_uuid`, `preview_url`, `thumbnail_url`, `presentation`)
 * - `cae2967ba-CnfHmUxF.js` `n()` JSON.parse of tool_result text
 * - `cd5a31703-B4nKQMBN.js` `TH`: input `caption` (or `message`) + `pp(toolUseResult)`
 *
 * Card paint residual lives in `OfficialSendUserFileCard.tsx` (`cc1aae219`).
 */

export const OFFICIAL_SEND_USER_FILE_TOOL = "SendUserFile";
export const OFFICIAL_SEND_USER_FILE_DELIVERY_ATTACHMENT = "attachment" as const;
export const OFFICIAL_SEND_USER_FILE_DELIVERY_PRESENT = "present_files" as const;

const PRESENTATION_KEEP = new Set(["first", "repeat", "resent"]);
const CUSTOMIZATION_KEEP = new Set(["skill", "plugin"]);

export type OfficialSendUserFileDeliveryKind =
  | typeof OFFICIAL_SEND_USER_FILE_DELIVERY_ATTACHMENT
  | typeof OFFICIAL_SEND_USER_FILE_DELIVERY_PRESENT;

export type OfficialSendUserFileDisplay = "render" | "attach";

export type OfficialSendUserFileAttachment = {
  caption?: string;
  deliveryKind: OfficialSendUserFileDeliveryKind;
  display?: OfficialSendUserFileDisplay;
  fileUuid?: string;
  isImage?: boolean;
  path: string;
  previewUrl?: string;
  sizeBytes?: number;
  thumbnailUrl?: string;
  unavailableText?: string;
};

export type OfficialSendUserFileCardModel = {
  caption?: string;
  display?: OfficialSendUserFileDisplay;
  files: OfficialSendUserFileAttachment[];
};

export type OfficialSendUserFileToolLike = {
  input: Record<string, unknown>;
  isError?: boolean;
  name: string;
  output?: string;
};

export function isOfficialSendUserFileTool(name: string | undefined | null): boolean {
  if (!name) return false;
  const base = name.split("__").pop() ?? name;
  return base === OFFICIAL_SEND_USER_FILE_TOOL;
}

/** Official `c289d7154` `k` — basename after last `/` or `\`. */
export function officialSendUserFileBasename(path: string): string {
  const slash = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return slash < 0 ? path : path.slice(slash + 1);
}

/**
 * Official `cda39216a` `k()` + `c289d7154` `o()` over a single SendUserFile tool.
 * Returns null when the tool is not SendUserFile or no presentable path exists.
 */
export function parseOfficialSendUserFileCard(
  tool: OfficialSendUserFileToolLike | undefined | null,
): OfficialSendUserFileCardModel | null {
  if (!tool || !isOfficialSendUserFileTool(tool.name)) return null;
  const input = asRecord(tool.input);
  const parsedResult = parseOfficialSendUserFileToolUseResult(tool.output);
  const display = officialSendUserFileDisplay(parsedResult.display ?? input.display);
  const caption = firstString(parsedResult.caption, input.caption, input.description, input.message);
  const files: OfficialSendUserFileAttachment[] = [];
  const seen = new Set<string>();

  const push = (file: OfficialSendUserFileAttachment | null | undefined) => {
    if (!file?.path) return;
    if (seen.has(file.path)) return;
    seen.add(file.path);
    files.push({
      ...file,
      ...(display && !file.display ? { display } : {}),
      ...(caption && !file.caption ? { caption } : {}),
    });
  };

  for (const attachment of parsedResult.attachments) push(attachment);

  push(fileFromUnknown(input.file, display, caption));
  const inputPath = firstString(input.file_path, input.path, input.filePath);
  if (inputPath) {
    push({
      path: inputPath,
      deliveryKind: OFFICIAL_SEND_USER_FILE_DELIVERY_ATTACHMENT,
      ...(display ? { display } : {}),
      ...(caption ? { caption } : {}),
      ...(typeof input.size === "number" && input.size > 0 ? { sizeBytes: input.size } : {}),
      ...(typeof input.file_uuid === "string" && input.file_uuid
        ? { fileUuid: input.file_uuid }
        : typeof input.fileUuid === "string" && input.fileUuid
          ? { fileUuid: input.fileUuid }
          : {}),
    });
  }

  if (Array.isArray(input.files)) {
    for (const entry of input.files) push(fileFromUnknown(entry, display, caption));
  }

  if (files.length === 0) return null;
  return {
    files,
    ...(caption ? { caption } : {}),
    ...(display ? { display } : {}),
  };
}

/**
 * Official `cae2967ba` `n()` + `c289d7154` `o()` over tool_result text / object.
 * Accepts JSON `{ attachments, caption, path }` or a `{ files: [...] }` bag.
 */
export function parseOfficialSendUserFileToolUseResult(output: unknown): {
  attachments: OfficialSendUserFileAttachment[];
  caption?: string;
  display?: OfficialSendUserFileDisplay;
} {
  const value = decodeToolUseResult(output);
  if (!value) return { attachments: [] };
  if (Array.isArray(value)) {
    return { attachments: value.flatMap((entry) => fileFromUnknown(entry) ? [fileFromUnknown(entry)!] : []) };
  }
  const record = asRecord(value);
  const display = officialSendUserFileDisplay(record.display);
  const caption = firstString(record.caption, record.description, record.message);
  const attachments: OfficialSendUserFileAttachment[] = [];
  const seen = new Set<string>();
  const push = (file: OfficialSendUserFileAttachment | null | undefined) => {
    if (!file?.path || seen.has(file.path)) return;
    seen.add(file.path);
    attachments.push({
      ...file,
      ...(display && !file.display ? { display } : {}),
      ...(caption && !file.caption ? { caption } : {}),
    });
  };

  for (const attachment of sanitizeOfficialSendUserFileAttachments(record.attachments)) {
    push(mapSanitizedAttachment(attachment, display, caption));
  }
  if (Array.isArray(record.file_deliveries)) {
    for (const delivery of record.file_deliveries) {
      const row = asRecord(delivery);
      const path = firstString(row.path);
      const fileUuid = firstString(row.file_uuid, row.fileUuid);
      if (!path || !fileUuid) continue;
      push({
        path,
        deliveryKind: OFFICIAL_SEND_USER_FILE_DELIVERY_ATTACHMENT,
        fileUuid,
        ...(display ? { display } : {}),
        ...(caption ? { caption } : {}),
      });
    }
  }
  if (Array.isArray(record.files)) {
    for (const entry of record.files) push(fileFromUnknown(entry, display, caption));
  }
  if (Array.isArray(record.content)) {
    for (const block of record.content) {
      const row = asRecord(block);
      if (row.type !== "local_resource") continue;
      const path = firstString(row.file_path, row.path);
      if (!path) continue;
      push({
        path,
        deliveryKind: OFFICIAL_SEND_USER_FILE_DELIVERY_PRESENT,
        ...(typeof row.unavailable_text === "string" ? { unavailableText: row.unavailable_text } : {}),
        ...(caption ? { caption } : {}),
      });
    }
  }
  push(fileFromUnknown(record, display, caption));
  return {
    attachments,
    ...(caption ? { caption } : {}),
    ...(display ? { display } : {}),
  };
}

type SanitizedAttachment = {
  customization_kind?: string;
  file_uuid?: string;
  isImage: boolean;
  path: string;
  presentation?: string;
  preview_url?: string;
  size: number;
  thumbnail_url?: string;
  unavailable?: boolean;
};

/** Official `c289d7154` `O` / `o()`. */
export function sanitizeOfficialSendUserFileAttachments(raw: unknown): SanitizedAttachment[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isAttachmentShape).map((entry) => {
    const presentationBad = entry.presentation !== undefined && !PRESENTATION_KEEP.has(entry.presentation);
    const previewBad = "preview_url" in entry && typeof entry.preview_url !== "string";
    const thumbBad = "thumbnail_url" in entry && typeof entry.thumbnail_url !== "string";
    const customBad = "customization_kind" in entry && !CUSTOMIZATION_KEEP.has(String(entry.customization_kind));
    const unavailableBad = "unavailable" in entry && typeof entry.unavailable !== "boolean";
    if (!presentationBad && !previewBad && !thumbBad && !customBad && !unavailableBad) return entry;
    const next = { ...entry };
    if (presentationBad) delete next.presentation;
    if (previewBad) delete next.preview_url;
    if (thumbBad) delete next.thumbnail_url;
    if (customBad) delete next.customization_kind;
    if (unavailableBad) delete next.unavailable;
    return next;
  });
}

function mapSanitizedAttachment(
  attachment: SanitizedAttachment,
  display?: OfficialSendUserFileDisplay,
  caption?: string,
): OfficialSendUserFileAttachment {
  return {
    path: attachment.path,
    deliveryKind: OFFICIAL_SEND_USER_FILE_DELIVERY_ATTACHMENT,
    isImage: attachment.isImage,
    ...(attachment.file_uuid ? { fileUuid: attachment.file_uuid } : {}),
    ...(display ? { display } : {}),
    ...(typeof attachment.preview_url === "string" ? { previewUrl: attachment.preview_url } : {}),
    ...(typeof attachment.thumbnail_url === "string" ? { thumbnailUrl: attachment.thumbnail_url } : {}),
    ...(attachment.size > 0 ? { sizeBytes: attachment.size } : {}),
    ...(attachment.unavailable ? { unavailableText: "" } : {}),
    ...(caption ? { caption } : {}),
  };
}

function isAttachmentShape(value: unknown): value is SanitizedAttachment {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  if (typeof row.path !== "string" || typeof row.size !== "number" || typeof row.isImage !== "boolean") return false;
  if ("file_uuid" in row && row.file_uuid !== undefined && typeof row.file_uuid !== "string") return false;
  if ("presentation" in row && row.presentation !== undefined && typeof row.presentation !== "string") return false;
  return true;
}

function fileFromUnknown(
  value: unknown,
  display?: OfficialSendUserFileDisplay,
  inheritedCaption?: string,
): OfficialSendUserFileAttachment | null {
  const row = asRecord(value);
  const path = firstString(row.path, row.file_path, row.filePath);
  if (!path) return null;
  const caption = firstString(row.caption, row.description, inheritedCaption);
  const fileUuid = firstString(row.file_uuid, row.fileUuid);
  const previewUrl = firstString(row.previewUrl, row.preview_url);
  const thumbnailUrl = firstString(row.thumbnailUrl, row.thumbnail_url);
  const size = typeof row.size === "number" ? row.size : typeof row.sizeBytes === "number" ? row.sizeBytes : undefined;
  const isImage = row.isImage === true;
  const resolvedDisplay = display ?? officialSendUserFileDisplay(row.display);
  const unavailableText = typeof row.unavailableText === "string"
    ? row.unavailableText
    : typeof row.unavailable_text === "string"
      ? row.unavailable_text
      : row.unavailable === true
        ? ""
        : undefined;
  return {
    path,
    deliveryKind: OFFICIAL_SEND_USER_FILE_DELIVERY_ATTACHMENT,
    ...(fileUuid ? { fileUuid } : {}),
    ...(resolvedDisplay ? { display: resolvedDisplay } : {}),
    ...(previewUrl ? { previewUrl } : {}),
    ...(thumbnailUrl ? { thumbnailUrl } : {}),
    ...(size !== undefined && size > 0 ? { sizeBytes: size } : {}),
    ...(isImage ? { isImage: true } : {}),
    ...(unavailableText !== undefined ? { unavailableText } : {}),
    ...(caption ? { caption } : {}),
  };
}

function officialSendUserFileDisplay(value: unknown): OfficialSendUserFileDisplay | undefined {
  return value === "render" || value === "attach" ? value : undefined;
}

function decodeToolUseResult(output: unknown): unknown {
  if (output === undefined || output === null || output === "") return undefined;
  if (typeof output === "object") return output;
  if (typeof output !== "string") return undefined;
  const trimmed = output.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return undefined;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value) return value;
  }
  return undefined;
}
