/**
 * Residual c11959232 Qj composer gates (exact).
 *
 * disabled:
 *   "spawning"===Os || J || Ns>0 || Ga || xn
 *
 * submitDisabled:
 *   cn.isProcessingImages || mn.isUploading || bi
 *
 * busy (H) is separate — Stop chrome / Escape stop; does NOT lock editable or Te send.
 *
 * Os = F ? "active" : (Qt.isPending && 0===Ns ? "spawning" : "draft")
 * J  = X && !O   (expectedId/sessionId present, session meta not yet)
 * Ns = create mutate in-flight counter (Rs +1 around Qt.mutateAsync)
 * Ga = Boolean(exceededMessageLimitWarning || overageExceededWarning) from pr()
 * xn = mn.isUploading (remote file-attachment uploader)
 * bi = "draft"===Os && local startIntent && !ssh && !1===_s
 *     product _s ≡ Xr() git/local probe true; bi when gitAvailable === false
 *
 * Product notes (no invent):
 * - Existing /code/:id always has F once routed → Os never "spawning" on this shell
 * - Draft create navigates away (LocalSessions.start) → Ns maps to home busy only
 * - Local staged image status==="loading" ≡ cn.isProcessingImages
 * - Remote mn.isUploading not wired (local-first host-loop)
 */

export type ResidualOs = "active" | "spawning" | "draft";

export type ResidualQjDisabledInput = {
  /** Residual Os. */
  os: ResidualOs;
  /** Residual J — expected session id without meta. */
  isMetaPending: boolean;
  /** Residual Ns — create mutate in-flight count. */
  createInFlightCount: number;
  /** Residual Ga — rate-limit exceeded (blocking). */
  rateLimitExceeded: boolean;
  /** Residual xn — remote attachment uploader busy. */
  isRemoteUploading: boolean;
};

export type ResidualQjSubmitDisabledInput = {
  /** Residual cn.isProcessingImages. */
  isProcessingImages: boolean;
  /** Residual mn.isUploading (also in submitDisabled; product may fold into isProcessingImages). */
  isRemoteUploading: boolean;
  /**
   * Residual bi — draft local non-ssh when git/local probe is false.
   * Product: showGitRequired (gitAvailable === false).
   */
  gitRequiredBlocksSubmit: boolean;
};

/** Residual Os = F ? "active" : createPending && Ns===0 ? "spawning" : "draft". */
export function residualOs(input: {
  hasSessionMeta: boolean;
  createPending: boolean;
  createInFlightCount: number;
}): ResidualOs {
  if (input.hasSessionMeta) return "active";
  if (input.createPending && input.createInFlightCount === 0) return "spawning";
  return "draft";
}

/** Residual Qj disabled expression. */
export function residualQjDisabled(input: ResidualQjDisabledInput): boolean {
  return (
    input.os === "spawning"
    || input.isMetaPending
    || input.createInFlightCount > 0
    || input.rateLimitExceeded
    || input.isRemoteUploading
  );
}

/** Residual Qj submitDisabled expression. */
export function residualQjSubmitDisabled(input: ResidualQjSubmitDisabledInput): boolean {
  return (
    input.isProcessingImages
    || input.isRemoteUploading
    || input.gitRequiredBlocksSubmit
  );
}

/**
 * Residual Ga from messageLimits map (pr exceeded / overage blocking).
 * Ga = Boolean(exceededMessageLimitWarning || overageExceededWarning).
 * Product reuses coworkRateLimitStore messageLimits for Code reset path too.
 */
export function residualGaFromMessageLimits(
  messageLimits: Record<string, { type?: string; overageStatus?: string } | undefined>,
): boolean {
  for (const limit of Object.values(messageLimits)) {
    if (limit?.type === "exceeded_limit") return true;
    // Residual overageExceededWarning — mapped overageStatus rejected → exceeded_limit.
    if (limit?.overageStatus === "exceeded_limit") return true;
  }
  return false;
}
