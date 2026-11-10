import { Menu } from "@base-ui-components/react/menu";
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Tooltip } from "@base-ui-components/react/tooltip";
import { desktopBridge, type SessionSummary } from "../../adapters/desktopBridge";
import { Icon } from "../../shell/icons";
import { selectedSessionIdFromPath, sessionHomePath, sessionPath } from "../../shell/sessionPaths";
import { paneStore } from "../../stores/paneStore";
import { OfficialTooltip, formatKeyboardShortcut } from "../shared/OfficialTooltip";
import { OfficialSwitch } from "../shared/OfficialSwitch";
import { archiveCodeSession, deleteCodeSession, replaceAppNavigation } from "./session/codeSessionDeletion";
import { officialCodeSessionStore, useOfficialXmShowsThinking } from "./session/officialCodeSessionStore";
import { copyOfficialMessageRich } from "./session/officialMessageClipboard";
import { useI18nText, type MessageDescriptors } from "../../i18n/footerMenuMessages";
import { formatOfficialIcu } from "../../i18n/formatOfficialIcu";
import { COMPOSER_GIT_MESSAGES, MESSAGE_ACTION_MESSAGES, ORIGIN_FOLDER_PILL_MESSAGES, SESSION_LOAD_MESSAGES, SHOW_IN_FOLDER_MESSAGES, SIDE_PANE_CHROME_MESSAGES, VIEWS_MENU_MESSAGES } from "./officialCodeChromeMessages";
import { officialEpitaxyEditorPrefsStore, type EditorSize } from "./diff/officialEpitaxyEditorPrefs";
import { isReducedMotionActive } from "../settings/appearanceSettings";
import { officialShowInFolderLabel } from "./session/officialFilePreviewUtils";
import { officialEpitaxyTerminalTabsStore } from "./session/officialEpitaxyTerminalTabsStore";
import {
  residualDefaultTranscriptMode,
  useOfficialSidePaneStoreApi,
  writeCodeDefaultTranscriptView,
} from "./session/officialSidePaneSessionStore";
import {
  officialOriginFolderBasename,
  officialOriginFolderIsRejectedUnc,
  officialOriginFolderMovedToast,
  officialOriginFolderRewriteWslUnc,
  officialYbMenuItems,
} from "./session/officialOriginFolderPillMenu";
import { OfficialTrustModal } from "./trust/OfficialTrustModal";
import { useErrorsOptional } from "../settings/errorsToast";
import {
  getOfficialSessionShortcutContext,
  officialSessionShortcutKeyForCommand,
} from "./session/officialSessionShortcuts";

export type OfficialSessionRef = {
  id: string;
  type: "local" | "remote" | "bridge";
};

export type OfficialDropdownItem = {
  checked?: boolean;
  /**
   * Official cf74 `YT` `checkedRole`: p4 view items are `"checkbox"`;
   * output-style radios stay `"radio"` (default when `checked` is set).
   */
  checkedRole?: "checkbox" | "radio";
  closeOnClick?: boolean;
  disabled?: boolean;
  hint?: ReactNode;
  icon?: string;
  items?: OfficialDropdownItem[];
  keepOpen?: boolean;
  label: ReactNode;
  noQuickKey?: boolean;
  onSelect?: () => void;
  separatorBefore?: boolean;
  shortcut?: string | string[];
  status?: ReactNode;
  subtitle?: ReactNode;
  suffix?: ReactNode;
  submenuFooterItems?: OfficialDropdownItem[];
  tooltip?: ReactNode;
  trailing?: ReactNode;
  type?: "button" | "checkbox" | "loading" | "section-header" | "separator" | "submenu";
  /** Official ce4f `w.Item variant:"danger"` (Delete). */
  variant?: "danger";
};

