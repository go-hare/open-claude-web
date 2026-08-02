/**
 * Code home draft Mode residual (c11959232-h_zsw3wI.js).
 *
 * Official:
 *   [$s,Us]=fc("cc-landing-draft-permission-mode","acceptEdits")
 *   [Qs,Xs]=fc("epitaxy-folder-permission-mode",Rm,{scope:"account"})
 *   draft rn = en ?? Zs ?? Gs ?? $s
 *     en = in-session override
 *     Zs = folder map[cwd] (worktree suffix stripped)
 *     Gs = getDefaultPermissionMode(cwd)
 *     $s = landing sticky (default acceptEdits)
 *   on change jn:
 *     tn(e) local override
 *     folder key → Xs({...map,[cwd]:e})  (incl. auto/bypass)
 *     !Sm(e) → Us(e) landing sticky  (Sm = auto|bypass — NOT written to landing)
 *   epitaxy:reset-draft: zo(uE)+remount only — does NOT clear folder/landing prefs
 *
 * Product: localStorage keys match official dual-write residual
 *   `persisted.cc-landing-draft-permission-mode`
 *   `persisted.epitaxy-folder-permission-mode`
 * plus in-memory override for the current mount. No invent OAuth/account uuid scope —
 * folder map is global like official when account uuid missing (c=!a||uuid).
 */
import type { EffortLevel, PermissionMode } from "../../adapters/desktopBridge";
import { normalizePermissionMode } from "./composer/options";

const LANDING_KEY = "persisted.cc-landing-draft-permission-mode";
const FOLDER_KEY = "persisted.epitaxy-folder-permission-mode";
/** Official fc default for landing sticky. */
const LANDING_DEFAULT: PermissionMode = "acceptEdits";

export type CodeDraftComposerState = {
  /** In-mount override (official `en`) — null after remount until user picks again. */
  overrideMode: PermissionMode | null;
  model: string | null;
  effort: EffortLevel | null;
  ultracode: boolean;
};

const empty: CodeDraftComposerState = {
  overrideMode: null,
  model: null,
  effort: null,
  ultracode: false,
};

let draft: CodeDraftComposerState = { ...empty };

/** Official Sm — auto/bypass skip landing sticky write. */
export function isSmPermissionMode(mode: string | null | undefined): boolean {
  return mode === "auto" || mode === "bypassPermissions" || mode === "bypass";
}

/** Official Ys: strip worktree suffix before folder-map key. */
export function folderPermissionModeKey(cwd: string | null | undefined): string | null {
  if (!cwd) return null;
  return cwd.replace(/\/\.claude\/worktrees\/[^/]+$/, "") || null;
}

/** Prefer globalThis.localStorage so Node tests can stub without window. */
function browserStorage(): Storage | null {
  try {
    const g = globalThis as { localStorage?: Storage };
    return g.localStorage ?? null;
  } catch {
    return null;
  }
}

function readLandingSticky(): PermissionMode {
  const ls = browserStorage();
  if (!ls) return LANDING_DEFAULT;
  try {
    const raw = ls.getItem(LANDING_KEY);
    if (raw == null || raw === "") return LANDING_DEFAULT;
    // Mantine-style JSON or plain string.
    const parsed = safeJsonParse(raw);
    const value = typeof parsed === "string" ? parsed : raw;
    return normalizePermissionMode(value);
  } catch {
    return LANDING_DEFAULT;
  }
}

function writeLandingSticky(mode: PermissionMode) {
  const ls = browserStorage();
  if (!ls) return;
  try {
    ls.setItem(LANDING_KEY, JSON.stringify(mode));
  } catch {
    /* ignore quota */
  }
}

function readFolderMap(): Record<string, PermissionMode> {
  const ls = browserStorage();
  if (!ls) return {};
  try {
    const raw = ls.getItem(FOLDER_KEY);
    if (!raw) return {};
    const parsed = safeJsonParse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, PermissionMode> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string" && v) out[k] = normalizePermissionMode(v);
    }
    return out;
  } catch {
    return {};
  }
}

