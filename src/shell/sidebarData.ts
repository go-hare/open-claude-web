import type { FrameMode } from "../stores/frameStore";
import { scheduledTaskIndexPath as coworkScheduledTaskIndexPath } from "../features/cowork/scheduled/scheduledPaths";
import { scheduledTaskIndexPath as codeScheduledTaskIndexPath } from "../features/scheduled/scheduledPaths";

export type SidebarNavItem = {
  key: string;
  label: string;
  icon: string;
  href: string;
  shortcut?: string;
  visibleIn: FrameMode[];
};

export const newSessionItemByMode: Record<FrameMode, SidebarNavItem> = {
  cowork: {
    key: "new-session",
    label: "新任务",
    icon: "Add",
    href: "/task/new",
    visibleIn: ["cowork"],
  },
  code: {
    key: "new-session",
    label: "新会话",
    icon: "Add",
    href: "/code",
    shortcut: "⌘N",
    visibleIn: ["code"],
  },
};

export const primaryNavItems: SidebarNavItem[] = [
  {
    key: "projects",
    label: "项目",
    icon: "Projects",
    href: "/projects",
    visibleIn: ["cowork"],
  },
  /**
   * Official desktop Artifacts residual:
   * - nav label "Artifacts" (eW5eoWkxy3)
   * - chrome often href `/artifacts/my`, desktop host library is `_K=/cowork-artifact`
   * Product uses the desktop residual path so DesktopFrame mode stays cowork.
   */
  {
    key: "artifacts",
    label: "Artifacts",
    icon: "Artifacts",
    href: "/cowork-artifact",
    visibleIn: ["cowork"],
  },
  /**
   * Official shared-21 `cY` `{id:"scheduled", gate:"scheduled", modes:["cowork","code"]}`.
   * Code default pin set `nJ` drops scheduled unless `hasCodeRoutines` (`w2`/`D2`).
   * Live 2.31226.1 Code chrome: Customize pinned; scheduled overflow as Routines.
   * Do not pin it on Code primary nav by default.
   */
  {
    key: "scheduled",
    label: "定时任务",
    icon: "Clock",
    href: coworkScheduledTaskIndexPath,
    visibleIn: ["cowork", "code"],
  },
  {
    key: "customize",
    label: "自定义",
    icon: "Tool",
    href: "/customize",
    visibleIn: ["cowork", "code"],
  },
];

/** Overflow extras (none). Code More flyout fills from unpinned primary items + Edit sidebar. */
export const moreNavItems: SidebarNavItem[] = [];

export function primaryNavItemsForMode(mode: FrameMode) {
  return primaryNavItems
    .filter((item) => item.visibleIn.includes(mode))
    .map((item) => item.key === "scheduled" ? {
      ...item,
      href: mode === "code" ? codeScheduledTaskIndexPath : coworkScheduledTaskIndexPath,
    } : item);
}

/**
 * Official `D2` / `nJ` when `navPinnedIds` is null.
 * Code `nJ` catalog includes scheduled, but `w2`/`hasCodeRoutines` false → delete scheduled
 * from the default pin set (overflow as Routines). Product: customize inline only.
 */
export function defaultPinnedNavKeys(mode: FrameMode, hasCodeRoutines = false): string[] {
  if (mode === "code") return hasCodeRoutines ? ["customize", "scheduled"] : ["customize"];
  return primaryNavItems.filter((item) => item.visibleIn.includes(mode)).map((item) => item.key);
}

/** Official w2 `s.some(e=>e.enabled)` — CCD / hd list. */
export function officialHasCodeRoutines(tasks: ReadonlyArray<{ enabled?: boolean }>): boolean {
  return tasks.some((task) => task.enabled === true);
}

/**
 * Official shared-1 `aN` / w2 `on(e)`: session-bound one-shot with no env/runner.
 * Cloud `/v1/code/triggers` rows matching this are excluded from hasCodeRoutines.
 */
