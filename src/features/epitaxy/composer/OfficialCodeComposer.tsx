import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  desktopBridge,
  type EffortLevel,
  type PermissionMode,
  type WorkspaceContext,
} from "../../../adapters/desktopBridge";
import {
  OfficialDropdownButton,
  type OfficialDropdownItem,
} from "../OfficialEpitaxyComponents";
import { OfficialPromptEditor } from "../OfficialPromptEditor";
import { useWorkspaceTrustGate } from "../trust/useWorkspaceTrustGate";
import {
  normalizeSelectorModelValue,
  useCodeModelOptions,
} from "../../cowork/composer/useCoworkModelOptions";
import {
  permissionModeLabel,
  ULTRACODE_OPTION,
  effortOptions,
} from "./options";
import { numberComposerMenuItems } from "./composerMenuItems";
import { EpitaxyPermissionModeModal } from "./EpitaxyPermissionModeModal";
import { OfficialEffortControl, type OfficialEffortItem } from "./OfficialEffortControl";
import { OfficialWorkspaceControls } from "./OfficialWorkspaceControls";
import { usePermissionModeConfirm } from "./usePermissionModeConfirm";
import { useCodePermissionModeOptions } from "./useBypassPermissionsEnabled";
import { useClaudeCodeGitAvailable } from "./useClaudeCodeGitAvailable";

type OfficialCodeComposerProps = {
  busy: boolean;
  /** Ladder stop only — Ultracode is a separate session flag (official jR / 5f75ff4). */
  effort: EffortLevel;
  /** Official get_settings.applied (CLI 2.7.16+) for the new-session draft ladder. */
  effortLevels?: string[] | null;
  model: string;
  /**
   * Official X(level, ultracode): ladder id + session flag.
   * Ultracode selects xhigh + ultracode=true (not a ladder value).
   */
  onEffortChange: (level: EffortLevel, ultracode: boolean) => void;
  onModelChange: (value: string) => void;
  onPermissionModeChange: (value: PermissionMode) => void;
  onSourceBranchChange: (branch: string) => void;
  onSubmit: () => void;
  onUseWorktreeChange: (enabled: boolean) => void;
  onWorkspaceChange: (workspace: WorkspaceContext) => void;
  permissionMode: PermissionMode;
  prompt: string;
  setPrompt: (value: string) => void;
  sourceBranch: string;
  /** Official yR — session-only Ultracode; new drafts start false. */
  ultracode?: boolean;
  ultracodeOfferable?: boolean | null;
  useWorktree: boolean;
  workspace: WorkspaceContext;
};

const composerIconButtonClass = "group/btn relative isolate inline-flex items-center whitespace-nowrap border-0 cursor-default select-none outline-none hide-focus-ring text-uncontained-default hover:text-uncontained-hover disabled:text-uncontained-disabled disabled:hover:text-uncontained-disabled busy:text-uncontained-busy pressed:text-uncontained-selected pressed:hover:text-uncontained-selected ring-focus h-base text-body rounded-base justify-center aspect-square px-p3";

