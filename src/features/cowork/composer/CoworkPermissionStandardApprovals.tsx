import type { CoworkPermissionDecision, CoworkPermissionRequest } from "../session/coworkPermissionTypes";
import { Icon } from "../../../shell/icons";
import { CoworkComputerAccessGlyph, CoworkWebGlyph } from "../ui/CoworkOfficialGlyphs";
import { CoworkComposerButton, CoworkPermissionSplitButton } from "./CoworkComposerPrimitives";
import { useCoworkPermissionKeyboard } from "./useCoworkPermissionKeyboard";

type ApprovalProps = {
  busy: boolean;
  disableKeyboardShortcuts?: boolean;
  isScheduledTask?: boolean;
  onDecide: (decision: CoworkPermissionDecision, input?: Record<string, unknown>) => void;
  request: CoworkPermissionRequest;
};

export function CoworkDirectoryApproval({ busy, disableKeyboardShortcuts, isScheduledTask, onDecide, request }: ApprovalProps) {
  const path = text(request.input.path);
  useStandardShortcuts(busy || disableKeyboardShortcuts === true, onDecide);
  return (
    <div className="bg-bg-000 rounded-xl border border-border-300 shadow-lg overflow-hidden p-3">
      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-2">
          <Icon className="text-text-300 flex-shrink-0 mt-0.5" customSize={20} name="Folder1" />
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-sm text-text-200">
              Claude would like to <span className="font-semibold">Cowork</span> in{path ? ":" : " a folder"}
            </span>
            {path ? <span className="font-mono text-sm text-text-100 break-all" title={path}>{path}</span> : null}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <CoworkComposerButton disabled={busy} onClick={() => onDecide("deny")} shortcut={shortcut(disableKeyboardShortcuts, "escape")} variant="secondary">Deny</CoworkComposerButton>
          {isScheduledTask && path ? <CoworkComposerButton disabled={busy} onClick={() => onDecide("always")} variant="secondary">Allow for all scheduled runs</CoworkComposerButton> : null}
          <CoworkComposerButton disabled={busy} onClick={() => onDecide("once")} shortcut={shortcut(disableKeyboardShortcuts, "enter")}>{path ? "Allow" : "Choose folder"}</CoworkComposerButton>
        </div>
      </div>
    </div>
  );
}

export function CoworkFileDeleteApproval({ busy, disableKeyboardShortcuts, onDecide, request }: ApprovalProps) {
  const folderName = text(request.input._folderName) ?? "workspace";
  useStandardShortcuts(busy || disableKeyboardShortcuts === true, onDecide);
  return (
    <div className="bg-bg-000 rounded-xl border border-border-300 shadow-lg overflow-hidden p-3">
      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-2">
          <Icon className="text-warning-100 flex-shrink-0 mt-0.5" customSize={20} name="Warning" />
          <div className="flex flex-col gap-1">
            <span className="font-base-bold">Allow Claude to permanently delete files in your <span className="font-semibold">{folderName}</span> folder during this task?</span>
            <span className="font-small text-text-500">Once allowed, this permission can&apos;t be revoked without starting a new task. Deleted files can&apos;t be restored.</span>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <CoworkComposerButton disabled={busy} onClick={() => onDecide("deny")} shortcut={shortcut(disableKeyboardShortcuts, "escape")} variant="secondary">Deny</CoworkComposerButton>
          <CoworkComposerButton disabled={busy} onClick={() => onDecide("once")} shortcut={shortcut(disableKeyboardShortcuts, "enter")}>Allow</CoworkComposerButton>
        </div>
      </div>
    </div>
  );
}

export function CoworkWebFetchApproval({ busy, disableKeyboardShortcuts, onDecide, request }: ApprovalProps) {
  const domain = text(request.input.domain) ?? "";
  useStandardShortcuts(busy || disableKeyboardShortcuts === true, onDecide);
  return (
    <div className="bg-bg-000 rounded-xl border border-border-300 shadow-lg overflow-hidden mb-4">
      <div className="p-3">
        <div className="flex items-start gap-2 mb-3">
          <CoworkWebGlyph className="text-text-300 flex-shrink-0" size={20} />
          <span className="text-sm text-text-200">Allow Claude to fetch a page from <span className="font-semibold">{domain}</span>?</span>
        </div>
        <div className="flex gap-2 ml-7">
          <CoworkComposerButton className="!font-semibold !text-xs !h-9" disabled={busy} onClick={() => onDecide("once")}>Allow</CoworkComposerButton>
          <CoworkComposerButton className="!font-semibold !text-xs !h-9" disabled={busy} onClick={() => onDecide("deny")} variant="secondary">Decline</CoworkComposerButton>
        </div>
      </div>
    </div>
  );
}

