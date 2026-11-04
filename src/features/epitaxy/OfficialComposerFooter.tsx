/**
 * Official composer footer residual (c11959232 Dne).
 * `w-full flex items-center gap-g5 py-[4px]`; Effort is a sibling chip, not nested under Models.
 * Pin Fast is visible `· Fast` (`tf+yHLZoYV`) on the Models label — not 4.29 Chin sr-only.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import type { SessionSummary } from "../../adapters/desktopBridge";
import type { LocalSessionsBridge } from "../../adapters/desktopBridge/types";
import { OfficialButton, OfficialDropdownButton, type OfficialDropdownItem, type OfficialSessionRef } from "./OfficialEpitaxyComponents";
import { OfficialComposerUsageIndicator } from "./OfficialComposerUsageIndicator";
import { OfficialEffortControl, type OfficialEffortItem } from "./composer/OfficialEffortControl";
import { officialDirectoryStore } from "../customize/directory/officialDirectoryStore";
import { useI18nText } from "../../i18n/footerMenuMessages";
import { COMPOSER_DICTATION_MESSAGES, COMPOSER_FAST_MODE_MESSAGES, COMPOSER_LOOP_MESSAGES, COMPOSER_MODELS_HEADER_MESSAGES, COMPOSER_PLUS_MENU_MESSAGES, COMPOSER_PLUS_MESSAGES, PERMISSION_MODE_MESSAGES } from "./officialCodeChromeMessages";
import {
  getOfficialSessionShortcutContext,
  matchOfficialSessionShortcut,
  officialSessionShortcutKeyForCommand,
  type OfficialSessionShortcutCommand,
  type OfficialSessionShortcutContext,
} from "./session/officialSessionShortcuts";

export type OfficialComposerDropdownItem = OfficialDropdownItem & {
  accent?: boolean;
  help?: { body?: ReactNode; title?: ReactNode };
  noQuickKey?: boolean;
  value?: string;
};

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
/** Official ak residual shared with session lk (officialSessionShortcuts). */
const composerMenuTargetByCommand = { openModeMenu: "mode", openModelMenu: "model", openEffortMenu: "effort" } as const;
type ComposerMenuTarget = "mode" | "model" | "effort";
type ComposerShortcutContext = OfficialSessionShortcutContext;

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
  const modeText = useI18nText(PERMISSION_MODE_MESSAGES);
  const modelsText = useI18nText(COMPOSER_MODELS_HEADER_MESSAGES);
  const plusText = useI18nText(COMPOSER_PLUS_MESSAGES);
  const plusMenuText = useI18nText(COMPOSER_PLUS_MENU_MESSAGES);
  const fastModeText = useI18nText(COMPOSER_FAST_MODE_MESSAGES);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const effortSection = modelExtraSections?.find((section) => section.key === "effort");
  const effortItems = effortSection?.items ?? emptyComposerMenuItems;
  const nonEffortSections = useMemo(
    () => modelExtraSections?.filter((section) => section.key !== "effort"),
    [modelExtraSections],
  );
  const shortcutContext = useMemo(() => getComposerShortcutContext(), []);
  const menu = useOfficialComposerFooterMenuState({
    effortItems,
    isPanelActive,
    modeItems: permissionItems,
    modelItems,
    modelPickerDisabled,
    shortcutContext,
  });
  const openFilePicker = useCallback(() => fileInputRef.current?.click(), []);
  const footerPlusItems = useMemo(
    () => composeOfficialPlusItems(onInsertSlashCommand, onAddFiles ? openFilePicker : undefined, supportsFileAttachments, plusMenuItems, plusMenuText),
    [onAddFiles, onInsertSlashCommand, openFilePicker, plusMenuItems, plusMenuText, supportsFileAttachments],
  );
  const onFileInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) onAddFiles?.(files);
    event.target.value = "";
  }, [onAddFiles]);

  const effortControlItems: OfficialEffortItem[] = useMemo(
    () => effortItems.map((item) => ({
      accent: item.accent,
      checked: item.checked,
      disabled: item.disabled,
      help: item.help,
      label: item.label,
      noQuickKey: item.noQuickKey,
      onSelect: item.onSelect,
      value: item.value,
    })),
    [effortItems],
  );

  // Official c119 Dne: `className:"w-full flex items-center gap-g5 py-[4px]"` — not 4.29 Chin overflow-clip.
  const modelTriggerLabel = fastModeOn ? (
    <span className="flex items-baseline gap-g3 min-w-0">
      <span className="truncate">{modelLabel}</span>
      <span className="text-t6 shrink-0">{`· ${fastModeText.fast}`}</span>
    </span>
  ) : modelLabel;

  return (
    <div className="w-full flex items-center gap-g5 py-[4px]">
      <div className="flex items-center gap-g5 min-w-0">
        <OfficialDropdownButton
          align="start"
          header={modeText.mode}
          items={menu.numberedModeItems}
          label={permissionDanger ? <span className="text-extended-yellow">{permissionLabel}</span> : permissionLabel}
          onOpenChange={menu.onModeOpenChange}
          open={menu.modeOpen}
          revealChevron="never"
          side="top"
          size="small"
          triggerKey={composerShortcutForCommand("openModeMenu", shortcutContext)}
        />
        {onCoordinatorModeChange ? <OfficialCoordinatorModeToggle onChange={onCoordinatorModeChange} value={coordinatorMode} /> : null}
        <OfficialDropdownButton align="start" ariaLabel={plusText.add} className="shrink-0" disabled={footerPlusItems.length === 0} dsTrigger icon="Add" items={footerPlusItems} preferFont revealChevron="never" side="top" size="small" variant="ghost" />
        <input ref={fileInputRef} type="file" multiple accept={supportsFileAttachments ? undefined : "image/png,image/jpeg,image/gif,image/webp"} className="hidden" onChange={onFileInputChange} />
        {hideDictation ? null : <OfficialDictationSlot disabledReason={dictationDisabledReason} showButton={showDictationButton} />}
        {loops?.length && onStopLoop ? <OfficialLoopIndicator loops={loops} onStopLoop={onStopLoop} /> : null}
      </div>
      <div className="ml-auto flex items-center gap-g4">
        <OfficialDropdownButton
          align="end"
          disabled={modelItems.length === 0 || modelPickerDisabled}
          extraSections={nonEffortSections}
          header={modelsText.models}
          items={menu.numberedModelItems}
          label={modelTriggerLabel}
          onOpenChange={menu.onModelOpenChange}
          open={menu.modelOpen}
          revealChevron="never"
          side="top"
          size="small"
          triggerKey={composerShortcutForCommand("openModelMenu", shortcutContext)}
        />
        {effortControlItems.length > 0 ? (
          <OfficialEffortControl
            disabled={modelPickerDisabled}
            items={menu.effortItemsForControl}
            onOpenChange={menu.onEffortOpenChange}
            open={menu.effortOpen}
          />
        ) : null}
        <OfficialComposerUsageIndicator bridge={bridge} session={session} sessionRef={sessionRef} />
      </div>
    </div>
  );
}

