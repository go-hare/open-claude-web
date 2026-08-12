/**
 * Official ImageBlockThumbnail residual (index-BELzQL5P UHe / OHe) for Cowork composer.
 * 120×120 group/thumbnail strip + absolute remove control.
 * Loading pulse while FileReader finishes (product stage bridge; no invent spinner).
 */
import { Icon } from "../../../shell/icons";
import type { CoworkStagedImage } from "./coworkComposerStagedImages";

export function CoworkStagedImageStrip({
  images,
  onRemove,
}: {
  images: CoworkStagedImage[];
  onRemove: (id: string) => void;
}) {
  if (images.length === 0) return null;
  return (
    <div
      className="flex flex-wrap gap-2"
      data-official-source="index-BELzQL5P:UHe/ImageBlockThumbnail"
    >
      {images.map((image) => (
        <CoworkStagedImageThumbnail
          image={image}
          key={image.id}
          onRemove={() => onRemove(image.id)}
        />
      ))}
    </div>
  );
}

function CoworkStagedImageThumbnail({
  image,
  onRemove,
}: {
  image: CoworkStagedImage;
  onRemove: () => void;
}) {
  const accessibleName = image.name || "Uploaded image";
  return (
    <div className="relative group/thumbnail">
      <div
        className="rounded-lg overflow-hidden can-focus-within border-0.5 border-border-300/25 hover:border-border-200/50 hover:shadow-always-black/10 shadow-sm shadow-always-black/5"
        style={{ width: 120, height: 120, minWidth: 120, minHeight: 120 }}
      >
        {image.status === "ready" ? (
          <img
            alt={accessibleName}
            className="block h-full w-full object-cover select-none pointer-events-none"
            draggable={false}
            src={image.previewUrl}
          />
        ) : (
          <div
            aria-label="Loading image"
            className="h-full w-full animate-pulse bg-bg-300"
          />
        )}
      </div>
      <button
        aria-label={`Remove ${accessibleName}`}
        className="transition-all hover:bg-bg-000/50 text-text-500 hover:text-text-200 group-focus-within/thumbnail:opacity-100 group-hover/thumbnail:opacity-100 opacity-0 w-5 h-5 absolute -top-2 -left-2 rounded-full border-0.5 border-border-300/25 bg-bg-000/90 backdrop-blur-sm flex items-center justify-center"
        data-official-source="index-BELzQL5P:OHe"
        onClick={(event) => {
          event.stopPropagation();
          event.preventDefault();
          onRemove();
        }}
        type="button"
      >
        <Icon bold customSize={12} name="X" />
      </button>
    </div>
  );
}
