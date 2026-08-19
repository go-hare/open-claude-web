/**
 * Official FHe / gs (index-BELzQL5P + c119 Cv): single-image click preview modal.
 * Zh shell with FHe chrome — max-w-[40rem] px-3 pb-14 pt-3, close left-full,
 * rounded-md shadow + img block w-full max-h-[calc(100vh-4rem)].
 */
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  readResolvedColorMode,
  THEME_MODE_CHANGE_EVENT,
} from "../../settings/appearanceSettings";
import { Icon } from "../../../shell/icons";

/**
 * Portaled FHe must re-root CDS tokens (same le pattern as BaseMenu CdsPortalRoot).
 * Bare body portal loses --always-black / --text-* from html.cds-root.
 */
function CdsPortalRoot({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"light" | "dark">(() => readResolvedColorMode());
  useEffect(() => {
    const sync = () => setMode(readResolvedColorMode());
    sync();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", sync);
    window.addEventListener("storage", sync);
    window.addEventListener(THEME_MODE_CHANGE_EVENT, sync);
    return () => {
      media.removeEventListener("change", sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener(THEME_MODE_CHANGE_EVENT, sync);
    };
  }, []);
  return (
    <div
      className="cds-root epitaxy-root"
      data-cds-portal=""
      data-density="default"
      data-mode={mode}
      data-platform="desktop"
      data-official-source="index-BELzQL5P:FHe"
    >
      {children}
    </div>
  );
}

export function OfficialComposerImagePreview({
  alt,
  isOpen,
  onClose,
  src,
}: {
  alt: string;
  isOpen: boolean;
  onClose: () => void;
  src: string;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !src) return null;

  return createPortal(
    <CdsPortalRoot>
      <button
        aria-label="Close image preview overlay"
        className="fixed inset-0 z-modal bg-always-black/60 draggable-none border-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <div
        className="fixed inset-0 z-modal flex items-center justify-center pointer-events-none draggable-none"
        role="presentation"
      >
        {/* Official FHe → Zh className */}
        <div
          className="relative max-w-[40rem] px-3 pb-14 pt-3 pointer-events-auto w-full"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-label="Image preview"
          aria-modal="true"
        >
          <button
            aria-label="Close image preview"
            className="hover:!text-text-100 !ring-border-200 !absolute left-full top-0 ml-1.5 !text-always-white !ring-offset-0 size-8 inline-flex items-center justify-center rounded-full"
            data-testid="close-file-preview"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onClose();
            }}
            type="button"
          >
            <Icon customSize={16} name="XCrossCloseMedium" />
          </button>
          <div className="rounded-md overflow-hidden shadow-[0_4px_32px_hsl(var(--always-black)/30%),_0_0_0_0.5px_hsl(var(--always-black)/25%)]">
            <img
              alt={alt}
              className="block w-full max-h-[calc(100vh-4rem)]"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onClose();
              }}
              src={src}
            />
          </div>
        </div>
      </div>
    </CdsPortalRoot>,
    document.body,
  );
}