function OfficialCoordinatorModeToggle({ onChange, value }: { onChange: (value: boolean) => void; value: boolean }) {
  // Official ca80 `E$`: C$/w$/T$ are JS literals, not catalog ids.
  return (
    <OfficialButton
      ariaLabel="Toggle coordinator mode"
      icon="Agent"
      onClick={() => onChange(!value)}
      pressed={value}
      size="small"
      tooltip={value ? "Turn off coordinator mode" : "Delegate work across parallel agents"}
      variant="toggle"
    />
  );
}

function OfficialDictationSlot({ disabledReason, showButton }: { disabledReason?: ReactNode; showButton: boolean }) {
  const dictationText = useI18nText(COMPOSER_DICTATION_MESSAGES);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<{ abort?: () => void; start?: () => void; stop?: () => void } | null>(null);
  const [shortcut, setShortcut] = useState<"default" | "off" | { accelerator?: string }>("default");

  useEffect(() => {
    let alive = true;
    const prefs = (window as Window & {
      "claude.settings"?: { AppPreferences?: { getPreferences?: () => Promise<{ dictationShortcut?: unknown }> } };
    })["claude.settings"]?.AppPreferences;
    void prefs?.getPreferences?.().then((bag) => {
      if (!alive) return;
      const value = bag?.dictationShortcut;
      if (value === "off" || value === "default" || (value && typeof value === "object")) {
        setShortcut(value as "default" | "off" | { accelerator?: string });
      }
    });
    return () => {
      alive = false;
      recognitionRef.current?.abort?.();
    };
  }, []);

  const disabled = Boolean(disabledReason) || shortcut === "off";
  const ariaLabel = disabledReason ? String(disabledReason) : listening ? dictationText.stopDictation : dictationText.dictate;

  const toggle = useCallback(() => {
    if (disabled) return;
    const SpeechRecognitionCtor =
      (window as Window & {
        SpeechRecognition?: new () => {
          continuous: boolean;
          interimResults: boolean;
          lang: string;
          onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
          onend: (() => void) | null;
          abort: () => void;
          start: () => void;
          stop: () => void;
        };
        webkitSpeechRecognition?: new () => {
          continuous: boolean;
          interimResults: boolean;
          lang: string;
          onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
          onend: (() => void) | null;
          abort: () => void;
          start: () => void;
          stop: () => void;
        };
      }).SpeechRecognition
      ?? (window as Window & { webkitSpeechRecognition?: new () => never }).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;
    if (listening) {
      recognitionRef.current?.stop?.();
      setListening(false);
      return;
    }
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = document.documentElement.lang || "en-US";
    recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      const transcript = last?.[0]?.transcript;
      if (!transcript) return;
      const active = document.activeElement as HTMLElement | null;
      if (active && ("value" in active || active.isContentEditable)) {
        document.execCommand("insertText", false, transcript);
      }
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [disabled, listening]);

  useEffect(() => {
    if (shortcut === "off") return;
    const onKey = (event: KeyboardEvent) => {
      if (shortcut === "default") {
        if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "d") return;
        event.preventDefault();
        toggle();
        return;
      }
      if (typeof shortcut !== "object" || !shortcut.accelerator) return;
      const parts = shortcut.accelerator.toLowerCase().split("+");
      const key = parts.at(-1);
      if (!key || event.key.toLowerCase() !== key) return;
      const needMeta = parts.includes("cmd") || parts.includes("command") || parts.includes("super") || parts.includes("meta");
      const needCtrl = parts.includes("ctrl") || parts.includes("control");
      const needAlt = parts.includes("alt") || parts.includes("option");
      const needShift = parts.includes("shift");
      if (needMeta !== event.metaKey || needCtrl !== event.ctrlKey || needAlt !== event.altKey || needShift !== event.shiftKey) {
        return;
      }
      event.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcut, toggle]);

  if (!showButton && disabled) {
    return <OfficialButton ariaLabel={ariaLabel} disabled icon="MicrophoneDictation" size="small" />;
  }
  return (
    <OfficialButton
      ariaLabel={ariaLabel}
      disabled={disabled}
      icon="MicrophoneDictation"
      onClick={toggle}
      pressed={listening}
      size="small"
    />
  );
}

function OfficialLoopIndicator({ loops, onStopLoop }: { loops: OfficialComposerLoop[]; onStopLoop: (loop: OfficialComposerLoop) => void }) {
  const loopText = useI18nText(COMPOSER_LOOP_MESSAGES);
  const label = loops.length > 1 ? `${loops.length} ${loopText.loop}` : loopText.loop;
  const items = loops.map((loop) => ({ icon: "XCrossCloseMedium", label: loop.prompt || loopText.recurringLoop, onSelect: () => onStopLoop(loop) }));
  return <OfficialDropdownButton className="shrink-0" items={items} label={label} revealChevron="never" side="top" size="small" />;
}

/** Official c119 `O?.loops` → Dne chip. Missing / empty → undefined (no invent). */
export function parseOfficialComposerLoops(value: SessionSummary["loops"] | undefined): OfficialComposerLoop[] | undefined {
  if (!value?.length) return undefined;
  const loops = value.flatMap((item) => {
    const id = typeof item.id === "string" && item.id.length > 0 ? item.id : "";
    if (!id) return [];
    return [{
      id,
      createdAt: typeof item.createdAt === "number" ? item.createdAt : 0,
      cron: item.cron,
      humanSchedule: item.humanSchedule,
      nextRunAt: item.nextRunAt,
      prompt: item.prompt,
    }];
  });
  return loops.length > 0 ? loops : undefined;
}

function composeOfficialPlusItems(
  onInsertSlashCommand: (() => void) | undefined,
  openFilePicker: (() => void) | undefined,
  supportsFileAttachments: boolean,
  plusMenuItems: OfficialComposerDropdownItem[] | undefined,
  plusMenuText: {
    addFilesOrPhotos: string;
    addImage: string;
    addPlugins: string;
    manageConnectors: string;
    slashCommands: string;
  },
) {
  const items: OfficialComposerDropdownItem[] = [];
  // Official ca80 `KN` then `zN`/`jN`: attach, extra (folder), slash, empty-catalog manageConnectors / addPlugins.
  // Do not invent Notion/Linear/Canva or GH/Linear import without `aae()` / githubIssue.available.
  if (openFilePicker) {
    items.push({
      icon: "Attachment",
      label: supportsFileAttachments ? plusMenuText.addFilesOrPhotos : plusMenuText.addImage,
      onSelect: openFilePicker,
    });
  }
  if (plusMenuItems?.length) items.push(...plusMenuItems);
  if (onInsertSlashCommand) {
    items.push({
      icon: "SlashShortcutCommand",
      label: plusMenuText.slashCommands,
      onSelect: onInsertSlashCommand,
    });
  }
  // Official ca80 `jN` empty `!i`: Manage connectors → `R`/`Tb` (directory connectors overlay).
  // Do not invent Notion/Linear/Canva rows. `cqx+RdJnHp` is the empty-catalog top row in pin ca80.
  items.push({
    icon: "Connectors",
    label: plusMenuText.manageConnectors,
    onSelect: () => {
      const next = "/customize/connectors";
      if (`${window.location.pathname}${window.location.search}` === next) return;
      window.history.pushState({}, "", next);
      window.dispatchEvent(new Event("app:navigation"));
    },
  });
  items.push({
    icon: "Plugin",
    label: plusMenuText.addPlugins,
    onSelect: () => officialDirectoryStore.getState().open("plugins", { pluginSeed: {} }),
  });
  return items.length > 0 ? items : emptyComposerMenuItems;
}

function useOfficialComposerFooterMenuState({
  effortItems,
  isPanelActive,
  modeItems,
  modelItems,
  modelPickerDisabled = false,
  shortcutContext,
}: {
  effortItems: OfficialComposerDropdownItem[];
  isPanelActive: boolean;
  modeItems: OfficialComposerDropdownItem[];
  modelItems: OfficialComposerDropdownItem[];
  modelPickerDisabled?: boolean;
  shortcutContext: ComposerShortcutContext;
}) {
  const [openMenu, setOpenMenu] = useState<ComposerMenuTarget | null>(null);
  const closeMenu = useCallback(() => setOpenMenu(null), []);
  useEffect(() => { if (!isPanelActive) closeMenu(); }, [closeMenu, isPanelActive]);
  useEffect(() => {
    if (
      (openMenu === "effort" && effortItems.length <= 1)
      || (openMenu === "model" && modelItems.length === 0)
      || (openMenu === "mode" && modeItems.length === 0)
    ) {
      closeMenu();
    }
  }, [closeMenu, effortItems.length, modeItems.length, modelItems.length, openMenu]);

  const selectableModeItems = useMemo(() => modeItems.filter(isQuickSelectableComposerItem), [modeItems]);
  const selectableModelItems = useMemo(() => modelItems.filter(isQuickSelectableComposerItem), [modelItems]);
  const selectableEffortItems = useMemo(() => effortItems.filter(isQuickSelectableComposerItem), [effortItems]);

  const onKeyDown = useCallback((event: KeyboardEvent) => {
    handleComposerFooterKeyDown(event, {
      closeMenu,
      effortItems,
      isPanelActive,
      modeItems,
      modelItems,
      modelPickerDisabled,
      openMenu,
      selectableEffortItems,
      selectableModeItems,
      selectableModelItems,
      setOpenMenu,
      shortcutContext,
    });
  }, [closeMenu, effortItems, isPanelActive, modeItems, modelItems, modelPickerDisabled, openMenu, selectableEffortItems, selectableModeItems, selectableModelItems, shortcutContext]);

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [onKeyDown]);

  return {
    effortItemsForControl: effortItems as OfficialEffortItem[],
    effortOpen: openMenu === "effort",
    modeOpen: openMenu === "mode",
    modelOpen: openMenu === "model",
    numberedModeItems: openMenu === "mode" ? numberComposerMenuItems(modeItems) : modeItems,
    numberedModelItems: openMenu === "model" ? numberComposerMenuItems(modelItems) : modelItems,
    onEffortOpenChange: (open: boolean) => setOpenMenu(open ? "effort" : null),
    onModeOpenChange: (open: boolean) => setOpenMenu(open ? "mode" : null),
    onModelOpenChange: (open: boolean) => setOpenMenu(open ? "model" : null),
  };
}

