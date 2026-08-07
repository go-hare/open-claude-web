/**
 * Official g6e RichSandbox (index-BELzQL5P.displayName="RichSandbox"):
 * iframe → ReadyForContent → SetContent({ content, type, tailwindStylesEnabled, @type SandboxContent })
 *
 * Host bridges (proxy / frame-ancestors / allowedParentOrigins) already cover
 * www.claudeusercontent.com under Vite; packaged app://localhost is residual-native.
 *
 * This slice: render path only. Non-alwaysPermitted capabilities stay denied
 * (no invent MCP modal / storage / completion host).
 */

import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  buildOfficialSandboxIframeSrc,
  OFFICIAL_EMPTY_PAYLOAD,
  OFFICIAL_SANDBOX,
  OFFICIAL_SANDBOX_CONTENT_TYPE,
  OFFICIAL_USER_CONTENT_RENDERER_URL,
} from "./officialSandboxConstants";
import { useOfficialSandboxCommunicator } from "./useOfficialSandboxCommunicator";

export type OfficialRichSandboxHandle = {
  refresh: () => void;
};

export type OfficialRichSandboxProps = {
  content?: string;
  type?: string;
  title?: string;
  className?: string;
  lazy?: boolean;
  zoom?: number;
  /** Residual g6e: artifact_tailwind_styles GrowthBook; default true for rich types. */
  tailwindStylesEnabled?: boolean;
  onSandboxConfirmation?: () => void;
  onDOMContentLoaded?: () => void;
  onSetContent?: () => void;
  onReportError?: (error: unknown) => void;
  onRefresh?: () => void;
};

export const OfficialRichSandbox = memo(
  forwardRef<OfficialRichSandboxHandle, OfficialRichSandboxProps>(
    function OfficialRichSandbox(
      {
        content,
        type,
        title,
        className,
        lazy = true,
        zoom = 1,
        tailwindStylesEnabled = true,
        onSandboxConfirmation,
        onDOMContentLoaded,
        onSetContent,
        onReportError,
        onRefresh,
      },
      ref,
    ) {
      const iframeRef = useRef<HTMLIFrameElement | null>(null);
      const [readyForContent, setReadyForContent] = useState(false);
      const [iframeEpoch, setIframeEpoch] = useState(0);

      const iframeSrc = useMemo(
        () =>
          buildOfficialSandboxIframeSrc({
            formattedSpreadsheets: true,
          }),
        [],
      );

      const onCapabilityAction = useCallback(
        async (method: string) => {
          // Residual g6e: ReadyForContent → set ready + onSandboxConfirmation
          if (method === OFFICIAL_SANDBOX.ReadyForContent) {
            setReadyForContent(true);
            onSandboxConfirmation?.();
            return OFFICIAL_EMPTY_PAYLOAD;
          }
          if (method === OFFICIAL_SANDBOX.DOMContentLoaded) {
            onDOMContentLoaded?.();
            return OFFICIAL_EMPTY_PAYLOAD;
          }
          if (method === OFFICIAL_SANDBOX.ReportError) {
            // payload handled by communicator path; host may log
            return OFFICIAL_EMPTY_PAYLOAD;
          }
          return OFFICIAL_EMPTY_PAYLOAD;
        },
        [onDOMContentLoaded, onSandboxConfirmation],
      );

      const { communicatorRef, restartListening } = useOfficialSandboxCommunicator({
        iframeRef,
        allowedOrigin: OFFICIAL_USER_CONTENT_RENDERER_URL,
        onCapabilityAction,
        bindKey: `${iframeSrc}#${iframeEpoch}`,
        // g6e residual has no hard SetContent timeout; keep 30s safety for hung handshake
        requestTimeoutMs: 30_000,
      });

      const onIframeLoad = useCallback(() => {
        if (!restartListening()) {
          setIframeEpoch((n) => n + 1);
        }
      }, [restartListening]);

      // Residual g6e: when ready + content + type → SetContent
      useEffect(() => {
        if (!readyForContent || content == null || !type) return;
        const communicator = communicatorRef.current;
        if (!communicator) return;
        let cancelled = false;
        void (async () => {
          try {
            await communicator.sendRequest(OFFICIAL_SANDBOX.SetContent, {
              "@type": OFFICIAL_SANDBOX_CONTENT_TYPE,
              content,
              type,
              tailwindStylesEnabled,
            });
            if (!cancelled) onSetContent?.();
          } catch (error) {
            if (!cancelled) onReportError?.(error);
          }
        })();
        return () => {
          cancelled = true;
        };
      }, [
        communicatorRef,
        content,
        onReportError,
        onSetContent,
        readyForContent,
        tailwindStylesEnabled,
        type,
      ]);

      useImperativeHandle(
        ref,
        () => ({
          refresh: () => {
            onRefresh?.();
            setReadyForContent(false);
            setIframeEpoch((n) => n + 1);
          },
        }),
        [onRefresh],
      );

      const iframeTitle = title || "Claude content";

      // Residual g6e return: relative + iframe full size + loading overlay until ready.
      return (
        <div
          className={className ? `relative ${className}` : "relative"}
          data-official-source="index-BELzQL5P.js:g6e RichSandbox"
        >
          <iframe
            ref={iframeRef}
            className="h-full w-full"
            style={{ zoom, border: "none" }}
            sandbox="allow-scripts allow-same-origin"
            title={iframeTitle}
            loading={lazy ? "lazy" : undefined}
            src={iframeSrc}
            allow="fullscreen; clipboard-write"
            referrerPolicy="no-referrer"
            onLoad={onIframeLoad}
          />
          {!readyForContent ? (
            <div className="bg-bg-000 absolute inset-0 z-10" aria-hidden />
          ) : null}
        </div>
      );
    },
  ),
);

OfficialRichSandbox.displayName = "RichSandbox";
