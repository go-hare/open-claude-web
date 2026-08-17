/**
 * Shared Code Recents/Pinned title cell.
 * Residual CodeSessionRow (Ja) sticky So gate + existing mask fade chrome.
 */
import { useEffect, useState } from "react";
import { OfficialTitleTypewriter } from "./OfficialTitleTypewriter";
import {
  isOfficialSidebarTitlePending,
  TITLE_REVEAL_HOLD_MS,
} from "./officialSidebarTitleReveal";

/** Existing Recents/Pinned title mask fade — keep exact class string. */
const TITLE_MASK_CLASS =
  "block w-full min-w-0 whitespace-nowrap overflow-hidden [mask-image:linear-gradient(to_right,hsl(var(--always-black))_85%,transparent_99%)] group-hover:[mask-image:linear-gradient(to_right,hsl(var(--always-black))_60%,transparent_78%)] group-focus-within:[mask-image:linear-gradient(to_right,hsl(var(--always-black))_60%,transparent_78%)] group-data-[menu-open=true]:[mask-image:linear-gradient(to_right,hsl(var(--always-black))_60%,transparent_78%)]";

export type OfficialSidebarTitleProps = {
  /** Session display title (placeholder or auto/user). */
  title: string;
};

/**
 * Residual: while pending (placeholder) keep So mounted with skipInitialReveal;
 * after auto title lands, hold So 1500ms so the change typewrites, then plain.
 */
export function OfficialSidebarTitle({ title }: OfficialSidebarTitleProps) {
  const pending = isOfficialSidebarTitlePending(title);
  const [reveal, setReveal] = useState(pending);

  useEffect(() => {
    if (pending) {
      setReveal(true);
      return;
    }
    if (!reveal) return;
    const timer = window.setTimeout(() => setReveal(false), TITLE_REVEAL_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [pending, reveal]);

  return (
    <span className={TITLE_MASK_CLASS}>
      {reveal ? (
        <OfficialTitleTypewriter text={title} skipInitialReveal />
      ) : (
        title
      )}
    </span>
  );
}
