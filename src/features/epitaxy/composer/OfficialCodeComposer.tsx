import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
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
import { OfficialPromptEditor, type OfficialPromptEditorHandle } from "../OfficialPromptEditor";
import { useWorkspaceTrustGate } from "../trust/useWorkspaceTrustGate";
import {
  normalizeSelectorModelValue,
  useCodeModelOptions,
} from "../../cowork/composer/useCoworkModelOptions";
import { permissionModeLabel } from "./options";
import { numberComposerMenuItems } from "./composerMenuItems";
import { EpitaxyPermissionModeModal } from "./EpitaxyPermissionModeModal";
import { OfficialEffortControl, type OfficialEffortItem } from "./OfficialEffortControl";
import { OfficialWorkspaceControls } from "./OfficialWorkspaceControls";
import { usePermissionModeConfirm } from "./usePermissionModeConfirm";
import { useCodePermissionModeOptions } from "./useBypassPermissionsEnabled";
import { useClaudeCodeGitAvailable } from "./useClaudeCodeGitAvailable";
import {
  buildOfficialEffortMenuItems,
  clampEffortToCatalog,
} from "../session/officialComposerOptions";
import { useOfficialTypeToComposer } from "../../shared/useOfficialTypeToComposer";
import { coworkRateLimitStore } from "../../cowork/session/rateLimit/coworkRateLimitStore";
import {
  residualGaFromMessageLimits,
  residualOs,
  residualQjDisabled,
  residualQjSubmitDisabled,
} from "../session/officialQjComposerGate";

