/**
 * Official existing-session composer (TipTap + footer + usage) — c11959232.
 * Extracted from EpitaxySessionTile — behavior unchanged.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type MutableRefObject, type ReactNode } from "react";
import { Popover } from "@base-ui-components/react/popover";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { desktopBridge, type ContextUsage, type SessionSummary } from "../../../adapters/desktopBridge";
import type { LocalSessionsBridge, SendMessageInput } from "../../../adapters/desktopBridge/types";
import { Icon } from "../../../shell/icons";
import {
  OfficialButton,
  OfficialDropdownButton,
  OfficialSessionSource,
  type OfficialDropdownItem,
} from "../OfficialEpitaxyComponents";
import { OfficialEpitaxyBranchRows } from "../OfficialEpitaxyBranchRows";
import {
  OfficialContextWindowSummary,
  OfficialUsageCircle,
  composerUsageCircumference,
  formatUsageTokenCount,
  officialClampPercent,
} from "../OfficialComposerContextUsage";
import { EpitaxyPermissionModeModal } from "../composer/EpitaxyPermissionModeModal";
import { usePermissionModeConfirm } from "../composer/usePermissionModeConfirm";
import { OfficialEpitaxySlashCommandMenu } from "../slash/OfficialEpitaxySlashCommandMenu";
import { OfficialSkillChip } from "../slash/OfficialSkillChip";
import { OfficialSlashCommandSuggestion } from "../slash/OfficialSlashCommandSuggestion";
import type { OfficialSlashCommandMenuProps } from "../slash/OfficialSlashTypes";
import type { EpitaxySessionRef } from "./epitaxyTranscriptActionContext";
import { officialCodeSessionStore } from "./officialCodeSessionStore";
import { InlineToolPermissionApprovals } from "./OfficialToolPermissionApprovals";
import {
  codeModelOptions,
  effortLevelOptions,
  effortLevelLabel,
  modelLabel,
  normalizeCodeModelValue,
  normalizeEffortValue,
  permissionModeLabel,
  permissionModeOptions,
} from "./officialComposerOptions";
import { setOfficialUltrareviewLaunching } from "./officialUltrareviewLaunch";
import { isMacPlatform } from "./useEpitaxySessionData";

/** Plain text → TipTap doc (same shape as OfficialCodeComposer). */
function tiptapDocFromPlainText(value: string) {
  if (!value) return { type: "doc", content: [] as Array<{ type: string; content?: Array<{ type: string; text: string }> }> };
  return {
    type: "doc",
    content: value.split("\n").map((line) => ({
      type: "paragraph",
      content: line ? [{ type: "text", text: line }] : [],
    })),
  };
}

