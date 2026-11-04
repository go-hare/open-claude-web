/**
 * Official cd5a31703 `Tw` — older-page status over the transcript sizer.
 * Mount only when `cwe` status is non-null (hasOlder).
 * Official `[Ise]:""` is pin `u` = `data-transcript-not-rows`.
 */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { OfficialButton } from "../OfficialEpitaxyComponents";
import { OfficialSpinner } from "./OfficialWorkingStatus";
import { useI18nText } from "../../../i18n/footerMenuMessages";
import { SESSION_LOAD_MESSAGES } from "../officialCodeChromeMessages";
import type { OfficialOlderStatus } from "./officialOlderPager";

export const OFFICIAL_OLDER_NOT_ROWS = "data-transcript-not-rows";

export function OfficialOlderStatusChrome({
  onRetry,
  status,
  topPx = 0,
}: {
  onRetry: () => void;
  status: OfficialOlderStatus;
  topPx?: number;
}): ReactNode | null {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const heldFocusRef = useRef(false);
  const [intersecting, setIntersecting] = useState(true);
  useEffect(() => {
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver((entries) => {
      setIntersecting(entries.at(-1)?.isIntersecting ?? true);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const node = rootRef.current;
    if (!node) return undefined;
    const onFocusIn = () => {
      heldFocusRef.current = true;
    };
    const onFocusOut = (event: FocusEvent) => {
      heldFocusRef.current = event.relatedTarget !== null && node.contains(event.relatedTarget as Node);
    };
    node.addEventListener("focusin", onFocusIn);
    node.addEventListener("focusout", onFocusOut);
    return () => {
      node.removeEventListener("focusin", onFocusIn);
      node.removeEventListener("focusout", onFocusOut);
    };
  }, []);
  useLayoutEffect(() => {
    const node = rootRef.current;
    if (node !== null && heldFocusRef.current && !node.contains(node.ownerDocument.activeElement)) {
      node.focus({ preventScroll: true });
    }
  }, [intersecting, status?.state]);
  useLayoutEffect(() => {
    const node = rootRef.current;
    return () => {
      if (node === null || !node.contains(node.ownerDocument.activeElement)) return;
      let parent: HTMLElement | null = node.parentElement;
      while (parent !== null && parent.tabIndex < 0 && !parent.hasAttribute("tabindex")) {
        parent = parent.parentElement;
      }
      parent?.focus({ preventScroll: true });
    };
  }, []);

  const text = useI18nText(SESSION_LOAD_MESSAGES);
  if (!status) return null;

  return (
    <div
      {...{ [OFFICIAL_OLDER_NOT_ROWS]: "" }}
      className="absolute left-0 w-full flex items-center justify-center gap-2"
      data-official-source="cd5a31703-B4nKQMBN.js:Tw"
      ref={rootRef}
      role="status"
      style={{ top: topPx, height: status.heightPx }}
      tabIndex={-1}
    >
      {status.state === "failed" ? (
        <>
          <span className="text-footnote text-muted" data-intl-id="2O0qJ9zfDJ">
            {text.couldntLoadOlderMessages}
          </span>
          <OfficialButton onClick={onRetry} size="small" variant="ghost">
            <span data-intl-id="62nsdyMyIO">{text.retry}</span>
          </OfficialButton>
        </>
      ) : (
        <>
          {intersecting ? <OfficialSpinner size="m" /> : null}
          <span className="sr-only" data-intl-id="gjBiyjshwX">{text.loadingEllipsis}</span>
        </>
      )}
    </div>
  );
}
