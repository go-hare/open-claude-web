/**
 * Official IBe leftover standalone verb rows (pin 2.31226.1).
 *
 * Kind: cd5a31703-B4nKQMBN.js IBe / wH. Verbs: c52b02f3f-DbJ5Omt6.js V().
 * PushNotification: cc4053f14-DYOgdTR9.js Te.
 *
 * ReportFindings / ClaudeDesign: Zg-like verb+meta (catalog verbs, not kX).
 * PushNotification unsent: verb IidprNKZ2T "Notification not sent", meta = input.message.
 * PushNotification sent: null (vH rolls-up → coordinator Zg).
 */
import { type ReactNode } from "react";
import {
  officialIbeStandaloneKind,
  officialIbeStandaloneMeta,
  officialIbeStandaloneVerb,
  type OfficialIbeToolLike,
} from "./officialIbeStandalone";

/** Official OfficialToolRow header class (cd5a Zg). */
const ZG_ROW =
  "relative group/tool flex self-start max-w-full items-center py-0 gap-0.75 text-left focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus rounded-sm";

export function OfficialIbeStandaloneCard({ tool }: { tool: OfficialIbeToolLike }): ReactNode | null {
  const kind = officialIbeStandaloneKind(tool);
  if (!kind) return null;
  if (kind === "push_notification") return null;
  const verb = officialIbeStandaloneVerb(tool);
  const meta = kind === "unsent_push_notification"
    ? (typeof tool.input.message === "string" && tool.input.message.trim() !== "" ? tool.input.message : undefined)
    : officialIbeStandaloneMeta(tool.input);
  return (
    <div className={ZG_ROW} data-official-ibe={kind} data-official-source="cd5a31703-B4nKQMBN.js:IBe wH c52b02f3f-DbJ5Omt6.js:V cc4053f14-DYOgdTR9.js:Te">
      <span className="shrink-0 text-body text-secondary" data-intl-id={verb.id}>{verb.text}</span>
      {meta ? <span className="text-body text-secondary truncate min-w-0">{meta}</span> : null}
    </div>
  );
}
