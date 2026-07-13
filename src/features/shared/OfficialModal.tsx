/**
 * Official Tm / _Component25 modal (c5f4e1303 LP).
 * Overlay PP + content MP classNames; modalSize xl => max-w-3xl (uYt).
 */
import {
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Icon } from "../../shell/icons";
import { OfficialButton } from "./OfficialButton";

export type OfficialModalSize = "sm" | "md" | "lg" | "2lg" | "xl" | "2xl" | "3xl";

const sizeClass: Record<OfficialModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  "2lg": "max-w-xl",
  xl: "max-w-3xl",
  "2xl": "max-w-5xl",
  "3xl": "max-w-6xl",
};

const overlayClassName =
  'fixed z-modal inset-0 grid items-center justify-items-center bg-always-black overflow-y-auto md:p-10 p-4 [background-color:hsl(var(--always-black)/var(--modal-overlay-opacity,0.5))] backdrop-blur-[2px] data-[state="open"]:[animation:fade_var(--modal-animation-duration,250ms)_ease-out_forwards] data-[state="closed"]:[animation:fade_var(--modal-close-duration,125ms)_ease-in_reverse_forwards]';

const contentBaseClassName =
  'flex flex-col focus:outline-none relative text-text-100 text-left shadow-xl border-0.5 border-border-300 rounded-2xl md:p-6 p-4 align-middle data-[state="open"]:[animation:zoom_var(--modal-animation-duration,250ms)_ease-out_forwards] data-[state="closed"]:[animation:zoom_var(--modal-close-duration,125ms)_ease-in_reverse_forwards]';

type OfficialModalProps = {
  autoCloseOnFocusOut?: boolean;
  children: ReactNode;
  className?: string;
  hasCloseButton?: boolean;
  isOpen: boolean;
  modalSize?: OfficialModalSize;
  onClose: () => void;
  subtitle?: ReactNode;
  title?: ReactNode;
};

export function OfficialModal({
  autoCloseOnFocusOut = true,
  children,
  className,
  hasCloseButton = false,
  isOpen,
  modalSize = "md",
  onClose,
  subtitle,
  title,
}: OfficialModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  const vars = {
    "--modal-animation-duration": "250ms",
    "--modal-close-duration": "125ms",
    "--modal-overlay-opacity": 0.5,
  } as CSSProperties;

  const contentClass = [
    contentBaseClassName,
    "min-w-0 w-full",
    sizeClass[modalSize],
    "bg-bg-100",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return createPortal(
    <div className="epitaxy-root" data-official-source="c5f4e1303:Tm/_Component25">
      <div
        className={overlayClassName}
        data-state="open"
        onMouseDown={() => {
          if (autoCloseOnFocusOut) onClose();
        }}
        role="presentation"
        style={vars}
      >
        <section
          aria-modal="true"
          className={contentClass}
          data-state="open"
          onMouseDown={(event) => event.stopPropagation()}
          role="dialog"
          style={vars}
        >
          <div
            className={[
              "min-h-full",
              title || hasCloseButton || subtitle ? "flex flex-col" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {title || hasCloseButton ? (
              <div className={`flex items-center gap-4 ${title ? "justify-between" : "justify-end"}`}>
                {title ? (
                  <h2 className="font-xl-bold text-text-100 flex w-full min-w-0 items-center leading-6 break-words">
                    <span className="[overflow-wrap:anywhere]">{title}</span>
                  </h2>
                ) : null}
                {hasCloseButton ? (
                  <div className="flex items-center gap-2">
                    <OfficialButton
                      aria-label="Close"
                      className="!text-text-500 hover:!text-text-400 -mx-2"
                      onClick={onClose}
                      size="icon_sm"
                      variant="ghost"
                    >
                      <Icon name="X" size="sm" />
                    </OfficialButton>
                  </div>
                ) : null}
              </div>
            ) : null}
            {subtitle ? <div className="text-text-300 mb-2 text-sm">{subtitle}</div> : null}
            {children}
          </div>
        </section>
      </div>
    </div>,
    document.body,
  );
}
