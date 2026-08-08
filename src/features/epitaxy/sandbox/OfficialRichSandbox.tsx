/**
 * Official g6e RichSandbox (index-BELzQL5P.displayName="RichSandbox"):
 * iframe → ReadyForContent → SetContent({ content, type, tailwindStylesEnabled, @type SandboxContent })
 *
 * Product: iframe src = local `/sandbox-runtime/frame.html` (residual A4e/p6e).
 * C-slice paint only (Html|Svg|Mermaid|React). Non-alwaysPermitted stay denied
 * (no invent MCP modal / storage / completion / Excel-Pdf-Repl host).
 *
 * Residual refresh re-appends the iframe node.
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
  resolveOfficialSandboxAllowedOrigin,
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
      // Residual refresh re-appends iframe; bump key so m6e rebinds p6e to the same element after src reset.
      const [bindEpoch, setBindEpoch] = useState(0);

      // Residual g6e: formattedSpreadsheets=true (+ optional errorReportingMode/routeHandlerPdf out of slice).
      const iframeSrc = useMemo(
        () =>
          buildOfficialSandboxIframeSrc({
            formattedSpreadsheets: true,
          }),
        [],
      );

      const onCapabilityAction = useCallback(
        async (method: string) => {
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
            return OFFICIAL_EMPTY_PAYLOAD;
          }
          return OFFICIAL_EMPTY_PAYLOAD;
        },
        [onDOMContentLoaded, onSandboxConfirmation],
      );

      const allowedOrigin = resolveOfficialSandboxAllowedOrigin();
      const { sendRequest } = useOfficialSandboxCommunicator({
        iframeRef,
        allowedOrigin,
        onCapabilityAction,
        bindKey: `${iframeSrc}#${bindEpoch}`,
        requestTimeoutMs: 0,
      });

      // Residual g6e: when ready + content + type → SetContent (fire-and-forget; product keeps error callback).
      useEffect(() => {
        if (!readyForContent || !sendRequest || content == null || !type) return;
        let cancelled = false;
        void (async () => {
          try {
            onSetContent?.();
            await sendRequest(OFFICIAL_SANDBOX.SetContent, {
              "@type": OFFICIAL_SANDBOX_CONTENT_TYPE,
              content,
              type,
              tailwindStylesEnabled,
            });
          } catch (error) {
            if (!cancelled) onReportError?.(error);
          }
        })();
        return () => {
          cancelled = true;
        };
      }, [
        content,
        onReportError,
        onSetContent,
        readyForContent,
        sendRequest,
        tailwindStylesEnabled,
        type,
      ]);

      useImperativeHandle(
        ref,
        () => ({
          refresh: () => {
            // Residual g6e.refresh: clear ready, re-append iframe with same src.
            onRefresh?.();
            setReadyForContent(false);
            const iframe = iframeRef.current;
            if (iframe) {
              const parent = iframe.parentNode;
              if (parent) {
                parent.removeChild(iframe);
                iframe.removeAttribute("src");
                iframe.sandbox.value = "allow-scripts allow-same-origin";
                iframe.setAttribute("data-no-service-worker", "true");
                iframe.setAttribute("referrerpolicy", "no-referrer");
                iframe.src = iframeSrc;
                parent.appendChild(iframe);
              } else {
                iframe.src = iframeSrc;
              }
            }
            setBindEpoch((n) => n + 1);
          },
        }),
        [iframeSrc, onRefresh],
      );

      const iframeTitle = title || "Claude content";

      // Residual g6e return: relative + iframe full size + overlay until ready.
      return (
        <div
          className={className ? `relative ${className}` : "relative"}
          data-official-source="index-BELzQL5P.js:g6e RichSandbox"
        >
          <iframe
            ref={iframeRef}
            className="h-full w-full"
            style={{ zoom }}
            sandbox="allow-scripts allow-same-origin"
            title={iframeTitle}
            loading={lazy ? "lazy" : undefined}
            src={iframeSrc}
            allow="fullscreen; clipboard-write"
            referrerPolicy="no-referrer"
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
