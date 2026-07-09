import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import type { SessionSummary } from "../../adapters/desktopBridge";
import type { LocalSessionsBridge } from "../../adapters/desktopBridge/types";
import { OfficialButton, OfficialDropdownButton, type OfficialDropdownItem, type OfficialSessionRef } from "./OfficialEpitaxyComponents";
import { OfficialComposerUsageIndicator } from "./OfficialComposerUsageIndicator";

export type OfficialComposerDropdownItem = OfficialDropdownItem & { noQuickKey?: boolean };

export type OfficialComposerExtraSection = {
  header?: ReactNode;
  items: OfficialComposerDropdownItem[];
  key?: string;
  triggerKey?: ReactNode;
};

export type OfficialComposerLoop = {
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
  onAddFiles?: (files: File[]) => void;
  onCoordinatorModeChange?: (value: boolean) => void;
  onInsertSlashCommand?: () => void;
  onStopLoop?: (loop: OfficialComposerLoop) => void;
  permissionDanger?: boolean | null;
  permissionItems: OfficialComposerDropdownItem[];
  permissionLabel: ReactNode;
  plusMenuItems?: OfficialComposerDropdownItem[];
  session?: SessionSummary | null;
  sessionRef?: OfficialSessionRef | null;
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
type ComposerShortcutContext = { isClaudeApp: boolean; mac: boolean };

export function OfficialComposerFooter({
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
  onAddFiles,
  onCoordinatorModeChange,
  onInsertSlashCommand,
  onStopLoop,
  permissionDanger = null,
  permissionItems,
  permissionLabel,
  plusMenuItems,
  session,
  sessionRef = null,
  showDictationButton = false,
  supportsFileAttachments = false,
}: OfficialComposerFooterProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const effortSection = modelExtraSections?.find((section) => section.key === "effort");
  const effortItems = effortSection?.items ?? emptyComposerMenuItems;
  const shortcutContext = useMemo(() => getComposerShortcutContext(), []);
  const menu = useOfficialComposerFooterMenuState({ effortItems, isPanelActive, modeItems: permissionItems, modelItems, shortcutContext });
  const selectedEffortLabel = effortSection?.items.find((item) => item.checked)?.label;
  const fastModeLabel = fastModeOn ? "Fast" : null;
  const modelSections = useMemo(() => modelExtraSections?.map((section) => section.key === "effort" ? {
    ...section,
    items: menu.numberedEffortItems,
    triggerKey: composerShortcutForCommand("openEffortMenu", shortcutContext),
  } : section), [menu.numberedEffortItems, modelExtraSections, shortcutContext]);
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
        <OfficialDropdownButton align="start" header="Mode" items={menu.numberedModeItems} label={permissionDanger ? <span className="text-extended-yellow">{permissionLabel}</span> : permissionLabel} onOpenChange={menu.onModeOpenChange} open={menu.modeOpen} revealChevron="never" side="top" size="small" triggerKey={composerShortcutForCommand("openModeMenu", shortcutContext)} />
        {onCoordinatorModeChange ? <OfficialCoordinatorModeToggle onChange={onCoordinatorModeChange} value={coordinatorMode} /> : null}
        <OfficialDropdownButton align="start" ariaLabel="Add" className="shrink-0" disabled={footerPlusItems.length === 0} icon="PlusLarge" items={footerPlusItems} revealChevron="never" side="top" size="small" />
        <input ref={fileInputRef} type="file" multiple accept={supportsFileAttachments ? undefined : "image/png,image/jpeg,image/gif,image/webp"} className="hidden" onChange={onFileInputChange} />
        {hideDictation ? null : <OfficialDictationSlot disabledReason={dictationDisabledReason} showButton={showDictationButton} />}
        {loops?.length && onStopLoop ? <OfficialLoopIndicator loops={loops} onStopLoop={onStopLoop} /> : null}
      </div>
      <div className="ml-auto flex items-center gap-g4">
        <OfficialDropdownButton align="end" disabled={modelItems.length === 0 || modelPickerDisabled} extraSections={modelSections} header="Models" items={menu.numberedModelItems} label={<OfficialModelFooterLabel effortLabel={selectedEffortLabel} fastModeLabel={fastModeLabel} modelLabel={modelLabel} />} onOpenChange={menu.onModelOpenChange} open={menu.modelOpen} revealChevron="never" side="top" size="small" triggerKey={composerShortcutForCommand("openModelMenu", shortcutContext)} />
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

function useOfficialComposerFooterMenuState({ effortItems, isPanelActive, modeItems, modelItems, shortcutContext }: { effortItems: OfficialComposerDropdownItem[]; isPanelActive: boolean; modeItems: OfficialComposerDropdownItem[]; modelItems: OfficialComposerDropdownItem[]; shortcutContext: ComposerShortcutContext }) {
  const [openMenu, setOpenMenu] = useState<ComposerMenuTarget | null>(null);
  const closeMenu = useCallback(() => setOpenMenu(null), []);
  useEffect(() => { if (!isPanelActive) closeMenu(); }, [closeMenu, isPanelActive]);
  const selectableModeItems = useMemo(() => modeItems.filter(isQuickSelectableComposerItem), [modeItems]);
  const selectableModelItems = useMemo(() => modelItems.filter(isQuickSelectableComposerItem), [modelItems]);
  const selectableEffortItems = useMemo(() => effortItems.filter(isQuickSelectableComposerItem), [effortItems]);
  const onKeyDown = useCallback((event: KeyboardEvent) => {
    handleComposerFooterKeyDown(event, { closeMenu, effortItems, isPanelActive, modeItems, modelItems, openMenu, selectableEffortItems, selectableModeItems, selectableModelItems, setOpenMenu, shortcutContext });
  }, [closeMenu, effortItems, isPanelActive, modeItems, modelItems, openMenu, selectableEffortItems, selectableModeItems, selectableModelItems, shortcutContext]);
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

function handleComposerFooterKeyDown(event: KeyboardEvent, state: { closeMenu: () => void; effortItems: OfficialComposerDropdownItem[]; isPanelActive: boolean; modeItems: OfficialComposerDropdownItem[]; modelItems: OfficialComposerDropdownItem[]; openMenu: ComposerMenuTarget | null; selectableEffortItems: OfficialComposerDropdownItem[]; selectableModeItems: OfficialComposerDropdownItem[]; selectableModelItems: OfficialComposerDropdownItem[]; setOpenMenu: (menu: ComposerMenuTarget | null) => void; shortcutContext: ComposerShortcutContext }) {
  if (!state.isPanelActive || event.defaultPrevented) return;
  const menuIsOpen = state.openMenu !== null;
  const plainKey = !(event.metaKey || event.ctrlKey || event.altKey || event.shiftKey);
  if (menuIsOpen && plainKey && event.key === "Escape") return event.preventDefault(), event.stopImmediatePropagation(), state.closeMenu();
  if (menuIsOpen && plainKey && event.code.startsWith("Digit")) return selectNumberedComposerItem(event, state);
  const command = composerCommandForKeyboardEvent(event, state.shortcutContext);
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

function composerShortcutForCommand(command: ComposerShortcutCommand, context: ComposerShortcutContext) {
  const binding = composerShortcutBindings.find((item) => item.command === command && composerShortcutConditionMatches("when" in item ? item.when : undefined, context.isClaudeApp));
  return binding ? renderShortcutGlyphs(binding.key, context.mac) : undefined;
}

function renderShortcutGlyphs(spec: string, mac: boolean) {
  const keyMap: Record<string, string> = mac
    ? { alt: "⌥", cmd: "⌘", ctrl: "⌃", shift: "⇧" }
    : { alt: "Alt", cmd: "Ctrl", ctrl: "Ctrl", shift: "Shift" };
  return spec.split("+").map((part) => keyMap[part] ?? part.toUpperCase());
}

function getComposerShortcutContext(): ComposerShortcutContext {
  const mac = isMacPlatform();
  return { isClaudeApp: mac, mac };
}

function isMacPlatform() {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}