export function CoworkBrowserApproval({ busy, disableKeyboardShortcuts, duplicateCount, isScheduledTask, onDecide, request }: ApprovalProps & {
  duplicateCount: number;
  isScheduledTask: boolean;
}) {
  const domain = text(request.input.domain) ?? "";
  useCoworkPermissionKeyboard({
    enabled: !busy && !disableKeyboardShortcuts,
    ignoreEditableTarget: true,
    onDeny: () => onDecide("deny"),
    onEnter: () => onDecide("always"),
  });
  const alwaysLabel = isScheduledTask ? "Allow for all scheduled runs" : "Allow for this website";
  return (
    <div className="bg-bg-000 rounded-xl border border-border-300 shadow-lg overflow-hidden mb-4">
      <div className="p-3">
        <div className="flex items-start gap-2 mb-3">
          <CoworkComputerAccessGlyph className="text-text-300 flex-shrink-0" size={20} />
          <span className="text-sm text-text-200">
            Allow Claude to use the browser on <span className="font-semibold">{domain}</span>?
            {duplicateCount > 1 ? <span className="ml-2 text-xs text-text-400">({duplicateCount} requests)</span> : null}
          </span>
        </div>
        <div className="flex gap-2 ml-7">
          <CoworkPermissionSplitButton
            buttonClassName="!bg-text-100 !text-bg-000 !border-text-100 hover:!bg-text-200 !font-semibold"
            disabled={busy}
            items={[
              { label: isScheduledTask ? "For all scheduled runs" : "All for this website", onSelect: () => onDecide("always") },
              { label: "This time only", onSelect: () => onDecide("once") },
            ]}
            mainButtonText={alwaysLabel}
            menuLabel="Allow..."
            onMainClick={() => onDecide("always")}
            triggerClassName="!h-9 [&>button:first-child]:!border-r [&>button:first-child]:!border-r-oncolor-100/25"
          />
          <CoworkComposerButton className="!font-semibold !text-xs !h-9" disabled={busy} onClick={() => onDecide("deny")} variant="secondary">Deny</CoworkComposerButton>
        </div>
      </div>
    </div>
  );
}

export function CoworkLaunchCodeApproval({ busy, disableKeyboardShortcuts, onDecide, onSetup, request }: ApprovalProps & {
  onSetup?: (request: CoworkPermissionRequest) => void;
}) {
  const spec = text(request.input.spec) ?? "";
  const summary = spec.split("\n", 1)[0]?.trim();
  useCoworkPermissionKeyboard({
    enabled: !busy && !disableKeyboardShortcuts,
    ignoreEditableTarget: true,
    onDeny: () => onDecide("deny"),
    onEnter: () => onSetup?.(request),
  });
  return (
    <div className="bg-bg-000 rounded-xl border border-border-300 shadow-lg overflow-hidden p-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="text-text-300 flex-shrink-0" customSize={20} name="Code" />
          <div className="min-w-0 flex flex-col">
            <span className="text-sm text-text-200">Claude wants to send this to <span className="font-semibold">Claude Code</span></span>
            {summary ? <span className="text-xs text-text-400 truncate">{summary}</span> : null}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <CoworkComposerButton disabled={busy} onClick={() => onDecide("deny")} shortcut={shortcut(disableKeyboardShortcuts, "escape")} variant="secondary">Deny</CoworkComposerButton>
          <CoworkComposerButton disabled={busy || !onSetup} onClick={() => onSetup?.(request)} shortcut={shortcut(disableKeyboardShortcuts, "enter")}>Set up…</CoworkComposerButton>
        </div>
      </div>
    </div>
  );
}

function useStandardShortcuts(busy: boolean, onDecide: ApprovalProps["onDecide"]) {
  useCoworkPermissionKeyboard({
    enabled: !busy,
    ignoreEditableTarget: true,
    onDeny: () => onDecide("deny"),
    onEnter: () => onDecide("once"),
  });
}

function text(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function shortcut(disabled: boolean | undefined, value: string) {
  return disabled ? undefined : value;
}
