/**
 * Official jue / N1e+E1e (index-BELzQL5P ~55406, ~113478): map SDK rate_limit_info → messageLimits entry.
 */

const RATE_LIMIT_TYPE_KEY = {
  five_hour: "5h",
  seven_day: "7d",
  seven_day_opus: "7d_opus",
  seven_day_sonnet: "7d_sonnet",
  overage: "overage",
} as const;

const STATUS_MAP = {
  allowed: "within_limit",
  allowed_warning: "approaching_limit",
  rejected: "exceeded_limit",
} as const;

export type CoworkRateLimitWindowStatus =
  | "within_limit"
  | "approaching_limit"
  | "exceeded_limit";

export type CoworkRateLimitWindow = {
  resets_at: number;
  status: CoworkRateLimitWindowStatus;
  surpassed_threshold: number | null;
  utilization: number;
};

export type CoworkMappedRateLimit =
  | { overageInUse?: boolean; type: "within_limit" }
  | {
      conversationUuid?: string;
      overageDisabledReason?: string;
      overageInUse?: boolean;
      overageStatus?: CoworkRateLimitWindowStatus;
      remaining: number;
      representativeClaim?: string;
      resetsAt: number;
      type: "approaching_limit";
      windows: Record<string, CoworkRateLimitWindow>;
    }
  | {
      conversationUuid?: string;
      overageDisabledReason?: string;
      overageInUse?: boolean;
      overageStatus?: CoworkRateLimitWindowStatus;
      representativeClaim?: string;
      resetsAt?: number;
      type: "exceeded_limit";
      windows: Record<string, CoworkRateLimitWindow>;
    };

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function mapStatus(
  status: unknown,
): CoworkRateLimitWindowStatus | undefined {
  if (status === "allowed" || status === "allowed_warning" || status === "rejected") {
    return STATUS_MAP[status];
  }
  return undefined;
}

function representativeClaim(rateLimitType: unknown): string | undefined {
  if (rateLimitType === "five_hour" || rateLimitType === "overage") {
    return rateLimitType;
  }
  if (typeof rateLimitType === "string" && rateLimitType.startsWith("seven_day")) {
    return "seven_day";
  }
  return undefined;
}

/** Official jue(e.rate_limit_info). */
export function mapCoworkRateLimitInfo(info: unknown): CoworkMappedRateLimit {
  const e = asRecord(info);
  const overageInUse =
    typeof e.isUsingOverage === "boolean" ? e.isUsingOverage : undefined;
  const overageDisabledReason =
    typeof e.overageDisabledReason === "string"
      ? e.overageDisabledReason
      : undefined;

  if (e.status === "allowed") {
    return { type: "within_limit", overageInUse };
  }

  const windows: Record<string, CoworkRateLimitWindow> = {};
  const typeKey =
    typeof e.rateLimitType === "string" && e.rateLimitType in RATE_LIMIT_TYPE_KEY
      ? RATE_LIMIT_TYPE_KEY[e.rateLimitType as keyof typeof RATE_LIMIT_TYPE_KEY]
      : undefined;
  const mappedStatus = mapStatus(e.status);
  if (typeKey && typeof e.resetsAt === "number" && mappedStatus) {
    windows[typeKey] = {
      status: mappedStatus,
      resets_at: e.resetsAt,
      utilization: typeof e.utilization === "number" ? e.utilization : 0,
      surpassed_threshold:
        typeof e.surpassedThreshold === "number" ? e.surpassedThreshold : null,
    };
  }

  const overageKey =
    typeof e.rateLimitType === "string" && e.rateLimitType in RATE_LIMIT_TYPE_KEY
      ? RATE_LIMIT_TYPE_KEY[e.rateLimitType as keyof typeof RATE_LIMIT_TYPE_KEY]
      : undefined;
  if (
    e.overageStatus &&
    typeof e.overageResetsAt === "number" &&
    overageKey !== "overage"
  ) {
    const overageMapped = mapStatus(e.overageStatus);
    if (overageMapped) {
      windows.overage = {
        status: overageMapped,
        resets_at: e.overageResetsAt,
        utilization: 0,
        surpassed_threshold: null,
      };
    }
  }

  const claim = representativeClaim(e.rateLimitType);
  const overageStatus = mapStatus(e.overageStatus);

  if (e.status === "allowed_warning") {
    if (typeof e.resetsAt !== "number") {
      return { type: "within_limit", overageInUse };
    }
    return {
      type: "approaching_limit",
      resetsAt: e.resetsAt,
      remaining: 1,
      windows,
      representativeClaim: claim,
      overageDisabledReason,
      overageStatus,
      overageInUse,
    };
  }

  return {
    type: "exceeded_limit",
    resetsAt: typeof e.resetsAt === "number" ? e.resetsAt : undefined,
    windows,
    representativeClaim: claim,
    overageDisabledReason,
    overageStatus,
    overageInUse,
  };
}

export function extractRateLimitInfoFromMessageEvent(
  event: unknown,
): unknown | null {
  const raw = asRecord(event);
  if (raw.type === "rate_limit_event" && raw.rate_limit_info) {
    return raw.rate_limit_info;
  }
  if (raw.type === "message") {
    const message = asRecord(raw.message);
    if (message.type === "rate_limit_event" && message.rate_limit_info) {
      return message.rate_limit_info;
    }
  }
  return null;
}

/**
 * Official Tke.scanTranscript (index-BELzQL5P ~71042): walk transcript newest→oldest;
 * first rate_limit_event wins. Apply only when mapped is not within_limit and
 * resetsAt is defined and still in the future (unix seconds).
 * Used by seedTranscript / reseedTranscript / appendTail / transcript case.
 */
export function scanCoworkTranscriptRateLimit(
  messages: readonly unknown[],
  nowSec: number = Date.now() / 1000,
): CoworkMappedRateLimit | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const entry = asRecord(messages[i]);
    // Official scan matches top-level type; also accept message-envelope for bridge shapes.
    const info =
      entry.type === "rate_limit_event" && entry.rate_limit_info
        ? entry.rate_limit_info
        : extractRateLimitInfoFromMessageEvent(entry);
    if (!info) continue;
    const mapped = mapCoworkRateLimitInfo(info);
    if (mapped.type === "within_limit") return null;
    if (mapped.resetsAt === undefined || mapped.resetsAt < nowSec) return null;
    return mapped;
  }
  return null;
}
