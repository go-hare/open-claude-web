/**
 * Official cn.images residual strip — c11959232 Cv → yv (epitaxy-attachment-pill).
 * Qj mounts shelf as `epitaxy-attachment-shelf px-p7 pt-p7` above the TipTap row.
 * Hover X: epitaxy-pill-remove + group-hover/pill.
 * Hover popup: yv floating 280px preview (AnimatePresence + floating-ui).
 * Click popup: Cv → gs/FHe OfficialComposerImagePreview.
 *
 * Product note: hover float is portaled (FloatingPortal + strategy fixed) so it is
 * not clipped by epitaxy-chat-column `[contain:layout]` / overflow ancestors.
 * ClassNames / motion tokens stay official yv residual.
 */
import {
  autoUpdate,
  FloatingPortal,
  offset,
  shift,
  useFloating,
} from "@floating-ui/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import {
  BaseContextMenuItem,
  BaseContextMenuPopup,
  ContextMenu,
} from "../../../shell/BaseMenu";
import { Icon } from "../../../shell/icons";
import {
  readResolvedColorMode,
  THEME_MODE_CHANGE_EVENT,
} from "../../settings/appearanceSettings";
import { OfficialComposerImagePreview } from "./OfficialComposerImagePreview";
import { OfficialSpinner } from "./OfficialWorkingStatus";

/** Portaled hover float needs CDS token re-root (ring/bg-z0). */
function CdsHoverPortalRoot({ children }: { children: ReactNode }) {
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
      className="cds-root"
      data-cds-portal=""
      data-density="default"
      data-mode={mode}
      data-platform="desktop"
    >
      {children}
    </div>
  );
}

export type StagedComposerImage = {
  id: string;
  name: string;
  previewUrl: string;
  status: "loading" | "ready";
  /** Anthropic image payload fields once ready. */
  base64?: string;
  mimeType?: string;
};

/** Official yv motion tokens (c11959232 pv/mv/hv/xv/vv). */
const PREVIEW_EXIT = { opacity: 0, scale: 0.96, y: 4 };
const PREVIEW_ENTER = {
  opacity: 1,
  scale: 1,
  y: 0,
  transition: { type: "spring" as const, duration: 0.4, bounce: 0.3 },
};
const PREVIEW_LEAVE = {
  opacity: 0,
  scale: 0.96,
  y: 4,
  transition: { type: "spring" as const, duration: 0.25, bounce: 0.2 },
};
const PREVIEW_INSTANT = { duration: 0 };

