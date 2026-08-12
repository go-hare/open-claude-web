/**
 * Official Code Computer Use approval cards (c11959232 Xt).
 * - yk → wk: epitaxy-approval-card app/flags grant (Deny / Allow for this session + _cuGrants)
 * - fo → Lge/Age: featureDisabled/tcc (Cowork residual chrome Uge/Fge; Oge fallback)
 * - mo → Vge: teach access (Cowork residual chrome)
 */
import { memo, useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import { Icon } from "../../../shell/icons";
import {
  CoworkComputerAccessApproval,
  CoworkComputerEnableApproval,
  CoworkComputerTccApproval,
  CoworkComputerTeachApproval,
} from "../../cowork/composer/CoworkComputerPermissionApprovals";
import type { CoworkPermissionRequest } from "../../cowork/session/coworkPermissionTypes";
import { OfficialButton } from "../OfficialEpitaxyComponents";
import {
  buildOfficialComputerUseGrantsPayload,
  officialComputerAccessAgeKind,
  officialComputerUseSentinelKind,
  officialComputerUseSentinelLabel,
  officialComputerUseTierLabel,
  officialComputerUseWkTitle,
  parseOfficialComputerUseInput,
  type OfficialComputerUseApp,
  type OfficialComputerUseParsedInput,
} from "./officialComputerUseModel";

type CuDecide = (decision: "always" | "deny" | "once", updatedInput?: Record<string, unknown>) => void;

/** Official wk — normal computer:request_access app list (epitaxy shell). */
export const OfficialComputerUseWkApprovalCard = memo(function OfficialComputerUseWkApprovalCard({
  busy,
  children,
  isPanelActive = true,
  onDecide,
  queueDepth = 0,
  toolInput,
}: {
  busy?: boolean;
  children?: ReactNode;
  isPanelActive?: boolean;
  onDecide: CuDecide;
  queueDepth?: number;
  toolInput: Record<string, unknown>;
}) {
  const parsed = useMemo(() => parseOfficialComputerUseInput(toolInput), [toolInput]);
  const pendingApps = useMemo(
    () => parsed.apps.filter((app) => !app.alreadyGranted),
    [parsed.apps],
  );
  const flags = parsed.requestedFlags;
  const hasFlags = Boolean(flags.clipboardRead || flags.clipboardWrite || flags.systemKeyCombos);
  const showRows = pendingApps.length > 0 || hasFlags;
  const ghostCount = Math.min(queueDepth, 2);
  const isPanelActiveRef = useRef(isPanelActive);
  isPanelActiveRef.current = isPanelActive;

  const onDeny = useCallback(() => {
    if (busy) return;
    onDecide("deny");
  }, [busy, onDecide]);

  const onAllow = useCallback(() => {
    if (busy) return;
    onDecide("always", buildOfficialComputerUseGrantsPayload(toolInput, parsed));
  }, [busy, onDecide, parsed, toolInput]);

  useEffect(() => {
    if (!isPanelActive) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isPanelActiveRef.current || busy) return;
      if (event.key === "Escape") {
        if (event.isComposing) {
          event.stopPropagation();
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        onDeny();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        onAllow();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [busy, isPanelActive, onAllow, onDeny]);

  return (
    <div className="epitaxy-approval-card" data-official-source="c11959232:wk">
      {Array.from({ length: ghostCount }, (_, index) => {
        const layer = index + 1;
        return (
          <div
            aria-hidden
            className="absolute inset-0 rounded-r7 bg-surface-primary-elevated epitaxy-approval-ghost pointer-events-none"
            key={layer}
            style={{
              opacity: 1 - 0.25 * layer,
              transform: `translateY(-${6 * layer}px) scale(${1 - 0.03 * layer})`,
              zIndex: -layer,
            }}
          />
        );
      })}
      <OfficialCuSurface />
      <OfficialCuWkHeader reason={parsed.reason} title={<OfficialCuWkTitle apps={pendingApps} hasFlags={hasFlags} />} />
      {showRows ? (
        <div className="flex flex-col gap-g2">
          {pendingApps.map((app, index) => (
            <OfficialCuAppRow app={app} key={app.resolved?.bundleId ?? `unresolved-${index}`} />
          ))}
          {flags.clipboardRead ? (
            <OfficialCuFlagRow icon="Clipboard" label="Read your clipboard" />
          ) : null}
          {flags.clipboardWrite ? (
            <OfficialCuFlagRow icon="ClipboardArrow" label="Write to your clipboard" />
          ) : null}
          {flags.systemKeyCombos ? (
            <OfficialCuFlagRow
              icon="Keyboard"
              label="Use system shortcuts (Cmd+Q, Cmd+Tab, and similar)"
            />
          ) : null}
        </div>
      ) : null}
      {parsed.willHide.length > 0 ? (
        <p className="text-footnote text-t6">
          {parsed.autoUnhideEnabled
            ? "Your other windows will be hidden, then restored when Claude is done."
            : "Your other windows will be hidden while Claude works."}
        </p>
      ) : null}
      {parsed.screenshotFiltering === "none" ? (
        <p className="text-footnote text-t5">
          On Windows, Claude can see all open apps. Actions on apps not allowed here are rejected.
        </p>
      ) : null}
      {children}
      <div className="flex flex-col gap-g3 sm:flex-row sm:justify-between relative z-[1]">
        <OfficialButton disabled={busy} onClick={onDeny} size="base" variant="contained">
          Deny
          <OfficialCuShortcut>esc</OfficialCuShortcut>
        </OfficialButton>
        <OfficialButton disabled={busy} onClick={onAllow} size="base" variant="primary">
          Allow for this session
          <OfficialCuShortcut>⌘⏎</OfficialCuShortcut>
        </OfficialButton>
      </div>
    </div>
  );
});

/**
 * Official Lge/Age for computer:request_access when !yk (featureDisabled / tcc).
 * Residual chrome is Cowork bg-bg-000 cards (Uge/Fge/Oge), not epitaxy-approval-card.
 */
export const OfficialComputerUseAgeApproval = memo(function OfficialComputerUseAgeApproval({
  busy,
  onDecide,
  requestId,
  sessionId,
  toolInput,
  toolName,
}: {
  busy?: boolean;
  onDecide: CuDecide;
  requestId: string;
  sessionId: string;
  toolInput: Record<string, unknown>;
  toolName: string;
}) {
  const kind = officialComputerAccessAgeKind(toolInput);
  const request = useMemo(
    () => toCoworkPermissionRequest(requestId, sessionId, toolName, toolInput),
    [requestId, sessionId, toolInput, toolName],
  );
  const props = {
    busy: busy === true,
    disableKeyboardShortcuts: busy === true,
    onDecide,
    request,
  };
  if (kind === "computer-enable") return <CoworkComputerEnableApproval {...props} />;
  if (kind === "computer-tcc") return <CoworkComputerTccApproval {...props} />;
  return <CoworkComputerAccessApproval {...props} />;
});

/** Official Vge / ho — computer:request_teach_access. */
export const OfficialComputerUseTeachApproval = memo(function OfficialComputerUseTeachApproval({
  busy,
  onDecide,
  requestId,
  sessionId,
  toolInput,
  toolName,
}: {
  busy?: boolean;
  onDecide: CuDecide;
  requestId: string;
  sessionId: string;
  toolInput: Record<string, unknown>;
  toolName: string;
}) {
  const request = useMemo(
    () => toCoworkPermissionRequest(requestId, sessionId, toolName, toolInput),
    [requestId, sessionId, toolInput, toolName],
  );
  return (
    <CoworkComputerTeachApproval
      busy={busy === true}
      disableKeyboardShortcuts={busy === true}
      onDecide={onDecide}
      request={request}
    />
  );
});

function OfficialCuWkTitle({
  apps,
  hasFlags,
}: {
  apps: OfficialComputerUseApp[];
  hasFlags: boolean;
}) {
  const title = officialComputerUseWkTitle(apps, hasFlags);
  if (title.kind === "single") {
    return (
      <>
        Allow Claude to <span className="text-t9">use</span>{" "}
        <span className="text-t9">{title.app}</span>?
      </>
    );
  }
  if (title.kind === "multi") {
    return (
      <>
        Allow Claude to <span className="text-t9">use</span> {title.count} apps?
      </>
    );
  }
  if (title.kind === "capabilities") {
    return (
      <>
        Allow Claude to <span className="text-t9">use</span> these capabilities?
      </>
    );
  }
  return (
    <>
      Allow Claude to <span className="text-t9">use your computer</span>?
    </>
  );
}

/** Official Ah header with subtitle = reason (c11959232). */
function OfficialCuWkHeader({ reason, title }: { reason?: string; title: ReactNode }) {
  return (
    <div className="text-body-semibold text-t9 min-h-[24px] flex items-center gap-1 pb-p6">
      <span className="flex flex-1 min-w-0 flex-col gap-[2px]">
        <span className="flex items-center gap-g3 min-w-0">
          <span aria-hidden className="grid size-[20px] shrink-0 place-items-center">
            <span className="size-[6px] rounded-full bg-extended-yellow" />
          </span>
          <span className="min-w-0 break-words">{title}</span>
        </span>
        {reason ? <div className="text-body text-t6">{reason}</div> : null}
      </span>
    </div>
  );
}

/** Official Ck app row. */
function OfficialCuAppRow({ app }: { app: OfficialComputerUseApp }) {
  const name = app.resolved?.displayName ?? app.requestedName;
  const icon = app.resolved?.iconDataUrl;
  const sentinel = app.isSentinel
    ? officialComputerUseSentinelLabel(
        officialComputerUseSentinelKind(app.resolved?.bundleId ?? app.requestedName),
      )
    : null;
  return (
    <div
      className={`flex items-center gap-g6 rounded-r4 px-p6 py-p6 bg-t1${app.resolved ? "" : " opacity-50"}`}
    >
      {icon ? (
        <img alt="" className="size-[20px] rounded-[4px] shrink-0 scale-[1.15]" src={icon} />
      ) : (
        <div className="size-[20px] rounded-[4px] bg-t3 shrink-0" />
      )}
      <div className="flex flex-col gap-g1 min-w-0 flex-1">
        <div className="text-body text-t9 truncate">
          {name}
          {app.resolved ? null : <span className="text-t5"> (not installed)</span>}
        </div>
        {sentinel ? <div className="text-footnote text-extended-yellow">{sentinel}</div> : null}
      </div>
      {app.resolved ? (
        <span className="text-footnote text-t6 shrink-0">
          {officialComputerUseTierLabel(app.proposedTier)}
        </span>
      ) : null}
    </div>
  );
}

/** Official Sk flag row — Icon residual uses size-[20px] text-t6. */
function OfficialCuFlagRow({ icon, label }: { icon: "Clipboard" | "ClipboardArrow" | "Keyboard"; label: string }) {
  return (
    <div className="flex items-center gap-g6 rounded-r4 px-p6 py-p6 bg-t1">
      <Icon className="size-[20px] text-t6 shrink-0" customSize={20} name={icon} />
      <div className="text-body text-t9 flex-1">{label}</div>
    </div>
  );
}

function OfficialCuSurface() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-primary-elevated effect-primary-elevated"
      data-surface="sidebar"
    />
  );
}

function OfficialCuShortcut({ children }: { children: ReactNode }) {
  return <kbd className="text-caption opacity-60 shrink-0">{children}</kbd>;
}

function toCoworkPermissionRequest(
  requestId: string,
  sessionId: string,
  toolName: string,
  input: Record<string, unknown>,
): CoworkPermissionRequest {
  return {
    input,
    requestId,
    sessionId,
    toolName,
    toolUseId: requestId,
  };
}

// silence unused if tree-shaken paths need parsed type export
export type { OfficialComputerUseParsedInput };