export function ExistingSessionComposer({
  attachRef,
  bridge,
  disabled,
  isResponding,
  onOpenDiff,
  onOpenPlan,
  onPermissionModeChange,
  onScrollToBottom,
  onStop,
  onSubmit,
  reload,
  session,
  sessionRef,
  showScrollButton,
}: {
  attachRef?: MutableRefObject<((text: string) => void) | null>;
  bridge: LocalSessionsBridge;
  disabled: boolean;
  isResponding: boolean;
  onOpenDiff?: () => void;
  /** Official Wk onOpenPlan → setSidePane("plan"). */
  onOpenPlan?: () => void;
  /** Official Wk onModeChange after plan accept (target permission mode). */
  onPermissionModeChange?: (mode: string) => void | Promise<void>;
  onScrollToBottom: () => void;
  onStop?: () => void | Promise<void>;
  onSubmit: (text: string, input?: SendMessageInput) => Promise<void>;
  reload: (options?: { silent?: boolean }) => Promise<void>;
  session: SessionSummary | null;
  sessionRef: EpitaxySessionRef | null;
  showScrollButton: boolean;
}) {
  const [text, setText] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  const [model, setModel] = useState(() => normalizeCodeModelValue(session?.model));
  const [permissionMode, setPermissionMode] = useState(session?.permissionMode ?? "default");
  const [effort, setEffort] = useState(() => normalizeEffortValue(session?.effort));
  const [isConfigBusy, setConfigBusy] = useState(false);
  const submitRef = useRef<() => Promise<void>>(async () => {});
  const clearComposerRef = useRef<() => void>(() => {});
  const tiptapEditorRef = useRef<Editor | null>(null);
  const slashMenuStateRef = useRef({ bridge, session, sessionRef });
  slashMenuStateRef.current = { bridge, session, sessionRef };
  const slashMenuComponent = useMemo(() => function EpitaxySlashCommandMenuRenderer(props: OfficialSlashCommandMenuProps) {
    const state = slashMenuStateRef.current;
    return <OfficialEpitaxySlashCommandMenu {...props} bridge={state.bridge} session={state.session} sessionRef={state.sessionRef} />;
  }, []);
  const bashModeRef = useRef(false);
  const respondingRef = useRef(isResponding);
  const isBashMode = text.trimStart().startsWith("!");
  const placeholder = "Type / for commands";
  const canStop = isResponding && Boolean(sessionRef && bridge.stop);
  const canSubmit = text.trim().length > 0 && !disabled && !isSubmitting && !isResponding;
  const editor = useEditor({
    content: "",
    editable: !disabled && !isSubmitting && !isResponding,
    editorProps: {
      attributes: {
        "aria-label": "Prompt",
        class: "tiptap",
        "data-placeholder": placeholder,
      },
      handleKeyDown: (_view, event) => {
        const slashStorage = (tiptapEditorRef.current?.storage as unknown as Record<string, unknown> | undefined)?.["slash-command-suggestion"] as { hasVisibleItems?: boolean; isActive?: boolean } | undefined;
        const hasSlashMenu = Boolean(slashStorage?.isActive && slashStorage?.hasVisibleItems);
        if (event.key === "Escape" && bashModeRef.current && !hasSlashMenu) {
          event.preventDefault();
          clearComposerRef.current();
          return true;
        }
        if (event.key === "Enter" && !event.shiftKey && !event.altKey && !event.isComposing && !hasSlashMenu) {
          event.preventDefault();
          if (!respondingRef.current) void submitRef.current();
          return true;
        }
        return false;
      },
    },
    onCreate: ({ editor }) => {
      tiptapEditorRef.current = editor;
    },
    extensions: [
      StarterKit.configure({
        blockquote: false,
        bulletList: false,
        code: false,
        heading: false,
        horizontalRule: false,
        listItem: false,
        orderedList: false,
      }),
      OfficialSkillChip,
      OfficialSlashCommandSuggestion.configure({ placement: "onpage", menuComponent: slashMenuComponent }),
    ],
    onUpdate: ({ editor: nextEditor }) => {
      setText(nextEditor.getText({ blockSeparator: "\n" }));
    },
  }, [placeholder, slashMenuComponent]);

  useEffect(() => {
    setModel(normalizeCodeModelValue(session?.model));
    setPermissionMode(session?.permissionMode ?? "default");
    setEffort(normalizeEffortValue(session?.effort));
  }, [session?.effort, session?.model, session?.permissionMode]);

  useEffect(() => {
    bashModeRef.current = isBashMode;
    respondingRef.current = isResponding;
  }, [isBashMode, isResponding]);

  useEffect(() => {
    const slashStorage = (editor?.storage as unknown as Record<string, unknown> | undefined)?.["slash-command-suggestion"] as { disabled?: boolean } | undefined;
    if (slashStorage) slashStorage.disabled = isBashMode;
  }, [editor, isBashMode]);

  useEffect(() => {
    editor?.setEditable(!disabled && !isSubmitting && !isResponding);
  }, [disabled, editor, isResponding, isSubmitting]);

  const clearComposer = useCallback(() => {
    editor?.commands.clearContent(true);
    setText("");
  }, [editor]);

  const insertSlashCommand = useCallback(() => {
    editor?.chain().focus("start").insertContent("/").run();
  }, [editor]);

  /** Official onAttachAsContext → setComposerText + focus (c119 Ye.current). */
  const attachTextAsContext = useCallback((value: string) => {
    const next = value.trim();
    if (!next || !editor || editor.isDestroyed) return;
    const current = editor.getText({ blockSeparator: "\n" }).trim();
    const combined = current ? `${current}\n\n${next}` : next;
    editor.commands.setContent(tiptapDocFromPlainText(combined), { emitUpdate: true });
    setText(editor.getText({ blockSeparator: "\n" }));
    editor.commands.focus("end");
  }, [editor]);

  const submit = useCallback(async () => {
    if (!canSubmit) return;
    const trimmed = text.trim();
    // Official Ms: /^\/ultrareview\b/ → fe.launchUltrareview, bs chrome while in flight.
    const ultraMatch = trimmed.match(/^\/ultrareview\b\s*(.*)$/is);
    if (ultraMatch && sessionRef?.type === "local" && bridge.launchUltrareview) {
      setSubmitting(true);
      setOfficialUltrareviewLaunching(sessionRef.id, true);
      try {
        const args = ultraMatch[1]?.trim() ?? "";
        const result = await bridge.launchUltrareview(sessionRef.id, args);
        const status = result && typeof result === "object" && "status" in result
          ? String((result as { status?: unknown }).status ?? "")
          : "";
        if (status === "error" || status === "blocked") {
          // Surface via normal send only if bridge rejects; clear chrome either way.
        }
        clearComposer();
      } catch {
        // Fall through: keep composer text on hard failure so user can retry.
      } finally {
        setOfficialUltrareviewLaunching(sessionRef.id, false);
        setSubmitting(false);
      }
      return;
    }
    if (ultraMatch && (!sessionRef || sessionRef.type !== "local" || !bridge.launchUltrareview)) {
      // Official: "/ultrareview is only available in a local Claude Code session."
      // Still clear slash and avoid sending as chat noise when bridge missing.
      clearComposer();
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(trimmed);
      clearComposer();
    } finally {
      setSubmitting(false);
    }
  }, [bridge, canSubmit, clearComposer, onSubmit, sessionRef, text]);

  useEffect(() => {
    submitRef.current = submit;
    clearComposerRef.current = clearComposer;
  }, [clearComposer, submit]);

  useEffect(() => {
    if (!attachRef) return undefined;
    attachRef.current = attachTextAsContext;
    return () => {
      if (attachRef.current === attachTextAsContext) attachRef.current = null;
    };
  }, [attachRef, attachTextAsContext]);

  const stopResponse = async () => {
    if (!sessionRef || !bridge.stop) return;
    // Official wt(): clear local stream first, then await LocalSessions.stop.
    await onStop?.();
    try {
      await bridge.stop(sessionRef.id);
    } finally {
      await reload({ silent: true });
    }
  };

  const applyModel = async (nextModel: string) => {
    if (!sessionRef || nextModel === model) return;
    setModel(nextModel);
    setConfigBusy(true);
    try {
      await bridge.setModel?.(sessionRef.id, nextModel);
      await reload({ silent: true });
    } finally {
      setConfigBusy(false);
    }
  };

  const applyPermissionMode = useCallback(async (nextMode: string) => {
    if (!sessionRef || nextMode === permissionMode) return;
    setPermissionMode(nextMode);
    // User Mode menu is authoritative until CLI emits a newer system/status (Fke).
    // Mirror into liveMeta so silent reload / stale session_updated cannot snap back.
    officialCodeSessionStore.getState().mergeLiveMeta(sessionRef.id, { permissionMode: nextMode });
    setConfigBusy(true);
    try {
      await bridge.setPermissionMode?.(sessionRef.id, nextMode);
      await reload({ silent: true });
    } finally {
      setConfigBusy(false);
    }
  }, [bridge, permissionMode, reload, sessionRef]);

  // Official Sm + EpitaxyPermissionModeModal: first bypass/auto selection confirms per workspace.
  const permissionModeConfirm = usePermissionModeConfirm(
    session?.cwd ?? null,
    (mode) => void applyPermissionMode(mode),
  );

  const applyEffort = async (nextEffort: string) => {
    if (!sessionRef || nextEffort === effort) return;
    setEffort(nextEffort);
    setConfigBusy(true);
    try {
      await bridge.setEffort?.(sessionRef.id, nextEffort);
      await reload({ silent: true });
    } finally {
      setConfigBusy(false);
    }
  };

  const addFolder = async () => {
    if (!sessionRef) return;
    const paths = await desktopBridge.Preferences.getDirectoryPath?.(false);
    const folder = paths?.[0];
    if (!folder) return;
    setConfigBusy(true);
    try {
      await bridge.addFolderToSession?.(sessionRef.id, folder);
      await reload({ silent: true });
    } finally {
      setConfigBusy(false);
    }
  };

  const modelItems = codeModelOptions.map((option) => ({
    label: option.label,
    checked: option.value === model,
    onSelect: () => void applyModel(option.value),
  }));
  const permissionItems = permissionModeOptions.map((option) => ({
    label: option.label,
    checked: option.value === permissionMode,
    onSelect: () => permissionModeConfirm.select(option.value),
  }));
  const effortItems = effortLevelOptions.map((option) => ({
    label: option.label,
    checked: option.value === effort,
    onSelect: () => void applyEffort(option.value),
  }));
  const modelExtraSections = bridge.setEffort ? [{ key: "effort", header: "Effort", items: effortItems }] : undefined;
  const plusMenuItems = [{ icon: "Folder1", label: "Add folder", onSelect: () => void addFolder() }];

  return (
    <div data-skip-approval-enter={undefined} className="epitaxy-chat-column epitaxy-chat-size relative shrink-0 flex flex-col gap-g5 [contain:layout]">
      <button
        aria-hidden={!showScrollButton}
        aria-label="Scroll to bottom"
        className={`inline-flex items-center h-[24px] px-p3 rounded-r5 bg-fill-contained-default text-contained-default effect-contained-default hover:bg-fill-contained-hover hover:text-contained-hover cursor-default border-0 outline-none hide-focus-ring ring-focus absolute -top-[32px] left-1/2 -translate-x-1/2 z-[1] transition-opacity duration-150 ${showScrollButton ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onScrollToBottom}
        tabIndex={showScrollButton ? 0 : -1}
        type="button"
      >
        <Icon name="ChevronDownSmall" size="s" />
      </button>
      <OfficialEpitaxyBranchRows bridge={bridge} onOpenDiff={onOpenDiff} session={session} sessionRef={sessionRef} />
      <InlineToolPermissionApprovals
        bridge={bridge}
        onOpenPlan={onOpenPlan}
        onPermissionModeChange={onPermissionModeChange ?? ((mode) => void applyPermissionMode(mode))}
        sessionId={sessionRef?.id}
      />
      <div
        className={`epitaxy-prompt relative isolate rounded-r7 transition-shadow duration-300 ${isBashMode ? "[&_.tiptap]:font-mono [&_.tiptap]:text-[length:var(--text-code)]" : ""}`}
        onClick={(event) => {
          if (event.target instanceof HTMLElement && event.target.closest("button")) return;
          editor?.commands.focus();
        }}
      >
        <div className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-prompt-blur effect-prompt-blur" data-surface="prompt" />
        {isBashMode ? <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-r7 shadow-[inset_0_0_0_1px_var(--extended-purple)]" /> : null}
        <span className="sr-only" role="status">{isBashMode ? "Bash mode. Press Escape to return to chat." : "Chat mode"}</span>
        <div aria-hidden="true" className="grid min-w-0 transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none" style={{ gridTemplateRows: "0fr" }}><div className="min-h-0 overflow-hidden" /></div>
        <div className="relative flex w-full">
          {isBashMode ? <span aria-hidden="true" title="Run as a shell command" className="ml-[var(--p7)] mt-[13px] shrink-0 select-none self-start rounded-r2 bg-extended-purple px-p3 text-code text-[var(--core-black)]">bash</span> : null}
          <EditorContent
            className={`epitaxy-prompt-input flex-1 min-w-0 text-heading text-t9 [&_.tiptap]:min-h-[var(--h8)] [&_.tiptap]:max-h-[218px] [&_.tiptap]:overflow-y-auto [&_.tiptap]:outline-none [&_.tiptap]:border-0 [&_.tiptap]:py-[13px] [&_.tiptap]:pl-p7 [&_.tiptap]:pr-p3 [&_.tiptap_p]:m-0 ${text.trim().length === 0 ? "[&_.is-editor-empty]:before:!content-['']" : ""}`}
            editor={editor}
            onKeyDownCapture={(event) => {
              const slashStorage = (editor?.storage as unknown as Record<string, unknown> | undefined)?.["slash-command-suggestion"] as { hasVisibleItems?: boolean; isActive?: boolean } | undefined;
              const hasSlashMenu = Boolean(slashStorage?.isActive && slashStorage?.hasVisibleItems);
              if (event.key === "Escape" && isBashMode && !hasSlashMenu) {
                event.preventDefault();
                clearComposer();
              }
            }}
          />
          {text.trim().length === 0 ? <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 right-[var(--h8)] truncate pl-p7 pt-[13px] text-heading text-t5">{placeholder}</span> : null}
          <div className="flex self-end p-p7 pl-p3">
            <OfficialButton
              ariaLabel={canStop ? "Stop response" : "Send"}
              disabled={!canSubmit && !canStop}
              icon={canStop || isSubmitting ? "Stop" : "ArrowReturn"}
              onClick={() => void (canStop ? stopResponse() : submit())}
            />
          </div>
        </div>
      </div>
      <OfficialComposerFooter
        bridge={bridge}
        // Official existing-session xk: onCoordinatorModeChange:void 0 (spawn-only toggle).
        // fastModeOn / loops from session meta when bridge provides them; dictation via hideDictation:!In.
        coordinatorMode={false}
        fastModeOn={false}
        hideDictation
        isPanelActive={!disabled}
        loops={undefined}
        modelExtraSections={modelExtraSections}
        modelItems={modelItems}
        modelLabel={modelLabel(model)}
        modelPickerDisabled={disabled || isConfigBusy}
        onCoordinatorModeChange={undefined}
        permissionDanger={permissionMode === "bypassPermissions"}
        permissionItems={permissionItems}
        permissionLabel={permissionModeLabel(permissionMode)}
        plusAriaLabel="Add"
        plusMenuItems={plusMenuItems}
        session={session}
        sessionRef={sessionRef}
        onInsertSlashCommand={insertSlashCommand}
      />
      <EpitaxyPermissionModeModal
        mode={permissionModeConfirm.confirming}
        onCancel={permissionModeConfirm.cancel}
        onConfirm={permissionModeConfirm.confirm}
        workspace={permissionModeConfirm.workspace}
      />
    </div>
  );
}

type OfficialComposerDropdownItem = OfficialDropdownItem & { noQuickKey?: boolean };
type OfficialComposerExtraSection = {
  header?: ReactNode;
  items: OfficialComposerDropdownItem[];
  key?: string;
  triggerKey?: string;
};
type OfficialComposerLoop = {
  createdAt: number;
  cron?: string;
  humanSchedule?: string;
  id: string;
  nextRunAt?: number;
  prompt?: string;
};
type OfficialComposerFooterProps = {
  bridge: LocalSessionsBridge;
  coordinatorMode?: boolean;
  dictationDisabledReason?: ReactNode;
  fastModeOn?: boolean;
  hideDictation?: boolean;
  isPanelActive?: boolean;
  loops?: OfficialComposerLoop[];
  modelExtraSections?: OfficialComposerExtraSection[];
  modelItems: OfficialComposerDropdownItem[];
  modelLabel: ReactNode;
  modelPickerDisabled?: boolean;
  hideSessionSource?: boolean;
  plusAriaLabel?: string;
  onAddFiles?: (files: File[]) => void;
  onCoordinatorModeChange?: (value: boolean) => void;
  onInsertSlashCommand?: () => void;
  onStopLoop?: (loop: OfficialComposerLoop) => void;
  permissionDanger?: boolean | null;
  permissionItems: OfficialComposerDropdownItem[];
  permissionLabel: ReactNode;
  plusMenuAlignOffset?: number;
  plusMenuItems?: OfficialComposerDropdownItem[];
  plusMenuPopupClassName?: string;
  plusMenuSide?: "top" | "right" | "bottom" | "left";
  plusMenuSideOffset?: number;
  session?: SessionSummary | null;
  sessionRef?: EpitaxySessionRef | null;
  showDictationButton?: boolean;
  supportsFileAttachments?: boolean;
};

const emptyComposerMenuItems: OfficialComposerDropdownItem[] = [];
const composerShortcutBindings = [
  { command: "togglePreview", key: "cmd+shift+p", code: "KeyP", when: "isClaudeApp" },
  { command: "togglePreview", key: "cmd+alt+p", code: "KeyP" },
  { command: "toggleDiff", key: "cmd+shift+d", code: "KeyD", when: "isClaudeApp" },
  { command: "toggleDiff", key: "ctrl+shift+d", code: "KeyD", when: "!isClaudeApp" },
  { command: "toggleTerminal", key: "ctrl+`", code: "Backquote" },
  { command: "toggleBrowser", key: "cmd+shift+f", code: "KeyF" },
  { command: "closePane", key: "cmd+\\", code: "Backslash" },
  { command: "toggleSideChat", key: "cmd+;", code: "Semicolon" },
  { command: "cycleTranscriptMode", key: "ctrl+o", code: "KeyO" },
  { command: "openModeMenu", key: "cmd+shift+m", code: "KeyM", when: "isClaudeApp" },
  { command: "openModeMenu", key: "cmd+alt+m", code: "KeyM" },
  { command: "openModelMenu", key: "cmd+shift+i", code: "KeyI" },
  { command: "openEffortMenu", key: "cmd+shift+e", code: "KeyE" },
  { command: "toggleSelectionMode", key: "cmd+shift+s", code: "KeyS" },
] as const;
const composerMenuTargetByCommand = { openModeMenu: "mode", openModelMenu: "model", openEffortMenu: "effort" } as const;

type ComposerShortcutCommand = (typeof composerShortcutBindings)[number]["command"];
type ComposerMenuTarget = "mode" | "model" | "effort";

function OfficialComposerFooter({
  bridge,
  coordinatorMode = false,
  dictationDisabledReason,
  fastModeOn = false,
  hideDictation = false,
  isPanelActive = true,
  loops,
  modelExtraSections,
  modelItems,
  modelLabel,
  modelPickerDisabled = false,
  hideSessionSource = false,
  plusAriaLabel = "Add",
  onAddFiles,
  onCoordinatorModeChange,
  onInsertSlashCommand,
  onStopLoop,
  permissionDanger = null,
  permissionItems,
  permissionLabel,
  plusMenuAlignOffset,
  plusMenuItems,
  plusMenuPopupClassName,
  plusMenuSide,
  plusMenuSideOffset,
  session,
  sessionRef = null,
  showDictationButton = false,
  supportsFileAttachments = false,
}: OfficialComposerFooterProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const effortSection = modelExtraSections?.find((section) => section.key === "effort");
  const effortItems = effortSection?.items ?? emptyComposerMenuItems;
  const menu = useOfficialComposerFooterMenuState({ effortItems, isPanelActive, modeItems: permissionItems, modelItems });
  const selectedEffortLabel = effortSection?.items.find((item) => item.checked)?.label;
  const fastModeLabel = fastModeOn ? "Fast" : null;
  const modelSections = useMemo(() => modelExtraSections?.map((section) => section.key === "effort" ? {
    ...section,
    items: menu.numberedEffortItems,
    triggerKey: composerShortcutForCommand("openEffortMenu", true),
  } : section), [menu.numberedEffortItems, modelExtraSections]);
  const openFilePicker = useCallback(() => fileInputRef.current?.click(), []);
  const footerPlusItems = useMemo(() => composeOfficialPlusItems(onInsertSlashCommand, onAddFiles ? openFilePicker : undefined, supportsFileAttachments, plusMenuItems), [onAddFiles, onInsertSlashCommand, openFilePicker, plusMenuItems, supportsFileAttachments]);
  const onFileInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) onAddFiles?.(files);
    event.target.value = "";
  }, [onAddFiles]);
  return (
    <div className="w-full flex items-center gap-g5 py-[4px]">
      <div className="flex items-center gap-g5 min-w-0">
        <OfficialDropdownButton ariaLabel="Permission mode" align="start" header="Mode" items={menu.numberedModeItems} label={permissionDanger ? <span className="text-extended-yellow">{permissionLabel}</span> : permissionLabel} onOpenChange={menu.onModeOpenChange} open={menu.modeOpen} revealChevron="never" side="top" size="small" triggerKey={composerShortcutForCommand("openModeMenu", true)} />
        {onCoordinatorModeChange ? <OfficialCoordinatorModeToggle onChange={onCoordinatorModeChange} value={coordinatorMode} /> : null}
        {plusAriaLabel === "Add" ? (
          <OfficialDropdownButton ariaLabel="Add" align="start" className="shrink-0" disabled={footerPlusItems.length === 0} icon="PlusLarge" items={footerPlusItems} revealChevron="never" side="top" size="small" />
        ) : (
          <OfficialDropdownButton align="start" alignOffset={plusMenuAlignOffset} ariaLabel={plusAriaLabel} className="shrink-0" disabled={footerPlusItems.length === 0} icon="PlusLarge" items={footerPlusItems} popupClassName={plusMenuPopupClassName} revealChevron="never" side={plusMenuSide ?? "top"} sideOffset={plusMenuSideOffset} size="small" />
        )}
        <input ref={fileInputRef} type="file" multiple accept={supportsFileAttachments ? undefined : "image/png,image/jpeg,image/gif,image/webp"} className="hidden" onChange={onFileInputChange} />
        {sessionRef && !hideSessionSource ? <span className="flex min-w-0"><OfficialSessionSource ariaLabel="Workspace" session={session ?? null} sessionRef={sessionRef} /></span> : null}
        {hideDictation ? null : <OfficialDictationSlot disabledReason={dictationDisabledReason} showButton={showDictationButton} />}
        {loops?.length && onStopLoop ? <OfficialLoopIndicator loops={loops} onStopLoop={onStopLoop} /> : null}
      </div>
      <div className="ml-auto flex items-center gap-g4">
        <OfficialDropdownButton ariaLabel="Model" align="end" disabled={modelItems.length === 0 || modelPickerDisabled} extraSections={modelSections} header="Models" items={menu.numberedModelItems} label={<OfficialModelFooterLabel effortLabel={selectedEffortLabel} fastModeLabel={fastModeLabel} modelLabel={modelLabel} />} onOpenChange={menu.onModelOpenChange} open={menu.modelOpen} revealChevron="never" side="top" size="small" triggerKey={composerShortcutForCommand("openModelMenu", true)} />
        <OfficialComposerUsageIndicator bridge={bridge} session={session} sessionRef={sessionRef} />
      </div>
    </div>
  );
}

