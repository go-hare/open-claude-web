/**
 * Official code-markdown mermaid block:
 *   index-BELzQL5P `hit` → language === "mermaid" → `eit` MermaidIframe
 *   c5f4e1303 `zL.Mermaid` = "application/vnd.ant.mermaid"
 *   sandbox URL: userContentRendererUrl = "https://www.claudeusercontent.com"
 *   handshake: p6e MessageChannel (`__sandbox_handshake__`) + m6e sendRequest
 *   capability: ReadyForContent → SetContent(SandboxContent { content, type: xm.Mermaid })
 *
 * Communicator shared with g6e via ./sandbox/* — eit chrome stays residual-local.
 *
 * Host notes (product, not residual invent of UI):
 *   - Packaged SPA origin is app://localhost (in sandbox frame-ancestors).
 *   - Dev MAIN_VIEW http://127.0.0.1:5176 needs desktop
 *     artifactSandboxFrameAncestorBridge + bag proxy for egress.
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildOfficialSandboxIframeSrc,
  OFFICIAL_EMPTY_PAYLOAD,
  OFFICIAL_SANDBOX,
  OFFICIAL_SANDBOX_CONTENT_TYPE,
  OFFICIAL_USER_CONTENT_RENDERER_URL,
  OFFICIAL_XM,
  resolveOfficialTheme,
} from "./sandbox/officialSandboxConstants";
import { useOfficialSandboxCommunicator } from "./sandbox/useOfficialSandboxCommunicator";

function isMermaidLanguage(language?: string) {
  // Official hit only checks language-mermaid; mmd also maps to xm.Mermaid via HL/VL.
  const lang = language?.trim().toLowerCase() ?? "";
  return lang === "mermaid" || lang === "mmd";
}

export function isOfficialMermaidMarkdownLanguage(language?: string) {
  return isMermaidLanguage(language);
}

/**
 * Official eit MermaidIframe (index-BELzQL5P):
 * iframe → ReadyForContent → SetContent(type: application/vnd.ant.mermaid)
 * error path: border card + "Unable to render diagram." + <pre> source
 *
 * Official m6e waits for iframeRef (retry up to 20 × 500ms) then constructs p6e.
 */
export function OfficialMermaidDiagramCard({
  source,
}: {
  source: string;
  isStreaming?: boolean;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [readyForContent, setReadyForContent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [iframeEpoch, setIframeEpoch] = useState(0);
  const theme = resolveOfficialTheme();
  const backgroundColor = theme === "dark" ? "#1f1e1d" : "#f5f4ef";

  const iframeSrc = useMemo(
    () =>
      buildOfficialSandboxIframeSrc({
        theme: theme === "dark" ? "dark" : "light",
      }),
    [theme],
  );

  const onCapabilityAction = useCallback(async (method: string) => {
    // Official eit: (e) => e.method === ReadyForContent → set ready
    if (method === OFFICIAL_SANDBOX.ReadyForContent) {
      setReadyForContent(true);
      return OFFICIAL_EMPTY_PAYLOAD;
    }
    return OFFICIAL_EMPTY_PAYLOAD;
  }, []);

  const { communicatorRef, restartListening } = useOfficialSandboxCommunicator({
    iframeRef,
    allowedOrigin: OFFICIAL_USER_CONTENT_RENDERER_URL,
    onCapabilityAction,
    bindKey: `${iframeSrc}#${iframeEpoch}`,
    requestTimeoutMs: 20_000,
  });

  // Residual: re-handshake after iframe finishes loading.
  const onIframeLoad = useCallback(() => {
    if (!restartListening()) {
      setIframeEpoch((n) => n + 1);
      return;
    }
  }, [restartListening]);

  // Official eit effect: when ready + sendRequest + content → SetContent(type: xm.Mermaid).
  useEffect(() => {
    if (!readyForContent || !source.trim()) return;
    const communicator = communicatorRef.current;
    if (!communicator) return;
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        setError(null);
        await communicator.sendRequest(OFFICIAL_SANDBOX.SetContent, {
          "@type": OFFICIAL_SANDBOX_CONTENT_TYPE,
          content: source,
          type: OFFICIAL_XM.Mermaid,
        });
        if (!cancelled) setLoading(false);
      } catch {
        if (!cancelled) {
          setError("Unable to render diagram.");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [communicatorRef, readyForContent, source]);

  // When source changes after a prior error, clear error so residual iframe path
  // can remount (error branch unmounts iframe — same as official eit).
  useEffect(() => {
    setError(null);
    setReadyForContent(false);
    setLoading(true);
    setIframeEpoch((n) => n + 1);
  }, [source]);

  // Official eit error chrome.
  if (error) {
    return (
      <div
        className="mb-2 p-4 rounded border border-border-300"
        style={{ backgroundColor }}
        data-official-source="index-BELzQL5P.js:eit"
      >
        <div className="text-text-400 text-sm font-mono mb-2">{error}</div>
        <pre className="text-xs text-text-500 overflow-x-auto whitespace-pre-wrap m-0">
          {source}
        </pre>
      </div>
    );
  }

  // Official eit body: relative min-h-[100px] rounded + spinner overlay + iframe height 600px.
  return (
    <div
      className="mb-2 relative min-h-[100px] rounded"
      style={{ backgroundColor }}
      data-official-source="index-BELzQL5P.js:eit MermaidIframe"
    >
      {loading ? (
        <div
          className="absolute inset-0 flex items-center justify-center rounded"
          style={{ backgroundColor }}
        >
          <div className="flex items-center gap-2 text-text-400">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span className="text-sm font-mono">Rendering diagram...</span>
          </div>
        </div>
      ) : null}
      <iframe
        ref={iframeRef}
        className="w-full rounded"
        style={{ height: "600px", border: "none", backgroundColor }}
        sandbox="allow-scripts allow-same-origin"
        src={iframeSrc}
        title="Mermaid diagram"
        referrerPolicy="no-referrer"
        allow="fullscreen; clipboard-write"
        onLoad={onIframeLoad}
      />
    </div>
  );
}

export const OfficialMermaidIframe = memo(OfficialMermaidDiagramCard);
