/**
 * Official cn.images residual strip — ready staged image previews above the prompt.
 * Minimal surface: thumbnail + remove; full loading spinner / multi-source not invent beyond residual.
 */
import { OfficialButton } from "../OfficialEpitaxyComponents";

export type StagedComposerImage = {
  id: string;
  name: string;
  previewUrl: string;
  status: "loading" | "ready";
  /** Anthropic image payload fields once ready. */
  base64?: string;
  mimeType?: string;
};

export function OfficialComposerStagedImages({
  images,
  onRemove,
}: {
  images: StagedComposerImage[];
  onRemove: (id: string) => void;
}) {
  if (images.length === 0) return null;
  return (
    <div
      className="flex flex-wrap items-end gap-g4 px-p7 pt-p5"
      data-official-source="c11959232-staged-images"
    >
      {images.map((image) => (
        <div
          key={image.id}
          className="relative group/img h-[64px] w-[64px] rounded-r4 overflow-hidden bg-t2 border border-border-300"
        >
          {image.status === "ready" ? (
            <img
              alt={image.name}
              src={image.previewUrl}
              className="h-full w-full object-cover select-none pointer-events-none"
              draggable={false}
            />
          ) : (
            <div className="h-full w-full animate-pulse bg-t3" aria-label="Loading image" />
          )}
          <div className="absolute top-0 right-0 p-p1 opacity-0 group-hover/img:opacity-100 focus-within:opacity-100">
            <OfficialButton
              ariaLabel={`Remove ${image.name}`}
              icon="XCrossCloseMedium"
              onClick={() => onRemove(image.id)}
              size="small"
              variant="contained"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** dataUrl → File-like base64 payload for LocalSessions images[]. */
export function dataUrlToImagePayload(dataUrl: string, name: string): {
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