function OfficialModelFooterLabel({ effortLabel, fastModeLabel, modelLabel }: { effortLabel?: ReactNode; fastModeLabel?: ReactNode; modelLabel: ReactNode }) {
  if (!effortLabel && !fastModeLabel) return <>{modelLabel}</>;
  return (
    <span className="flex items-baseline gap-g3 min-w-0">
      <span className="truncate">{modelLabel}</span>
      {effortLabel ? <span className="text-t6 shrink-0">· {effortLabel}</span> : null}
      {fastModeLabel ? <span className="text-t6 shrink-0">· {fastModeLabel}</span> : null}
    </span>
  );
}

function OfficialCoordinatorModeToggle({ onChange, value }: { onChange: (value: boolean) => void; value: boolean }) {
  return <OfficialButton ariaLabel="Toggle coordinator mode" icon="AgentPlanPath" onClick={() => onChange(!value)} pressed={value} size="small" variant="toggle" />;
}

function OfficialDictationSlot({ disabledReason, showButton }: { disabledReason?: ReactNode; showButton: boolean }) {
  const ariaLabel = disabledReason ? String(disabledReason) : "Dictate";
  return showButton ? <OfficialButton ariaLabel="Dictate" disabled icon="MicrophoneDictation" size="small" /> : <OfficialButton ariaLabel={ariaLabel} disabled icon="MicrophoneDictation" size="small" />;
}

