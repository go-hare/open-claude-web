import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { desktopBridge } from "../../../adapters/desktopBridge";
import { Icon } from "../../../shell/icons";
import { ConfirmDialog } from "../../../shell/ConfirmDialog";
import type { CoworkPermissionDecision, CoworkPermissionRequest } from "../session/coworkPermissionTypes";
import { CoworkComputerAccessGlyph } from "../ui/CoworkOfficialGlyphs";
import { CoworkComposerButton } from "./CoworkComposerPrimitives";
import { useCoworkPermissionKeyboard } from "./useCoworkPermissionKeyboard";

type ApprovalProps = {
  busy: boolean;
  disableKeyboardShortcuts?: boolean;
  onDecide: (decision: CoworkPermissionDecision, input?: Record<string, unknown>) => void;
  request: CoworkPermissionRequest;
};

type TccGrantState = "granted" | "denied" | "not-determined" | "not-supported";
type TccState = { accessibility: TccGrantState; screenRecording: TccGrantState };

/**
 * Official residual Uge ComputerUseEnablePanel (index-BELzQL5P):
 *   title “Claude wants to use your computer”
 *   row Computer use → Enable → xge confirm “Turn on computer use?” → setPreference chicagoEnabled true
 *   optional Accessibility / Screen recording rows when input.tccState present and chicago already on
 *   Deny / Continue
 */
export function CoworkComputerEnableApproval(props: ApprovalProps) {
  const rootRef = useApprovalScrollIntoView();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [chicagoEnabled, setChicagoEnabled] = useState(false);
  const [tcc, setTcc] = useState<TccState | null>(readTccFromInput(props.request.input.tccState));
  const hasTccInInput = props.request.input.tccState !== undefined;
  const accessibilityGranted = tcc?.accessibility === "granted";
  const screenRecordingGranted = tcc?.screenRecording === "granted";
  const showOsRows = chicagoEnabled && hasTccInInput;
  const needsOs = showOsRows && (!accessibilityGranted || !screenRecordingGranted);

  useEffect(() => {
    let alive = true;
    void desktopBridge.Preferences.getPreferences?.().then((prefs) => {
      if (!alive) return;
      setChicagoEnabled(Boolean((prefs as { chicagoEnabled?: boolean } | null)?.chicagoEnabled));
    });
    const unsub = desktopBridge.Preferences.onPreferencesChanged?.((prefs) => {
      setChicagoEnabled(Boolean((prefs as { chicagoEnabled?: boolean }).chicagoEnabled));
    });
    return () => {
      alive = false;
      unsub?.();
    };
  }, []);

  const refreshTcc = useCallback(() => {
    void computerUseTcc()?.getState?.().then((state) => {
      if (state) setTcc(normalizeTcc(state));
    });
  }, []);

  useEffect(() => {
    if (hasTccInInput) refreshTcc();
  }, [hasTccInInput, refreshTcc]);

  const onDeny = useCallback(() => {
    props.onDecide("deny");
  }, [props]);

  const onEnableConfirm = useCallback(() => {
    setConfirmOpen(false);
    setChicagoEnabled(true);
    void desktopBridge.Preferences.setPreference?.(
      "chicagoEnabled" as never,
      true as never,
    );
  }, []);

  const onContinue = useCallback(() => {
    // Official Continue after enable = deny the current featureDisabled request
    // so the model re-calls request_access (CFi residual post-enable message).
    props.onDecide("deny");
  }, [props]);

  useComputerShortcuts(
    props.busy || props.disableKeyboardShortcuts === true || confirmOpen,
    onDeny,
    chicagoEnabled ? onContinue : onDeny,
  );

  const reason = text(props.request.input.reason);

  return (
    <div ref={rootRef}>
      {reason ? <p className="text-text-100 mb-3">{reason}</p> : null}
      <div
        className="bg-bg-000 rounded-xl border border-border-300 shadow-lg overflow-hidden mb-4"
        data-official-source="index-BELzQL5P:Uge"
        data-permission-kind="computer-enable"
      >
        <div className="p-3">
          <div className="flex items-start gap-2 mb-3">
            <CoworkComputerAccessGlyph className="text-text-300 flex-shrink-0" size={20} />
            <span className="text-sm text-text-200 font-semibold">Claude wants to use your computer</span>
          </div>
          <div className="ml-7 mb-3 border border-border-300 rounded-lg divide-y divide-border-300">
            <ComputerPermissionToggleRow
              buttonLabel="Enable"
              description="Let Claude see your screen and control your mouse and keyboard."
              granted={chicagoEnabled}
              label="Computer use"
              onRequest={() => setConfirmOpen(true)}
            />
            {showOsRows && !accessibilityGranted ? (
              <ComputerPermissionToggleRow
                description="Required for mouse and keyboard control."
                granted={false}
                label="Accessibility"
                onRequest={() => {
                  void computerUseTcc()?.requestAccessibility?.().finally(refreshTcc);
                }}
              />
            ) : null}
            {showOsRows && !screenRecordingGranted ? (
              <ComputerPermissionToggleRow
                description="Required for screen visibility. macOS may ask you to restart."
                granted={false}
                label="Screen recording"
                onRequest={() => {
                  void computerUseTcc()?.requestScreenRecording?.().finally(refreshTcc);
                }}
              />
            ) : null}
          </div>
          {needsOs ? (
            <p className="text-xs text-text-400 ml-7 mb-3">
              Grant the macOS permissions above to finish. You&apos;ll need to be at your Mac for these.
            </p>
          ) : null}
          <div className="flex gap-2 ml-7">
            <CoworkComposerButton
              className="!font-semibold !text-xs !h-9"
              disabled={props.busy}
              onClick={onDeny}
              shortcut={shortcut(props.disableKeyboardShortcuts || confirmOpen, "cmd+.")}
              variant="secondary"
            >
              Deny
            </CoworkComposerButton>
            {chicagoEnabled ? (
              <CoworkComposerButton
                className="!font-semibold !text-xs !h-9"
                disabled={props.busy}
                onClick={onContinue}
                shortcut={shortcut(props.disableKeyboardShortcuts || confirmOpen, "cmd+enter")}
              >
                Continue
              </CoworkComposerButton>
            ) : null}
          </div>
        </div>
      </div>
      {/* Official xge: Turn on computer use? / Turn on / warning */}
      {/* Official xge: variant warning + Turn on / Turn on computer use? */}
      <ConfirmDialog
        confirmText="Turn on"
        isOpen={confirmOpen}
        message={
          <div className="flex flex-col gap-3 pt-1">
            <p>
              Claude will take screenshots of your screen and control your mouse and keyboard. You&apos;ll approve each app, but not confirm each step Claude performs. Prefer tasks where mistakes are easy to fix.
            </p>
          </div>
        }
        onClose={() => setConfirmOpen(false)}
        onConfirm={onEnableConfirm}
        title="Turn on computer use?"
        variant="warning"
      />
    </div>
  );
}

