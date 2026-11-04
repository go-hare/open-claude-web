/**
 * Official later-pin `vu` / leftover Np `Ll` (c65de4b60 `s as n`):
 *   data-testid="pending-nav-frame" className `relative ${className}`
 *   pending-nav-body + shield + role=status sr-only announcement
 *
 * Pin 2.42304.2 Dm:
 *   vu({ className:"flex-1 min-h-0", announcement: IY7S4mLrkm })
 * Pin 2.31226.1 has no this wrap — leftover asked the later announcement.
 * Do not invent hp() router leaving or pending-nav-scrim.
 */
import type { ReactNode } from "react";
import { useI18nText } from "../../../i18n/footerMenuMessages";
import { SESSION_LOAD_MESSAGES } from "../officialCodeChromeMessages";

export function OfficialPendingNavFrame({
  announcement,
  children,
  className,
  pending = false,
}: {
  announcement?: string;
  children: ReactNode;
  className?: string;
  pending?: boolean;
}) {
  const text = useI18nText(SESSION_LOAD_MESSAGES);
  const label = announcement ?? text.loadingSession;
  return (
    <div
      className={`relative ${className ?? ""}`}
      data-testid="pending-nav-frame"
    >
      <div
        className={pending ? "h-full w-full isolate" : "h-full w-full"}
        data-leaving={pending || undefined}
        data-testid="pending-nav-body"
      >
        {children}
      </div>
      <div
        aria-hidden
        className="absolute inset-0 cursor-default"
        data-testid="pending-nav-shield"
        hidden={!pending}
      />
      <div className="sr-only" role="status">
        {pending ? <span data-intl-id="IY7S4mLrkm">{label}</span> : null}
      </div>
    </div>
  );
}