function OfficialLoopIndicator({ loops, onStopLoop }: { loops: OfficialComposerLoop[]; onStopLoop: (loop: OfficialComposerLoop) => void }) {
  const label = loops.length > 1 ? `${loops.length} loops` : "Loop";
  const items = loops.map((loop) => ({ icon: "XCrossCloseMedium", label: loop.prompt || "Recurring loop", onSelect: () => onStopLoop(loop) }));
  return <OfficialDropdownButton className="shrink-0" header="Active loops" items={items} label={label} revealChevron="never" side="top" size="small" />;
}

function composeOfficialPlusItems(onInsertSlashCommand: (() => void) | undefined, openFilePicker: (() => void) | undefined, supportsFileAttachments: boolean, plusMenuItems?: OfficialComposerDropdownItem[]) {
  const items: OfficialComposerDropdownItem[] = [];
  if (onInsertSlashCommand) {
    items.push({
      icon: "SlashShortcutCommand",
      label: "Slash commands",
      onSelect: onInsertSlashCommand,
    });
  }
  if (openFilePicker) {
    items.push({
      icon: "PaperclipAttach",
      label: supportsFileAttachments ? "Add files or photos" : "Add image",
      onSelect: openFilePicker,
    });
  }
  if (plusMenuItems?.length) items.push(...plusMenuItems);
  return items.length > 0 ? items : emptyComposerMenuItems;
}

