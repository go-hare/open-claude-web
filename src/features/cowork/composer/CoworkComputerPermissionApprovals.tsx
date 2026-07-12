import { useEffect, useMemo, useRef } from "react";
import { Icon } from "../../../shell/icons";
import type { CoworkPermissionDecision, CoworkPermissionRequest } from "../session/coworkPermissionTypes";
import { CoworkComputerAccessGlyph, CoworkComputerTeachGlyph } from "../ui/CoworkOfficialGlyphs";
import { CoworkComposerButton } from "./CoworkComposerPrimitives";
import { useCoworkPermissionKeyboard } from "./useCoworkPermissionKeyboard";

type ApprovalProps = {
  busy: boolean;
  disableKeyboardShortcuts?: boolean;
  onDecide: (decision: CoworkPermissionDecision, input?: Record<string, unknown>) => void;
  request: CoworkPermissionRequest;
};

export function CoworkComputerAccessApproval(props: ApprovalProps) {
  const rootRef = useApprovalScrollIntoView();
  const apps = useMemo(() => computerApps(props.request.input.apps), [props.request.input.apps]);
  const flags = record(props.request.input.requestedFlags);
  const allow = () => props.onDecide("always", withComputerGrants(props.request.input, apps, flags));
  useComputerShortcuts(props.busy || props.disableKeyboardShortcuts === true, () => props.onDecide("deny"), allow);
  const flagCount = [flags.clipboardRead, flags.clipboardWrite, flags.systemKeyCombos].filter(Boolean).length;
  return (
    <div ref={rootRef}>
      <div className="bg-bg-000 rounded-xl border border-border-300 shadow-lg overflow-hidden mb-4">
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
      <div className="bg-bg-000 rounded-xl border border-border-300 shadow-lg overflow-hidden mb-4">
        <div className="p-3">
          <div className="flex items-start gap-2 mb-1"><CoworkComputerTeachGlyph className="text-text-300 flex-shrink-0" size={20} /><span className="text-sm text-text-200 font-semibold">Let Claude guide you step by step?</span></div>
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

function useApprovalScrollIntoView() { const ref = useRef<HTMLDivElement | null>(null); useEffect(() => { ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, []); return ref; }
function useComputerShortcuts(busy: boolean, onDeny: () => void, onAllow: () => void) { useCoworkPermissionKeyboard({ enabled: !busy, modifiedOnly: true, onDeny, onEnter: onAllow }); }
function shortcut(disabled: boolean | undefined, value: string) { return disabled ? undefined : value; }