export function officialIsSessionBoundOneShotTrigger(trigger: {
  job_config?: { ccr?: { environment_id?: unknown; self_hosted_runner_pool_id?: unknown } };
  persistent_session_id?: unknown;
  run_once_at?: unknown;
}): boolean {
  const runOnce = Boolean(trigger.run_once_at && trigger.persistent_session_id);
  if (!runOnce) return false;
  const ccr = trigger.job_config?.ccr;
  const environmentId = typeof ccr?.environment_id === "string" ? ccr.environment_id : "";
  const runnerPoolId = typeof ccr?.self_hosted_runner_pool_id === "string" ? ccr.self_hosted_runner_pool_id : "";
  return environmentId.length === 0 && runnerPoolId.length === 0;
}

/**
 * Official w2 cloud half: `Ln({excludeTags:["cowork-scheduled"]})` then
 * `e.enabled && !aN(e)`. Fetch is `yM`/`LN` in officialCodeTriggers.ts.
 */
export function officialHasEnabledCloudTriggers(
  triggers: ReadonlyArray<{
    enabled?: boolean;
    job_config?: { ccr?: { environment_id?: unknown; self_hosted_runner_pool_id?: unknown } };
    persistent_session_id?: unknown;
    run_once_at?: unknown;
  }>,
): boolean {
  return triggers.some((trigger) => trigger.enabled === true && !officialIsSessionBoundOneShotTrigger(trigger));
}

/** Official w2 `l`: CCD enabled OR cloud enabled (not session one-shot). */
export function officialW2LiveHasCodeRoutines(
  ccdTasks: ReadonlyArray<{ enabled?: boolean }>,
  cloudTriggers: ReadonlyArray<{
    enabled?: boolean;
    job_config?: { ccr?: { environment_id?: unknown; self_hosted_runner_pool_id?: unknown } };
    persistent_session_id?: unknown;
    run_once_at?: unknown;
  }> = [],
): boolean {
  return officialHasCodeRoutines(ccdTasks) || officialHasEnabledCloudTriggers(cloudTriggers);
}

/** Official Yg: persisted `navHasCodeRoutinesByOrg[orgId]===true`. */
export function officialPersistedHasCodeRoutines(
  byOrg: Record<string, true> | Record<string, boolean> | undefined,
  orgId: string | null | undefined,
): boolean {
  return typeof orgId === "string" && orgId.length > 0 && byOrg?.[orgId] === true;
}

/**
 * Official w2 return: `l || d && !p` — live CCD/cloud, else last persist until settle.
 * Cloud list is official GET `/v1/code/triggers`; 3p empty list is CCD-only, not invented rows.
 */
export function officialW2HasCodeRoutines(live: boolean, persisted: boolean, settled: boolean): boolean {
  return live || (persisted && !settled);
}

/**
 * Official D2: persisted pins that include keys from another mode (cowork projects, etc.)
 * are treated as the default pin set for this mode — not a user pin list.
 * Code leftover `scheduled` on the nJ default list overflows unless `hasCodeRoutines`.
 */
export function effectivePinnedNavKeys(
  mode: FrameMode,
  storedPins: string[] | null,
  configurableKeys: readonly string[],
  hasCodeRoutines = false,
): string[] {
  const defaults = defaultPinnedNavKeys(mode, hasCodeRoutines);
  if (storedPins === null) return defaults;
  const storedIsCrossMode = storedPins.some((key) => !configurableKeys.includes(key));
  if (storedIsCrossMode) return defaults;
  if (mode === "code" && storedPins.includes("scheduled") && !hasCodeRoutines) {
    const withoutScheduled = storedPins.filter((key) => key !== "scheduled");
    const matchesDefaultWithoutScheduled =
      withoutScheduled.length === defaults.length && defaults.every((key) => withoutScheduled.includes(key));
    if (matchesDefaultWithoutScheduled) return defaults;
  }
  return storedPins;
}