const officialContextUsageCache = new Map<string, ContextUsage>();

function OfficialComposerUsageIndicator({ bridge, session, sessionRef }: { bridge: LocalSessionsBridge; session?: SessionSummary | null; sessionRef?: EpitaxySessionRef | null }) {
  const sessionId = sessionRef?.id;
  const [bridgeUsage, setBridgeUsage] = useState<ContextUsage | null>(() => sessionId ? officialContextUsageCache.get(sessionId) ?? null : null);
  const [isFetching, setIsFetching] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const setUsageForSession = useCallback((nextUsage: ContextUsage | null) => {
    if (!sessionId) {
      setBridgeUsage(null);
      return;
    }
    if (nextUsage) officialContextUsageCache.set(sessionId, nextUsage);
    setBridgeUsage(nextUsage ?? officialContextUsageCache.get(sessionId) ?? null);
  }, [sessionId]);
  const refreshUsage = useCallback(async () => {
    if (!sessionId || !bridge.getContextUsage) {
      setUsageForSession(null);
      setIsFetching(false);
      return;
    }
    setIsFetching(true);
    let alive = true;
    await bridge.getContextUsage(sessionId).then((nextUsage) => {
      if (alive) setUsageForSession(nextUsage);
    }).catch(() => {
      if (alive) setUsageForSession(null);
    }).finally(() => {
      if (alive) setIsFetching(false);
    });
    alive = false;
  }, [bridge, sessionId, setUsageForSession]);
  useEffect(() => {
    let alive = true;
    if (!sessionId || !bridge.getContextUsage) {
      setUsageForSession(null);
      setIsFetching(false);
      return undefined;
    }
    setBridgeUsage(officialContextUsageCache.get(sessionId) ?? null);
    setIsFetching(true);
    void bridge.getContextUsage(sessionId).then((nextUsage) => {
      if (alive) setUsageForSession(nextUsage);
    }).catch(() => {
      if (alive) setUsageForSession(null);
    }).finally(() => {
      if (alive) setIsFetching(false);
    });
    return () => {
      alive = false;
    };
  }, [bridge, sessionId, setUsageForSession]);

  const isLocalContext = sessionRef?.type === "local" || session?.kind === "code";
  const usage = bridgeUsage;
  const usedTokens = usage?.totalTokens ?? 0;
  const maxTokens = usage?.rawMaxTokens ?? null;
  const usagePercent = typeof maxTokens === "number" && maxTokens > 0 ? officialClampPercent(usedTokens / maxTokens * 100) : null;
  const contextSummary = typeof maxTokens === "number" && maxTokens > 0 ? `${formatUsageTokenCount(usedTokens)} / ${formatUsageTokenCount(maxTokens)} (${usagePercent}%)` : formatUsageTokenCount(usedTokens);
  const triggerPercent = isLocalContext ? usagePercent ?? 0 : 0;
  const strokeDashoffset = composerUsageCircumference * (1 - triggerPercent / 100);
  const ariaParts = [isLocalContext ? `context ${usagePercent !== null ? `${usagePercent}%` : contextSummary}` : null].filter(Boolean);
  const ariaLabel = ariaParts.length > 0 ? `Usage: ${ariaParts.join(", ")}` : "Usage";
  const handleOpenChange = useCallback((open: boolean) => {
    if (open && isLocalContext) void refreshUsage();
    if (!open) setExpanded(false);
  }, [isLocalContext, refreshUsage]);
  return (
    <Popover.Root onOpenChange={handleOpenChange}>
      <Popover.Trigger render={<OfficialButton ariaLabel={ariaLabel} className="shrink-0" customIcon={<OfficialUsageCircle strokeDashoffset={strokeDashoffset} usagePercent={triggerPercent} />} size="small" variant="uncontained" />} />
      <Popover.Portal>
        <Popover.Positioner align="end" className="epitaxy-root size-0" side="top" sideOffset={8}>
          <Popover.Popup className="outline-none absolute bottom-0 right-0">
            <div className="relative isolate flex flex-col py-p5 rounded-r6 w-[360px] max-w-[calc(100vw-2rem)] max-h-[min(var(--available-height),640px)]">
              <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-popover effect-hud" />
              <h2 className="sr-only">Usage</h2>
              <div className="flex-1 min-h-0 flex flex-col overflow-y-auto overscroll-contain">
                {isLocalContext ? (
                  <OfficialContextWindowSummary
                    contextPct={usagePercent}
                    contextUsage={usage}
                    expanded={expanded}
                    isFetching={isFetching}
                    onToggle={() => setExpanded((value) => !value)}
                    summary={contextSummary}
                  />
                ) : null}
              </div>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function useOfficialComposerFooterMenuState({ effortItems, isPanelActive, modeItems, modelItems }: { effortItems: OfficialComposerDropdownItem[]; isPanelActive: boolean; modeItems: OfficialComposerDropdownItem[]; modelItems: OfficialComposerDropdownItem[] }) {
  const [openMenu, setOpenMenu] = useState<ComposerMenuTarget | null>(null);
  const closeMenu = useCallback(() => setOpenMenu(null), []);
  useEffect(() => { if (!isPanelActive) closeMenu(); }, [closeMenu, isPanelActive]);
  const selectableModeItems = useMemo(() => modeItems.filter(isQuickSelectableComposerItem), [modeItems]);
  const selectableModelItems = useMemo(() => modelItems.filter(isQuickSelectableComposerItem), [modelItems]);
  const selectableEffortItems = useMemo(() => effortItems.filter(isQuickSelectableComposerItem), [effortItems]);
  const onKeyDown = useCallback((event: KeyboardEvent) => {
    handleComposerFooterKeyDown(event, { closeMenu, effortItems, isPanelActive, modeItems, modelItems, openMenu, selectableEffortItems, selectableModeItems, selectableModelItems, setOpenMenu });
  }, [closeMenu, effortItems, isPanelActive, modeItems, modelItems, openMenu, selectableEffortItems, selectableModeItems, selectableModelItems]);
  useEffect(() => {
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [onKeyDown]);
  return {
    modeOpen: openMenu === "mode",
    modelOpen: openMenu === "model" || openMenu === "effort",
    numberedEffortItems: openMenu === "effort" ? numberComposerMenuItems(effortItems) : effortItems,
    numberedModeItems: openMenu === "mode" ? numberComposerMenuItems(modeItems) : modeItems,
    numberedModelItems: openMenu === "model" ? numberComposerMenuItems(modelItems) : modelItems,
    onModeOpenChange: (open: boolean) => setOpenMenu(open ? "mode" : null),
    onModelOpenChange: (open: boolean) => setOpenMenu(open ? "model" : null),
  };
}

function handleComposerFooterKeyDown(event: KeyboardEvent, state: { closeMenu: () => void; effortItems: OfficialComposerDropdownItem[]; isPanelActive: boolean; modeItems: OfficialComposerDropdownItem[]; modelItems: OfficialComposerDropdownItem[]; openMenu: ComposerMenuTarget | null; selectableEffortItems: OfficialComposerDropdownItem[]; selectableModeItems: OfficialComposerDropdownItem[]; selectableModelItems: OfficialComposerDropdownItem[]; setOpenMenu: (menu: ComposerMenuTarget | null) => void }) {
  if (!state.isPanelActive || event.defaultPrevented) return;
  const menuIsOpen = state.openMenu !== null;
  const plainKey = !(event.metaKey || event.ctrlKey || event.altKey || event.shiftKey);
  if (menuIsOpen && plainKey && event.key === "Escape") return event.preventDefault(), event.stopImmediatePropagation(), state.closeMenu();
  if (menuIsOpen && plainKey && event.code.startsWith("Digit")) return selectNumberedComposerItem(event, state);
  const command = composerCommandForKeyboardEvent(event, { isClaudeApp: true, mac: isMacPlatform() });
  const target = command ? composerMenuTargetByCommand[command as keyof typeof composerMenuTargetByCommand] : undefined;
  if (!target || !composerMenuHasItems(target, state)) return;
  event.preventDefault();
  event.stopPropagation();
  if (!menuIsOpen) state.setOpenMenu(target === "effort" && state.effortItems.length === 0 ? "model" : target);
}

function selectNumberedComposerItem(event: KeyboardEvent, state: Parameters<typeof handleComposerFooterKeyDown>[1]) {
  event.preventDefault();
  event.stopPropagation();
  const digit = Number(event.code.slice(5));
  if (digit < 1 || digit > 9) return;
  const items = state.openMenu === "mode" ? state.selectableModeItems : state.openMenu === "effort" ? state.selectableEffortItems : state.selectableModelItems;
  const item = items[digit - 1];
  if (!item?.onSelect) return;
  item.onSelect();
  state.closeMenu();
}

function composerMenuHasItems(target: ComposerMenuTarget, state: { effortItems: OfficialComposerDropdownItem[]; modeItems: OfficialComposerDropdownItem[]; modelItems: OfficialComposerDropdownItem[] }) {
  if (target === "mode") return state.modeItems.length > 0;
  if (target === "effort") return state.effortItems.length > 0 || state.modelItems.length > 0;
  return state.modelItems.length > 0 || state.effortItems.length > 0;
}

function numberComposerMenuItems(items: OfficialComposerDropdownItem[]) {
  let count = 0;
  return items.map((item) => item.disabled || item.noQuickKey || count >= 9 ? item : { ...item, shortcut: String(++count) });
}

function isQuickSelectableComposerItem(item: OfficialComposerDropdownItem) {
  return !item.disabled && !item.noQuickKey;
}

function composerCommandForKeyboardEvent(event: KeyboardEvent, options: { isClaudeApp: boolean; mac: boolean }) {
  for (const binding of composerShortcutBindings) {
    const when = "when" in binding ? binding.when : undefined;
    if (event.code === binding.code && composerShortcutConditionMatches(when, options.isClaudeApp) && composerShortcutMatches(event, binding.key, options.mac)) return binding.command;
  }
  return null;
}

function composerShortcutConditionMatches(when: string | undefined, isClaudeApp: boolean) {
  return when === "isClaudeApp" ? isClaudeApp : when !== "!isClaudeApp" || !isClaudeApp;
}

function composerShortcutMatches(event: KeyboardEvent, spec: string, mac: boolean) {
  const parts = spec.split("+");
  const wantsCmd = parts.includes("cmd");
  const wantsCtrl = parts.includes("ctrl");
  return event.metaKey === (mac && wantsCmd) && event.ctrlKey === (wantsCtrl || (!mac && wantsCmd)) && event.shiftKey === parts.includes("shift") && event.altKey === parts.includes("alt");
}

function composerShortcutForCommand(command: ComposerShortcutCommand, isClaudeApp: boolean) {
  const binding = composerShortcutBindings.find((item) => item.command === command && composerShortcutConditionMatches("when" in item ? item.when : undefined, isClaudeApp));
  return binding?.key;
}

/** Official ExitPlanMode tool names that mount Wk (not the generic approval card). */