function writeFolderMap(map: Record<string, PermissionMode>) {
  const ls = browserStorage();
  if (!ls) return;
  try {
    ls.setItem(FOLDER_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

export function getFolderPermissionMode(cwd: string | null | undefined): PermissionMode | undefined {
  const key = folderPermissionModeKey(cwd);
  if (!key) return undefined;
  return readFolderMap()[key];
}

export function getLandingDraftPermissionMode(): PermissionMode {
  return readLandingSticky();
}

/**
 * Official draft rn (no session): en ?? Zs ?? Gs ?? $s
 * Pass hostDefaultMode as Gs when resolved; null keeps landing.
 */
export function resolveDraftPermissionMode(opts: {
  cwd?: string | null;
  hostDefaultMode?: string | null;
  /** Prefer live override (en) when still on this mount. */
  preferOverride?: boolean;
}): PermissionMode {
  const override = opts.preferOverride !== false ? draft.overrideMode : null;
  if (override) return normalizePermissionMode(override);
  const folder = getFolderPermissionMode(opts.cwd);
  if (folder) return folder;
  if (opts.hostDefaultMode != null && opts.hostDefaultMode !== "") {
    return normalizePermissionMode(opts.hostDefaultMode);
  }
  return getLandingDraftPermissionMode();
}

/**
 * Official jn Mode pill change (draft or session surface).
 * - Always set in-mount override (en)
 * - Persist folder map when cwd known (incl. auto/bypass)
 * - Persist landing sticky only when !Sm(mode)
 */
export function setDraftPermissionMode(
  mode: PermissionMode,
  opts?: { cwd?: string | null; skipPersist?: boolean },
): PermissionMode {
  const next = normalizePermissionMode(mode);
  draft = { ...draft, overrideMode: next };
  if (opts?.skipPersist) return next;
  const folderKey = folderPermissionModeKey(opts?.cwd);
  if (folderKey) {
    const map = readFolderMap();
    map[folderKey] = next;
    writeFolderMap(map);
  }
  if (!isSmPermissionMode(next)) {
    writeLandingSticky(next);
  }
  return next;
}

/** @deprecated Prefer resolveDraftPermissionMode / setDraftPermissionMode. */
export function getCodeDraftComposerState(): CodeDraftComposerState & {
  cwd: string | null;
  permissionMode: PermissionMode | null;
  permissionModeUserSet: boolean;
} {
  return {
    ...draft,
    cwd: null,
    permissionMode: draft.overrideMode,
    permissionModeUserSet: draft.overrideMode != null,
  };
}

/** Seed path no longer invents userSet; host default only used when no folder/landing. */
export function seedCodeDraftPermissionMode(_cwd: string | null | undefined, _mode: PermissionMode) {
  // Official does not write host default into sticky on seed — only read Gs into rn.
  return getCodeDraftComposerState();
}

export function setCodeDraftPermissionMode(
  mode: PermissionMode,
  opts?: { userSet?: boolean; cwd?: string | null; skipPersist?: boolean },
) {
  setDraftPermissionMode(mode, { cwd: opts?.cwd, skipPersist: opts?.skipPersist });
  return getCodeDraftComposerState();
}

export function setCodeDraftModel(model: string) {
  draft = { ...draft, model };
  return draft;
}

export function setCodeDraftEffort(effort: EffortLevel, ultracode = false) {
  draft = { ...draft, effort, ultracode };
  return draft;
}

/**
 * Official epitaxy:reset-draft with no session: zo(uE) + remount counter.
 * Clears in-mount override / prompt-adjacent draft fields only —
 * does NOT wipe folder map or landing sticky (that was the product bug).
 */
export function resetCodeDraftComposer() {
  draft = {
    ...empty,
    // Keep model/effort ephemeral clear on full reset of draft composer fields.
    model: null,
    effort: null,
    ultracode: false,
    overrideMode: null,
  };
  return draft;
}
