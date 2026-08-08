/**
 * Official code-markdown mermaid block (index-BELzQL5P):
 *   hit → language === "mermaid" → eit MermaidIframe
 *   eit: ReadyForContent → SetContent(SandboxContent { content, type: xm.Mermaid })
 *   iframe height 600px; error chrome "Unable to render diagram."
 *
 * Residual hit wraps eit in `div.mb-2` — callers must wrap; eit itself has no mb-2.
 * Product iframe src: local `/sandbox-runtime/frame.html` (residual protocol + 3817/65255 UI).
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildOfficialSandboxIframeSrc,
  OFFICIAL_EMPTY_PAYLOAD,
  OFFICIAL_SANDBOX,
  OFFICIAL_SANDBOX_CONTENT_TYPE,
  OFFICIAL_XM,
  resolveOfficialSandboxAllowedOrigin,
  resolveOfficialTheme,
} from "./sandbox/officialSandboxConstants";
import { useOfficialSandboxCommunicator } from "./sandbox/useOfficialSandboxCommunicator";

/**
 * Residual hit: /language-(\w+)/ → n === "mermaid" only.
 * Product also accepts bare "mermaid" / "mmd" from fence lang without language- prefix.
 */
function isMermaidLanguage(language?: string) {
  const lang = language?.trim().toLowerCase() ?? "";
  return lang === "mermaid" || lang === "mmd";
}

export function isOfficialMermaidMarkdownLanguage(language?: string) {
  return isMermaidLanguage(language);
}

/**
 * Official eit MermaidIframe (index-BELzQL5P, displayName="MermaidIframe"):
 *   loading i=true; ready l=false; error u=null
 *   m6e sendRequest g — effect if (!l || !g || !e) return; SetContent; catch → error chrome
 *   No source remount / iframeEpoch invent; error unmounts iframe (sticky until parent remount).
 *   No onLoad invent; m6e binds p6e after iframe ref (retry 20×500ms).
 */
function OfficialMermaidDiagramCardImpl({
  source,
}: {
  source: string;
  /** Product fence prop; residual eit ignores streaming for paint. */
  isStreaming?: boolean;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [readyForContent, setReadyForContent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const theme = resolveOfficialTheme();
  const backgroundColor = theme === "dark" ? "#1f1e1d" : "#f5f4ef";

  // Residual eit: domain + theme + parentOrigin only (no formattedSpreadsheets).
  const iframeSrc = useMemo(
    () =>
      buildOfficialSandboxIframeSrc({
        theme: theme === "dark" ? "dark" : "light",
      }),
    [theme],
  );

  // Residual eit: (e) => e.method === ReadyForContent ? (d(!0), Promise.resolve(void 0)) : Promise.resolve(void 0)
  const onCapabilityAction = useCallback(async (method: string) => {
    if (method === OFFICIAL_SANDBOX.ReadyForContent) {
      setReadyForContent(true);
      return OFFICIAL_EMPTY_PAYLOAD;
    }
    return OFFICIAL_EMPTY_PAYLOAD;
  }, []);

  // Residual m6e: sendRequest is undefined until p6e constructed; no invent timeout on p6e.sendRequest.
  const allowedOrigin = resolveOfficialSandboxAllowedOrigin();
  const { sendRequest } = useOfficialSandboxCommunicator({
    iframeRef,
    allowedOrigin,
    onCapabilityAction,
    bindKey: iframeSrc,
    requestTimeoutMs: 0,
  });

  // Residual eit effect: [l, g, e] — ready + sendRequest + content.
  useEffect(() => {
    if (!readyForContent || !sendRequest || !source) return;
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        setError(null);
        await sendRequest(OFFICIAL_SANDBOX.SetContent, {
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
  }, [readyForContent, sendRequest, source]);

  // Residual eit error chrome (no mb-2 — hit wrapper owns spacing).
  if (error) {
    return (
      <div
        className="p-4 rounded border border-border-300"
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

  // Residual eit body: relative min-h-[100px] rounded + spinner + iframe height 600px.
  return (
    <div
      className="relative min-h-[100px] rounded"
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
      />
    </div>
  );
}

/** Residual eit = memo(MermaidIframe). */
export const OfficialMermaidDiagramCard = memo(OfficialMermaidDiagramCardImpl);
export const OfficialMermaidIframe = OfficialMermaidDiagramCard;

/**
 * Residual hit mermaid branch: div.mb-2 > eit.
 * Use at markdown fence call sites so eit chrome stays residual-exact.
 */
export function OfficialMermaidHit({
  source,
  isStreaming,
}: {
  source: string;
  isStreaming?: boolean;
}) {
  return (
    <div className="mb-2" data-official-source="index-BELzQL5P.js:hit mermaid">
      <OfficialMermaidDiagramCard source={source} isStreaming={isStreaming} />
    </div>
  );
}