function handleComposerFooterKeyDown(event: KeyboardEvent, state: {
  closeMenu: () => void;
  effortItems: OfficialComposerDropdownItem[];
  isPanelActive: boolean;
  modeItems: OfficialComposerDropdownItem[];
  modelItems: OfficialComposerDropdownItem[];
  modelPickerDisabled: boolean;
  openMenu: ComposerMenuTarget | null;
  selectableEffortItems: OfficialComposerDropdownItem[];
  selectableModeItems: OfficialComposerDropdownItem[];
  selectableModelItems: OfficialComposerDropdownItem[];
  setOpenMenu: (menu: ComposerMenuTarget | null) => void;
  shortcutContext: ComposerShortcutContext;
}) {
  if (!state.isPanelActive || event.defaultPrevented) return;
  const menuIsOpen = state.openMenu !== null;
  const plainKey = !(event.metaKey || event.ctrlKey || event.altKey || event.shiftKey);
  if (menuIsOpen && plainKey && event.key === "Escape") {
    event.preventDefault();
    event.stopImmediatePropagation();
    state.closeMenu();
    return;
  }
  if (menuIsOpen && plainKey && event.code.startsWith("Digit")) {
    if (state.modelPickerDisabled && (state.openMenu === "model" || state.openMenu === "effort")) return;
    return selectNumberedComposerItem(event, state);
  }
  // Official: footer only opens mode/model/effort; pane commands dispatch at session lk.
  const command = matchOfficialSessionShortcut(event, state.shortcutContext);
  const target = command ? composerMenuTargetByCommand[command as keyof typeof composerMenuTargetByCommand] : undefined;
  if (!target) return;
  if (state.modelPickerDisabled && (target === "model" || target === "effort")) return;
  if (!composerMenuHasItems(target, state)) return;
  event.preventDefault();
  event.stopPropagation();
  if (!menuIsOpen) {
    // Official: effort shortcut with <=1 item falls back to model menu.
    state.setOpenMenu(target === "effort" && state.effortItems.length <= 1 ? "model" : target);
  }
}