function pillVtName(value: string) {
  return `epitaxy-pill-${value.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

/** Official yv image thumbnail pill (thumbnail string case). */
function OfficialAttachmentImagePill({
  image,
  onOpenLightbox,
  onPreviewIntent,
  onRemove,
  previewOpen,
}: {
  image: StagedComposerImage;
  onOpenLightbox: () => void;
  onPreviewIntent: (id: string | null, immediate?: boolean) => void;
  onRemove: (id: string) => void;
  previewOpen: boolean;
}) {
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = useReducedMotion();
  const loading = image.status === "loading";
  const thumbnail = image.previewUrl;

  const { refs, floatingStyles, middlewareData } = useFloating({
    open: previewOpen,
    placement: "top-start",
    strategy: "fixed",
    transform: false,
    middleware: [offset(8), shift({ padding: 16 })],
    whileElementsMounted: autoUpdate,
  });
  const shiftX = -(middlewareData.shift?.x ?? 0);

  const remove = useCallback(() => {
    const current = triggerRef.current;
    const neighbor = current?.nextElementSibling ?? current?.previousElementSibling;
    neighbor?.querySelector<HTMLElement>(".epitaxy-pill-body")?.focus();
    onRemove(image.id);
  }, [image.id, onRemove]);

  const onPillKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      const pill = event.currentTarget.closest(".epitaxy-attachment-pill");
      const focusBody = (el: Element | null | undefined) => {
        el?.querySelector<HTMLElement>(".epitaxy-pill-body")?.focus();
      };
      switch (event.key) {
        case "Delete":
        case "Backspace":
          event.preventDefault();
          remove();
          return;
        case "ArrowLeft":
          event.preventDefault();
          event.stopPropagation();
          focusBody(pill?.previousElementSibling);
          return;
        case "ArrowRight":
          event.preventDefault();
          event.stopPropagation();
          focusBody(pill?.nextElementSibling);
          return;
        case "Home":
          event.preventDefault();
          event.stopPropagation();
          focusBody(pill?.parentElement?.firstElementChild);
          return;
        case "End":
          event.preventDefault();
          event.stopPropagation();
          focusBody(pill?.parentElement?.lastElementChild);
          return;
        case "Enter":
        case " ":
          event.preventDefault();
          onOpenLightbox();
          return;
        default:
          return;
      }
    },
    [onOpenLightbox, remove],
  );

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger
        render={(props) => (
          <div
            {...props}
            ref={(node) => {
              triggerRef.current = node;
              refs.setReference(node);
              const incoming = (
                props as {
                  ref?:
                    | ((el: HTMLDivElement | null) => void)
                    | { current: HTMLDivElement | null }
                    | null;
                }
              ).ref;
              if (typeof incoming === "function") incoming(node);
              else if (incoming && typeof incoming === "object") incoming.current = node;
            }}
            className="epitaxy-attachment-pill group/pill relative shrink-0 hover:z-10 focus-within:z-10"
            style={{ "--pill-vt-name": pillVtName(image.id) } as CSSProperties}
            onMouseEnter={() => onPreviewIntent(image.id)}
          >
            <button
              type="button"
              aria-label={image.name}
              onKeyDown={onPillKeyDown}
              onFocus={() => onPreviewIntent(image.id, true)}
              onClick={onOpenLightbox}
              className="epitaxy-pill-body grid place-items-stretch w-[var(--h7)] h-[var(--h7)] rounded-r3 overflow-hidden outline-none border-0 p-0 ring-focus hide-focus-ring bg-fill-contained-default"
            >
              <div className="relative w-full h-full">
                {thumbnail ? (
                  <img src={thumbnail} alt="" className="w-full h-full object-cover" draggable={false} />
                ) : null}
                {loading ? (
                  <div role="status" className="absolute inset-0 grid place-items-center bg-z0/60">
                    <OfficialSpinner size="s" />
                    <span className="sr-only">Processing image</span>
                  </div>
                ) : null}
              </div>
            </button>
            <button
              type="button"
              tabIndex={-1}
              aria-label={`Remove ${image.name}`}
              onClick={(event) => {
                event.stopPropagation();
                event.preventDefault();
                remove();
              }}
              onMouseDown={(event) => event.preventDefault()}
              className="epitaxy-pill-remove absolute -top-1.5 -right-1.5 z-10 grid place-items-center w-4 h-4 rounded-full bg-z0 text-t7 ring-1 ring-[var(--t2)] opacity-0 pointer-events-none transition-opacity group-hover/pill:opacity-100 group-hover/pill:pointer-events-auto group-focus-within/pill:opacity-100 group-focus-within/pill:pointer-events-auto hover:text-t9"
            >
              <Icon name="XCrossCloseMedium" size="s" />
            </button>
            <FloatingPortal>
              <CdsHoverPortalRoot>
                <AnimatePresence>
                  {previewOpen && thumbnail ? (
                    <motion.div
                      ref={refs.setFloating}
                      aria-hidden="true"
                      initial={!reducedMotion ? PREVIEW_EXIT : undefined}
                      animate={reducedMotion ? { ...PREVIEW_ENTER, transition: PREVIEW_INSTANT } : PREVIEW_ENTER}
                      exit={reducedMotion ? { ...PREVIEW_LEAVE, transition: PREVIEW_INSTANT } : PREVIEW_LEAVE}
                      style={{ ...floatingStyles, transformOrigin: `${shiftX}px bottom` }}
                      className="z-30 pointer-events-none rounded-r4 overflow-hidden shadow-lg ring-1 ring-[var(--t2)]"
                    >
                      <img
                        src={thumbnail}
                        alt=""
                        className="block max-w-[280px] max-h-[280px] object-contain bg-z0"
                      />
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </CdsHoverPortalRoot>
            </FloatingPortal>
          </div>
        )}
      />
      <BaseContextMenuPopup>
        <BaseContextMenuItem className="text-destructive-default" onClick={remove}>
          Delete
        </BaseContextMenuItem>
      </BaseContextMenuPopup>
    </ContextMenu.Root>
  );
}

export function OfficialComposerStagedImages({
  images,
  onRemove,
}: {
  images: StagedComposerImage[];
  onRemove: (id: string) => void;
}) {
  /** Official Cv: M preview id, S lightbox open, R {src,alt}. */
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  /** Official E — first hover already shown (skip 600ms thereafter until strip leave). */
  const shownOnceRef = useRef(false);
  /** Official T — suppress immediate focus preview right after click opens lightbox. */
  const suppressAfterClickRef = useRef(false);
  const delayTimerRef = useRef<number | undefined>(undefined);

  /**
   * Official Cv `_`:
   * clearTimeout; id==null → C(null);
   * else if !(immediate && T): immediate||E → open now; else 600ms debounce;
   * else (immediate && T): T=false (skip open).
   */
  const onPreviewIntent = useCallback((id: string | null, immediate = false) => {
    window.clearTimeout(delayTimerRef.current);
    if (id === null) {
      setPreviewId(null);
      return;
    }
    if (immediate && suppressAfterClickRef.current) {
      suppressAfterClickRef.current = false;
      return;
    }
    if (immediate || shownOnceRef.current) {
      shownOnceRef.current = true;
      setPreviewId(id);
      return;
    }
    delayTimerRef.current = window.setTimeout(() => {
      shownOnceRef.current = true;
      setPreviewId(id);
    }, 600);
  }, []);

  /** Official A — clear timeout + E + C(null). Does not touch T. */
  const clearPreview = useCallback(() => {
    window.clearTimeout(delayTimerRef.current);
    shownOnceRef.current = false;
    setPreviewId(null);
  }, []);

  /** Official image onClick: A(); T.current=!0; I({src,alt}); N(!0). */
  const openLightbox = useCallback((image: StagedComposerImage) => {
    clearPreview();
    suppressAfterClickRef.current = true;
    setLightbox({ src: image.previewUrl, alt: image.name });
    setLightboxOpen(true);
  }, [clearPreview]);

  if (images.length === 0) return null;

  return (
    <>
      <div
        className="epitaxy-attachment-shelf px-p7 pt-p7"
        data-official-source="c11959232-staged-images"
      >
        <div
          className="flex gap-g3 flex-wrap"
          onMouseLeave={clearPreview}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) clearPreview();
          }}
        >
          {images.map((image) => (
            <OfficialAttachmentImagePill
              key={image.id}
              image={image}
              onRemove={onRemove}
              previewOpen={previewId === image.id}
              onPreviewIntent={onPreviewIntent}
              onOpenLightbox={() => openLightbox(image)}
            />
          ))}
        </div>
      </div>
      <OfficialComposerImagePreview
        src={lightbox?.src ?? ""}
        alt={lightbox?.alt ?? ""}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}

/** dataUrl → File-like base64 payload for LocalSessions images[]. */
export function dataUrlToImagePayload(
  dataUrl: string,
  name: string,
): {
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