type OfficialCodeComposerProps = {
  /**
   * Product draft create in-flight (EpitaxyHome setBusy around LocalSessions.start).
   * Maps residual Ns create mutate counter — NOT residual H busy/Stop chrome.
   */
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
  // Residual Ga from pr() messageLimits (shared Code/Cowork store).
  const messageLimits = useSyncExternalStore(
    (onStoreChange) => coworkRateLimitStore.subscribe(onStoreChange),
    () => coworkRateLimitStore.getState().messageLimits,
    () => coworkRateLimitStore.getState().messageLimits,
  );
  /**
   * Residual Qj on draft home:
   * Os = draft (no F; product never keeps createPending on this shell — navigate after start).
   * Ns = busy (create mutate in-flight around LocalSessions.start).
   * J = false (no expectedId on home). Ga from messageLimits. xn N/A local-first.
   * bi → submitDisabled (not editable lock).
   */
  const createInFlightCount = busy ? 1 : 0;
  const draftOs = residualOs({
    hasSessionMeta: false,
    createPending: false,
    createInFlightCount,
  });
  const qjDisabled = residualQjDisabled({
    os: draftOs,
    isMetaPending: false,
    createInFlightCount,
    rateLimitExceeded: residualGaFromMessageLimits(messageLimits),
    isRemoteUploading: false,
  });
  const qjSubmitDisabled = residualQjSubmitDisabled({
    isProcessingImages: false,
    isRemoteUploading: false,
    gitRequiredBlocksSubmit: showGitRequired,
  });
  const submitStateRef = useRef({
    busy,
    ensureTrusted,
    hasPrompt: false,
    onSubmit,
    workspaceCwd: workspace.cwd,
    qjDisabled,
    qjSubmitDisabled,
  });
  // Official Ye / focusComposer residual: after folder pill / native browse, focus returns
  // to the prompt so keystrokes land in TipTap (not the folder Menu.Trigger / body).
  const promptEditorRef = useRef<OfficialPromptEditorHandle | null>(null);
  const [replayKey, setReplayKey] = useState(0);
  const [openFooterMenu, setOpenFooterMenu] = useState<"effort" | "mode" | "model" | null>(null);
  const hasPrompt = prompt.trim().length > 0;
  const allowedModelValues = useMemo(
    () => codeModelOptions.items.map((item) => item.value),
    [codeModelOptions.items],
  );
  const selectedModel = normalizeSelectorModelValue(model, allowedModelValues);

  submitStateRef.current = {
    busy,
    ensureTrusted,
    hasPrompt,
    onSubmit,
    workspaceCwd: workspace.cwd,
    qjDisabled,
    qjSubmitDisabled,
  };

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
    // CLI applied.effortLevels when present; else model residual of CLI catalog (no 5-stop flash).
    return buildOfficialEffortMenuItems({
      current: effort,
      effortLevels,
      model: selectedModel,
      ultracode,
      showUltracode: ultracodeOfferable !== false,
      onSelect: (level, nextUltracode) => onEffortChange(level, nextUltracode),
    });
  }, [effort, effortLevels, onEffortChange, selectedModel, ultracode, ultracodeOfferable]);
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
    // Residual Te: !disabled && !submitDisabled — busy maps Ns (also in disabled via createInFlight).
    if (!state.hasPrompt || state.qjDisabled || state.qjSubmitDisabled) return;
    void state.ensureTrusted(state.workspaceCwd, state.onSubmit);
  }, []);

  /**
   * Official c119 Ye.current?.focus residual.
   * Draft gate is Mi.current once — NOT a window-focus / multi-second retry storm.
   * Re-focus mid-IME cancels composition (packaged flash + stuck view.composing).
   */
  const draftAutofocusedRef = useRef(false);
  const focusPromptEditor = useCallback(() => {
    const ed = promptEditorRef.current?.getEditor?.() ?? null;
    if (ed?.view?.composing) return;
    const dom =
      (ed?.view?.dom as HTMLElement | undefined)
      ?? document.querySelector<HTMLElement>('[aria-label="Prompt"]')
      ?? document.querySelector<HTMLElement>(".epitaxy-prompt-input .tiptap");
    if (dom && document.activeElement === dom) return true;
    if (!ed && !dom) return false;
    promptEditorRef.current?.focus();
    return document.activeElement === (ed?.view?.dom ?? dom);
  }, []);

  // Official Ase residual (index-BELzQL5P): printable keys while focus is on folder /
  // env pill still go into TipTap — matches Code home after folder select.
  // Residual Ase gated by !disabled (Ns/Ga); busy on draft is Ns not Stop chrome.
  useOfficialTypeToComposer(
    useCallback((key: string) => {
      if (submitStateRef.current.qjDisabled) return;
      // Official: T.current?.getEditor()?.chain().insertContent(e).focus().run()
      const ed = promptEditorRef.current?.getEditor?.();
      if (ed?.view?.composing) return;
      if (ed) {
        ed.chain().insertContent(key).focus("end").run();
        return;
      }
      promptEditorRef.current?.insertText?.(key);
    }, []),
    !qjDisabled,
  );

  // Official c119 draft residual (exact):
  //   Mi.current||"draft"===Os&&x&&(Mi.current=!0,Ye.current?.focus())
  // aYt: focus when editor A is ready (useEffect on A), not on first empty ref tick.
  useEffect(() => {
    if (draftAutofocusedRef.current) return;
    let cancelled = false;
    const tryFocus = () => {
      if (cancelled || draftAutofocusedRef.current) return;
      const ed = promptEditorRef.current?.getEditor?.();
      if (!ed || ed.isDestroyed) return;
      draftAutofocusedRef.current = true;
      focusPromptEditor();
    };
    tryFocus();
    // One rAF if editor not mounted yet — not a multi-second storm.
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(tryFocus);
    });
    const t = window.setTimeout(tryFocus, 50);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
  }, [focusPromptEditor]);

  // Official returns focus to Ye after folder drop / image / file picker — not on
  // every window focus or footer menu open (those cancel IME).
  const handleWorkspaceChange = useCallback((next: WorkspaceContext) => {
    onWorkspaceChange(next);
    focusPromptEditor();
  }, [focusPromptEditor, onWorkspaceChange]);

  return (
    <div className="flex flex-col gap-g5">
      <OfficialWorkspaceControls
        disabled={qjDisabled}
        ensureTrusted={ensureTrusted}
        onFolderMenuClosed={focusPromptEditor}
        onSourceBranchChange={onSourceBranchChange}
        onUseWorktreeChange={onUseWorktreeChange}
        onWorkspaceChange={handleWorkspaceChange}
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
      {/* Official c119: shadow is on .epitaxy-prompt via effect-prompt-blur (+ _f(M)),
          not dframe --df-shadow-card (card chrome). */}
      <OfficialPromptEditor
        ref={promptEditorRef}
        bridge={desktopBridge.LocalSessions}
        // Draft create in-flight maps Ns → disabled; not residual H busy/Stop.
        busy={false}
        disabled={qjDisabled}
        onChange={setPrompt}
        onSubmit={submitWithTrust}
        placeholder="描述一个任务，或提一个问题"
        slashCwd={workspace.cwd || undefined}
        submitDisabled={qjSubmitDisabled}
        value={prompt}
      />
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
            disabled={qjDisabled}
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
          <OfficialDropdownButton ariaLabel="Add" disabled={qjDisabled} icon="PlusLarge" items={[{ icon: "Folder1", label: "Add folder" }]} revealChevron="never" side="top" size="small" variant="uncontained" />
        </div>
        <div className="ml-auto flex items-center gap-g4">
          <OfficialDropdownButton
            align="end"
            ariaLabel="Model"
            disabled={qjDisabled}
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
            disabled={qjDisabled}
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
