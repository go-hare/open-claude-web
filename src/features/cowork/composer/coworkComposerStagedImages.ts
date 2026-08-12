/**
 * Official Cowork / local-agent image staging residual (index-BELzQL5P):
 * - j0: clipboardData → image Files
 * - p0 mime allowlist (jpeg/png/gif/webp)
 * - LZe: image blocks with source.type===base64 → {base64, mimeType} for sendMessage arg3
 * - un-style stage: File → loading preview → ready base64 (shared with Code cn.images)
 */
import type { CoworkImagePayload } from "../../../adapters/desktopBridge/types";

/** Official p0 / m0. */
export const COWORK_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

export type CoworkImageMimeType = (typeof COWORK_IMAGE_MIME_TYPES)[number];

/**
 * Product cap mirrors Code cn.images residual (max 5 staged).
 * Official chat v0.maxTotalUploadsPerMessage is 20; local Cowork strip stays 5.
 */
export const COWORK_STAGED_IMAGE_MAX = 5;

export type CoworkStagedImage = {
  id: string;
  name: string;
  previewUrl: string;
  status: "loading" | "ready";
  base64?: string;
  mimeType?: string;
};

/** Anthropic / residual image block shape before LZe. */
export type CoworkImageBlock = {
  type: "image";
  source: {
    type: "base64";
    media_type: string;
    data: string;
  };
};

/** Official j0 — extract image Files from a paste event. */
export function imageFilesFromClipboardData(
  clipboardData: DataTransfer | null | undefined,
): File[] {
  if (!clipboardData?.items) return [];
  const files: File[] = [];
  for (let index = 0; index < clipboardData.items.length; index += 1) {
    const item = clipboardData.items[index];
    if (!item || !item.type.startsWith("image/")) continue;
    const file = item.getAsFile();
    if (file) files.push(file);
  }
  return files;
}

export function isCoworkImageMimeType(value: string | undefined | null): value is CoworkImageMimeType {
  return Boolean(value && (COWORK_IMAGE_MIME_TYPES as readonly string[]).includes(value));
}

export function filterCoworkImageFiles(files: File[]): File[] {
  return files.filter((file) => isCoworkImageMimeType(file.type));
}

/**
 * Official LZe residual:
 *   filter source.type==="base64" → { base64: data, mimeType: media_type }
 * Empty / non-base64 → undefined (sendMessage omits images).
 */
export function coworkImageBlocksToPayloads(
  blocks: Array<{ source?: { type?: string; data?: string; media_type?: string } } | CoworkImageBlock>,
): CoworkImagePayload[] | undefined {
  if (!blocks.length) return undefined;
  const payloads = blocks.flatMap((block) => {
    const source = block.source;
    if (!source || source.type !== "base64") return [];
    if (typeof source.data !== "string" || source.data.length === 0) return [];
    return [{
      base64: source.data,
      mimeType: typeof source.media_type === "string" && source.media_type
        ? source.media_type
        : "image/png",
    }];
  });
  return payloads.length > 0 ? payloads : undefined;
}

/** Ready staged strip → LZe-compatible payloads for sendMessage arg3. */
export function readyCoworkStagedImagesToPayloads(
  images: CoworkStagedImage[],
): CoworkImagePayload[] | undefined {
  const ready = images.filter((image) => image.status === "ready" && image.base64);
  if (ready.length === 0) return undefined;
  return ready.map((image) => ({
    base64: image.base64!,
    mimeType: image.mimeType ?? "image/png",
    filename: image.name,
  }));
}

/** Ready staged → residual image blocks (optional intermediate for LZe tests). */
export function readyCoworkStagedImagesToBlocks(images: CoworkStagedImage[]): CoworkImageBlock[] {
  return images
    .filter((image) => image.status === "ready" && image.base64)
    .map((image) => ({
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: image.mimeType ?? "image/png",
        data: image.base64!,
      },
    }));
}

export function dataUrlToCoworkImageParts(dataUrl: string, name: string): {
  base64: string;
  mimeType: string;
  filename: string;
  previewUrl: string;
} {
  const comma = dataUrl.indexOf(",");
  const header = comma >= 0 ? dataUrl.slice(0, comma) : "data:image/png;base64";
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const mimeMatch = /data:([^;]+)/.exec(header);
  const mimeType = mimeMatch?.[1] ?? "image/png";
  return {
    base64,
    mimeType,
    filename: name || "image.png",
    previewUrl: dataUrl.startsWith("data:") ? dataUrl : `data:${mimeType};base64,${base64}`,
  };
}

export function revokeCoworkStagedImagePreview(image: Pick<CoworkStagedImage, "previewUrl">): void {
  if (image.previewUrl.startsWith("blob:")) URL.revokeObjectURL(image.previewUrl);
}

export function roomForCoworkStagedImages(
  currentCount: number,
  max = COWORK_STAGED_IMAGE_MAX,
): number {
  return Math.max(0, max - currentCount);
}