/**
 * Official residual Fge ComputerUseTccPanel:
 * System permissions needed + Accessibility / Screen recording rows + Deny / Ask again.
 */
export function CoworkComputerTccApproval(props: ApprovalProps) {
  const rootRef = useApprovalScrollIntoView();
  const [tcc, setTcc] = useState<TccState | null>(readTccFromInput(props.request.input.tccState));
  const accessibilityGranted = tcc?.accessibility === "granted";
  const screenRecordingGranted = tcc?.screenRecording === "granted";
  const ready = Boolean(accessibilityGranted && screenRecordingGranted);

  const refreshTcc = useCallback(() => {
    void computerUseTcc()?.getState?.().then((state) => {
      if (state) setTcc(normalizeTcc(state));
    });
  }, []);

  useEffect(() => {
    refreshTcc();
  }, [refreshTcc]);

  const onDeny = useCallback(() => {
    props.onDecide("deny");
  }, [props]);

  useComputerShortcuts(props.busy || props.disableKeyboardShortcuts === true, onDeny, onDeny);

  return (
    <div ref={rootRef}>
      <div
        className="bg-bg-000 rounded-xl border border-border-300 shadow-lg overflow-hidden mb-4"
        data-official-source="index-BELzQL5P:Fge"
        data-permission-kind="computer-tcc"
      >
        <div className="p-3">
          <div className="flex items-start gap-2 mb-1">
            <CoworkComputerAccessGlyph className="text-text-300 flex-shrink-0" size={20} />
            <span className="text-sm text-text-200 font-semibold">System permissions needed</span>
          </div>
          <p className="text-sm text-text-300 ml-7 mb-3">
            Computer use needs two macOS permissions. Click each one, grant it in System Settings, then come back here.
          </p>
          <div className="ml-7 mb-3 border border-border-300 rounded-lg divide-y divide-border-300">
            <ComputerPermissionToggleRow
              description="Required for mouse and keyboard control."
              granted={accessibilityGranted === true}
              label="Accessibility"
              onRequest={() => {
                void computerUseTcc()?.requestAccessibility?.().finally(refreshTcc);
              }}
            />
            <ComputerPermissionToggleRow
              description="Required for screen visibility. macOS may ask you to restart."
              granted={screenRecordingGranted === true}
              label="Screen recording"
              onRequest={() => {
                void computerUseTcc()?.requestScreenRecording?.().finally(refreshTcc);
              }}
            />
          </div>
          {ready ? (
            <p className="text-xs text-text-400 ml-7 mb-3">Permissions are ready. Click Ask again to continue.</p>
          ) : null}
          <div className="flex gap-2 ml-7">
            <CoworkComposerButton
              className="!font-semibold !text-xs !h-9"
              disabled={props.busy}
              onClick={onDeny}
              shortcut={shortcut(props.disableKeyboardShortcuts, "cmd+.")}
              variant="secondary"
            >
              Deny
            </CoworkComposerButton>
            {ready ? (
              <CoworkComposerButton
                className="!font-semibold !text-xs !h-9"
                disabled={props.busy}
                onClick={onDeny}
              >
                Ask again
              </CoworkComposerButton>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CoworkComputerAccessApproval(props: ApprovalProps) {
  const rootRef = useApprovalScrollIntoView();
  const apps = useMemo(() => computerApps(props.request.input.apps), [props.request.input.apps]);
  const flags = record(props.request.input.requestedFlags);
  const allow = () => props.onDecide("always", withComputerGrants(props.request.input, apps, flags));
  useComputerShortcuts(props.busy || props.disableKeyboardShortcuts === true, () => props.onDecide("deny"), allow);
  const flagCount = [flags.clipboardRead, flags.clipboardWrite, flags.systemKeyCombos].filter(Boolean).length;
  return (
    <div ref={rootRef}>
      <div
        className="bg-bg-000 rounded-xl border border-border-300 shadow-lg overflow-hidden mb-4"
        data-official-source="index-BELzQL5P:Oge"
        data-permission-kind="computer-access"
      >
        <div className="p-3">
          <div className="flex items-start gap-2 mb-1"><CoworkComputerAccessGlyph className="text-text-300 flex-shrink-0" size={20} /><span className="text-sm text-text-200 font-semibold">{computerTitle(apps, flagCount > 0)}</span></div>
          {apps.length || flagCount ? <ComputerAccessRows apps={apps} flags={flags} /> : null}
          {Array.isArray(props.request.input.willHide) && props.request.input.willHide.length ? <p className="text-sm text-text-300 ml-7 mb-3">{props.request.input.autoUnhideEnabled ? "Your other windows will be hidden, then restored when Claude is done." : "Your other windows will be hidden while Claude works."}</p> : null}
          {props.request.input.screenshotFiltering === "none" ? <p className="text-xs text-text-400 ml-7 mb-3">On Windows, Claude can see all open apps. Actions on apps not allowed here are rejected.</p> : null}
          <div className="flex gap-2 ml-7">
            <CoworkComposerButton className="!font-semibold !text-xs !h-9" disabled={props.busy} onClick={() => props.onDecide("deny")} shortcut={shortcut(props.disableKeyboardShortcuts, "cmd+.")} variant="secondary">Deny</CoworkComposerButton>
            <CoworkComposerButton className="!font-semibold !text-xs !h-9" disabled={props.busy} onClick={allow} shortcut={shortcut(props.disableKeyboardShortcuts, "cmd+enter")}>Allow for this session</CoworkComposerButton>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CoworkComputerTeachApproval(props: ApprovalProps) {
  const rootRef = useApprovalScrollIntoView();
  const apps = useMemo(() => computerApps(props.request.input.apps), [props.request.input.apps]);
  const allow = () => props.onDecide("always", withComputerGrants(props.request.input, apps, {}));
  useComputerShortcuts(props.busy || props.disableKeyboardShortcuts === true, () => props.onDecide("deny"), allow);
  return (
    <div ref={rootRef}>
      <div
        className="bg-bg-000 rounded-xl border border-border-300 shadow-lg overflow-hidden mb-4"
        data-official-source="index-BELzQL5P:Vge"
        data-permission-kind="computer-teach"
      >
        <div className="p-3">
          <div className="flex items-start gap-2 mb-1"><CoworkComputerAccessGlyph className="text-text-300 flex-shrink-0" size={20} /><span className="text-sm text-text-200 font-semibold">Let Claude guide you step by step?</span></div>
          <p className="text-sm text-text-300 ml-7 mb-2">{text(props.request.input.reason)}</p>
          <p className="text-xs text-text-400 ml-7 mb-3">The Claude window will hide. A tooltip appears next to each step with a Next button. Click Exit anytime to stop.</p>
          {apps.length ? <div className="ml-7 mb-3 rounded-lg border border-border-300 bg-bg-100 divide-y divide-border-300 [&>*:nth-child(even)]:bg-bg-200/40">{apps.map((app, index) => <ComputerAppRow app={app} key={app.resolved?.bundleId ?? `unresolved-${index}`} />)}</div> : null}
          {Array.isArray(props.request.input.willHide) && props.request.input.willHide.length ? <p className="text-sm text-text-300 ml-7 mb-3">{props.request.input.autoUnhideEnabled ? "Your other windows will be hidden, then restored when Claude is done." : "Your other windows will be hidden while Claude works."}</p> : null}
          {props.request.input.screenshotFiltering === "none" ? <p className="text-xs text-text-400 ml-7 mb-3">On Windows, Claude can see all open apps. Actions on apps not allowed here are rejected.</p> : null}
          <div className="flex gap-2 ml-7">
            <CoworkComposerButton className="!font-semibold !text-xs !h-9" disabled={props.busy} onClick={() => props.onDecide("deny")} shortcut={shortcut(props.disableKeyboardShortcuts, "cmd+.")} variant="secondary">Deny</CoworkComposerButton>
            <CoworkComposerButton className="!font-semibold !text-xs !h-9" disabled={props.busy} onClick={allow} shortcut={shortcut(props.disableKeyboardShortcuts, "cmd+enter")}>Start guide</CoworkComposerButton>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Official qge ComputerUseTccRow residual (index-BELzQL5P ~62141):
 * label row + Granted/Not granted badge (Check / X icons), description, Enable/Request button when not granted.
 */
function ComputerPermissionToggleRow({
  // Official qge default buttonLabel = "Request"; Uge Computer use passes "Enable".
  buttonLabel = "Request",
  description,
  granted,
  label,
  onRequest,
}: {
  buttonLabel?: string;
  description: string;
  granted: boolean;
  label: string;
  onRequest: () => void;
}) {
  return (
    <div className="p-3 flex items-start justify-between gap-3" data-official-source="index-BELzQL5P:qge">
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-200 font-medium">{label}</span>
          {granted ? (
            <span className="inline-flex items-center gap-1 text-xs text-text-400">
              <Icon className="text-success-000 flex-shrink-0" customSize={14} name="Check" />
              Granted
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-text-400">
              <Icon className="text-text-400 flex-shrink-0" customSize={14} name="X" />
              Not granted
            </span>
          )}
        </div>
        <p className="text-xs text-text-400 m-0">{description}</p>
      </div>
      {granted ? null : (
        <CoworkComposerButton className="flex-shrink-0" onClick={onRequest} size="sm" variant="secondary">
          {buttonLabel}
        </CoworkComposerButton>
      )}
    </div>
  );
}

type ComputerApp = {
  alreadyGranted: boolean;
  isSentinel: boolean;
  proposedTier: "click" | "full" | "read";
  requestedName: string;
  resolved?: { bundleId: string; displayName: string; iconDataUrl?: string };
};

function ComputerAccessRows({ apps, flags }: { apps: ComputerApp[]; flags: Record<string, unknown> }) {
  return (
    <div className="ml-7 mb-3 rounded-lg border border-border-300 bg-bg-100 divide-y divide-border-300 [&>*:nth-child(even)]:bg-bg-200/40">
      {apps.map((app, index) => <ComputerAppRow app={app} key={app.resolved?.bundleId ?? `unresolved-${index}`} />)}
      {flags.clipboardRead ? <ComputerFlagRow icon="Clipboard" label="Read your clipboard" /> : null}
      {flags.clipboardWrite ? <ComputerFlagRow icon="ClipboardArrow" label="Write to your clipboard" /> : null}
      {flags.systemKeyCombos ? <ComputerFlagRow icon="Keyboard" label="Use system shortcuts (Cmd+Q, Cmd+Tab, and similar)" /> : null}
    </div>
  );
}

function ComputerAppRow({ app }: { app: ComputerApp }) {
  const resolved = app.resolved;
  return (
    <div className={`p-2.5${resolved ? "" : " opacity-50"}`}>
      <div className="flex items-center gap-2">
        {resolved?.iconDataUrl ? <div className="w-5 h-5 rounded overflow-hidden flex-shrink-0"><img alt="" className="w-full h-full scale-[1.15]" src={resolved.iconDataUrl} /></div> : <div className="w-5 h-5 rounded bg-bg-300 flex-shrink-0" />}
        <span className="text-sm text-text-200 truncate flex-1 min-w-0">{resolved?.displayName ?? app.requestedName}</span>
        {resolved ? <span className="rounded px-1.5 py-0.5 text-xs text-text-400">{app.alreadyGranted ? "Already allowed" : tierLabel(app.proposedTier)}</span> : <span className="text-xs text-text-400 flex-shrink-0">(not installed)</span>}
      </div>
    </div>
  );
}

function ComputerFlagRow({ icon, label }: { icon: string; label: string }) {
  return <div className="flex items-center gap-2 p-2.5"><Icon className="text-text-400 flex-shrink-0" customSize={16} name={icon} /><span className="text-sm text-text-200">{label}</span></div>;
}

function withComputerGrants(input: Record<string, unknown>, apps: ComputerApp[], flags: Record<string, unknown>) {
  const grantedAt = Date.now();
  const granted = apps.flatMap((app) => !app.alreadyGranted && app.resolved ? [{ bundleId: app.resolved.bundleId, displayName: app.resolved.displayName, grantedAt, tier: app.proposedTier }] : []);
  const denied = apps.flatMap((app) => !app.alreadyGranted && !app.resolved ? [{ bundleId: app.requestedName, reason: "not_installed" }] : []);
  return { ...input, _cuGrants: { denied, flags: { clipboardRead: flags.clipboardRead ?? false, clipboardWrite: flags.clipboardWrite ?? false, systemKeyCombos: flags.systemKeyCombos ?? false }, granted } };
}

function computerApps(value: unknown): ComputerApp[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((value) => {
    const app = record(value);
    const resolved = record(app.resolved);
    const proposedTier = app.proposedTier === "read" || app.proposedTier === "click" ? app.proposedTier : "full";
    const requestedName = text(app.requestedName);
    if (!requestedName) return [];
    return [{ alreadyGranted: app.alreadyGranted === true, isSentinel: app.isSentinel === true, proposedTier, requestedName, resolved: text(resolved.bundleId) && text(resolved.displayName) ? { bundleId: text(resolved.bundleId), displayName: text(resolved.displayName), iconDataUrl: text(resolved.iconDataUrl) } as ComputerApp["resolved"] : undefined }];
  });
}

function computerTitle(apps: ComputerApp[], hasFlags: boolean) { if (!apps.length && !hasFlags) return "Claude wants to use your computer"; if (!apps.length) return "Claude wants to:"; if (apps.length === 1 && !hasFlags) return `Claude wants to use ${apps[0]?.resolved?.displayName ?? apps[0]?.requestedName}`; return "Claude wants to use:"; }
function tierLabel(tier: ComputerApp["proposedTier"]) { return tier === "read" ? "View only" : tier === "click" ? "Click only" : "Full control"; }
function record(value: unknown) { return value && typeof value === "object" ? value as Record<string, unknown> : {}; }
function text(value: unknown) { return typeof value === "string" ? value : ""; }

function readTccFromInput(value: unknown): TccState | null {
  const row = record(value);
  if (!row.accessibility && !row.screenRecording) return null;
  return normalizeTcc(row);
}

function normalizeTcc(value: unknown): TccState {
  const row = record(value);
  return {
    accessibility: asGrant(row.accessibility),
    screenRecording: asGrant(row.screenRecording),
  };
}

function asGrant(value: unknown): TccGrantState {
  if (value === "granted" || value === "denied" || value === "not-determined" || value === "not-supported") {
    return value;
  }
  return "not-determined";
}

type ComputerUseTccBridge = {
  getState?: () => Promise<TccState | null | undefined>;
  requestAccessibility?: () => Promise<unknown>;
  requestScreenRecording?: () => Promise<unknown>;
};

function computerUseTcc(): ComputerUseTccBridge | undefined {
  const web = (window as unknown as { "claude.web"?: { ComputerUseTcc?: ComputerUseTccBridge } })["claude.web"];
  return web?.ComputerUseTcc;
}

function useApprovalScrollIntoView() { const ref = useRef<HTMLDivElement | null>(null); useEffect(() => { ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, []); return ref; }
function useComputerShortcuts(busy: boolean, onDeny: () => void, onAllow: () => void) { useCoworkPermissionKeyboard({ enabled: !busy, modifiedOnly: true, onDeny, onEnter: onAllow }); }
function shortcut(disabled: boolean | undefined, value: string) { return disabled ? undefined : value; }