function selectNumberedComposerItem(event: KeyboardEvent, state: Parameters<typeof handleComposerFooterKeyDown>[1]) {
  event.preventDefault();
  event.stopPropagation();
  const digit = Number(event.code.slice(5));
  if (digit < 1 || digit > 9) return;
  const items = state.openMenu === "mode"
    ? state.selectableModeItems
    : state.openMenu === "effort"
      ? state.selectableEffortItems
      : state.selectableModelItems;
  const item = items[digit - 1];
  if (!item?.onSelect) return;
  item.onSelect();
  state.closeMenu();
}

function composerMenuHasItems(target: ComposerMenuTarget, state: { effortItems: OfficialComposerDropdownItem[]; modeItems: OfficialComposerDropdownItem[]; modelItems: OfficialComposerDropdownItem[] }) {
  if (target === "mode") return state.modeItems.length > 0;
  // Official openEffortMenu: effortItems.length > 1 OR modelItems
  if (target === "effort") return state.effortItems.length > 1 || state.modelItems.length > 0;
  return state.modelItems.length > 0;
}

function numberComposerMenuItems(items: OfficialComposerDropdownItem[]) {
  let count = 0;
  return items.map((item) => item.disabled || item.noQuickKey || count >= 9 ? item : { ...item, shortcut: String(++count) });
}

function isQuickSelectableComposerItem(item: OfficialComposerDropdownItem) {
  return !item.disabled && !item.noQuickKey;
}

/**
 * OfficialCodeComposer residual: triggerKey is the raw binding spec
 * (`"cmd+shift+i"`), not pre-split glyphs. OfficialTriggerShortcut /
 * shortcutChordParts render platform labels from `+`-joined chords.
 * Pre-mapping to `["Ctrl","Shift","I"]` then joining with spaces made
 * shortcutChordParts treat each word as a bare chord and Array.from() it
 * into single-letter kbd chips (C t r l then S h i f t …).
 */
function composerShortcutForCommand(
  command: OfficialSessionShortcutCommand,
  context: ComposerShortcutContext,
) {
  return officialSessionShortcutKeyForCommand(command, context.isClaudeApp);
}

function getComposerShortcutContext(): ComposerShortcutContext {
  return getOfficialSessionShortcutContext();
}
