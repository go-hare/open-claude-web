import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  desktopBridge,
  type EffortLevel,
  type PermissionMode,
  type WorkspaceContext,
} from "../../../adapters/desktopBridge";
import type { CoworkImagePayload } from "../../../adapters/desktopBridge/types";
import {
  filterCoworkImageFiles,
} from "../../cowork/composer/coworkComposerStagedImages";
import { OfficialPromptEditor, type OfficialPromptEditorHandle } from "../OfficialPromptEditor";
import { OfficialComposerFooter } from "../OfficialComposerFooter";
import { useWorkspaceTrustGate } from "../trust/useWorkspaceTrustGate";
import {
  normalizeSelectorModelValue,
  useCodeModelOptions,
} from "../../cowork/composer/useCoworkModelOptions";
import { permissionModeLabel } from "./options";
import { EpitaxyPermissionModeModal } from "./EpitaxyPermissionModeModal";
import { OfficialWorkspaceControls } from "./OfficialWorkspaceControls";
import { usePermissionModeConfirm } from "./usePermissionModeConfirm";
import { useCodePermissionModeOptions } from "./useBypassPermissionsEnabled";
import { useClaudeCodeGitAvailable } from "./useClaudeCodeGitAvailable";
import {
  buildOfficialEffortMenuItems,
} from "../session/officialComposerOptions";
import {
  dataUrlToImagePayload,
  type StagedComposerImage,
} from "../session/OfficialComposerStagedImages";
import { useOfficialTypeToComposer } from "../../shared/useOfficialTypeToComposer";
import { coworkRateLimitStore } from "../../cowork/session/rateLimit/coworkRateLimitStore";
import {
  residualGaFromMessageLimits,
  residualOs,
  residualQjDisabled,
  residualQjSubmitDisabled,
} from "../session/officialQjComposerGate";

