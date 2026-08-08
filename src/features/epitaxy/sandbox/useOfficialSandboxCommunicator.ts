/**
 * Official m6e residual (index-BELzQL5P):
 *   wait for iframeRef (retry up to 20 × 500ms) then construct p6e
 *   sendRequest is undefined until communicator ready (eit effect gates on g truthy)
 *   restartListening → p6e.restartListening
 */

import { useCallback, useEffect, useState, type RefObject } from "react";
import {
  OfficialSandboxCommunicator,
  type OfficialSandboxCapabilityHandler,
} from "./OfficialSandboxCommunicator";
import { resolveOfficialSandboxAllowedOrigin } from "./officialSandboxConstants";

export type OfficialSandboxSendRequest = (
  method: string,
  payload: unknown,
) => Promise<unknown>;

export function useOfficialSandboxCommunicator(args: {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  allowedOrigin?: string;
  onCapabilityAction: OfficialSandboxCapabilityHandler;
  /** Remount key (src). Residual m6e deps include retry tick when iframe not yet mounted. */
  bindKey: string | number;
  /**
   * Residual p6e.sendRequest has no timeout.
   * 0 = disabled (default, residual-exact).
   */
  requestTimeoutMs?: number;
  /** Residual m6e → p6e onRateLimited (g6e “I’m still here”). */
  onRateLimited?: (() => void) | null;
}) {
  const {
    iframeRef,
    allowedOrigin = resolveOfficialSandboxAllowedOrigin(),
    onCapabilityAction,
    bindKey,
    requestTimeoutMs = 0,
    onRateLimited = null,
  } = args;

  // Residual m6e: useState(null) communicator; sendRequest undefined until set.
  const [communicator, setCommunicator] =
    useState<OfficialSandboxCommunicator | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) {
      if (retryTick < 20) {
        const timer = window.setTimeout(() => {
          setRetryTick((n) => n + 1);
        }, 500);
        return () => window.clearTimeout(timer);
      }
      return;
    }

    const next = new OfficialSandboxCommunicator({
      iframe,
      allowedOrigin,
      onCapabilityAction,
      requestTimeoutMs,
      onRateLimited,
    });
    setCommunicator(next);
    return () => {
      next.cleanup();
      setCommunicator(null);
    };
  }, [
    allowedOrigin,
    bindKey,
    iframeRef,
    onCapabilityAction,
    onRateLimited,
    requestTimeoutMs,
    retryTick,
  ]);

  // Residual m6e: restartListening = () => o?.restartListening()
  const restartListening = useCallback(() => {
    if (!communicator) return false;
    communicator.restartListening();
    return true;
  }, [communicator]);

  const sendRequestImpl = useCallback<OfficialSandboxSendRequest>(
    async (method, payload) => {
      if (!communicator) throw new Error("Communicator not initialized");
      return communicator.sendRequest(method, payload);
    },
    [communicator],
  );

  // Residual: sendRequest: null===o ? void 0 : p
  const sendRequest: OfficialSandboxSendRequest | undefined = communicator
    ? sendRequestImpl
    : undefined;

  return {
    communicator,
    sendRequest,
    restartListening,
    /** Compat: same shape as prior ref API for mid-migration call sites. */
    communicatorRef: { current: communicator },
  };
}