export function OfficialCodeComposer({
  busy,
  effort,
  effortLevels = null,
  model,
  onEffortChange,
  onModelChange,
  onPermissionModeChange,
  onSourceBranchChange,
  onSubmit,
  onUseWorktreeChange,
  onWorkspaceChange,
  permissionMode,
  prompt,
  setPrompt,
  sourceBranch,
  ultracode = false,
  ultracodeOfferable = null,
  useWorktree,
  workspace,
}: OfficialCodeComposerProps) {
  const { ensureTrusted, modal } = useWorkspaceTrustGate(workspace.cwd);
  const codeModelOptions = useCodeModelOptions();
  // Official s7t/Xr — only gate when probe returns false (null = unknown/missing host API).
  const gitAvailable = useClaudeCodeGitAvailable();
  // Official bi: draft local non-ssh && !1===_s. Home composer is always the draft path.
  const showGitRequired =
    workspace.mode === "local"
    && !workspace.sshConfig
    && gitAvailable === false;
  const submitStateRef = useRef({ busy, ensureTrusted, hasPrompt: false, onSubmit, workspaceCwd: workspace.cwd });
  const [replayKey, setReplayKey] = useState(0);
  const [openFooterMenu, setOpenFooterMenu] = useState<"effort" | "mode" | "model" | null>(null);
  const hasPrompt = prompt.trim().length > 0;
  const allowedModelValues = useMemo(
    () => codeModelOptions.items.map((item) => item.value),
    [codeModelOptions.items],
  );
  const selectedModel = normalizeSelectorModelValue(model, allowedModelValues);

  submitStateRef.current = { busy, ensureTrusted, hasPrompt, onSubmit, workspaceCwd: workspace.cwd };

  // Official Sm + EpitaxyPermissionModeModal for first bypass/auto selection.
  const permissionModeConfirm = usePermissionModeConfirm(
    workspace.cwd,
    (mode) => onPermissionModeChange(mode as PermissionMode),
  );

  // Official c119: sticky restore when draft still on default after bag loads.
  useEffect(() => {
    if (!codeModelOptions.ready) return;
    if (normalizeSelectorModelValue(model, allowedModelValues) !== "default") return;
    if (codeModelOptions.preferredSelectorValue === "default") return;
    onModelChange(codeModelOptions.preferredSelectorValue);
  }, [allowedModelValues, codeModelOptions.preferredSelectorValue, codeModelOptions.ready, model, onModelChange]);

  // Drop shell-leaked session models (grok/kimi) once bag list is known.
  useEffect(() => {
    if (!codeModelOptions.ready) return;
    const normalized = normalizeSelectorModelValue(model, allowedModelValues);
    if (normalized !== model) onModelChange(normalized);
  }, [allowedModelValues, codeModelOptions.ready, model, onModelChange]);

  // Official te() + Os residual: hide bypass when bypassPermissionsModeEnabled is off.
  const codePermissionModeOptions = useCodePermissionModeOptions();
  const permissionItems: OfficialDropdownItem[] = codePermissionModeOptions.map((option) => ({
    checked: option.value === permissionMode,
    label: option.label,
    onSelect: () => permissionModeConfirm.select(option.value),
  }));
  const modelItems: OfficialDropdownItem[] = codeModelOptions.items.map((option) => ({
    checked: option.value === selectedModel,
    label: option.label,
    onSelect: () => {
      codeModelOptions.setStickyModelPreference(option.value);
      onModelChange(option.value);
    },
  }));
  const effortItems: OfficialEffortItem[] = useMemo(() => {
    // 5f75ff4: per-model catalog when present; null → full residual 5-stop ladder.
    const allowed = effortLevels && effortLevels.length > 0 ? new Set(effortLevels) : null;
    const ladder = allowed ? effortOptions.filter((o) => allowed.has(o.value)) : effortOptions;
    const items: OfficialEffortItem[] = ladder.map((option) => ({
      checked: !ultracode && option.value === effort,
      label: option.label,
      value: option.value,
      // Ladder pick clears Ultracode flag (official X(level, false)).
      onSelect: () => onEffortChange(option.value, false),
    }));
    // Official $ gate: ultracodeOfferable=false → hide Ultracode; null keeps it.
    if (ultracodeOfferable !== false) {
      items.push({
        accent: true,
        checked: ultracode,
        help: ULTRACODE_OPTION.help,
        label: ULTRACODE_OPTION.label,
        value: ULTRACODE_OPTION.value,
        // Residual: Ultracode = xhigh + workflows flag (not a ladder id).
        onSelect: () => onEffortChange("xhigh", true),
      });
    }
    return items;
  }, [effort, effortLevels, onEffortChange, ultracode, ultracodeOfferable]);
  const numberedPermissionItems = useMemo(() => (
    openFooterMenu === "mode" ? numberComposerMenuItems(permissionItems) : permissionItems
  ), [openFooterMenu, permissionItems]);
  const numberedModelItems = useMemo(() => (
    openFooterMenu === "model" ? numberComposerMenuItems(modelItems) : modelItems
  ), [modelItems, openFooterMenu]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const hasOnlyDigit = !(event.metaKey || event.ctrlKey || event.altKey || event.shiftKey);
      if (openFooterMenu && hasOnlyDigit && event.code.startsWith("Digit")) {
        const index = Number(event.code.slice(5)) - 1;
        // Official Dne: digit quick-keys also apply while Effort slider popover is open.
        const items = openFooterMenu === "mode"
          ? numberedPermissionItems
          : openFooterMenu === "effort"
            ? effortItems
            : numberedModelItems;
        const item = items[index];
        if (item?.onSelect && !item.disabled) {
          event.preventDefault();
          event.stopPropagation();
          item.onSelect();
          setOpenFooterMenu(null);
        }
        return;
      }

      if (openFooterMenu && hasOnlyDigit && event.key === "Escape") {
        event.preventDefault();
        setOpenFooterMenu(null);
        return;
      }

      const commandKey = navigator.platform.toLowerCase().includes("mac") ? event.metaKey : event.ctrlKey;
      if (!commandKey || !event.shiftKey || event.altKey) return;
      if (event.code === "KeyM" && permissionItems.length > 0) {
        event.preventDefault();
        setOpenFooterMenu("mode");
      } else if (event.code === "KeyI" && modelItems.length > 0) {
        event.preventDefault();
        setOpenFooterMenu("model");
      } else if (event.code === "KeyE" && effortItems.length > 0) {
        event.preventDefault();
        setOpenFooterMenu("effort");
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [effortItems, modelItems, numberedModelItems, numberedPermissionItems, openFooterMenu, permissionItems.length]);

  const submitWithTrust = useCallback(() => {
    const state = submitStateRef.current;
    if (!state.hasPrompt || state.busy) return;
    void state.ensureTrusted(state.workspaceCwd, state.onSubmit);
  }, []);

  return (
    <div className="flex flex-col gap-g5">
      <OfficialWorkspaceControls
        disabled={busy}
        ensureTrusted={ensureTrusted}
        onSourceBranchChange={onSourceBranchChange}
        onUseWorktreeChange={onUseWorktreeChange}
        onWorkspaceChange={onWorkspaceChange}
        sourceBranch={sourceBranch}
        useWorktree={useWorktree}
        workspace={workspace}
      />
      <div className="relative h-0 -mb-[var(--g5)] pointer-events-none">
        <button
          aria-hidden="true"
          className="absolute right-[-16px] bottom-[-13px] w-[80px] h-[80px] -scale-x-100 border-0 bg-transparent p-0 outline-none hide-focus-ring cursor-default pointer-events-auto"
          onClick={() => setReplayKey((key) => key + 1)}
          onMouseDown={(event) => event.preventDefault()}
          tabIndex={-1}
          type="button"
        >
          <img alt="" className="h-full w-full" draggable={false} key={replayKey} src="/assets/v1/clawd-laptop-official.gif" />
        </button>
      </div>
      <div style={{ boxShadow: "var(--df-shadow-card)" }}>
        <OfficialPromptEditor
          bridge={desktopBridge.LocalSessions}
          busy={busy}
          onChange={setPrompt}
          onSubmit={submitWithTrust}
          placeholder="描述一个任务，或提一个问题"
          slashCwd={workspace.cwd || undefined}
          value={prompt}
        />
      </div>
      {/* Official c119 bi residual (CHsqi6o1Li) above mode footer when git probe false. */}
      {showGitRequired ? (
        <div
          className="text-footnote text-extended-pink select-text"
          data-official-source="c11959232-h_zsw3wI.js:CHsqi6o1Li"
        >
          Git is required for local sessions.
        </div>
      ) : null}
      <div className="w-full flex items-center gap-g5 py-[4px]">
        <div className="flex items-center gap-g5 min-w-0">
          <OfficialDropdownButton
            align="start"
            ariaLabel="Permission mode"
            disabled={busy}
            header="模式"
            items={numberedPermissionItems}
            label={<span className={permissionMode === "bypassPermissions" ? "text-extended-yellow" : undefined}>{permissionModeLabel(permissionMode)}</span>}
            mode="text"
            onOpenChange={(open) => setOpenFooterMenu(open ? "mode" : null)}
            open={openFooterMenu === "mode"}
            revealChevron="never"
            side="top"
            size="small"
            triggerKey="cmd+shift+m"
            variant="uncontained"
          />
          <OfficialDropdownButton ariaLabel="Add" disabled={busy} icon="PlusLarge" items={[{ icon: "Folder1", label: "Add folder" }]} revealChevron="never" side="top" size="small" variant="uncontained" />
        </div>
        <div className="ml-auto flex items-center gap-g4">
          <OfficialDropdownButton
            align="end"
            ariaLabel="Model"
            disabled={busy}
            header="Models"
            items={numberedModelItems}
            label={codeModelOptions.labelFor(selectedModel)}
            mode="text"
            onOpenChange={(open) => setOpenFooterMenu(open ? "model" : null)}
            open={openFooterMenu === "model"}
            revealChevron="never"
            side="top"
            size="small"
            triggerKey="cmd+shift+i"
            variant="uncontained"
          />
          <OfficialEffortControl
            disabled={busy}
            items={effortItems}
            onOpenChange={(open) => setOpenFooterMenu(open ? "effort" : null)}
            open={openFooterMenu === "effort"}
          />
          <button className={`${composerIconButtonClass} h-small text-footnote rounded-small shrink-0`} type="button" aria-label="Usage">
            <span aria-hidden="true" className="btn-squish absolute inset-0 -z-[1] rounded-[inherit] bg-[var(--fill-uncontained-default)] group-hover/btn:bg-[var(--fill-uncontained-hover)]" />
            <span className="size-[12px] rounded-full border-2 border-border-400" aria-hidden="true" />
          </button>
        </div>
      </div>
      {modal}
      <EpitaxyPermissionModeModal
        mode={permissionModeConfirm.confirming}
        onCancel={permissionModeConfirm.cancel}
        onConfirm={permissionModeConfirm.confirm}
        workspace={permissionModeConfirm.workspace}
      />
    </div>
  );
}
