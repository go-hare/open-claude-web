/**
 * Official rVe + NVe subset for Local Cowork (index-BELzQL5P ~96073 / ~96524).
 * Reads local coworkRateLimitStore messageLimits — not full account hc()/react-query bootstrap.
 * Action buttons (pVe upgrade/overage/admin request) intentionally residual.
 */

import type {
  CoworkMappedRateLimit,
  CoworkRateLimitWindow,
  CoworkRateLimitWindowStatus,
} from "./coworkRateLimitMap";

export type CoworkRateLimitWindowPick = {
  windowName: string | null;
  status: CoworkRateLimitWindow | null;
  surpassedThreshold: number | null;
};

/** Official rVe(windows). */
export function pickCoworkRateLimitWindow(
  windows: Record<string, CoworkRateLimitWindow> | undefined,
): CoworkRateLimitWindowPick {
  if (!windows) {
    return { windowName: null, status: null, surpassedThreshold: null };
  }
  const exceeded5h = windows["5h"]?.status === "exceeded_limit";
  const exceeded7d = windows["7d"]?.status === "exceeded_limit";
  const exceededOpus = windows["7d_opus"]?.status === "exceeded_limit";
  const exceededCowork = windows["7d_cowork"]?.status === "exceeded_limit";
  const exceededOverage = windows.overage?.status === "exceeded_limit";
  if ((exceeded7d || exceeded5h || exceededOpus || exceededCowork) && exceededOverage) {
    return {
      windowName: "overage",
      status: windows.overage ?? null,
      surpassedThreshold: windows.overage?.surpassed_threshold ?? null,
    };
  }
  const multi: { name: string; resetTime: number }[] = [];
  if (exceeded5h && typeof windows["5h"]?.resets_at === "number") {
    multi.push({ name: "5h", resetTime: windows["5h"].resets_at });
  }
  if (exceeded7d && typeof windows["7d"]?.resets_at === "number") {
    multi.push({ name: "7d", resetTime: windows["7d"].resets_at });
  }
  if (exceededOpus && typeof windows["7d_opus"]?.resets_at === "number") {
    multi.push({ name: "7d_opus", resetTime: windows["7d_opus"].resets_at });
  }
  if (exceededCowork && typeof windows["7d_cowork"]?.resets_at === "number") {
    multi.push({ name: "7d_cowork", resetTime: windows["7d_cowork"].resets_at });
  }
  if (multi.length > 1) {
    const pick = multi.reduce((a, b) => (b.resetTime > a.resetTime ? b : a));
    return {
      windowName: pick.name,
      status: windows[pick.name] ?? null,
      surpassedThreshold: null,
    };
  }
  if (exceededOpus) {
    return { windowName: "7d_opus", status: windows["7d_opus"] ?? null, surpassedThreshold: null };
  }
  if (exceededCowork) {
    return {
      windowName: "7d_cowork",
      status: windows["7d_cowork"] ?? null,
      surpassedThreshold: null,
    };
  }
  if (exceeded7d) {
    return { windowName: "7d", status: windows["7d"] ?? null, surpassedThreshold: null };
  }
  if (exceeded5h) {
    return { windowName: "5h", status: windows["5h"] ?? null, surpassedThreshold: null };
  }
  if (windows["5h"]?.status === "approaching_limit") {
    return {
      windowName: "5h",
      status: windows["5h"],
      surpassedThreshold: windows["5h"]?.surpassed_threshold ?? null,
    };
  }
  if (windows["7d"]?.status === "approaching_limit") {
    return {
      windowName: "7d",
      status: windows["7d"],
      surpassedThreshold: windows["7d"]?.surpassed_threshold ?? null,
    };
  }
  if (windows.overage?.status === "approaching_limit") {
    return {
      windowName: "overage",
      status: windows.overage,
      surpassedThreshold: windows.overage?.surpassed_threshold ?? null,
    };
  }
  return { windowName: null, status: null, surpassedThreshold: null };
}

export type CoworkRateLimitBannerKind = "exceeded" | "approaching" | null;

export type CoworkRateLimitBannerModel = {
  kind: Exclude<CoworkRateLimitBannerKind, null>;
  messageLimit: Exclude<CoworkMappedRateLimit, { type: "within_limit" }>;
  windowName: string | null;
  resetsAt: number | null;
  surpassedThreshold: number | null;
  /** Official EVe/IVe primary body strings (no intl ids — English official defaults). */
  body: string;
  dangerText: boolean;
  minimalUi: boolean;
};

