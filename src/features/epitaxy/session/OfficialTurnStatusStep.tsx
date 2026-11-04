/**
 * Official c734 `Tt.Step` / `ap.Step` — Collapsible Root + Trigger + Panel.
 * hangMark / mergeBusyStep: busy+empty body → pending visual; hangMark keeps busy/blocked hang.
 * Face delay is shared-frame `Qk` (`ye`): settleMs 250, minMs Xk=650 / yt=2000, restretch, line.
 */
import { type ReactNode, useState } from "react";
import { Icon } from "../../../shell/icons";
import {
  OFFICIAL_HANG_BUSY_BODY_MIN_MS,
  officialHangBusyLine,
  officialHangFaceKey,
  useOfficialHangFace,
} from "./officialHangFace";
function StepChevron({ expanded }: { expanded: boolean }) {
  return (
    <span className="shrink-0 text-muted">
      <Icon
        className={`transition-transform duration-fast motion-reduce:transition-none ${expanded ? "rotate-90" : ""}`}
        customSize={14}
        name="CaretRight"
      />
    </span>
  );
}

function officialHasStepLabel(label: ReactNode) {
  if (typeof label === "string") return label !== "";
  return label != null;
}

export function OfficialTurnStatusStep({
  actions,
  actionsLabel,
  children,
  busyStepKeys,
  defaultOpen = true,
  elapsedSeconds,
  findOmitted = false,
  hangMark = false,
  label,
  mergeBusyStep = false,
  meta,
  onOpenChange,
  open: openProp,
  source,
  state = "done",
}: {
  actions?: ReactNode;
  actionsLabel?: string;
  children?: ReactNode;
  defaultOpen?: boolean;
  elapsedSeconds?: number;
  findOmitted?: boolean;
  busyStepKeys?: string[];
  hangMark?: boolean;
  label: ReactNode;
  mergeBusyStep?: boolean;
  meta?: ReactNode;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  source: string;
  state?: "blocked" | "busy" | "done" | "failed" | "pending";
}) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const expandable = children != null;
  const emptyBody = !expandable;
  const visualState =
    mergeBusyStep
    && emptyBody
    && officialHasStepLabel(label)
    && (state === "busy" || state === "blocked")
      ? "pending"
      : state;
  const hangFace = useOfficialHangFace(visualState, officialHangFaceKey(visualState, label), {
    hangMark,
    line: visualState === "busy" && !emptyBody ? officialHangBusyLine(busyStepKeys) : undefined,
    minMs: (current) => (current === "busy" && visualState === "busy" ? (emptyBody ? undefined : OFFICIAL_HANG_BUSY_BODY_MIN_MS) : 0),
    restretch: visualState === "busy" || visualState === "blocked" || hangMark,
    settleMs: hangMark || visualState === "busy" || visualState === "blocked" ? 250 : 0,
  });
  const paintedState = hangFace.value;
  const hang = (hangMark === true && (paintedState === "busy" || paintedState === "blocked")) || hangFace.hang;
  const open = expandable ? (openProp ?? uncontrolled) : false;
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setUncontrolled(next);
    onOpenChange?.(next);
  };
  const showElapsed = paintedState === "busy" && elapsedSeconds != null && elapsedSeconds >= 2;
  // Official c734 uses Base UI Collapsible. Vite prebundle of
  // `@base-ui-components/react/collapsible` duplicates React (invalid-hook /
  // useRef null) and EpitaxyChatPanelErrorBoundary swallows the session.
  // Native details matches Settings overlay residual; keep c734 chrome classes.
  return expandable ? (
    <details
      className="flex w-full min-w-0 flex-col"
      data-cds="TurnStatusStep"
      data-find-omitted={findOmitted ? "" : undefined}
      data-hang={hang ? "" : undefined}
      data-official-source={source}
      data-state={paintedState}
      onToggle={(event) => {
        const next = event.currentTarget.open;
        if (next !== open) setOpen(next);
      }}
      open={open}
    >
      <summary className="relative group/step flex self-start max-w-full items-center py-0 gap-0.75 text-left list-none [&::-webkit-details-marker]:hidden cursor-pointer focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus rounded-sm" data-cds-row="">
        <span className={`text-body ${paintedState === "busy" ? "epitaxy-text-shine" : "text-muted"}`}>{label}</span>
        {meta ? <span className="text-body text-primary min-w-0 truncate">{meta}</span> : null}
        {showElapsed ? (
          <span className="text-body text-muted tabular-nums shrink-0" data-official-source="cd5a31703-B4nKQMBN.js:Yj">
            {elapsedSeconds}s
          </span>
        ) : null}
        <StepChevron expanded={open} />
      </summary>
      <div className="h-auto overflow-visible">
        <div
          className="flex min-w-0 items-start gap-xs font-sans text-body font-normal text-secondary not-italic pt-xs"
          data-cds-actions-scope={actions ? "" : undefined}
        >
          <div className="min-w-0 flex-1 whitespace-pre-wrap break-words">{children}</div>
          {actions ? (
            <div aria-label={actionsLabel} className="flex h-[1lh] shrink-0 items-center" role="toolbar">
              {actions}
            </div>
          ) : null}
        </div>
      </div>
    </details>
  ) : (
    <div
      className="flex w-full min-w-0 flex-col"
      data-cds="TurnStatusStep"
      data-find-omitted={findOmitted ? "" : undefined}
      data-hang={hang ? "" : undefined}
      data-official-source={source}
      data-state={paintedState}
    >
      <div className="relative group/step flex self-start max-w-full items-center py-0 gap-0.75" data-cds-row="">
        <span className={`text-body ${paintedState === "busy" ? "epitaxy-text-shine" : "text-muted"}`}>{label}</span>
        {meta ? <span className="text-body text-primary min-w-0 truncate">{meta}</span> : null}
        {showElapsed ? (
          <span className="text-body text-muted tabular-nums shrink-0" data-official-source="cd5a31703-B4nKQMBN.js:Yj">
            {elapsedSeconds}s
          </span>
        ) : null}
      </div>
    </div>
  );
}