export type OfficialCodeComposerSubmitOptions = {
  /** Official start residual first-turn images (cn.images → LocalSessions.start). */
  images?: CoworkImagePayload[];
};

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
  onSubmit: (options?: OfficialCodeComposerSubmitOptions) => void;
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
  /**
   * Official cn.images residual on draft home — same stage path as existing session.
   * TipTap paste/drop + Plus Add image → strip → LocalSessions.start({ images }).
   */
  const [stagedImages, setStagedImages] = useState<StagedComposerImage[]>([]);
  const stagedImagesRef = useRef(stagedImages);
  stagedImagesRef.current = stagedImages;
  const readyImageCount = stagedImages.filter((image) => image.status === "ready" && image.base64).length;
  const isProcessingImages = stagedImages.some((image) => image.status === "loading");
  // Residual Qj submitDisabled: cn.isProcessingImages || mn.isUploading || bi
  const qjSubmitDisabled = residualQjSubmitDisabled({
    isProcessingImages,
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
  // Official Te (he||m): text or ready staged images.
  const hasPrompt = prompt.trim().length > 0 || readyImageCount > 0;
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

  // Official Sn: Os.map then disabled bypass (hint 9aM6b8EJG/) when pref off.
  const codePermissionModeOptions = useCodePermissionModeOptions();
  const permissionItems = codePermissionModeOptions.map((option) => ({
    checked: option.value === permissionMode,
    disabled: option.disabled,
    hint: option.hint,
    label: option.label,
    onSelect: option.disabled ? undefined : () => permissionModeConfirm.select(option.value),
  }));
  const modelItems = codeModelOptions.items.map((option) => ({
    checked: option.value === selectedModel,
    label: option.label,
    onSelect: () => {
      codeModelOptions.setStickyModelPreference(option.value);
      onModelChange(option.value);
    },
  }));
  const effortItems = useMemo(() => {
    return buildOfficialEffortMenuItems({
      current: effort,
      effortLevels,
      model: selectedModel,
      ultracode,
      showUltracode: ultracodeOfferable !== false,
      onSelect: (level, nextUltracode) => onEffortChange(level, nextUltracode),
    });
  }, [effort, effortLevels, onEffortChange, selectedModel, ultracode, ultracodeOfferable]);
  const plusMenuItems = useMemo(
    () => [{ icon: "Folder1", label: "Add folder" }],
    [],
  );
  const modelExtraSections = useMemo(
    () => [{ key: "effort", header: "Effort", items: effortItems }],
    [effortItems],
  );

  const removeStagedImage = useCallback((id: string) => {
    setStagedImages((prev) => {
      const hit = prev.find((item) => item.id === id);
      if (hit?.previewUrl.startsWith("blob:")) URL.revokeObjectURL(hit.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  }, []);

  /**
   * Official un(File[]) residual — stage image Files (max 5; PNG/JPEG/GIF/WebP).
   * Shared with existing-session TipTap paste/drop + footer picker.
   */
  const addImageFiles = useCallback((files: File[]) => {
    const allowed = filterCoworkImageFiles(files);
    if (allowed.length === 0) return;
    setStagedImages((prev) => {
      const room = 5 - prev.length;
      if (room <= 0) return prev;
      const slice = allowed.slice(0, room);
      const loading: StagedComposerImage[] = slice.map((file) => ({
        id: crypto.randomUUID(),
        name: file.name || "image.png",
        previewUrl: URL.createObjectURL(file),
        status: "loading",
      }));
      slice.forEach((file, index) => {
        const id = loading[index]!.id;
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = typeof reader.result === "string" ? reader.result : "";
          if (!dataUrl) {
            setStagedImages((cur) => {
              const hit = cur.find((item) => item.id === id);
              if (hit?.previewUrl.startsWith("blob:")) URL.revokeObjectURL(hit.previewUrl);
              return cur.filter((item) => item.id !== id);
            });
            return;
          }
          const payload = dataUrlToImagePayload(dataUrl, file.name || "image.png");
          setStagedImages((cur) =>
            cur.map((item) =>
              item.id === id
                ? {
                    ...item,
                    status: "ready",
                    base64: payload.base64,
                    mimeType: payload.mimeType,
                  }
                : item,
            ),
          );
        };
        reader.onerror = () => {
          setStagedImages((cur) => {
            const hit = cur.find((item) => item.id === id);
            if (hit?.previewUrl.startsWith("blob:")) URL.revokeObjectURL(hit.previewUrl);
            return cur.filter((item) => item.id !== id);
          });
        };
        reader.readAsDataURL(file);
      });
      return [...prev, ...loading];
    });
    queueMicrotask(() => {
      promptEditorRef.current?.focus();
    });
  }, []);

  // Revoke blob URLs if draft composer unmounts (route leave / draftEpoch remount).
  useEffect(() => () => {
    for (const image of stagedImagesRef.current) {
      if (image.previewUrl.startsWith("blob:")) URL.revokeObjectURL(image.previewUrl);
    }
  }, []);

  const submitWithTrust = useCallback(() => {
    const state = submitStateRef.current;
    // Residual Te: !disabled && !submitDisabled — busy maps Ns (also in disabled via createInFlight).
    if (!state.hasPrompt || state.qjDisabled || state.qjSubmitDisabled) return;
    const ready = stagedImagesRef.current.filter(
      (image) => image.status === "ready" && image.base64,
    );
    const images: CoworkImagePayload[] | undefined =
      ready.length > 0
        ? ready.map((image) => ({
            base64: image.base64!,
            mimeType: image.mimeType ?? "image/png",
            filename: image.name,
          }))
        : undefined;
    // On success EpitaxyHome navigates away (unmount revokes blobs). Keep strip on start failure.
    void state.ensureTrusted(state.workspaceCwd, () => {
      state.onSubmit(images ? { images } : undefined);
    });
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
        hasAttachments={readyImageCount > 0}
        onAddImageFiles={addImageFiles}
        onChange={setPrompt}
        onRemoveStagedImage={removeStagedImage}
        onSubmit={submitWithTrust}
        placeholder="描述一个任务，或提一个问题"
        slashCwd={workspace.cwd || undefined}
        stagedImages={stagedImages}
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
      {/* Official c119 `_Component175` / Dne — reuse existing-session footer, not a third draft footer. */}
      <OfficialComposerFooter
        bridge={desktopBridge.LocalSessions}
        hideDictation
        isPanelActive
        modelExtraSections={modelExtraSections}
        modelItems={modelItems}
        modelLabel={codeModelOptions.labelFor(selectedModel)}
        modelPickerDisabled={qjDisabled}
        onAddFiles={addImageFiles}
        permissionDanger={permissionMode === "bypassPermissions"}
        permissionItems={permissionItems}
        permissionLabel={permissionModeLabel(permissionMode)}
        plusMenuItems={plusMenuItems}
        session={null}
        sessionRef={null}
      />
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
