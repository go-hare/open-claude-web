/**
 * Official Code session shortcuts residual (c11959232 `ak` / `lk` / `ik` / `rk` / `ok`).
 * Footer reuses the same table for openMode/Model/Effort labels; session-level
 * dispatch (panes / cycleTranscriptMode / closePane) lives in useEpitaxyViewShortcuts.
 *
 * Honest wall: toggleSideChat (cmd+;) is matched but never dispatched — no Side chat product path.
 */
export type OfficialSessionShortcutCommand =
  | "togglePreview"
  | "toggleDiff"
  | "toggleTerminal"
  | "toggleBrowser"
  | "closePane"
  | "toggleSideChat"
  | "cycleTranscriptMode"
  | "openModeMenu"
  | "openModelMenu"
  | "openEffortMenu"
  | "toggleSelectionMode";

export type OfficialSessionShortcutBinding = {
  command: OfficialSessionShortcutCommand;
  key: string;
  code: string;
  when?: "isClaudeApp" | "!isClaudeApp";
};

/** Official `ak` table — order matches ion-dist c11959232. */
export const OFFICIAL_SESSION_SHORTCUT_BINDINGS = [
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
] as const satisfies readonly OfficialSessionShortcutBinding[];

export type OfficialSessionShortcutContext = {
  isClaudeApp: boolean;
  mac: boolean;
};

/** Official `$l()` / footer residual: Claude App shortcut layout follows macOS. */
export function getOfficialSessionShortcutContext(): OfficialSessionShortcutContext {
  const mac = isMacPlatform();
  return { isClaudeApp: mac, mac };
}

/**
 * Official `lk(event, { isClaudeApp })` — returns command or null.
 * Does not preventDefault; caller decides.
 */
export function matchOfficialSessionShortcut(
  event: KeyboardEvent,
  context: OfficialSessionShortcutContext = getOfficialSessionShortcutContext(),
): OfficialSessionShortcutCommand | null {
  for (const binding of OFFICIAL_SESSION_SHORTCUT_BINDINGS) {
    // `as const` omits optional `when` on some rows — read via residual Binding shape.
    const when = "when" in binding ? binding.when : undefined;
    if (
      event.code === binding.code
      && officialShortcutConditionMatches(when, context.isClaudeApp)
      && officialShortcutMatches(event, binding.key, context.mac)
    ) {
      return binding.command;
    }
  }
  return null;
}

/** Official `ck(command, isClaudeApp)` — first matching binding key for labels. */
export function officialSessionShortcutKeyForCommand(
  command: OfficialSessionShortcutCommand,
  isClaudeApp: boolean,
): string | undefined {
  for (const binding of OFFICIAL_SESSION_SHORTCUT_BINDINGS) {
    const when = "when" in binding ? binding.when : undefined;
    if (binding.command === command && officialShortcutConditionMatches(when, isClaudeApp)) {
      return binding.key;
    }
  }
  return undefined;
}

/** Official `ok` */
function officialShortcutConditionMatches(
  when: OfficialSessionShortcutBinding["when"] | undefined,
  isClaudeApp: boolean,
) {
  return when === "isClaudeApp" ? isClaudeApp : when !== "!isClaudeApp" || !isClaudeApp;
}

/** Official `ik` + `rk` */
function officialShortcutMatches(event: KeyboardEvent, spec: string, mac: boolean) {
  const parts = spec.split("+");
  const wantsCmd = parts.includes("cmd");
  const wantsCtrl = parts.includes("ctrl");
  // Official rk: meta only when mac+cmd; ctrl = wantsCtrl OR (!mac && cmd)
  return (
    event.metaKey === (mac && wantsCmd)
    && event.ctrlKey === (wantsCtrl || (!mac && wantsCmd))
    && event.shiftKey === parts.includes("shift")
    && event.altKey === parts.includes("alt")
  );
}

function isMacPlatform() {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}
