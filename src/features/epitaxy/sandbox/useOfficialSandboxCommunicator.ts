/**
 * Official m6e residual (index-BELzQL5P):
 * wait for iframeRef (retry up to 20 × 500ms) then construct p6e communicator.
 */

import { useCallback, useEffect, useRef, type RefObject } from "react";
import {
  OfficialSandboxCommunicator,
  type OfficialSandboxCapabilityHandler,
} from "./OfficialSandboxCommunicator";
import { OFFICIAL_USER_CONTENT_RENDERER_URL } from "./officialSandboxConstants";

export function useOfficialSandboxCommunicator(args: {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  allowedOrigin?: string;
  onCapabilityAction: OfficialSandboxCapabilityHandler;
  /** Remount key (src / epoch). */
  bindKey: string | number;
  requestTimeoutMs?: number;
}) {
  const {
    iframeRef,
    allowedOrigin = OFFICIAL_USER_CONTENT_RENDERER_URL,
    onCapabilityAction,
    bindKey,
    requestTimeoutMs,
  } = args;
  const communicatorRef = useRef<OfficialSandboxCommunicator | null>(null);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: number | undefined;
    let attempts = 0;

    const bind = () => {
      if (cancelled) return;
      const iframe = iframeRef.current;
      if (!iframe) {
        if (attempts < 20) {
          attempts += 1;
          retryTimer = window.setTimeout(bind, 500);
        }
        return;
      }
      communicatorRef.current?.cleanup();
      communicatorRef.current = new OfficialSandboxCommunicator({
        iframe,
        allowedOrigin,
        onCapabilityAction,
        requestTimeoutMs,
      });
    };

    bind();
    return () => {
      cancelled = true;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      communicatorRef.current?.cleanup();
      communicatorRef.current = null;
    };
  }, [allowedOrigin, bindKey, iframeRef, onCapabilityAction, requestTimeoutMs]);

  const restartListening = useCallback(() => {
    const communicator = communicatorRef.current;
    if (!communicator) return false;
    communicator.restartListening();
    return true;
  }, []);

  const sendRequest = useCallback(
    async (method: string, payload: unknown) => {
      const communicator = communicatorRef.current;
      if (!communicator) throw new Error("Communicator not initialized");
      return communicator.sendRequest(method, payload);
    },
    [],
  );

  return { communicatorRef, restartListening, sendRequest };
}