function formatTimeSimple(resetsAtSec: number): string {
  try {
    return new Date(resetsAtSec * 1000).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function formatWeekday(resetsAtSec: number): string {
  try {
    return new Date(resetsAtSec * 1000).toLocaleDateString(undefined, { weekday: "long" });
  } catch {
    return "";
  }
}

function formatPercent(value: number): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "percent", maximumFractionDigits: 0 }).format(
      value,
    );
  } catch {
    return `${Math.round(value * 100)}%`;
  }
}

function exceededBody(
  windowName: string | null,
  resetsAt: number | null,
): string {
  if (!resetsAt) {
    return "You've reached your usage limit.";
  }
  const time = formatTimeSimple(resetsAt);
  if (windowName === "5h") {
    return `You've hit your session limit ∙ Resets at ${time}`;
  }
  if (windowName === "7d" || windowName === "7d_opus" || windowName === "7d_sonnet" || windowName === "7d_cowork") {
    const day = formatWeekday(resetsAt);
    if (windowName === "7d_opus") {
      return `You've hit your Opus limit ∙ Resets ${day} at ${time}`;
    }
    if (windowName === "7d_sonnet") {
      return `You've hit your Sonnet limit ∙ Resets ${day} at ${time}`;
    }
    if (windowName === "7d_cowork") {
      return `You've hit your cowork limit ∙ Resets ${day} at ${time}`;
    }
    return `You've hit your weekly limit ∙ Resets ${day} at ${time}`;
  }
  return `Usage limit reached ∙ Resets ${time}`;
}

function approachingBody(
  windowName: string | null,
  resetsAt: number | null,
  surpassedThreshold: number | null,
): string {
  if (windowName === "5h") {
    if (typeof surpassedThreshold === "number") {
      return `You've used ${formatPercent(surpassedThreshold)} of your session limit`;
    }
    return "Approaching session limit";
  }
  if (windowName === "7d") {
    if (typeof surpassedThreshold === "number") {
      return `You've used ${formatPercent(surpassedThreshold)} of your weekly limit`;
    }
    return "Approaching weekly limit";
  }
  if (windowName === "overage") {
    if (typeof surpassedThreshold === "number") {
      return `You've used ${formatPercent(surpassedThreshold)} of your extra usage`;
    }
    return "You're almost out of extra usage";
  }
  if (typeof surpassedThreshold === "number" && resetsAt) {
    return `You've used ${formatPercent(surpassedThreshold)} of your usage ∙ Resets at ${formatTimeSimple(resetsAt)}`;
  }
  if (typeof surpassedThreshold === "number") {
    return `You've used ${formatPercent(surpassedThreshold)} of your usage`;
  }
  return "You're almost out of usage";
}

/**
 * Official NVe branch subset for LocalAgentMode:
 * - exceeded_limit → EVe-style body (no pVe action invent)
 * - approaching_limit → IVe-style body
 * Skips overage admin / seat / chicory_no_free_tier / full hc() gates.
 */
export function buildCoworkRateLimitBannerModel(
  limit: CoworkMappedRateLimit | undefined | null,
  nowSec: number = Date.now() / 1000,
): CoworkRateLimitBannerModel | null {
  if (!limit || limit.type === "within_limit") return null;
  // Official NVe auto-clear gate (~96541): expired resetsAt → no banner.
  // Use injectable nowSec so unit tests / SSR stay deterministic.
  if (limit.resetsAt !== undefined && limit.resetsAt <= nowSec) {
    return null;
  }
  if (
    limit.type === "exceeded_limit" &&
    limit.resetsAt === undefined &&
    !limit.overageDisabledReason
  ) {
    // Official: treat as cleared when no reset and no overage reason.
    return null;
  }
  const pick = pickCoworkRateLimitWindow(limit.windows);
  const resetsAt =
    pick.status?.resets_at ??
    (typeof limit.resetsAt === "number" ? limit.resetsAt : null);
  if (resetsAt !== null && resetsAt < nowSec && limit.type === "exceeded_limit") {
    return null;
  }
  if (limit.type === "exceeded_limit") {
    if (!resetsAt) return null;
    return {
      kind: "exceeded",
      messageLimit: limit,
      windowName: pick.windowName,
      resetsAt,
      surpassedThreshold: pick.surpassedThreshold,
      body: exceededBody(pick.windowName, resetsAt),
      dangerText: true,
      minimalUi: true,
    };
  }
  // approaching_limit
  return {
    kind: "approaching",
    messageLimit: limit,
    windowName: pick.windowName,
    resetsAt,
    surpassedThreshold: pick.surpassedThreshold,
    body: approachingBody(pick.windowName, resetsAt, pick.surpassedThreshold),
    dangerText: false,
    minimalUi: true,
  };
}

export type { CoworkRateLimitWindowStatus };