type OfficialButtonProps = {
  ariaLabel?: string;
  children?: ReactNode;
  className?: string;
  customIcon?: ReactNode;
  disabled?: boolean;
  icon?: string;
  mode?: "text" | "icon";
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>["onClick"];
  pressed?: boolean;
  size?: "small" | "base" | "large";
  /** Official yd tooltip: icon mode falls back to aria-label (c87b7760f Button). null disables. */
  tooltip?: ReactNode | null;
  tooltipSide?: "top" | "bottom" | "left" | "right";
  tooltipDelay?: number;
  tooltipShortcut?: string;
  type?: "button" | "submit";
  variant?: "uncontained" | "contained" | "primary" | "destructive" | "toggle" | "accent" | "link" | "muted" | "ghost";
  /** Official CDS Button (`c43c5949a` `_n`) / Files ListBullet — Anthropicons font, not SVG path. */
  preferFont?: boolean;
  /** Official c09cb `Rl` titlebar icons — customSize 18. */
  customSize?: number;
  /** Official yd `badge` — overlay on icon (c87b `_C` EC connection dot). */
  badge?: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "type" | "onClick">;

type OfficialDropdownButtonProps = {
  align?: "start" | "center" | "end";
  alignOffset?: number;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  extraSections?: Array<{ header?: ReactNode; items: OfficialDropdownItem[]; triggerKey?: ReactNode | string | string[] }>;
  header?: ReactNode;
  icon?: string;
  /**
   * Official Ou residual: icon slot can be a ReactNode (e.g. sketch tool glyph / color dot),
   * not only a named Icon. When set, preferred over `icon` string in icon mode.
   */
  customIcon?: ReactNode;
  items?: OfficialDropdownItem[];
  label?: ReactNode;
  mode?: "text" | "icon" | "chevron";
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  popupClassName?: string;
  pressed?: boolean;
  revealChevron?: "always" | "hover" | "never";
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
  size?: "small" | "base" | "large";
  /**
   * Official Ce/Ou (c3d5d2a6f): icon mode uses `tooltip ?? aria-label`; text mode only explicit tooltip.
   * Wrap trigger when `tooltip !== null` and resolved label is truthy. Pass `null` to disable.
   */
  tooltip?: ReactNode | null;
  triggerKey?: ReactNode | string | string[];
  variant?: "uncontained" | "contained" | "muted" | "ghost";
  tooltipSide?: "top" | "bottom" | "left" | "right";
  /** Official CDS `Vn` Files ⋯ — Anthropicons font, not SVG path. */
  preferFont?: boolean;
  /** Official c09cb `Rl` titlebar overflow — customSize 18. */
  customSize?: number;
  /** Optional test id on Menu.Trigger (Views overflow). */
  dataTestId?: string;
  /**
   * Official ca80 `KN`: `Bs.Trigger render={Ds}` ghost iconOnly `tooltip:!1`, wrapper `fs` tooltip.
   * Code plus uses this; other Ce/Ou dropdowns stay Menu.Trigger class chrome.
   */
  dsTrigger?: boolean;
};

/** Official Kw split control (c11959232): primary action + chevron menu. */
type OfficialSplitDropdownButtonProps = {
  align?: "start" | "center" | "end";
  ariaLabel?: string;
  busy?: boolean;
  disabled?: boolean;
  items?: OfficialDropdownItem[];
  label: ReactNode;
  menuLabel?: string;
  onIconClick?: () => void;
  /** Controlled open (Wk Escape closes menu before revise). */
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  side?: "top" | "right" | "bottom" | "left";
  size?: "small" | "base" | "large";
  variant?: "uncontained" | "contained" | "primary";
};

type OfficialModalProps = {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  width?: string;
};

export type OfficialComposerFolderRecent = {
  displayName?: string;
  path: string;
};

type OfficialComposerFolderPillProps = {
  browseDisabled?: boolean;
  folder?: string;
  isSSH?: boolean;
  onBrowse: () => void;
  /** Official focusComposer residual after folder menu closes (select or dismiss). */
  onMenuClosed?: () => void;
  onSelectFolder: (path: string) => void;
  recentFolders: OfficialComposerFolderRecent[];
};

type OfficialSearchSelectProps<T> = {
  disabled?: boolean;
  emptyMessage: ReactNode;
  icon: string;
  isLoading?: boolean;
  itemToLabel: (item: T) => string;
  items: T[];
  onQueryChange?: (query: string) => void;
  onSelect: (item: T) => void;
  placeholder: string;
  side?: "top" | "bottom";
  triggerAriaLabel?: string;
  triggerClassName: string;
  triggerLabel?: ReactNode;
  value: T | null;
};

type OfficialSessionHeaderProps = {
  activeView?: OfficialViewPane;
  /**
   * Official eI `agent` — chip between OC and YR. Falsy hides the chip;
   * do not invent a name when the session has none.
   */
  agent?: string | null;
  /**
   * Official p4 `A_`/`W` — Files overflow item when local listSessionDirectory
   * + fetchMentionOptions (not VC ccd_file_browser).
   */
  canOpenFiles?: boolean;
  /** Official YR Screen — framebufferPreview supported + sources/open. */
  canOpenFramebuffer?: boolean;
  /** Official ES — show Runs when session is a scheduled run. */
  canOpenRuns?: boolean;
  dragHandle?: ReactNode;
  /** Official p4 `O||A` — plan content / todos. */
  hasPlan?: boolean;
  hasRunningTasks?: boolean;
  /** Official p4 `E` — background-task count (show Tasks when > 0). */
  taskCount?: number;
  hideViews?: boolean;
  hideSummary?: boolean;
  isTitleLoading?: boolean;
  isTopLeft?: boolean;
  onSessionRemoved?: () => void;
  onTranscriptModeChange?: (mode: OfficialTranscriptMode) => void;
  onViewSelect?: (view: OfficialViewPane) => void;
  /** Official gc(tileLayout) membership — multi-tile side stack (tasks + subagent). */
  openViews?: readonly OfficialViewPane[];
  paneIndex?: number;
  /**
   * Official YR `!!i` — live previewServerId enables Preview on remote
   * without inventing sink_planter_vase.
   */
  previewServerId?: string | null;
  session: SessionSummary | null;
  sessionRef: OfficialSessionRef | null;
  title: string;
  transcriptMode?: OfficialTranscriptMode;
};

/**
 * Official c593 `kp`: local + setManualKeepAwake + not archived/cloud-run.
 * cf74 `ZT` paints CapHOIPauL after view items when `!shared && keepAwake`.
 */
function officialKpKeepAwake(
  sessionRef: OfficialSessionRef | null | undefined,
  session: SessionSummary | null | undefined,
): { on: boolean; onToggle: () => void } | undefined {
  const setKeepAwake = desktopBridge.LocalSessions.setManualKeepAwake;
  if (!setKeepAwake || sessionRef?.type !== "local" || !session) return undefined;
  if (session.isArchived || session.isShared === true) return undefined;
  return {
    on: session.manualKeepAwake === true,
    onToggle: () => {
      void setKeepAwake(sessionRef.id, session.manualKeepAwake !== true);
    },
  };
}

/** Official ce4f `ke` / cf74 `ZT` CapHOIPauL row — Switch trailing, checkbox role. */
function officialKeepAwakeMenuItem(
  text: { keepComputerAwake: string; onlyForThisSession: string },
  keepAwake: { on: boolean; onToggle: () => void },
  separatorBefore?: boolean,
): OfficialDropdownItem {
  return {
    checked: keepAwake.on,
    checkedRole: "checkbox",
    keepOpen: true,
    label: text.keepComputerAwake,
    onSelect: keepAwake.onToggle,
    separatorBefore,
    subtitle: text.onlyForThisSession,
    trailing: (
      <span inert>
        <OfficialSwitch checked={keepAwake.on} size="xs" tabIndex={-1} />
      </span>
    ),
  };
}

/** Official QR side kinds (c11959232): includes browser (Files) + runs + framebuffer (Screen). */
export type OfficialViewPane =
  | "preview"
  | "diff"
  | "terminal"
  | "browser"
  | "tasks"
  | "plan"
  | "file"
  | "subagent"
  | "runs"
  /** Official YR "framebuffer" pane — UI label Screen. */
  | "framebuffer";
export type OfficialTranscriptMode = "normal" | "thinking" | "verbose" | "summary";

type OfficialTranscriptProps = {
  children: ReactNode;
  scrollRef?: (node: HTMLDivElement | null) => void;
};

export function OfficialAwaitingDot() {
  return (
    <span aria-hidden="true" className="grid size-[20px] shrink-0 place-items-center">
      <span className="size-[6px] rounded-full bg-extended-yellow" />
    </span>
  );
}

const buttonVariantClasses: Record<NonNullable<OfficialButtonProps["variant"]>, string> = {
  uncontained: "text-uncontained-default hover:text-uncontained-hover disabled:text-uncontained-disabled disabled:hover:text-uncontained-disabled busy:text-uncontained-busy pressed:text-uncontained-selected pressed:hover:text-uncontained-selected ring-focus",
  contained: "text-contained-default hover:text-contained-hover disabled:text-contained-disabled disabled:hover:text-contained-disabled busy:text-contained-busy pressed:text-contained-selected pressed:hover:text-contained-selected ring-focus",
  primary: "text-primary-default hover:text-primary-hover disabled:text-primary-disabled disabled:hover:text-primary-disabled busy:text-primary-busy ring-focus-primary",
  destructive: "text-destructive-default hover:text-destructive-hover disabled:text-destructive-disabled disabled:hover:text-destructive-disabled busy:text-destructive-busy ring-focus-destructive",
  toggle: "text-uncontained-default hover:text-uncontained-hover disabled:text-uncontained-disabled disabled:hover:text-uncontained-disabled busy:text-uncontained-busy pressed:text-[var(--accent)] pressed:hover:text-[var(--accent-hover)] ring-focus",
  accent: "text-[var(--accent)] disabled:text-uncontained-disabled disabled:hover:text-uncontained-disabled busy:text-uncontained-busy ring-focus",
  link: "text-[var(--accent)] hover:text-[var(--accent-hover)] disabled:text-uncontained-disabled disabled:hover:text-uncontained-disabled busy:text-uncontained-busy ring-focus",
  muted: "text-t6 hover:text-t7 disabled:text-t4 disabled:hover:text-t4 busy:text-t4 pressed:text-t7 pressed:hover:text-t7 ring-focus",
  /** Official shared-frame `Yc` ghost — Files ListBullet (`Vn` variant ghost). */
  ghost: "text-primary font-normal aria-pressed:text-accent ring-focus",
};

const buttonSizeClasses: Record<NonNullable<OfficialButtonProps["size"]>, string> = {
  small: "h-small text-footnote rounded-small",
  base: "h-base text-body rounded-base",
  large: "h-large text-heading rounded-large",
};

const buttonTextPadding: Record<NonNullable<OfficialButtonProps["size"]>, string> = {
  small: "px-p5",
  base: "px-p6",
  large: "px-p7",
};

const buttonBgClasses: Record<NonNullable<OfficialButtonProps["variant"]>, string> = {
  uncontained: "bg-[var(--fill-uncontained-default)] group-hover/btn:bg-[var(--fill-uncontained-hover)] group-disabled/btn:bg-[var(--fill-uncontained-disabled)] group-pressed/btn:bg-[var(--fill-uncontained-selected)]",
  contained: "bg-[var(--fill-contained-default)] group-hover/btn:bg-[var(--fill-contained-hover)] group-disabled/btn:bg-[var(--fill-contained-disabled)] group-pressed/btn:bg-[var(--fill-contained-selected)] effect-contained-default group-disabled/btn:shadow-none",
  primary: "bg-[var(--fill-primary-default)] group-hover/btn:bg-[var(--fill-primary-hover)] group-disabled/btn:bg-[var(--fill-primary-disabled)] effect-primary-default group-disabled/btn:shadow-none",
  destructive: "bg-[var(--fill-destructive-default)] group-hover/btn:bg-[var(--fill-destructive-hover)] group-disabled/btn:bg-[var(--fill-destructive-disabled)]",
  toggle: "bg-[var(--fill-uncontained-default)] group-hover/btn:bg-[var(--fill-uncontained-hover)] group-disabled/btn:bg-[var(--fill-uncontained-disabled)]",
  accent: "bg-[var(--accent-10)] group-hover/btn:bg-[var(--accent-20)]",
  link: "bg-transparent",
  muted: "bg-[var(--fill-uncontained-default)] group-hover/btn:bg-[var(--fill-uncontained-hover)]",
  ghost: "bg-transparent group-hover/btn:bg-fill-ghost-hover group-aria-pressed/btn:bg-accent group-hover/btn:group-aria-pressed/btn:bg-accent",
};

const dropdownVariantClasses: Record<NonNullable<OfficialDropdownButtonProps["variant"]>, string> = {
  uncontained: "text-uncontained-default hover:text-uncontained-hover disabled:text-uncontained-disabled disabled:hover:text-uncontained-disabled aria-[expanded=true]:text-[var(--text-uncontained-selected)] aria-[expanded=true]:hover:text-[var(--text-uncontained-selected)]",
  contained: "text-contained-default hover:text-contained-hover disabled:text-contained-disabled disabled:hover:text-contained-disabled aria-[expanded=true]:text-[var(--text-contained-selected)] aria-[expanded=true]:hover:text-[var(--text-contained-selected)]",
  muted: "text-t6 hover:text-t7 disabled:text-t4 aria-[expanded=true]:text-t7 aria-[expanded=true]:hover:text-t7",
  ghost: "text-primary font-normal aria-[expanded=true]:text-accent",
};

const dropdownSizeClasses: Record<NonNullable<OfficialDropdownButtonProps["size"]>, string> = {
  small: "h-small rounded-small text-footnote",
  base: "h-base rounded-base text-body",
  large: "h-large rounded-large text-body",
};

const dropdownModeClasses: Record<NonNullable<OfficialDropdownButtonProps["mode"]>, string> = {
  text: "justify-between pl-p5 pr-p2",
  icon: "justify-between pl-p3 pr-p2",
  chevron: "justify-center aspect-square",
};

const dropdownBgClasses: Record<NonNullable<OfficialDropdownButtonProps["variant"]>, string> = {
  uncontained: "bg-[var(--fill-uncontained-default)] group-hover/dd:bg-[var(--fill-uncontained-hover)] group-disabled/dd:bg-[var(--fill-uncontained-disabled)] group-aria-[expanded=true]/dd:bg-[var(--fill-uncontained-selected)]",
  contained: "bg-[var(--fill-contained-default)] group-hover/dd:bg-[var(--fill-contained-hover)] group-disabled/dd:bg-[var(--fill-contained-disabled)] group-aria-[expanded=true]/dd:bg-[var(--fill-contained-selected)] effect-contained-default group-disabled/dd:shadow-none",
  muted: "bg-[var(--fill-uncontained-default)] group-hover/dd:bg-[var(--fill-uncontained-hover)] group-disabled/dd:bg-[var(--fill-uncontained-disabled)] group-aria-[expanded=true]/dd:bg-[var(--fill-uncontained-selected)]",
  ghost: "bg-transparent group-hover/dd:bg-fill-ghost-hover group-aria-[expanded=true]/dd:bg-fill-ghost-hover",
};

const dropdownIconSize: Record<NonNullable<OfficialDropdownButtonProps["size"]>, "xs" | "sm" | "md"> = {
  small: "xs",
  base: "sm",
  large: "md",
};

/** Live pin ca80 `S0` origin glyph — icon-only, not a Folder1 + repo-name pill. */
const officialSessionSourceClass = "inline-flex size-control shrink-0 items-center justify-center rounded border-0 cursor-default select-none outline-none hide-focus-ring ring-focus text-primary hover:bg-fill-ghost-hover";
/** Live pin ca80 `$1` origin glyph (c593 `x0`). Not c119 `RC` Folder1. */
const officialSessionIconMap = {
  local: "Laptop",
  ssh: "CommandLine",
  remote: "Cloud",
  bridge: "Laptop",
} as const;
type OfficialSessionSourceKind = keyof typeof officialSessionIconMap;
/** Live cd5a `oIe` user bubble chrome (was c119 `$b`). */
export const officialUserMessageClass = "relative flex flex-col gap-1.25 py-md px-lg rounded-card bg-alpha-1 text-primary select-text";
/** Official cd5a `Mz` — inner user markdown is prose, not `text-body` (own-row body pin). */
export const officialUserBubbleProseClass = "epitaxy-bubble-prose";
/** Official cd5a `UR` fallback is text-body; KR/Ig main path is `typography:"prose"`. */
export const officialUserBubbleTextClass = "text-prose whitespace-pre-wrap [overflow-wrap:anywhere] text-pretty m-0";
const userMessageClass = officialUserMessageClass;
const officialMenuPopupClass = "epitaxy-popup relative isolate min-w-[130px] max-w-[320px] max-h-[var(--available-height)] flex flex-col py-p5 rounded-r6 outline-none";
const officialMenuScrollClass = "flex-1 min-h-0 flex flex-col overflow-y-auto";
const officialMenuItemBaseClass = "relative isolate flex items-center min-h-[var(--h4)] shrink-0 px-p8 text-body select-none cursor-default outline-none hide-focus-ring before:content-[''] before:absolute before:-z-[1] before:inset-y-0 before:left-[6px] before:right-[6px] before:rounded-r5 data-[disabled]:opacity-50 data-[disabled]:pointer-events-none text-[var(--menu-item-color,var(--t8))] data-[highlighted]:before:bg-fill-uncontained-hover hover:before:bg-fill-uncontained-hover focus-visible:before:bg-fill-uncontained-hover";
const officialMenuIconStyle = { "--class-base-icon": "14px" } as CSSProperties;
/** Official c119 `YM` — Code composer env / folder / extra-folder pill. */
export const officialComposerPillClass = "relative inline-flex items-center gap-g5 h-[24px] px-p5 rounded-r5 bg-fill-contained-default text-contained-default text-body effect-contained-default hover:bg-fill-contained-hover hover:text-contained-hover disabled:bg-fill-contained-disabled disabled:text-contained-disabled aria-[expanded=true]:bg-[var(--fill-contained-selected)] aria-[expanded=true]:text-[var(--text-contained-selected)] aria-[expanded=true]:hover:bg-[var(--fill-contained-selected)] aria-[expanded=true]:hover:text-[var(--text-contained-selected)] cursor-default select-none border-0 outline-none hide-focus-ring ring-focus";
/** Official c119 `JM` — GitBranch split trigger / worktree label. */
export const officialComposerSplitPillClass = "relative inline-flex items-center h-[24px] bg-transparent text-contained-default text-body hover:bg-fill-contained-hover hover:text-contained-hover disabled:text-contained-disabled aria-[expanded=true]:text-[var(--text-contained-selected)] aria-[expanded=true]:hover:bg-transparent aria-[expanded=true]:hover:text-[var(--text-contained-selected)] cursor-default select-none border-0 outline-none hide-focus-ring ring-focus rounded-[inherit]";

export function OfficialSearchSelect<T>({
  disabled,
  emptyMessage,
  icon,
  isLoading,
  itemToLabel,
  items,
  onQueryChange,
  onSelect,
  placeholder,
  side = "top",
  triggerAriaLabel,
  triggerClassName,
  triggerLabel,
  value,
}: OfficialSearchSelectProps<T>) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredItems = useMemo(() => (
    normalizedQuery
      ? items.filter((item) => itemToLabel(item).toLowerCase().includes(normalizedQuery))
      : items
  ), [itemToLabel, items, normalizedQuery]);

  const searchBox = (
    <div className="relative flex items-center gap-g5 mx-[6px] px-p6 h-h4 shrink-0 rounded-r5 bg-[var(--z0)]">
      <Icon name="Search" size="s" />
      <input
        aria-label={placeholder}
        className="flex-1 min-w-0 bg-transparent border-0 outline-none hide-focus-ring text-body text-t8 placeholder:text-t6"
        onChange={(event) => {
          setQuery(event.target.value);
          onQueryChange?.(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && filteredItems[0]) onSelect(filteredItems[0]);
        }}
        placeholder={placeholder}
        value={query}
      />
      {isLoading ? (
        <div role="status" className={`absolute inset-x-0 h-[2px] overflow-hidden rounded-full ${side === "top" ? "top-0" : "bottom-0"}`}>
          <div className="epitaxy-linear-sweep h-full w-[30%] bg-[var(--t6)]" />
          <span className="sr-only">Loading results</span>
        </div>
      ) : null}
    </div>
  );

  return (
    <Menu.Root onOpenChange={(open) => { if (!open) setQuery(""); }}>
      <Menu.Trigger aria-label={triggerAriaLabel} className={triggerClassName} disabled={disabled}>
        <Icon name={icon} preferFont size="sm" />
        {triggerLabel ? <span className="truncate max-w-[200px]">{triggerLabel}</span> : null}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="start" className="epitaxy-root z-[60]" side={side} sideOffset={8}>
          <Menu.Popup className={`${officialMenuPopupClass} !max-h-[min(360px,var(--available-height))]`} data-cds="Menu">
            <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-popover effect-hud" />
            {side === "bottom" ? <>{searchBox}<div className="h-p5 shrink-0" /></> : null}
            <div className={officialMenuScrollClass}>
              {filteredItems.map((item) => {
                const label = itemToLabel(item);
                const selected = value !== null && itemToLabel(value) === label;
                return (
                  <Menu.Item
                    aria-checked={selected}
                    className={[officialMenuItemBaseClass, "group data-[selected]:before:bg-fill-uncontained-hover gap-g3"].join(" ")}
                    data-selected={selected || undefined}
                    key={label}
                    onClick={() => onSelect(item)}
                    role="menuitemradio"
                  >
                    <span className="flex-1 min-w-0 truncate">{label}</span>
                    <span className="flex items-center justify-center size-[16px] shrink-0 ml-[6px] text-[var(--accent)]" style={officialMenuIconStyle}>
                      {selected ? <Icon name="CheckSelection" size="sm" /> : null}
                    </span>
                  </Menu.Item>
                );
              })}
            </div>
            {filteredItems.length === 0 ? <div className="px-p8 py-p5 text-body text-t6">{emptyMessage}</div> : null}
            {side === "top" ? <><div className="h-p5 shrink-0" />{searchBox}</> : null}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

/**
 * Official CDS Button (`c43c5949a` `_o`): `forwardRef` + rest `...v` onto the real
 * `<button>`. Menu.Trigger `render={Ds}` (ca80 `KN`) cloneElement-merges
 * `aria-haspopup` / `aria-expanded` / ref; a plain function drops them.
 */
export const OfficialButton = forwardRef<HTMLButtonElement, OfficialButtonProps>(function OfficialButton({
  ariaLabel,
  badge,
  children,
  className,
  customIcon,
  disabled,
  icon,
  mode = children ? "text" : "icon",
  onClick,
  pressed,
  size = "base",
  tooltip,
  tooltipSide = "top",
  // Official button tooltip wrapper `c` default delay is 400 (c87b7760f)
  tooltipDelay = 400,
  tooltipShortcut,
  type = "button",
  variant = "uncontained",
  preferFont = false,
  customSize,
  ...rest
}, ref) {
  const modeClass = mode === "icon" ? "justify-center aspect-square px-p3" : `gap-g3 ${buttonTextPadding[size]}`;
  // Official A/yd: T = icon mode ? (tooltip ?? aria-label) : tooltip; wrap when tooltip !== null && T
  const tooltipLabel = mode === "icon" ? (tooltip ?? ariaLabel) : tooltip;
  const iconNode = customIcon ?? (icon ? (
    <Icon
      name={icon}
      preferFont={preferFont}
      customSize={customSize}
      size={size === "small" ? "xs" : size === "large" ? "md" : "sm"}
    />
  ) : null);
  const iconWithBadge = badge && iconNode
    ? (
      <span className="grid">
        <span className="col-start-1 row-start-1">{iconNode}</span>
        <span className="col-start-1 row-start-1 translate-x-[1px] -translate-y-[1px] self-start justify-self-end">{badge}</span>
      </span>
    )
    : iconNode;
  const button = (
    <button
      aria-label={ariaLabel}
      aria-pressed={pressed || undefined}
      className={[
        "group/btn relative isolate inline-flex items-center whitespace-nowrap border-0 cursor-default select-none outline-none hide-focus-ring",
        buttonVariantClasses[variant],
        buttonSizeClasses[size],
        modeClass,
        className ?? "",
      ].join(" ")}
      data-cds="Button"
      data-cds-ghost={variant === "ghost" ? "" : undefined}
      data-cds-icon-only={mode === "icon" ? "" : undefined}
      disabled={disabled}
      onClick={onClick}
      ref={ref}
      type={type}
      {...rest}
    >
      <span aria-hidden="true" className={`btn-squish absolute inset-0 -z-[1] rounded-[inherit] ${buttonBgClasses[variant]}`} />
      {iconWithBadge}
      {children}
    </button>
  );
  if (tooltip === null || tooltipLabel == null || tooltipLabel === false || tooltipLabel === "") {
    return button;
  }
  return (
    <OfficialTooltip
      delayDuration={tooltipDelay}
      keyboardShortcut={tooltipShortcut}
      side={tooltipSide}
      tooltipContent={tooltipLabel}
    >
      {button}
    </OfficialTooltip>
  );
});

export function OfficialModal({
  children,
  isOpen,
  onClose,
  title,
  width = "w-[640px]",
}: OfficialModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="epitaxy-root">
      <button
        aria-label="Close modal"
        className="fixed inset-0 z-50 bg-always-black/50 backdrop-blur-[2px] draggable-none border-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <section
        aria-modal="true"
        className={`epitaxy-root fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 ${width} max-w-[calc(100vw-2rem)] max-h-[calc(100vh-4rem)] draggable-none outline-none`}
        role="dialog"
      >
        <div className="relative isolate rounded-r6 flex flex-col max-h-[inherit]">
          <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-popover effect-hud" />
          <div className="flex items-center justify-between gap-g4 px-[24px] pt-[24px]">
            <h2 className="text-heading-semibold text-t9">{title}</h2>
            <OfficialButton ariaLabel="Close" icon="XCrossCloseMedium" onClick={onClose} size="small" variant="uncontained" />
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-[24px] pb-[24px] pt-[16px]">
            {children}
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}

/**
 * Official Kw (c11959232 EpitaxyBranchRow PR control):
 * split primary button + chevron Menu.Trigger with items.
 */
export function OfficialSplitDropdownButton({
  align = "end",
  ariaLabel,
  busy = false,
  disabled = false,
  items = [],
  label,
  menuLabel = "More options",
  onIconClick,
  onOpenChange,
  open,
  side = "top",
  size = "base",
  variant = "contained",
}: OfficialSplitDropdownButtonProps) {
  // Official Kw: open/onOpenChange controlled with internal fallback.
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const setOpen = (next: boolean) => {
    setInternalOpen(next);
    onOpenChange?.(next);
  };
  const shellClass = [
    "relative inline-flex w-fit items-center border-0 cursor-default select-none outline-none",
    size === "small" ? "h-small rounded-small" : size === "large" ? "h-large rounded-large" : "h-base rounded-base",
    variant === "primary"
      ? "bg-[var(--fill-primary-default)] text-primary-default data-[popup-open]:bg-[var(--fill-primary-hover)] data-[popup-open]:text-[var(--text-primary-hover)]"
      : variant === "contained"
        ? "bg-[var(--fill-contained-default)] text-contained-default effect-contained-default data-[popup-open]:bg-[var(--fill-contained-selected)] data-[popup-open]:text-[var(--text-contained-selected)] data-[disabled]:shadow-none"
        : "bg-[var(--fill-uncontained-default)] text-uncontained-default data-[popup-open]:bg-[var(--fill-uncontained-selected)] data-[popup-open]:text-[var(--text-uncontained-selected)]",
    (disabled || busy) ? "data-[disabled]:pointer-events-none opacity-70" : "",
  ].join(" ");
  const sideHover =
    variant === "primary"
      ? "hover:bg-fill-primary-hover hover:text-primary-hover"
      : variant === "contained"
        ? "hover:bg-fill-contained-hover hover:text-contained-hover"
        : "hover:bg-fill-uncontained-hover hover:text-uncontained-hover";
  const primaryClass = `h-full inline-flex items-center justify-center bg-transparent border-0 cursor-default outline-none hide-focus-ring ring-focus rounded-l-[inherit] px-p5 gap-g4 text-body ${sideHover}`;
  // Official Kw text mode: chevron uses size "s" (not xs).
  const chevronClass = `h-full inline-flex items-center justify-center bg-transparent border-0 cursor-default outline-none hide-focus-ring ring-focus rounded-r-[inherit] min-w-[16px] shrink-0 ${sideHover}`;
  // Official Kw divider between primary + chevron (primary: z0/20%; else t2).
  const dividerClass =
    variant === "primary"
      ? "w-px self-stretch bg-[var(--z0)] opacity-20 my-[4px]"
      : variant === "contained"
        ? "w-px self-stretch bg-t2 my-px"
        : "w-px self-stretch bg-t2 my-[4px]";

  return (
    <Menu.Root
      open={isOpen}
      onOpenChange={(next) => {
        setOpen(next);
      }}
    >
      <div className={shellClass} data-disabled={disabled || busy || undefined} data-popup-open={isOpen ? "" : undefined}>
        <button
          aria-busy={busy || undefined}
          aria-label={ariaLabel}
          className={primaryClass}
          disabled={disabled || busy}
          onClick={onIconClick}
          type="button"
        >
          {busy ? (
            <span data-cds="Spinner" className="relative inline-block shrink-0 align-middle" style={{ height: 16, width: 16 }} aria-hidden="true">
              <span className="absolute inset-0 rounded-full" style={{ border: "1.75px solid var(--cds-border, var(--t2))" }} />
              <span className="absolute inset-0 rounded-full animate-[spin_2s_linear_infinite]" style={{ background: "conic-gradient(transparent 40%, currentColor)", WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 1.75px), #000 calc(100% - 1.25px))", mask: "radial-gradient(farthest-side, transparent calc(100% - 1.75px), #000 calc(100% - 1.25px))" }} />
            </span>
          ) : null}
          <span className="truncate">{label}</span>
        </button>
        <span aria-hidden="true" className={dividerClass} />
        <Menu.Trigger aria-label={menuLabel} className={chevronClass} disabled={disabled || busy}>
          <Icon name="ChevronDownSmall" size="s" />
        </Menu.Trigger>
      </div>
      {items.length > 0 ? (
        <Menu.Portal>
          <Menu.Positioner align={align} className="epitaxy-root z-[60]" side={side} sideOffset={8}>
            <Menu.Popup className={officialMenuPopupClass} data-cds="Menu">
              <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-popover effect-hud" />
              <div className={officialMenuScrollClass}>
                <Menu.Group className="flex flex-col">
                  <OfficialMenuItems items={items} />
                </Menu.Group>
              </div>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      ) : null}
    </Menu.Root>
  );
}

export function OfficialDropdownButton({
  align = "end",
  alignOffset,
  ariaLabel,
  className,
  customIcon,
  disabled,
  extraSections,
  header,
  icon,
  items = [],
  label,
  mode,
  onOpenChange,
  open,
  popupClassName,
  pressed,
  revealChevron = "always",
  side = "bottom",
  sideOffset,
  size = "base",
  tooltip,
  tooltipSide = "top",
  triggerKey,
  variant = "uncontained",
  preferFont = false,
  customSize,
  dataTestId,
  dsTrigger = false,
}: OfficialDropdownButtonProps) {
  const actualMode = mode ?? (icon || customIcon ? "icon" : "text");
  const hasPopup = items.length > 0 || Boolean(extraSections?.some((section) => section.items.length > 0));
  const resolvedAlignOffset = alignOffset ?? (align === "end" ? 0 : actualMode === "text" ? -6 : -8);
  const resolvedSideOffset = sideOffset ?? 8;
  const [menuOpen, setMenuOpen] = useState(false);
  const resolvedOpen = open ?? menuOpen;
  const handleOpenChange = (next: boolean) => {
    setMenuOpen(next);
    onOpenChange?.(next);
  };
  // Official Ce: M = text mode ? tooltip : (tooltip ?? aria-label); wrap when tooltip !== null && M
  const tooltipLabel = actualMode === "text" ? tooltip : (tooltip ?? ariaLabel);
  const iconSlot =
    actualMode === "icon"
      ? customIcon ??
        (icon ? (
          <Icon name={icon} preferFont={preferFont} customSize={customSize} size={dropdownIconSize[size]} className={pressed ? "text-[var(--accent)]" : undefined} />
        ) : null)
      : null;
  // Official cf580 `jr` Globe is `G.TriggerButton` icon-only (square), not a
  // chevron-padded `justify-between min-w-0` trigger that flex-shrinks to 7px.
  const iconOnlyNoChevron = actualMode === "icon" && revealChevron === "never";
  const dsButton = (
    <OfficialButton
      ariaLabel={ariaLabel}
      className={className ?? "shrink-0"}
      customIcon={customIcon}
      customSize={customSize}
      disabled={disabled}
      icon={icon}
      preferFont={preferFont}
      pressed={pressed}
      size={size}
      tooltip={null}
      variant="ghost"
    />
  );
  const trigger = dsTrigger ? (
    <Menu.Trigger data-testid={dataTestId} disabled={disabled} render={dsButton} />
  ) : (
    <Menu.Trigger
      aria-label={ariaLabel}
      className={[
        "group/dd relative isolate inline-flex items-center border-0 cursor-default select-none outline-none hide-focus-ring ring-focus",
        iconOnlyNoChevron ? "justify-center aspect-square shrink-0" : "min-w-0",
        dropdownVariantClasses[variant],
        dropdownSizeClasses[size],
        iconOnlyNoChevron ? "px-p3" : dropdownModeClasses[actualMode],
        className ?? "",
      ].join(" ")}
      data-testid={dataTestId}
      disabled={disabled}
    >
      <span aria-hidden="true" className={`absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none ${dropdownBgClasses[variant]}`} />
      {iconSlot ? <span className="relative inline-flex">{iconSlot}</span> : null}
      {actualMode === "text" ? <span className="min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap">{label}</span> : null}
      {revealChevron !== "never" ? <Icon name="ChevronDownSmall" size="xs" className={revealChevron === "hover" ? "shrink-0 opacity-0 group-hover/dd:opacity-100 group-focus-visible/dd:opacity-100 group-aria-[expanded=true]/dd:opacity-100" : "shrink-0"} /> : null}
    </Menu.Trigger>
  );
  return (
    <Menu.Root open={open !== undefined ? open : menuOpen} onOpenChange={handleOpenChange}>
      {tooltip !== null && tooltipLabel != null && tooltipLabel !== false && tooltipLabel !== "" ? (
        <OfficialTooltip delayDuration={400} open={resolvedOpen ? false : undefined} side={tooltipSide} tooltipContent={tooltipLabel}>
          {trigger}
        </OfficialTooltip>
      ) : (
        trigger
      )}
      {hasPopup ? (
        <Menu.Portal>
          <Menu.Positioner align={align} alignOffset={resolvedAlignOffset} className="epitaxy-root z-[60]" side={side} sideOffset={resolvedSideOffset}>
            <Menu.Popup className={`${officialMenuPopupClass} ${popupClassName ?? ""}`} data-cds="Menu">
              <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-popover effect-hud" />
              <div className={officialMenuScrollClass}>
                {items.length > 0 ? (
                  <Menu.Group className="flex flex-col">
                    {header ? <OfficialMenuHeader triggerKey={triggerKey}>{header}</OfficialMenuHeader> : null}
                    <OfficialMenuItems items={items} />
                  </Menu.Group>
                ) : null}
                {extraSections?.map((section, index) => section.items.length > 0 ? (
                  <Menu.Group className="flex flex-col" key={index}>
                    {(items.length > 0 || index > 0) ? <OfficialMenuSeparator /> : null}
                    {section.header ? <OfficialMenuHeader triggerKey={section.triggerKey}>{section.header}</OfficialMenuHeader> : null}
                    <OfficialMenuItems items={section.items} />
                  </Menu.Group>
                ) : null)}
              </div>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      ) : null}
    </Menu.Root>
  );
}

export function OfficialSessionHeader({
  activeView,
  agent,
  canOpenFiles = false,
  canOpenFramebuffer = false,
  canOpenRuns = false,
  dragHandle,
  hasPlan = false,
  hasRunningTasks = false,
  hideViews = false,
  taskCount = 0,
  hideSummary = false,
  isTitleLoading = false,
  isTopLeft,
  onSessionRemoved,
  onTranscriptModeChange,
  onViewSelect,
  openViews,
  paneIndex = 0,
  previewServerId,
  session,
  sessionRef,
  title,
  transcriptMode = "normal",
}: OfficialSessionHeaderProps) {
  const sessionLoadText = useI18nText(SESSION_LOAD_MESSAGES);
  const agentName = agent?.trim() || "";
  return (
    <div data-top-left={isTopLeft || undefined} className="epitaxy-titlebar relative flex items-center h-[32px] pl-[16px] pr-[16px]">
      <div className="draggable absolute inset-0 -z-[1]" aria-hidden="true" />
      <div className="group/lead relative z-[1] flex items-center min-w-0 gap-xs draggable-none">
        {sessionRef ? (
          <span className="-ml-[4px] flex min-w-0 shrink-0">
            <OfficialSessionSource session={session} sessionRef={sessionRef} />
          </span>
        ) : null}
        {sessionRef ? (
          isTitleLoading
            ? <span aria-hidden="true" className="h-[10px] w-[128px] rounded-r3 bg-t2 animate-pulse" />
            : (
              <>
                <OfficialSessionTitle
                  hideSummary={hideSummary}
                  onSessionRemoved={onSessionRemoved}
                  onTranscriptModeChange={onTranscriptModeChange}
                  onViewSelect={onViewSelect}
                  paneIndex={paneIndex}
                  session={session}
                  sessionRef={sessionRef}
                  title={title}
                  transcriptMode={transcriptMode}
                />
                <OfficialOriginFolderPill session={session} sessionRef={sessionRef} />
              </>
            )
        ) : null}
      </div>
      {dragHandle}
      <div className="relative z-[1] ml-auto flex items-center gap-g3 shrink-0 draggable-none">
        {sessionRef ? (
          <OfficialTitlebarPaneButtons
            onViewSelect={onViewSelect}
            openViews={openViews}
            sessionRef={sessionRef}
          />
        ) : null}
        {sessionRef && sessionRef.type !== "local" && session && session.isShared === false ? (
          <OfficialButton ariaLabel={sessionLoadText.share} icon="ShareArrowOutOfBox" size="base" variant="uncontained" />
        ) : null}
        {agentName && sessionRef ? (
          <OfficialTooltip delayDuration={400} tooltipContent={formatOfficialIcu(sessionLoadText.runningAsAgent, { agent: agentName })}>
            <span
              className="inline-flex items-center gap-g4 h-[20px] px-p5 rounded-r4 bg-fill-contained-default text-contained-default text-footnote select-none outline-none hide-focus-ring ring-focus"
              role="status"
              tabIndex={0}
            >
              <Icon name="AgentPlanPath" size="sm" />
              <span className="truncate max-w-[120px]">{agentName}</span>
            </span>
          </OfficialTooltip>
        ) : null}
        {!hideViews ? (
          <OfficialViewsButton
            activeView={activeView}
            canOpenFiles={canOpenFiles}
            canOpenFramebuffer={canOpenFramebuffer}
            canOpenRuns={canOpenRuns}
            hasPlan={hasPlan}
            hasRunningTasks={hasRunningTasks}
            onViewSelect={onViewSelect}
            openViews={openViews}
            previewServerId={previewServerId}
            session={session}
            sessionRef={sessionRef}
            taskCount={taskCount}
          />
        ) : null}
        {onSessionRemoved ? <OfficialButton ariaLabel={sessionLoadText.closePane} icon="XCrossCloseMedium" onClick={onSessionRemoved} /> : null}
      </div>
    </div>
  );
}

export function OfficialChatTileShell({
  children,
  onActivate,
}: {
  children: ReactNode;
  /**
   * Official iE (c11959232): `M=()=>p(l)` on onFocusCapture / onPointerDownCapture
   * where p = setFocusedTile. Product maps to paneStore.setFocusedIndex.
   */
  onActivate?: () => void;
}) {
  return (
    <div
      className="h-full w-full min-w-0 relative isolate rounded-r6"
      onFocusCapture={onActivate}
      onPointerDownCapture={onActivate}
    >
      <div
        aria-hidden="true"
        data-surface="sidebar"
        className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-primary-elevated effect-primary-elevated opacity-0 transition-opacity duration-200 [.tiles-dragging_&]:opacity-100"
      />
      {children}
    </div>
  );
}

export function OfficialTranscript({ children, scrollRef }: OfficialTranscriptProps) {
  return (
    <div ref={scrollRef} data-testid="epitaxy-virtual-transcript" className="h-full overflow-y-auto overflow-x-hidden [contain:strict]">
      <div className="relative epitaxy-chat-column">
        <div className="w-full pt-[48px] pb-[48px]">
          {children}
        </div>
      </div>
    </div>
  );
}

export function OfficialTranscriptRows({ children }: { children: ReactNode }) {
  return (
    <div className="w-full">
      {children}
    </div>
  );
}

export function OfficialTranscriptRow({ children }: { children: ReactNode; last?: boolean }) {
  return (
    <div className="epitaxy-chat-size pb-[var(--chat-turn-gap)] last:pb-0 empty:pb-0 [content-visibility:auto] [contain-intrinsic-size:auto_400px] empty:hidden">
      {children}
    </div>
  );
}

export function OfficialUserMessage({
  children,
  copyText,
  createdAt,
  isQueued = false,
  onFork,
  onRewind,
  rewindAriaLabel,
  rewindIcon,
}: {
  children: ReactNode;
  copyText?: string;
  createdAt?: string;
  isQueued?: boolean;
  onFork?: () => void;
  onRewind?: () => void;
  rewindAriaLabel?: string;
  rewindIcon?: string;
}) {
  return (
    <div className={`epitaxy-user-turn group/msg flex w-full flex-col min-w-0 ms-auto items-end gap-sm transition-opacity duration-200 ${isQueued ? "opacity-50 hover:opacity-80" : ""}`}>
      <div className="flex flex-col items-end gap-g6 max-w-[85%] min-w-0">
        <div className={`${userMessageClass} max-w-full`}>
          <div className={officialUserBubbleProseClass}>{children}</div>
        </div>
        {!isQueued && (copyText !== undefined || createdAt || onFork || onRewind) ? (
          <OfficialMessageActions copyText={copyText} layout="pretty" onFork={onFork} onRewind={onRewind} rewindAriaLabel={rewindAriaLabel} rewindIcon={rewindIcon} timestamp={createdAt} />
        ) : null}
      </div>
    </div>
  );
}

type OfficialMessageRating = "negative" | "positive";

/** Official cd5a `WNe` — GNe ghost buttons muted until hover. */
const officialMessageActionsMutedClass =
  "[&_[data-cds=Button]:not([aria-pressed=true])]:text-muted [&_[data-cds=Button]:hover:not([aria-pressed=true])]:text-primary";
/** Official shared-2 `oW` pretty MessageActions muted. */
const officialPrettyMessageActionsMutedClass =
  "[&_button]:text-muted [&_button:hover:not([aria-pressed=true])]:text-primary";
/** Official cd5a `GNe` `z` hover reveal. Product rows also use `group/message-row`. */
const officialMessageActionsRevealClass =
  "opacity-0 pointer-events-none group-hover/message-row:opacity-100 group-hover/message-row:pointer-events-auto group-hover/msg:opacity-100 group-hover/msg:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto has-[[aria-expanded=true]]:opacity-100 has-[[aria-expanded=true]]:pointer-events-auto has-[[aria-haspopup=dialog][data-popup-open]]:opacity-100 has-[[aria-haspopup=dialog][data-popup-open]]:pointer-events-auto pointer-coarse:opacity-100 pointer-coarse:pointer-events-auto [@media(hover:none)]:opacity-100 [@media(hover:none)]:pointer-events-auto";
/** Official cd5a `OI` / `kI` row timestamp (GNe, trailing). */
const officialMessageActionsTimestampClass =
  "text-body text-muted tabular-nums flex min-h-control items-center self-center pl-1.25";
/** Official shared-2 `gW` + cd5a `jI` (`DI` + `ps-md pe-md`) — pretty timestamp leads the row. */
const officialPrettyTimestampClass =
  "flex h-control items-center ps-sm pe-sm first:ps-0 last:pe-0 text-caption font-normal text-muted select-none text-body tabular-nums ps-md pe-md";

/** Official GNe (cd5a) / pretty `zI` (shared-2 `oW`): hover message action row. */
export function OfficialMessageActions({
  buttonSize = "base",
  className = "",
  copyText,
  isPinned = false,
  layout = "gne",
  onFork,
  onPinChapter,
  onRateMessage,
  onRewind,
  rateMessageUuid,
  rating,
  rewindAriaLabel,
  rewindIcon = "ArrowCounterClockwise",
  timestamp,
  timestampPlacement,
}: {
  buttonSize?: "small" | "base" | "large";
  className?: string;
  copyText?: string;
  isPinned?: boolean;
  /** Official Uz `Ee` / assistant `HI` → `zI` pretty. */
  layout?: "gne" | "pretty";
  onFork?: () => void;
  onPinChapter?: () => void;
  onRateMessage?: (messageUuid: string, rating: OfficialMessageRating) => void;
  onRewind?: () => void;
  rateMessageUuid?: string;
  rating?: OfficialMessageRating;
  rewindAriaLabel?: string;
  rewindIcon?: string;
  timestamp?: string;
  /** Official HI trailing `jI`; user pretty leads. Default: pretty start, GNe end. */
  timestampPlacement?: "start" | "end";
}) {
  const actionsText = useI18nText(MESSAGE_ACTION_MESSAGES);
  const rewindLabel = rewindAriaLabel ?? actionsText.rewindToHere;
  const [copied, setCopied] = useState(false);
  const [localRating, setLocalRating] = useState<OfficialMessageRating | undefined>(rating);
  const currentRating = rating ?? localRating;
  const isPretty = layout === "pretty";
  const stampPlacement = timestampPlacement ?? (isPretty ? "start" : "end");
  const copyMessage = () => {
    if (copyText === undefined) return;
    void copyOfficialMessageRich(copyText).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    });
  };
  const rateMessage = (nextRating: OfficialMessageRating) => {
    if (rateMessageUuid && onRateMessage) {
      onRateMessage(rateMessageUuid, nextRating);
      setLocalRating(nextRating);
      return;
    }
    setLocalRating((value) => value === nextRating ? undefined : nextRating);
  };
  const shouldShowRating = Boolean(rateMessageUuid && onRateMessage);
  const stamp = timestamp ? <OfficialRelativeTimestamp layout={isPretty ? "pretty" : "gne"} timestamp={timestamp} /> : null;
  const buttons = (
    <>
      {copyText !== undefined ? <OfficialButton ariaLabel={copied ? actionsText.copied : actionsText.copyMessage} icon={copied ? "Check" : "Copy"} onClick={copyMessage} preferFont size={buttonSize} variant="ghost" /> : null}
      {onPinChapter ? <OfficialButton ariaLabel={isPinned ? actionsText.unpinChapter : actionsText.pinAsChapter} icon={isPinned ? "PinSlash" : "Pin"} onClick={onPinChapter} preferFont pressed={isPinned} size={buttonSize} variant="ghost" /> : null}
      {onRewind ? <OfficialButton ariaLabel={rewindLabel} icon={rewindIcon} onClick={onRewind} preferFont size={buttonSize} variant="ghost" /> : null}
      {onFork ? <OfficialButton ariaLabel={actionsText.forkFromHere} icon="ArrowSplitRight" onClick={onFork} preferFont size={buttonSize} variant="ghost" /> : null}
      {shouldShowRating ? (
        <>
          <OfficialButton ariaLabel={actionsText.goodResponse} icon={currentRating === "positive" ? "ThumbsUpFilled" : "ThumbsUp"} onClick={() => rateMessage("positive")} preferFont pressed={currentRating === "positive"} size={buttonSize} variant="ghost" />
          <OfficialButton ariaLabel={actionsText.badResponse} icon={currentRating === "negative" ? "ThumbsDownFilled" : "ThumbsDown"} onClick={() => rateMessage("negative")} preferFont pressed={currentRating === "negative"} size={buttonSize} variant="ghost" />
        </>
      ) : null}
    </>
  );
  if (isPretty) {
    return (
      <div
        aria-label={actionsText.messageActions}
        className={["flex items-center select-none", officialPrettyMessageActionsMutedClass, officialMessageActionsRevealClass, className].filter(Boolean).join(" ")}
        data-cds="MessageActions"
        data-official-source="cd5a31703-B4nKQMBN.js:zI shared-2:oW"
        data-reveal="fade"
        role="toolbar"
      >
        {stampPlacement === "start" ? stamp : null}
        {buttons}
        {stampPlacement === "end" ? stamp : null}
      </div>
    );
  }
  return (
    <div
      aria-label={actionsText.messageActions}
      className={["flex gap-0.75 pt-[4px]", officialMessageActionsMutedClass, officialMessageActionsRevealClass, className].filter(Boolean).join(" ")}
      data-official-source="cd5a31703-B4nKQMBN.js:GNe"
      role="toolbar"
    >
      {stampPlacement === "start" ? stamp : null}
      {buttons}
      {stampPlacement === "end" ? stamp : null}
    </div>
  );
}

function OfficialRelativeTimestamp({ layout = "gne", timestamp }: { layout?: "gne" | "pretty"; timestamp: string }) {
  const [, forceUpdate] = useReducer((value: number) => value + 1, 0);

  useEffect(() => {
    const tick = () => {
      if (typeof document === "undefined" || !document.hidden) forceUpdate();
    };
    const timer = window.setInterval(tick, 30_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  const parsed = Date.parse(timestamp);
  const dateTime = Number.isNaN(parsed) ? undefined : new Date(parsed).toISOString();
  return (
    <time
      className={layout === "pretty" ? officialPrettyTimestampClass : officialMessageActionsTimestampClass}
      data-cds="RelativeTime"
      data-row-time=""
      dateTime={dateTime}
      title={formatTranscriptTimestampTitle(timestamp)}
    >
      {formatTranscriptTimestamp(timestamp)}
    </time>
  );
}

export function OfficialAssistantMessage({
  children,
  copyText,
  createdAt,
  isPinned = false,
  showAwaitingDot = false,
  onFork,
  onPinChapter,
  onRateMessage,
  rateMessageUuid,
  rating,
  textSize,
}: {
  children: ReactNode;
  copyText?: string;
  createdAt?: string;
  isPinned?: boolean;
  onFork?: () => void;
  onPinChapter?: () => void;
  onRateMessage?: (messageUuid: string, rating: OfficialMessageRating) => void;
  rateMessageUuid?: string;
  rating?: OfficialMessageRating;
  showAwaitingDot?: boolean;
  textSize?: "sm" | "lg";
}) {
  return (
    <div
      className="group/message-row group/msg relative flex w-full min-w-0 flex-col gap-xs break-words select-text print:block"
      data-busy={showAwaitingDot ? "" : undefined}
      data-cds="AssistantMessage"
      data-text-size={textSize}
    >
      {showAwaitingDot ? <span className="absolute left-[-28px] top-0" data-official-source="cd5a31703-B4nKQMBN.js:Kb showAwaitingDot _h"><OfficialAwaitingDot /></span> : null}
      <div className="flex min-w-0 flex-col gap-5 compact:gap-4 select-text print:block">
        {children}
      </div>
      {(copyText !== undefined || createdAt || onPinChapter || onFork || (rateMessageUuid && onRateMessage)) ? (
        <OfficialMessageActions
          copyText={copyText}
          isPinned={isPinned}
          layout="pretty"
          onFork={onFork}
          onPinChapter={onPinChapter}
          onRateMessage={onRateMessage}
          rateMessageUuid={rateMessageUuid}
          rating={rating}
          timestamp={createdAt}
          timestampPlacement="end"
        />
      ) : null}
    </div>
  );
}

export function OfficialComposerDropdown({
  children,
  icon,
  onClick,
}: {
  children?: ReactNode;
  icon?: string;
  onClick?: () => void;
}) {
  if (icon) {
    return (
      <button className="group/dd relative isolate inline-flex items-center min-w-0 border-0 cursor-default select-none outline-none hide-focus-ring ring-focus text-uncontained-default hover:text-uncontained-hover disabled:text-uncontained-disabled disabled:hover:text-uncontained-disabled aria-[expanded=true]:text-[var(--text-uncontained-selected)] aria-[expanded=true]:hover:text-[var(--text-uncontained-selected)] h-small rounded-small text-footnote justify-between pl-p3 pr-p2 shrink-0" onClick={onClick} type="button">
        <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-[var(--fill-uncontained-default)] group-hover/dd:bg-[var(--fill-uncontained-hover)]" />
        <Icon name={icon} customSize={16} />
      </button>
    );
  }

  return (
    <button className="group/dd relative isolate inline-flex items-center min-w-0 border-0 cursor-default select-none outline-none hide-focus-ring ring-focus text-uncontained-default hover:text-uncontained-hover disabled:text-uncontained-disabled disabled:hover:text-uncontained-disabled aria-[expanded=true]:text-[var(--text-uncontained-selected)] aria-[expanded=true]:hover:text-[var(--text-uncontained-selected)] h-small rounded-small text-footnote justify-between pl-p5 pr-p2" type="button">
      <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-[var(--fill-uncontained-default)] group-hover/dd:bg-[var(--fill-uncontained-hover)]" />
      <span className="min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap">{children}</span>
    </button>
  );
}

export function OfficialComposerPill({
  ariaLabel,
  children,
  className = "",
  icon,
  onClick,
  title,
}: {
  ariaLabel?: string;
  children?: ReactNode;
  className?: string;
  icon?: string;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button aria-label={ariaLabel} className={`${officialComposerPillClass} ${className}`} onClick={onClick} title={title} type="button">
      {icon ? <Icon name={icon} preferFont size="sm" /> : null}
      {children}
    </button>
  );
}

const officialComposerTooltipClass =
  "epitaxy-popup inline-flex items-center whitespace-nowrap h-h4 rounded-r5 gap-g5 px-p6 bg-[var(--ui-tooltip-fill)] text-[var(--ui-tooltip-text)] text-body font-ui effect-shadow-large";
const officialComposerTooltipMultilineClass =
  "epitaxy-popup inline-flex flex-col max-w-[360px] whitespace-pre-wrap rounded-r5 gap-g3 px-p6 py-p5 bg-[var(--ui-tooltip-fill)] text-[var(--ui-tooltip-text)] text-body font-ui effect-shadow-large";

/** Official c87b `c` / Md — composer chrome tooltip (label + optional cwd detail). */
function OfficialComposerChromeTooltip({
  children,
  detail,
  label,
}: {
  children: ReactElement;
  detail?: string;
  label: ReactNode;
}) {
  if (!isValidElement(children)) return children;
  const multiline = Boolean(detail);
  return (
    <Tooltip.Root disableHoverablePopup>
      <Tooltip.Trigger delay={400} render={children as ReactElement<Record<string, unknown>>} />
      <Tooltip.Portal>
        <Tooltip.Positioner className="epitaxy-root z-[100]" collisionPadding={{ top: 48 }} side="top" sideOffset={4}>
          <Tooltip.Popup className={multiline ? officialComposerTooltipMultilineClass : officialComposerTooltipClass}>
            <span className={multiline ? "line-clamp-3" : undefined}>{label}</span>
            {detail ? (
              <span className="max-w-[280px] overflow-hidden text-ellipsis text-[var(--ui-tooltip-text)] opacity-70 [direction:rtl]">
                <bdi>{detail}</bdi>
              </span>
            ) : null}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

export function OfficialComposerPillPulse({
  children,
  pulseNonce,
}: {
  children: ReactNode;
  pulseNonce?: unknown;
}) {
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    if (pulseNonce === undefined) return;
    if (isReducedMotionActive()) return;
    setIsPulsing(true);
  }, [pulseNonce]);

  return (
    <span
      className={isPulsing ? "inline-flex epitaxy-pill-pulse" : "inline-flex"}
      onAnimationEnd={(event) => {
        if (event.animationName === "epitaxy-pill-pulse") setIsPulsing(false);
      }}
    >
      {children}
    </span>
  );
}

export function OfficialComposerFolderPill({
  browseDisabled = false,
  folder,
  isSSH = false,
  onBrowse,
  onMenuClosed,
  onSelectFolder,
  recentFolders,
}: OfficialComposerFolderPillProps) {
  const [open, setOpen] = useState(false);
  const gitText = useI18nText(COMPOSER_GIT_MESSAGES);
  const duplicateBasenames = useMemoizedDuplicateBasenames(recentFolders);
  const triggerChildren = (
    <>
      <Icon name="Folder1" size="s" />
      <span className="truncate max-w-[160px]">{folder ? basename(folder) : gitText.selectFolderEllipsis}</span>
    </>
  );
  const wrapWorkingDirectory = (node: ReactElement) => (
    <OfficialComposerChromeTooltip detail={folder || undefined} label={gitText.workingDirectory}>
      {node}
    </OfficialComposerChromeTooltip>
  );

  if (recentFolders.length === 0) {
    const button = (
      <button className={officialComposerPillClass} disabled={browseDisabled} onClick={onBrowse} title={folder} type="button">
        {triggerChildren}
      </button>
    );
    const wrapped = wrapWorkingDirectory(button);
    return browseDisabled ? <span className="inline-flex">{wrapped}</span> : wrapped;
  }

  /** Official c119 focusComposer: after folder menu closes, keyboard goes to TipTap — not the pill. */
  const focusCodePrompt = () => {
    if (typeof document === "undefined") return null;
    const prompt =
      document.querySelector<HTMLElement>(".epitaxy-prompt-input .tiptap")
      ?? document.querySelector<HTMLElement>(".epitaxy-prompt .tiptap")
      ?? document.querySelector<HTMLElement>(".tiptap");
    if (!prompt) return null;
    try {
      prompt.focus({ preventScroll: true });
    } catch {
      prompt.focus();
    }
    return prompt;
  };

  return (
    <Menu.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Base UI FloatingFocusManager returnFocus parks keyboard on Menu.Trigger /
        // epitaxy-popup after item select — Code draft then cannot type into TipTap.
        // Official c119 focusComposer residual: after folder UI closes, focus composer.
        if (!next && typeof document !== "undefined") {
          const releaseFolderFocus = () => {
            const active = document.activeElement;
            if (!(active instanceof HTMLElement)) return;
            if (active.closest?.(".tiptap") || active.classList?.contains("tiptap")) return;
            // Folder trigger, menu popup, or any non-composer focus left by Menu close.
            if (
              active.getAttribute("title") === folder
              || active.closest?.("[data-cds='Menu']")
              || active.classList?.contains("epitaxy-popup")
              || active.matches?.("button")
            ) {
              active.blur();
            }
            focusCodePrompt();
          };
          releaseFolderFocus();
          requestAnimationFrame(releaseFolderFocus);
          window.setTimeout(releaseFolderFocus, 0);
          window.setTimeout(releaseFolderFocus, 50);
          window.setTimeout(releaseFolderFocus, 120);
          window.setTimeout(releaseFolderFocus, 250);
          onMenuClosed?.();
        }
      }}
    >
      {wrapWorkingDirectory(
        <Menu.Trigger className={officialComposerPillClass} title={folder}>
          {triggerChildren}
        </Menu.Trigger>,
      )}
      <Menu.Portal>
        <Menu.Positioner align="start" className="epitaxy-root z-[60]" side="top" sideOffset={8}>
          {/* finalFocus → Code prompt (not folder pill). Base UI accepts element | false | fn. */}
          <Menu.Popup
            className={officialMenuPopupClass}
            data-cds="Menu"
            finalFocus={() => focusCodePrompt()}
          >
            <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-popover effect-hud" />
            <div className={officialMenuScrollClass}>
              <Menu.Group className="flex flex-col">
                <OfficialMenuHeader>{gitText.recent}</OfficialMenuHeader>
                {recentFolders.map((recent) => {
                  const label = recent.displayName ?? basename(recent.path) ?? recent.path;
                  const parent = parentPath(recent.path);
                  const needsParent = !recent.displayName && parent && duplicateBasenames.has(label);
                  return (
                    <Menu.Item
                      aria-checked={recent.path === folder}
                      className={[officialMenuItemBaseClass, "gap-g3"].join(" ")}
                      key={recent.path}
                      onClick={() => onSelectFolder(recent.path)}
                      role="menuitemradio"
                      title={recent.path}
                    >
                      {needsParent ? (
                        <span className="flex min-w-0 items-baseline">
                          <span className="shrink-0">{label}</span>
                          <span className="ml-[var(--g6)] truncate text-footnote text-t6">{parent}</span>
                        </span>
                      ) : (
                        <span className="flex-1 min-w-0 truncate pr-[16px]">{label}</span>
                      )}
                      <span className="flex items-center justify-center size-[16px] shrink-0 ml-[6px] text-[var(--accent)]" style={officialMenuIconStyle}>
                        {recent.path === folder ? <Icon name="CheckSelection" size="sm" /> : null}
                      </span>
                    </Menu.Item>
                  );
                })}
              </Menu.Group>
              <OfficialMenuSeparator />
              <Menu.Item className={[officialMenuItemBaseClass, "gap-g3"].join(" ")} disabled={browseDisabled} onClick={onBrowse}>
                <span className="flex-1 min-w-0 truncate pr-[16px]">{isSSH ? gitText.browseRemoteFolder : gitText.openFolderEllipsis}</span>
              </Menu.Item>
            </div>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

export function OfficialComposerSplitPill({
  children,
  className = "",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button className={`${officialComposerSplitPillClass} ${className}`} onClick={onClick} type="button">
      {children}
    </button>
  );
}

export function OfficialSessionSource({ ariaLabel, session, sessionRef }: { ariaLabel?: string; session: SessionSummary | null; sessionRef: OfficialSessionRef }) {
  const cwd = normalizeLabel(session?.cwd);
  const branch = normalizeLabel(session?.repo?.branch);
  const repoNames = normalizeLabel(session?.repo?.name) ? [normalizeLabel(session?.repo?.name)!] : [];
  const repoName = normalizeLabel(repoNames.length > 1 ? `${repoNames.length} repos` : repoNames[0]) ?? normalizeLabel(basename(cwd));
  const kind = sessionSourceKind(sessionRef, session);

  const connection = session?.connectionState ?? null;
  const sshHost = normalizeLabel(
    (session as { sshConfig?: { sshHost?: string; host?: string } } | null)?.sshConfig?.sshHost
      ?? (session as { sshConfig?: { host?: string } } | null)?.sshConfig?.host,
  );

  // Live pin ca80 `S0` local titlebar is icon-only (K1 "Local"), not c119 AC folder menu.
  if (kind !== "local" && repoName) {
    return (
      <OfficialSessionSourceMenu
        ariaLabel={ariaLabel}
        branch={branch}
        connection={connection}
        cwd={cwd}
        kind={kind}
        repoName={repoName}
        repoNames={repoNames}
        sshHost={sshHost}
      />
    );
  }

  return (
    <OfficialSessionSourceButton
      ariaLabel={ariaLabel}
      connection={connection}
      kind={kind}
      loading={!session}
      sshHost={sshHost}
    />
  );
}

function OfficialSessionSourceMenu({ ariaLabel, branch, connection, cwd, kind, repoName, repoNames, sshHost }: {
  ariaLabel?: string;
  branch?: string;
  connection?: string | null;
  cwd?: string;
  kind: OfficialSessionSourceKind;
  repoName: string;
  repoNames: string[];
  sshHost?: string;
}) {
  const [open, setOpen] = useState(false);
  const sessionLoadText = useI18nText(SESSION_LOAD_MESSAGES);
  const paneChrome = useI18nText(SIDE_PANE_CHROME_MESSAGES);
  const folderText = useI18nText(SHOW_IN_FOLDER_MESSAGES);
  const errors = useErrorsOptional();
  const localCwd = kind === "local" ? cwd : undefined;
  // Official AC `b`: extra repo names · environmentName · sshHost (not branch).
  const hoverDetail = [repoNames.length > 1 ? repoNames.join(", ") : undefined, sshHost].filter(Boolean).join(" · ");
  const connectionLabel = connection ? officialConnectionStatusLabel(connection, sessionLoadText) : null;
  const hasHoverTooltip = Boolean(hoverDetail || connectionLabel);
  const items: OfficialDropdownItem[] = [
    ...(localCwd && desktopBridge.FileSystem.showInFolder
      ? [{
          label: officialShowInFolderLabel(folderText),
          onSelect: () => {
            void desktopBridge.FileSystem.showInFolder?.(localCwd);
          },
        } satisfies OfficialDropdownItem]
      : []),
    ...(cwd
      ? [{
          label: paneChrome.copyPath,
          onSelect: () => {
            void navigator.clipboard?.writeText(cwd).then(() => {
              errors?.addSuccess(paneChrome.pathCopiedToClipboard);
            }).catch(() => undefined);
          },
        } satisfies OfficialDropdownItem]
      : []),
    ...(branch
      ? [{
          label: sessionLoadText.copyBranchName,
          onSelect: () => {
            void navigator.clipboard?.writeText(branch).then(() => {
              errors?.addSuccess(sessionLoadText.branchNameCopiedToClipboard);
            }).catch(() => undefined);
          },
        } satisfies OfficialDropdownItem]
      : []),
  ];

  const trigger = (
    <Menu.Trigger
      aria-label={ariaLabel ?? sourceAriaLabel(kind, sessionLoadText, sshHost)}
      className={officialSessionSourceClass}
      onContextMenu={(event) => {
        event.preventDefault();
        setOpen(true);
      }}
    >
      <OfficialSessionSourceIcon connection={connection} kind={kind} />
    </Menu.Trigger>
  );
  return (
    <Menu.Root open={open} onOpenChange={setOpen}>
      {hasHoverTooltip ? (
        <OfficialTooltip
          delayDuration={400}
          open={open ? false : undefined}
          tooltipContent={(
            <>
              {hoverDetail ? <span className="text-body-medium text-t7">{hoverDetail}</span> : null}
              {connectionLabel ? <span className="text-footnote text-t6">{connectionLabel}</span> : null}
            </>
          )}
        >
          {trigger}
        </OfficialTooltip>
      ) : trigger}
      {items.length > 0 ? (
        <Menu.Portal>
          <Menu.Positioner align="start" className="epitaxy-root z-[60]" side="bottom" sideOffset={8}>
            <Menu.Popup className={officialMenuPopupClass} data-cds="Menu">
              <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-popover effect-hud" />
              <div className={officialMenuScrollClass}>
                <OfficialMenuItems items={items} />
              </div>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      ) : null}
    </Menu.Root>
  );
}

function OfficialSessionSourceButton({ ariaLabel, connection, kind, label, loading = false, sshHost }: { ariaLabel?: string; connection?: string | null; kind: OfficialSessionSourceKind; label?: string; loading?: boolean; sshHost?: string }) {
  const sessionLoadText = useI18nText(SESSION_LOAD_MESSAGES);
  const resolvedAriaLabel = ariaLabel ?? sourceAriaLabel(kind, sessionLoadText, sshHost);
  if (label) {
    return (
      <span aria-label={resolvedAriaLabel} className={officialSessionSourceClass}>
        <OfficialSessionSourceIcon connection={connection} kind={kind} />
        <span className="truncate">{label}</span>
      </span>
    );
  }
  if (loading) {
    return (
      <span aria-label={resolvedAriaLabel} className={officialSessionSourceClass}>
        <OfficialSessionSourceIcon connection={connection} kind={kind} />
        <span className="h-[10px] w-[64px] rounded-r3 bg-t2 animate-pulse" />
      </span>
    );
  }
  const button = (
    <OfficialButton
      ariaLabel={resolvedAriaLabel}
      badge={officialConnectionDot(connection)}
      customSize={18}
      icon={officialSessionIconMap[kind]}
      preferFont
      tooltipSide="bottom"
    />
  );
  if (connection == null || connection === undefined) return button;
  const connectionLabel = officialConnectionStatusLabel(connection, sessionLoadText);
  if (!connectionLabel) return button;
  return (
    <OfficialTooltip delayDuration={400} tooltipContent={`${resolvedAriaLabel} · ${connectionLabel}`}>
      {button}
    </OfficialTooltip>
  );
}

function officialConnectionStatusLabel(
  connection: string,
  text: {
    originNotConnected: string;
    originConnecting: string;
    originReconnecting: string;
    originConnected: string;
    originDisconnected: string;
  },
) {
  switch (connection) {
    case "idle": return text.originNotConnected;
    case "connecting": return text.originConnecting;
    case "reconnecting": return text.originReconnecting;
    case "connected": return text.originConnected;
    case "disconnected": return text.originDisconnected;
    default: return null;
  }
}

/**
 * Official PC residual: kind icon with optional EC connection dot overlay.
 * When connection is undefined (typical local host-loop), badge is omitted.
 */
function OfficialSessionSourceIcon({
  connection,
  kind,
}: {
  connection?: string | null;
  kind: OfficialSessionSourceKind;
}) {
  const badge = officialConnectionDot(connection);
  // Official ca80 `x0`: Ts({ name: $1(kind), customSize: 18 }) — Anthropicons font, not SVG MacBook path.
  const icon = <Icon name={officialSessionIconMap[kind]} preferFont customSize={18} />;
  if (!badge) return icon;
  return (
    <span className="grid" data-official-source="cd5a31703-B4nKQMBN.js:PC">
      <span className="col-start-1 row-start-1">{icon}</span>
      <span className="col-start-1 row-start-1 translate-x-[1px] -translate-y-[1px] self-start justify-self-end">
        {badge}
      </span>
    </span>
  );
}

/** Official EC residual — connection status dot. */
function officialConnectionDot(connection?: string | null) {
  if (!connection) return null;
  if (connection === "connecting" || connection === "reconnecting") {
    return <span className="block size-[6px] rounded-full animate-pulse bg-[var(--accent)]" style={{ boxShadow: "0 0 0 0.5px var(--surface-primary)" }} />;
  }
  if (connection === "connected") {
    return <span className="block size-[6px] rounded-full bg-[var(--accent)]" style={{ boxShadow: "0 0 0 0.5px var(--surface-primary)" }} />;
  }
  if (connection === "disconnected") {
    return <span className="block size-[6px] rounded-full bg-[var(--core-red)]" style={{ boxShadow: "0 0 0 0.5px var(--surface-primary)" }} />;
  }
  if (connection === "idle") {
    return (
      <span
        className="block size-[6px] rounded-full"
        style={{ boxShadow: "inset 0 0 0 1px var(--accent), 0 0 0 0.5px var(--surface-primary)" }}
      />
    );
  }
  return null;
}

/**
 * Official RC residual: local | ssh | remote | bridge.
 * sessionRef.type has no ssh — use session.sessionType / workspace mode when present.
 */
function sessionSourceKind(
  sessionRef: OfficialSessionRef,
  session?: SessionSummary | null,
): OfficialSessionSourceKind {
  if (sessionRef.type === "bridge") return "bridge";
  if (sessionRef.type === "remote") return "remote";
  const sessionType = session?.sessionType?.toLowerCase?.() ?? "";
  if (sessionType === "ssh" || sessionType.includes("ssh")) return "ssh";
  // Workspace mode residual when session meta carries ssh config marker.
  const mode = (session as { workspaceMode?: string } | null | undefined)?.workspaceMode;
  if (mode === "ssh") return "ssh";
  return "local";
}

function sourceAriaLabel(
  kind: OfficialSessionSourceKind,
  text: { originLocal: string; originSshHost: string; originRemote: string; originBridge: string },
  sshHost?: string,
) {
  switch (kind) {
    case "local": return text.originLocal;
    case "ssh": return formatOfficialIcu(text.originSshHost, { sshHost: sshHost?.trim() || "" });
    case "remote": return text.originRemote;
    case "bridge": return text.originBridge;
  }
}

/** Official shared-2 `YU` / `eW` — year→minute including week. */
const OFFICIAL_RELATIVE_TIME_UNITS = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
] as const;

function formatTranscriptTimestamp(value: string) {
  const time = Date.parse(value);
  if (Number.isNaN(time)) return value;
  const signedSeconds = Math.round((time - Date.now()) / 1000);
  const absSeconds = Math.abs(signedSeconds);
  if (absSeconds < 60) return "just now";
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto", style: "long" });
  let unit: (typeof OFFICIAL_RELATIVE_TIME_UNITS)[number][0] = "minute";
  let size = 60;
  for (const [nextUnit, nextSize] of OFFICIAL_RELATIVE_TIME_UNITS) {
    if (absSeconds >= nextSize) {
      unit = nextUnit;
      size = nextSize;
      break;
    }
  }
  return rtf.format(Math.round(signedSeconds / size), unit);
}

function formatTranscriptTimestampTitle(value: string) {
  const time = Date.parse(value);
  if (Number.isNaN(time)) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "medium" }).format(new Date(time));
}

/** Official title chevron `vu` / `pe` residual (c11959232). */
const SESSION_TITLE_MESSAGES = {
  sessionActions: { defaultMessage: "Session actions", id: "eoNgAKwa5b" },
  sessionName: { defaultMessage: "Session name", id: "mvdlXjfNEZ" },
  rename: { defaultMessage: "Rename", id: "FPJlgifNwD" },
  renameSession: { defaultMessage: "{name}, rename session", id: "Z444Es4IIr" },
  moreOptionsFor: { defaultMessage: "More options for {label}", id: "rKQPgfPvWS" },
  moreOptions: { defaultMessage: "More options", id: "IzCVhGdYVc" },
  archive: { defaultMessage: "Archive", id: "NOMnBofwOT" },
  delete: { defaultMessage: "Delete", id: "K3r6DQW7h+" },
  openIn: { defaultMessage: "Open in", id: "4nONiiddCv" },
  splitView: { defaultMessage: "Split view", id: "Ag1TzTm++9" },
  newWindow: { defaultMessage: "New window", id: "XzejZSc1R2" },
  terminal: { defaultMessage: "Terminal", id: "GE7Vqpsyct" },
  fork: { defaultMessage: "Fork", id: "ID9MKARV89" },
  outputStyle: { defaultMessage: "Output style", id: "/jFmdFrLzq" },
} satisfies MessageDescriptors;

/** Official qC residual (c11959232) — formatMessage ids for Transcript view menu. */
const TRANSCRIPT_VIEW_MESSAGES = {
  header: { defaultMessage: "Transcript view", id: "sFXw3+Ca5d" },
  ariaLabel: { defaultMessage: "Transcript view mode", id: "IFemRIFDSs" },
  normal: { defaultMessage: "Normal", id: "myq2ZLhZnI" },
  thinking: { defaultMessage: "Thinking", id: "AHQWDTo4+e" },
  verbose: { defaultMessage: "Verbose", id: "ti6aQl5Lr/" },
  summary: { defaultMessage: "Summary", id: "RrCui3yt/J" },
  textSize: { defaultMessage: "Text size", id: "VjynyQmk9u" },
  smallText: { defaultMessage: "Small text", id: "GW6Zyo3cO4" },
  mediumText: { defaultMessage: "Medium text", id: "bDNRyyPJKa" },
  largeText: { defaultMessage: "Large text", id: "HhwYFtK23H" },
  /** Official c593 `xm` / `41fOlD8UGe` — ke Transcript view footer. */
  makeDefault: { defaultMessage: "Make {mode} the default", id: "41fOlD8UGe" },
} satisfies MessageDescriptors;

const OFFICIAL_CHAT_TEXT_SIZES = ["s", "m", "l"] as const satisfies readonly EditorSize[];
const OFFICIAL_CHAT_TEXT_SIZE_ICON: Record<EditorSize, "s" | "m" | "l"> = { s: "s", m: "m", l: "l" };

/**
 * Official c11959232 `qC` — titlebar Transcript view (NoteSquareLines).
 * Text size trailing is keepOpen; sizes write epitaxy-editor-prefs chatTextSize.
 */
function OfficialTranscriptViewButton({
  hideSummary = false,
  onTranscriptModeChange,
  transcriptMode = "normal",
}: {
  hideSummary?: boolean;
  onTranscriptModeChange?: (mode: OfficialTranscriptMode) => void;
  transcriptMode?: OfficialTranscriptMode;
}) {
  const text = useI18nText(TRANSCRIPT_VIEW_MESSAGES);
  const chatTextSize = useSyncExternalStore(
    officialEpitaxyEditorPrefsStore.subscribe,
    () => officialEpitaxyEditorPrefsStore.getState().chatTextSize,
    () => "m" as EditorSize,
  );
  const cycleKey = officialSessionShortcutKeyForCommand(
    "cycleTranscriptMode",
    getOfficialSessionShortcutContext().isClaudeApp,
  );
  const effectiveMode = hideSummary && transcriptMode === "summary" ? "normal" : transcriptMode;
  const sizeLabels: Record<EditorSize, string> = {
    s: text.smallText,
    m: text.mediumText,
    l: text.largeText,
  };
  const items: OfficialDropdownItem[] = [
    { label: text.normal, checked: effectiveMode === "normal", onSelect: () => onTranscriptModeChange?.("normal") },
    { label: text.thinking, checked: effectiveMode === "thinking", onSelect: () => onTranscriptModeChange?.("thinking") },
    { label: text.verbose, checked: effectiveMode === "verbose", onSelect: () => onTranscriptModeChange?.("verbose") },
    ...(hideSummary
      ? []
      : [{ label: text.summary, checked: effectiveMode === "summary", onSelect: () => onTranscriptModeChange?.("summary") } satisfies OfficialDropdownItem]),
    {
      keepOpen: true,
      label: null,
      trailing: (
        <div
          aria-label={text.textSize}
          className="flex items-stretch gap-g3 pt-p6 pb-p2 -ml-[2px] -mr-[2px]"
          role="group"
        >
          {OFFICIAL_CHAT_TEXT_SIZES.map((size) => (
            <OfficialButton
              ariaLabel={sizeLabels[size]}
              className="flex-1 aspect-auto"
              customIcon={<Icon name="TitleCaseFontSize" preferFont size={OFFICIAL_CHAT_TEXT_SIZE_ICON[size]} />}
              key={size}
              onClick={() => officialEpitaxyEditorPrefsStore.getState().setChatTextSize(size)}
              pressed={chatTextSize === size}
              variant="contained"
            />
          ))}
        </div>
      ),
    },
  ];
  return (
    <OfficialDropdownButton
      align="end"
      ariaLabel={text.ariaLabel}
      header={text.header}
      icon="NoteSquareLines"
      items={items}
      revealChevron="never"
      side="bottom"
      size="base"
      triggerKey={cycleKey}
    />
  );
}

/**
 * Official c11959232 code session title (`Q` inline edit + chevron `vu` / `ZR` actions).
 * Transcript view lives on header `qC`, not this chevron.
 * Click title → start rename; menu Rename → same; commit → LocalSessions.updateSession + store patch.
 */
/**
 * Live pin ca80 `d0`/`u0` — titlebar origin folder label after the session name.
 * `J1("h-[20px] px-1.25")` + `t0` `before:bg-alpha-2 text-secondary`.
 * Label is repo name or cwd basename (W1).
 */
function officialOriginFolderLabel(session: SessionSummary | null) {
  const repo = normalizeLabel(session?.repo?.name);
  if (repo) return repo;
  return normalizeLabel(basename(session?.cwd));
}

const officialOriginFolderPillClass =
  "relative isolate inline-flex items-center gap-0.75 h-[20px] px-1.25 rounded text-footnote select-none before:content-[''] before:absolute before:-z-[1] before:inset-0 before:rounded before:bg-alpha-2 text-secondary min-w-0";
const officialOriginFolderPillTriggerClass =
  `${officialOriginFolderPillClass} border-0 cursor-default outline-none hide-focus-ring focus-visible:shadow-focus hover:before:bg-alpha-3 aria-[expanded=true]:before:bg-alpha-3`;

function OfficialOriginFolderPill({
  session,
  sessionRef,
}: {
  session: SessionSummary | null;
  sessionRef: OfficialSessionRef;
}) {
  const [open, setOpen] = useState(false);
  const [pendingTrust, setPendingTrust] = useState<{ directory: string; sources: string[] } | null>(null);
  const sessionLoadText = useI18nText(SESSION_LOAD_MESSAGES);
  const paneChrome = useI18nText(SIDE_PANE_CHROME_MESSAGES);
  const pillText = useI18nText(ORIGIN_FOLDER_PILL_MESSAGES);
  const folderText = useI18nText(SHOW_IN_FOLDER_MESSAGES);
  const errors = useErrorsOptional();
  const sidePaneStore = useOfficialSidePaneStoreApi();
  const label = officialOriginFolderLabel(session);
  const cwd = normalizeLabel(session?.cwd);
  const branch = normalizeLabel(session?.repo?.branch);
  const isLocal = sessionSourceKind(sessionRef, session) === "local";
  const sessionId = sessionRef.id;
  const canChangeCwd = isLocal && Boolean(desktopBridge.FileSystem.browseFolder && desktopBridge.LocalSessions.changeCwd);

  const copyText = useCallback((value: string, success: string) => {
    void navigator.clipboard?.writeText(value).then(() => {
      errors?.addSuccess(success);
    }).catch(() => undefined);
  }, [errors]);

  const applyOkCwd = useCallback((nextCwd: string) => {
    officialCodeSessionStore.getState().patchSession(sessionId, {
      cwd: nextCwd,
      repo: { name: officialOriginFolderBasename(nextCwd) },
    } as never);
    void desktopBridge.LocalSessions.getGitInfo?.(sessionId).then((info) => {
      const git = info && typeof info === "object" ? info as { branch?: unknown; root?: unknown } : null;
      const gitBranch = typeof git?.branch === "string" ? git.branch : undefined;
      const gitRoot = typeof git?.root === "string" ? git.root : undefined;
      officialCodeSessionStore.getState().patchSession(sessionId, {
        cwd: nextCwd,
        repo: {
          name: officialOriginFolderBasename(gitRoot || nextCwd),
          branch: gitBranch,
        },
      } as never);
    }).catch(() => undefined);
  }, [sessionId]);

  const runChangeCwd = useCallback(async (nextCwd?: string, trustAccepted?: boolean, trustedDirectory?: string) => {
    const browse = desktopBridge.FileSystem.browseFolder;
    const changeCwd = desktopBridge.LocalSessions.changeCwd;
    if (!sessionId || !browse || !changeCwd) return false;
    const picked = nextCwd ?? await browse(pillText.changeWorkingDirectory).catch(() => null);
    if (!picked) return false;
    if (officialOriginFolderIsRejectedUnc(picked)) {
      errors?.addError(pillText.uncRejected);
      return false;
    }
    const target = officialOriginFolderRewriteWslUnc(picked);
    try {
      const result = await changeCwd(sessionId, target, trustAccepted, trustedDirectory);
      if (result.status === "needs_trust") {
        if (trustAccepted) {
          errors?.addError(pillText.directoryCouldntBeTrusted);
          return false;
        }
        setPendingTrust({
          directory: result.directory,
          sources: (result.sources ?? []).filter((item): item is string => typeof item === "string"),
        });
        return false;
      }
      if (result.status === "rejected") {
        errors?.addError(result.message?.trim() || pillText.couldntChangeDirectory);
        return false;
      }
      applyOkCwd(result.cwd);
      if (result.changed) {
        errors?.addSuccess(officialOriginFolderMovedToast(pillText, result.cwd, result.filesCarried, formatOfficialIcu));
      } else {
        errors?.addSuccess(pillText.alreadyInDirectory);
      }
      if (!result.transcriptRelocated) errors?.addError(pillText.historyMayNotSurvive);
      return true;
    } catch (error) {
      errors?.addError(pillText.couldntChangeDirectory, {
        error,
        messageForLogging: "Epitaxy changeCwd IPC failed",
      });
      return false;
    }
  }, [applyOkCwd, errors, pillText, sessionId]);

  if (!label) return null;

  const extraItems: OfficialDropdownItem[] = isLocal && cwd && desktopBridge.FileSystem.showInFolder
    ? [{
        label: officialShowInFolderLabel(folderText),
        onSelect: () => {
          void desktopBridge.FileSystem.showInFolder?.(cwd);
        },
      }]
    : [];

  const copyAndChange: OfficialDropdownItem[] = [];
  if (cwd && branch) {
    copyAndChange.push({
      label: pillText.copy,
      items: [
        { label: pillText.copyPathItem, onSelect: () => copyText(cwd, paneChrome.pathCopiedToClipboard) },
        { label: pillText.copyBranchItem, onSelect: () => copyText(branch, sessionLoadText.branchNameCopiedToClipboard) },
      ],
    });
  } else if (cwd) {
    copyAndChange.push({
      label: paneChrome.copyPath,
      onSelect: () => copyText(cwd, paneChrome.pathCopiedToClipboard),
    });
  } else if (branch) {
    copyAndChange.push({
      label: sessionLoadText.copyBranchName,
      onSelect: () => copyText(branch, sessionLoadText.branchNameCopiedToClipboard),
    });
  }
  if (canChangeCwd) {
    copyAndChange.push({
      label: cwd ? pillText.changeFolderEllipsis : pillText.chooseFolderEllipsis,
      onSelect: () => {
        void runChangeCwd();
      },
    });
  }

  const terminalItems: OfficialDropdownItem[] = cwd
    ? [{
        label: paneChrome.openInTerminal,
        onSelect: () => {
          officialEpitaxyTerminalTabsStore.getState().addTab(sessionId, cwd, officialOriginFolderBasename(cwd));
          sidePaneStore.getState().setSidePane("terminal");
        },
      }]
    : [];

  const items = officialYbMenuItems([extraItems, copyAndChange, terminalItems]);
  const inner = (
    <>
      <span className="hidden group-data-[pills-compact]/lead:inline-flex">
        <Icon name="Folder" preferFont size="xs" />
      </span>
      <span className="truncate">{label}</span>
    </>
  );
  const tooltip = cwd && cwd !== label ? cwd : undefined;
  const trustModal = (
    <OfficialTrustModal
      isOpen={pendingTrust !== null}
      onAccept={() => {
        const pending = pendingTrust;
        if (!pending) return;
        setPendingTrust(null);
        void runChangeCwd(pending.directory, true, pending.directory);
      }}
      onDecline={() => {
        setPendingTrust(null);
      }}
      sources={pendingTrust?.sources ?? []}
      workspace={pendingTrust?.directory ?? ""}
    />
  );

  if (items.length === 0) {
    const idle = (
      <span className={`${officialOriginFolderPillClass} cursor-default`} data-testid="epitaxy-origin-label">
        {inner}
      </span>
    );
    return (
      <>
        {tooltip ? (
          <OfficialTooltip delayDuration={400} side="bottom" tooltipContent={tooltip}>
            {idle}
          </OfficialTooltip>
        ) : idle}
        {trustModal}
      </>
    );
  }

  const trigger = (
    <Menu.Trigger
      className={officialOriginFolderPillTriggerClass}
      data-testid="epitaxy-origin-label"
      onContextMenu={(event) => {
        event.preventDefault();
        setOpen(true);
      }}
      type="button"
    >
      {inner}
    </Menu.Trigger>
  );
  return (
    <>
      <Menu.Root open={open} onOpenChange={setOpen}>
        {tooltip ? (
          <OfficialTooltip delayDuration={400} open={open ? false : undefined} side="bottom" tooltipContent={tooltip}>
            {trigger}
          </OfficialTooltip>
        ) : trigger}
        <Menu.Portal>
          <Menu.Positioner align="start" className="epitaxy-root z-[60]" side="bottom" sideOffset={8}>
            <Menu.Popup className={officialMenuPopupClass} data-cds="Menu">
              <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-popover effect-hud" />
              <div className={officialMenuScrollClass}>
                <OfficialMenuItems items={items} />
              </div>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      {trustModal}
    </>
  );
}

function OfficialSessionTitle({
  hideSummary = false,
  onSessionRemoved,
  onTranscriptModeChange,
  onViewSelect,
  paneIndex,
  session,
  sessionRef,
  title,
  transcriptMode = "normal",
}: {
  hideSummary?: boolean;
  onSessionRemoved?: () => void;
  onTranscriptModeChange?: (mode: OfficialTranscriptMode) => void;
  onViewSelect?: (view: OfficialViewPane) => void;
  paneIndex: number;
  session: SessionSummary | null;
  sessionRef: OfficialSessionRef;
  title: string;
  transcriptMode?: OfficialTranscriptMode;
}) {
  const sessionId = sessionRef.id;
  const isShared = sessionRef.type !== "local";
  const cwd = session?.cwd?.trim() || "";
  const viewsText = useI18nText(VIEWS_MENU_MESSAGES);
  const transcriptText = useI18nText(TRANSCRIPT_VIEW_MESSAGES);
  const keepAwake = officialKpKeepAwake(sessionRef, session);
  const outputStyles = Array.isArray((session as { availableOutputStyles?: string[] } | null)?.availableOutputStyles)
    ? (session as { availableOutputStyles: string[] }).availableOutputStyles
    : [];
  const currentOutputStyle = typeof (session as { outputStyle?: string } | null)?.outputStyle === "string"
    ? (session as { outputStyle: string }).outputStyle
    : "default";
  const extraPanes = paneStore.getState().extraPanesByMode.code ?? [];
  const alreadySplit = extraPanes.some((pane) => pane.ref.id === sessionId);

  const forkSession = useCallback(async () => {
    const forked = await desktopBridge.LocalSessions.forkSession?.(sessionId);
    if (!forked?.id) return;
    officialCodeSessionStore.getState().openSession(forked.id, forked);
    replaceAppNavigation(sessionPath(forked));
  }, [sessionId]);

  const splitSession = useCallback(() => {
    paneStore.addPane("code", sessionId, { kind: "code", id: sessionId, title });
  }, [sessionId, title]);

  const openNewWindow = useCallback(() => {
    const url = `${window.location.origin}${sessionPath({ id: sessionId, kind: "code" })}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, [sessionId]);

  const applyOutputStyle = useCallback((style: string) => {
    officialCodeSessionStore.getState().patchSession(sessionId, { outputStyle: style } as never);
    void desktopBridge.LocalSessions.updateSession?.(sessionId, { outputStyle: style } as never);
  }, [sessionId]);
  const [editing, setEditing] = useState(false);
  const [titleMenuOpen, setTitleMenuOpen] = useState(false);
  const [draft, setDraft] = useState(title);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const committedRef = useRef(false);

  useEffect(() => {
    if (!editing) setDraft(title);
  }, [editing, title]);

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  const startRename = useCallback(
    (event?: { preventDefault?: () => void; stopPropagation?: () => void }) => {
      if (isShared) return;
      event?.preventDefault?.();
      event?.stopPropagation?.();
      committedRef.current = false;
      setDraft(title);
      setEditing(true);
    },
    [isShared, title],
  );

  const commitRename = useCallback(() => {
    if (committedRef.current) return;
    committedRef.current = true;
    setEditing(false);
    const next = draft.trim();
    if (!next || next === title) return;
    officialCodeSessionStore.getState().patchSession(sessionId, { title: next, titleSource: "user" });
    void desktopBridge.LocalSessions.updateSession?.(sessionId, { title: next, titleSource: "user" }).then((updated) => {
      if (updated) officialCodeSessionStore.getState().patchSession(sessionId, updated);
    });
  }, [draft, sessionId, title]);

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      event.stopPropagation();
      if (event.nativeEvent.isComposing) return;
      if (event.key === "Enter") {
        event.preventDefault();
        commitRename();
      } else if (event.key === "Escape") {
        event.preventDefault();
        committedRef.current = true;
        setEditing(false);
        setDraft(title);
      }
    },
    [commitRename, title],
  );

  /**
   * Titlebar archive/delete (not sidebar ue/ge):
   * shared archiveCodeSession/deleteCodeSession ($Yt + bridge + $5/H5 caches).
   * KEe = setStarred(false)+removeFromPinnedOrder — sidebar clearSessionSidebarMeta, not here.
   * Extra-pane close is PaneLayout subscribe / onSessionRemoved (Close pane X), separate from KEe.
   * Lone primary: leave /code home if URL still on this id (sidebar ue/ge uses next/prev/home).
   */
  const archiveSession = useCallback(async () => {
    const ok = await archiveCodeSession(sessionId);
    if (!ok) return;
    if (onSessionRemoved) {
      onSessionRemoved();
      return;
    }
    if (selectedSessionIdFromPath(window.location.pathname) === sessionId) {
      replaceAppNavigation(sessionHomePath("code"));
    }
  }, [onSessionRemoved, sessionId]);

  const deleteSession = useCallback(async () => {
    // Shared delete: bridge + cache clear + notify. Pane close / home leave stays in caller.
    const ok = await deleteCodeSession(sessionId);
    if (!ok) return;
    if (onSessionRemoved) {
      onSessionRemoved();
      return;
    }
    // Lone primary without Close-pane callback: leave if URL still points at this session.
    if (selectedSessionIdFromPath(window.location.pathname) === sessionId) {
      replaceAppNavigation(sessionHomePath("code"));
    }
  }, [onSessionRemoved, sessionId]);

  const sessionMenuText = useI18nText(SESSION_TITLE_MESSAGES);
  const folderText = useI18nText(SHOW_IN_FOLDER_MESSAGES);
  const openInItems: OfficialDropdownItem[] = [];
  if (!isShared) {
    if (!alreadySplit) {
      openInItems.push({ label: sessionMenuText.splitView, shortcut: String(openInItems.length + 1), onSelect: splitSession });
    }
    openInItems.push({ label: sessionMenuText.newWindow, shortcut: String(openInItems.length + 1), onSelect: openNewWindow });
    if (onViewSelect) {
      openInItems.push({ label: sessionMenuText.terminal, shortcut: String(openInItems.length + 1), onSelect: () => onViewSelect("terminal") });
    }
    if (cwd) {
      openInItems.push({
        label: officialShowInFolderLabel(folderText),
        shortcut: String(openInItems.length + 1),
        onSelect: () => {
          void desktopBridge.FileSystem.showInFolder?.(cwd);
        },
      });
    }
  }
  // Official c593 `xm` → ce4f `ke` Transcript view submenu (not c119 qC NoteSquareLines on titlebar).
  // Official cc432 `pW`: s=Rb(e) / c=bD(r,{thinking:s}) — Thinking row only when gated.
  const showThinking = useOfficialXmShowsThinking(sessionId, sessionRef.type === "local");
  const remappedTranscriptMode = transcriptMode === "thinking" && !showThinking ? "normal" : transcriptMode;
  const effectiveTranscriptMode = hideSummary && remappedTranscriptMode === "summary" ? "normal" : remappedTranscriptMode;
  const selectTranscriptMode = (mode: OfficialTranscriptMode) => {
    onTranscriptModeChange?.(mode);
  };
  const transcriptViewItems: OfficialDropdownItem[] = onTranscriptModeChange
    ? [
        { label: transcriptText.normal, checked: effectiveTranscriptMode === "normal", onSelect: () => selectTranscriptMode("normal") },
        ...(showThinking
          ? [{ label: transcriptText.thinking, checked: effectiveTranscriptMode === "thinking", onSelect: () => selectTranscriptMode("thinking") } satisfies OfficialDropdownItem]
          : []),
        { label: transcriptText.verbose, checked: effectiveTranscriptMode === "verbose", onSelect: () => selectTranscriptMode("verbose") },
      ]
    : [];
  const accountDefault = residualDefaultTranscriptMode();
  const transcriptViewDefault =
    onTranscriptModeChange
    && (effectiveTranscriptMode === "normal" || effectiveTranscriptMode === "thinking" || effectiveTranscriptMode === "verbose")
    && effectiveTranscriptMode !== accountDefault
      ? {
          label: formatOfficialIcu(transcriptText.makeDefault, {
            mode:
              effectiveTranscriptMode === "thinking"
                ? transcriptText.thinking
                : effectiveTranscriptMode === "verbose"
                  ? transcriptText.verbose
                  : transcriptText.normal,
          }),
          onSelect: () => writeCodeDefaultTranscriptView(effectiveTranscriptMode),
        }
      : undefined;
  const actions: OfficialDropdownItem[] = [
    ...(openInItems.length
      ? [{ label: sessionMenuText.openIn, items: openInItems } satisfies OfficialDropdownItem]
      : []),
    ...(!isShared
      ? [{ label: sessionMenuText.rename, shortcut: "R", onSelect: () => startRename(), separatorBefore: openInItems.length > 0 } satisfies OfficialDropdownItem]
      : []),
    ...(!isShared && desktopBridge.LocalSessions.forkSession
      ? [{ label: sessionMenuText.fork, shortcut: "F", onSelect: () => { void forkSession(); } } satisfies OfficialDropdownItem]
      : []),
    ...(transcriptViewItems.length
      ? [{
          label: transcriptText.header,
          items: [
            ...transcriptViewItems,
            ...(transcriptViewDefault
              ? [{
                  label: transcriptViewDefault.label,
                  onSelect: transcriptViewDefault.onSelect,
                  separatorBefore: true,
                } satisfies OfficialDropdownItem]
              : []),
          ],
        } satisfies OfficialDropdownItem]
      : []),
    ...(outputStyles.length
      ? [{
          label: sessionMenuText.outputStyle,
          items: outputStyles.map((style) => ({
            label: style === "default" ? "Default" : style,
            checked: currentOutputStyle === style,
            onSelect: () => applyOutputStyle(style),
          })),
        } satisfies OfficialDropdownItem]
      : []),
    ...(keepAwake
      ? [officialKeepAwakeMenuItem(viewsText, keepAwake)]
      : []),
    ...(!isShared
      ? [
          { label: sessionMenuText.archive, shortcut: "A", onSelect: () => { void archiveSession(); }, separatorBefore: true } satisfies OfficialDropdownItem,
          { label: sessionMenuText.delete, shortcut: "D", variant: "danger", onSelect: () => { void deleteSession(); } } satisfies OfficialDropdownItem,
        ]
      : []),
  ];

  if (editing) {
    return (
      <div className="flex items-center min-w-[32px] flex-1" data-official-source="cd5a31703-B4nKQMBN.js:inline-rename" data-pane-index={paneIndex}>
        <input
          aria-label={sessionMenuText.sessionName}
          className="epitaxy-prompt-input h-small flex-1 min-w-0 text-body bg-transparent border-0"
          onBlur={commitRename}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          ref={inputRef}
          size={Math.max(draft.length, 10)}
          value={draft}
        />
      </div>
    );
  }

  const trimmed = title.trim();
  const moreOptionsLabel = trimmed
    ? sessionMenuText.moreOptionsFor.replace("{label}", trimmed)
    : sessionMenuText.moreOptions;
  const renameAria = sessionMenuText.renameSession.replace("{name}", trimmed || title);

  return (
    <div className="flex items-center min-w-[calc(32px+var(--cds-h-control,24px))] group-data-[pills-compact]/lead:min-w-[calc(8px+var(--cds-h-control,24px))]" data-official-source="c593f7513-DQShcHgn.js:Om" data-pane-index={paneIndex}>
      <OfficialTooltip delayDuration={400} side="bottom" tooltipContent={isShared ? undefined : sessionMenuText.rename}>
        <button
          aria-label={isShared ? undefined : renameAria}
          className="truncate text-body font-medium font-control text-primary select-none mx-outset h-control px-xs rounded text-left bg-transparent border-0 hover:bg-fill-ghost-hover focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus cursor-text"
          data-pane-title=""
          onClick={isShared ? undefined : startRename}
          style={{ "--cds-outset-x": "var(--cds-pad-xs)" } as CSSProperties}
          type="button"
        >
          {title}
        </button>
      </OfficialTooltip>
      <Menu.Root open={titleMenuOpen} onOpenChange={setTitleMenuOpen}>
        <OfficialTooltip delayDuration={400} open={titleMenuOpen ? false : undefined} side="bottom" tooltipContent={moreOptionsLabel}>
          <Menu.Trigger
            aria-label={moreOptionsLabel}
            className="group/btn relative isolate inline-flex shrink-0 items-center justify-center aspect-square h-control w-control px-0 rounded border-0 bg-transparent text-secondary font-normal font-control outline-none hide-focus-ring focus-visible:shadow-focus hover:bg-fill-ghost-hover aria-[expanded=true]:bg-fill-control aria-[expanded=true]:text-primary"
            data-cds="Button"
            data-cds-ghost=""
            data-cds-icon-only=""
            type="button"
          >
            <Icon name="CaretDown" preferFont size="sm" />
          </Menu.Trigger>
        </OfficialTooltip>
        <Menu.Portal>
          <Menu.Positioner align="start" className="epitaxy-root z-[60]" side="bottom" sideOffset={8}>
            <Menu.Popup className={officialMenuPopupClass} data-cds="Menu">
              <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-popover effect-hud" />
              <div className={officialMenuScrollClass}>
                <OfficialMenuItems items={actions} />
              </div>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
}

/**
 * Live pin c593 `hm`/`mm` + ca80 `u4`: Terminal / Changes / Preview ghost icon-only.
 * `Ag` = CommandLinePrompt / ChangesPlusMinus / Play. Overflow Views stays YR.
 */
function OfficialTitlebarPaneButtons({
  onViewSelect,
  openViews,
  sessionRef,
}: {
  canOpenFiles?: boolean;
  onViewSelect?: (view: OfficialViewPane) => void;
  openViews?: readonly OfficialViewPane[];
  sessionRef: OfficialSessionRef;
}) {
  const text = useI18nText(VIEWS_MENU_MESSAGES);
  const shortcutContext = getOfficialSessionShortcutContext();
  const isLocal = sessionRef.type === "local";
  const isOpen = (view: OfficialViewPane) => Boolean(openViews?.includes(view));
  const buttons: Array<{
    icon: string;
    label: string;
    pane: OfficialViewPane;
    shortcut?: string;
  }> = [
    ...(isLocal
      ? [{
          icon: "CommandLinePrompt",
          label: text.terminal,
          pane: "terminal" as const,
          shortcut: officialSessionShortcutKeyForCommand("toggleTerminal", shortcutContext.isClaudeApp),
        }]
      : []),
    {
      icon: "ChangesPlusMinus",
      label: text.diff,
      pane: "diff",
      shortcut: officialSessionShortcutKeyForCommand("toggleDiff", shortcutContext.isClaudeApp),
    },
    ...(isLocal
      ? [{
          icon: "Play",
          label: text.preview,
          pane: "preview" as const,
          shortcut: officialSessionShortcutKeyForCommand("togglePreview", shortcutContext.isClaudeApp),
        }]
      : []),
  ];
  return (
    <div className="flex items-center gap-1 empty:hidden">
      {buttons.map((button) => (
        <OfficialButton
          ariaLabel={button.label}
          customSize={18}
          icon={button.icon}
          key={button.pane}
          onClick={() => onViewSelect?.(button.pane)}
          preferFont
          pressed={isOpen(button.pane)}
          tooltipSide="bottom"
          tooltipShortcut={button.shortcut}
          variant="ghost"
        />
      ))}
    </div>
  );
}

function OfficialViewsButton({
  activeView,
  canOpenFiles = false,
  canOpenFramebuffer = false,
  canOpenRuns = false,
  hasPlan = false,
  hasRunningTasks = false,
  onViewSelect,
  openViews,
  previewServerId: _previewServerId,
  session,
  sessionRef,
  taskCount = 0,
}: {
  activeView?: OfficialViewPane;
  /** Official p4 `A_`/`W` — Files (not VC ccd_file_browser). */
  canOpenFiles?: boolean;
  /** Official YR Screen — T && (sources || already open framebuffer). */
  canOpenFramebuffer?: boolean;
  /** Official ES — Runs gated on scheduledTaskId / remote trigger. */
  canOpenRuns?: boolean;
  hasPlan?: boolean;
  hasRunningTasks?: boolean;
  onViewSelect?: (view: OfficialViewPane) => void;
  openViews?: readonly OfficialViewPane[];
  previewServerId?: string | null;
  session?: SessionSummary | null;
  sessionRef?: OfficialSessionRef | null;
  taskCount?: number;
}) {
  const text = useI18nText(VIEWS_MENU_MESSAGES);
  const paneChrome = useI18nText(SIDE_PANE_CHROME_MESSAGES);
  // Official toggleSidePane membership via ir(tileLayout).has — multi-tile stack keeps tasks open under subagent.
  const isOpen = (view: OfficialViewPane) => openViews ? openViews.includes(view) : activeView === view;
  const shortcutContext = getOfficialSessionShortcutContext();
  /**
   * Official xN (c119): Claude App + not local/bridge → SRfvtxpa+5.
   * Do not invent sink_planter_vase / ccr_cardboard_truck remote enablement.
   */
  // Official xN: isLocal:"local"===t?.type — draft t undefined is NOT local.
  const isLocal = sessionRef?.type === "local";
  const isBridge = sessionRef?.type === "bridge";
  const localOnlyTooltip = shortcutContext.isClaudeApp && !isLocal && !isBridge
    ? paneChrome.onlyAvailableInLocalSessions
    : undefined;
  /**
   * Live pin ca80 `p4` + cf74 `ZT`: Files / Plan (gated) / Background tasks (D||E||open)
   * then separator + Keep computer awake (`kp` / CapHOIPauL).
   * Terminal / Changes / Preview stay `hm` inline. Do not invent simulator rows.
   */
  const showFiles = canOpenFiles || isOpen("file") || Boolean(localOnlyTooltip);
  const showTasks = hasRunningTasks || isOpen("tasks");
  const showPlan = hasPlan || isOpen("plan") || Boolean(sessionRef);
  const keepAwake = officialKpKeepAwake(sessionRef, session);
  // Live pin ca80 `p4`: overflow omits Terminal / Changes / Preview (those are `hm` inline).
  const items: OfficialDropdownItem[] = [
    ...(showFiles
      ? [{
          icon: "Folder1",
          label: text.files,
          checked: canOpenFiles && isOpen("file"),
          checkedRole: "checkbox",
          shortcut: officialSessionShortcutKeyForCommand("toggleBrowser", shortcutContext.isClaudeApp),
          disabled: !canOpenFiles,
          tooltip: canOpenFiles ? undefined : localOnlyTooltip,
          onSelect: canOpenFiles ? () => onViewSelect?.("file") : undefined,
        } satisfies OfficialDropdownItem]
      : []),
    ...(showTasks
      ? [{
          icon: "Blocks",
          label: text.backgroundTasks,
          checked: isOpen("tasks"),
          checkedRole: "checkbox",
          status: (hasRunningTasks || taskCount > 0) && !isOpen("tasks"),
          onSelect: () => onViewSelect?.("tasks"),
        } satisfies OfficialDropdownItem]
      : []),
    ...(showPlan
      ? [{
          icon: "CheckList",
          label: text.plan,
          checked: isOpen("plan"),
          checkedRole: "checkbox",
          onSelect: () => onViewSelect?.("plan"),
        } satisfies OfficialDropdownItem]
      : []),
    ...(canOpenRuns
      ? [{
          icon: "ClockTimeslot",
          label: text.runs,
          checked: isOpen("runs"),
          checkedRole: "checkbox",
          onSelect: () => onViewSelect?.("runs"),
        } satisfies OfficialDropdownItem]
      : []),
    ...(canOpenFramebuffer
      ? [{
          icon: "SystemComputerLaptopMacbook",
          label: text.screen,
          checked: isOpen("framebuffer"),
          checkedRole: "checkbox",
          onSelect: () => onViewSelect?.("framebuffer"),
        } satisfies OfficialDropdownItem]
      : []),
  ];
  const extraSections = keepAwake
    ? [{ items: [officialKeepAwakeMenuItem(text, keepAwake)] }]
    : undefined;
  return (
    <OfficialDropdownButton
      align="end"
      ariaLabel={text.views}
      customSize={18}
      dataTestId="epitaxy-views-overflow"
      extraSections={extraSections}
      icon="DotsVertical"
      items={items}
      preferFont
      revealChevron="never"
      size="base"
      tooltip={null}
    />
  );
}

function OfficialMenuItems({ items }: { items: OfficialDropdownItem[] }) {
  // Official YT: radio check column only when some item is radio (not checkbox + Switch).
  const hasChecks = items.some((item) => item.checked !== undefined && item.checkedRole !== "checkbox" && !item.trailing);
  return (
    <>
      {items.map((item, index) => (
        <MenuItemFragment hasChecks={hasChecks} item={item} key={index} />
      ))}
    </>
  );
}

function MenuItemFragment({ hasChecks, item }: { hasChecks: boolean; item: OfficialDropdownItem }) {
  if (item.type === "separator") return <OfficialMenuSeparator />;
  if (item.type === "section-header") return <OfficialMenuHeader>{item.label}</OfficialMenuHeader>;
  if (item.type === "loading") return <OfficialLoadingMenuItem item={item} />;
  if (item.items?.length || item.type === "submenu") return <OfficialSubmenuItem hasChecks={hasChecks} item={item} />;

  const hasIcon = Boolean(item.icon);
  const trailingOnly = item.label == null && Boolean(item.trailing);
  const checkRole = item.checked === undefined
    ? undefined
    : (item.checkedRole ?? "radio");
  const checkProps = checkRole === undefined
    ? {}
    : { "aria-checked": item.checked, role: checkRole === "checkbox" ? "menuitemcheckbox" as const : "menuitemradio" as const };
  const row = (
    <Menu.Item
      className={[officialMenuItemBaseClass, hasIcon ? "gap-g6" : "gap-g3", item.variant === "danger" ? "text-danger" : ""].join(" ")}
      disabled={item.disabled}
      onClick={item.onSelect}
      closeOnClick={item.keepOpen || item.closeOnClick === false ? false : undefined}
      style={item.variant === "danger" ? { "--menu-item-color": "var(--cds-text-danger, var(--danger))" } as CSSProperties : undefined}
      {...checkProps}
    >
      {item.icon ? (
        <span className={["relative flex items-center justify-center size-[14px] shrink-0", item.checked ? "text-[var(--accent)]" : ""].join(" ")} style={officialMenuIconStyle}>
          <Icon name={item.icon} size="sm" bold={item.checked} />
        </span>
      ) : null}
      {trailingOnly ? null : <OfficialMenuItemLabel item={item} />}
      {hasChecks && !trailingOnly ? (
        <span className="flex items-center justify-center size-[16px] shrink-0 ml-[6px] text-[var(--accent)]" style={officialMenuIconStyle}>
          {item.checked ? <Icon name="CheckSelection" size="sm" /> : null}
        </span>
      ) : null}
      {renderMenuItemStatus(item.status)}
      {item.shortcut ? <OfficialShortcut keys={item.shortcut} /> : null}
      {item.suffix}
      {item.trailing}
    </Menu.Item>
  );
  return (
    <>
      {item.separatorBefore ? <OfficialMenuSeparator /> : null}
      {item.tooltip ? (
        <OfficialTooltip delayDuration={400} tooltipContent={item.tooltip}>
          <span className="flex [&>*]:w-full">{row}</span>
        </OfficialTooltip>
      ) : row}
    </>
  );
}

function OfficialSubmenuItem({ hasChecks, item }: { hasChecks: boolean; item: OfficialDropdownItem }) {
  const hasIcon = Boolean(item.icon);
  const [open, setOpen] = useState(false);
  return (
    <>
      {item.separatorBefore ? <OfficialMenuSeparator /> : null}
      <Menu.SubmenuRoot open={open} onOpenChange={(nextOpen) => setOpen(nextOpen)}>
        <Menu.SubmenuTrigger
          className={[officialMenuItemBaseClass, hasIcon ? "gap-g6" : "gap-g3"].join(" ")}
          delay={0}
          disabled={item.disabled}
          onClick={() => setOpen(true)}
          onPointerEnter={() => setOpen(true)}
          openOnHover
        >
          {item.icon ? (
            <span className={["relative flex items-center justify-center size-[14px] shrink-0", item.checked ? "text-[var(--accent)]" : ""].join(" ")} style={officialMenuIconStyle}>
              <Icon name={item.icon} size="sm" bold={item.checked} />
            </span>
          ) : null}
          <OfficialMenuItemLabel item={item} />
          {hasChecks ? <span className="size-[16px] shrink-0 ml-[6px]" /> : null}
          {renderMenuItemStatus(item.status)}
          {item.shortcut ? <OfficialShortcut keys={item.shortcut} /> : null}
          {item.suffix}
          {item.trailing}
          <span className="flex items-center justify-center size-[16px] shrink-0 ml-[6px] text-t6" style={officialMenuIconStyle}>
            <Icon name="ChevronRightMedium" size="sm" />
          </span>
        </Menu.SubmenuTrigger>
        <Menu.Portal>
          <Menu.Positioner align="start" className="epitaxy-root z-[70]" side="right" sideOffset={4}>
            <Menu.Popup className={officialMenuPopupClass} data-cds="Menu">
              <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-popover effect-hud" />
              <div className={officialMenuScrollClass}>
                <Menu.Group className="flex flex-col">
                  <OfficialMenuItems items={item.items ?? []} />
                  {item.submenuFooterItems?.length ? (
                    <>
                      <OfficialMenuSeparator />
                      <OfficialMenuItems items={item.submenuFooterItems} />
                    </>
                  ) : null}
                </Menu.Group>
              </div>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.SubmenuRoot>
    </>
  );
}

function OfficialLoadingMenuItem({ item }: { item: OfficialDropdownItem }) {
  return (
    <>
      {item.separatorBefore ? <OfficialMenuSeparator /> : null}
      <Menu.Item className={[officialMenuItemBaseClass, "gap-g6"].join(" ")} disabled>
        <span className="relative flex items-center justify-center size-[14px] shrink-0" style={officialMenuIconStyle}>
          <Icon name={item.icon ?? "Spinner"} size="sm" />
        </span>
        <span className="flex-1 min-w-0 truncate pr-[16px]">{item.label || "Loading…"}</span>
      </Menu.Item>
    </>
  );
}

function OfficialMenuItemLabel({ item }: { item: OfficialDropdownItem }) {
  if (!item.subtitle) return <span className="flex-1 min-w-0 truncate pr-[16px]">{item.label}</span>;
  return (
    <span className="flex flex-1 min-w-0 flex-col pr-[16px]">
      <span className="truncate">{item.label}</span>
      <span className="truncate text-footnote text-t6">{item.subtitle}</span>
    </span>
  );
}

function renderMenuItemStatus(status: ReactNode | boolean) {
  if (status === true) {
    return <span aria-hidden="true" className="size-[6px] shrink-0 rounded-full bg-[var(--accent)]" />;
  }
  return status || null;
}

function OfficialShortcut({ keys }: { keys: string | string[] }) {
  const normalizedKeys = Array.isArray(keys) ? keys.join(" ") : keys;
  if (/^[1-9]$/.test(normalizedKeys)) {
    return <span className="shrink-0 pl-p2 text-body text-t6 tabular-nums">{normalizedKeys}</span>;
  }

  const chords = Array.isArray(keys) ? keys : [keys];
  return (
    <span className="flex items-center gap-px shrink-0 text-footnote text-t6">
      {chords.map((chord, index) => (
        <kbd className="font-ui flex items-center justify-center h-[16px]" key={`${chord}-${index}`}>
          {formatKeyboardShortcut(chord)}
        </kbd>
      ))}
    </span>
  );
}

function OfficialMenuHeader({ children, triggerKey }: { children: ReactNode; triggerKey?: ReactNode | string | string[] }) {
  return (
    <div className="flex items-center gap-g3 px-p8 py-p2 min-h-[20px] text-footnote text-t6" role="presentation">
      <span className="flex-1 pr-p8">{children}</span>
      {typeof triggerKey === "string" || Array.isArray(triggerKey) ? <OfficialTriggerShortcut keys={triggerKey} /> : triggerKey}
    </div>
  );
}

function OfficialTriggerShortcut({ keys }: { keys: string | string[] }) {
  const normalizedKeys = Array.isArray(keys) ? keys.join(" ") : keys;
  return (
    <span className="inline-flex items-center gap-g3">
      {shortcutChordGroups(normalizedKeys).map((group, groupIndex) => (
        <span className="contents" key={`${group.join("-")}-${groupIndex}`}>
          {groupIndex > 0 ? <span className="text-footnote opacity-60">then</span> : null}
          {group.map((key, keyIndex) => (
            <kbd className="inline-flex items-center justify-center h-h3 min-w-[var(--h3)] px-p3 rounded-r3 bg-t1 border border-[var(--border-default)] text-caption" key={`${key}-${keyIndex}`}>
              {key}
            </kbd>
          ))}
        </span>
      ))}
    </span>
  );
}

function shortcutChordGroups(keys: string) {
  return keys.trim().split(/\s+/).filter(Boolean).map(shortcutChordParts);
}

function shortcutChordParts(chord: string) {
  if (!chord.includes("+")) return Array.from(chord);

  const rawParts = chord.toLowerCase().split("+").filter(Boolean);
  const keyPart = rawParts.find((part) => !["alt", "cmd", "ctrl", "shift"].includes(part));
  const mac = isMacLikePlatform();
  const modifierOrder = mac ? ["shift", "alt", "cmd", "ctrl"] : ["cmd", "ctrl", "shift", "alt"];
  const modifierLabels: Record<string, string> = mac
    ? { alt: "⌥", cmd: "⌘", ctrl: "⌃", shift: "⇧" }
    : { alt: "Alt", cmd: "Ctrl", ctrl: "Ctrl", shift: "Shift" };
  const parts = modifierOrder
    .filter((part) => rawParts.includes(part))
    .map((part) => modifierLabels[part]);
  if (keyPart) parts.push(keyPart.toUpperCase());
  return parts;
}

function isMacLikePlatform() {
  if (typeof navigator === "undefined") return true;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}

function OfficialMenuSeparator() {
  return (
    <Menu.Separator className="relative h-h1">
      <div className="absolute left-[12px] right-[12px] top-1/2 h-px rounded-[1px] bg-t3" />
    </Menu.Separator>
  );
}

function useMemoizedDuplicateBasenames(recentFolders: OfficialComposerFolderRecent[]) {
  return useMemo(() => {
    const counts = new Map<string, number>();
    for (const recent of recentFolders) {
      const label = basename(recent.path);
      if (label) counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return new Set([...counts].filter(([, count]) => count > 1).map(([label]) => label));
  }, [recentFolders]);
}

function parentPath(value: string): string | null {
  const index = Math.max(value.lastIndexOf("/"), value.lastIndexOf("\\"));
  return index > 0 ? value.slice(0, index) : null;
}

function normalizeLabel(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function basename(value?: string): string | undefined {
  return value?.split(/[\\/]/).filter(Boolean).at(-1);
}
