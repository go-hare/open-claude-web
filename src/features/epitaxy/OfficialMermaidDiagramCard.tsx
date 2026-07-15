/**
 * Official code-markdown mermaid block:
 *   index-BELzQL5P `hit` → language === "mermaid" → `eit` MermaidIframe
 *   c5f4e1303 `zL.Mermaid` = "application/vnd.ant.mermaid"
 *   sandbox URL: userContentRendererUrl = "https://www.claudeusercontent.com"
 *   handshake: p6e MessageChannel (`__sandbox_handshake__`) + m6e sendRequest
 *   capability: ReadyForContent → SetContent(SandboxContent { content, type: xm.Mermaid })
 *
 * Ported from ion-dist only. No local flowchart-pill invent.
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

/** Official zL / xm.Mermaid (c5f4e1303-CSqThUeQ.js). */
const OFFICIAL_XM_MERMAID = "application/vnd.ant.mermaid";

/** Official config userContentRendererUrl (index-BELzQL5P). */
const OFFICIAL_USER_CONTENT_RENDERER_URL = "https://www.claudeusercontent.com";

/** Official A4e (index-BELzQL5P). */
const OFFICIAL_SANDBOX_READY_FOR_CONTENT = "anthropic.claude.usercontent.sandbox.ReadyForContent";
const OFFICIAL_SANDBOX_SET_CONTENT = "anthropic.claude.usercontent.sandbox.SetContent";

function isMermaidLanguage(language?: string) {
  // Official hit only checks language-mermaid; mmd also maps to xm.Mermaid via HL/VL.
  const lang = language?.trim().toLowerCase() ?? "";
  return lang === "mermaid" || lang === "mmd";
}

export function isOfficialMermaidMarkdownLanguage(language?: string) {
  return isMermaidLanguage(language);
}

function resolveOfficialTheme(): "dark" | "light" {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/**
 * Minimal official p6e communicator (index-BELzQL5P) scoped to MermaidIframe needs:
 * handshake port transfer + request/response over iframe postMessage / MessageChannel.
 */
class OfficialSandboxCommunicator {
  private iframe: HTMLIFrameElement;
  private allowedOrigin: string;
  private messageChannel: MessageChannel | null = null;
  private handshakeCompleted = false;
  private inFlight = new Map<string, { resolve: (payload: unknown) => void; reject: (error: Error) => void }>();
  private onCapabilityAction: (method: string) => Promise<unknown>;
  private boundHandleWindowMessage: (event: MessageEvent) => void;
  private boundHandlePortMessage: (event: MessageEvent) => void;

  constructor(args: {
    iframe: HTMLIFrameElement;
    allowedOrigin: string;
    onCapabilityAction: (method: string) => Promise<unknown>;
  }) {
    this.iframe = args.iframe;
    this.allowedOrigin = args.allowedOrigin;
    this.onCapabilityAction = args.onCapabilityAction;
    this.boundHandleWindowMessage = this.handleWindowMessage.bind(this);
    this.boundHandlePortMessage = this.handlePortMessage.bind(this);
    window.addEventListener("message", this.boundHandleWindowMessage, false);
    this.setupMessageChannel();
    if (this.iframe.contentWindow && this.allowedOrigin) this.sendHandshakeWithPort();
  }

  private setupMessageChannel() {
    this.messageChannel = new MessageChannel();
    this.messageChannel.port1.onmessage = this.boundHandlePortMessage;
  }

  private sendHandshakeWithPort() {
    if (!this.messageChannel) return;
    if (this.handshakeCompleted) {
      this.messageChannel.port1.close();
      this.setupMessageChannel();
    }
    this.iframe.contentWindow?.postMessage(
      { type: "__sandbox_handshake__" },
      this.allowedOrigin,
      [this.messageChannel.port2],
    );
    this.handshakeCompleted = true;
  }

  private handleWindowMessage(event: MessageEvent) {
    if (event.origin !== this.allowedOrigin) return;
    if (event.source !== this.iframe.contentWindow) return;
    const data = event.data;
    if (data && typeof data === "object" && data.type === "__sandbox_handshake_request__") {
      this.sendHandshakeWithPort();
      return;
    }
    this.routeEnvelope(data);
  }

  private handlePortMessage(event: MessageEvent) {
    this.routeEnvelope(event.data);
  }

  private routeEnvelope(data: unknown) {
    if (!data || typeof data !== "object") return;
    const envelope = data as {
      channel?: string;
      method?: string;
      requestId?: string;
      payload?: unknown;
      status?: number;
    };
    if (envelope.channel === "response" && typeof envelope.requestId === "string") {
      const pending = this.inFlight.get(envelope.requestId);
      if (!pending) return;
      this.inFlight.delete(envelope.requestId);
      if (typeof envelope.status === "number" && envelope.status >= 400) {
        const errorPayload = envelope.payload as { error?: string } | undefined;
        pending.reject(new Error(errorPayload?.error || `Sandbox error (${envelope.status})`));
        return;
      }
      pending.resolve(envelope.payload);
      return;
    }
    if (envelope.channel === "request" && typeof envelope.method === "string" && typeof envelope.requestId === "string") {
      void this.onCapabilityAction(envelope.method)
        .then((payload) => {
          this.postResponse(envelope.requestId!, 200, payload ?? {
            "@type": "type.googleapis.com/google.protobuf.Empty",
          });
        })
        .catch((error: unknown) => {
          this.postResponse(envelope.requestId!, 500, {
            "@type": "type.googleapis.com/anthropic.claude.usercontent.ErrorResponse",
            error: error instanceof Error ? error.message : "Internal server error while processing action",
          });
        });
    }
  }

  private postResponse(requestId: string, status: number, payload: unknown) {
    const response = { channel: "response", status, requestId, payload };
    // Official p6e: responses go to iframe contentWindow (and port path also accepts responses).
    this.iframe.contentWindow?.postMessage(response, this.allowedOrigin);
    this.messageChannel?.port1.postMessage(response);
  }

  sendRequest(method: string, payload: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      this.inFlight.set(requestId, { resolve, reject });
      const request = {
        channel: "request",
        method,
        requestId,
        payload,
      };
      // Official p6e.sendRequest posts to iframe contentWindow (optionally with transfer list).
      this.iframe.contentWindow?.postMessage(request, this.allowedOrigin);
      // Timeout so a blocked sandbox does not hang forever (local bridge only).
      window.setTimeout(() => {
        if (!this.inFlight.has(requestId)) return;
        this.inFlight.delete(requestId);
        reject(new Error("Unable to render diagram."));
      }, 12_000);
    });
  }

  cleanup() {
    window.removeEventListener("message", this.boundHandleWindowMessage);
    this.messageChannel?.port1.close();
    this.messageChannel = null;
    this.handshakeCompleted = false;
    this.inFlight.clear();
  }
}

/**
 * Official eit MermaidIframe (index-BELzQL5P):
 * iframe → ReadyForContent → SetContent(type: application/vnd.ant.mermaid)
 * error path: border card + "Unable to render diagram." + <pre> source
 */
export function OfficialMermaidDiagramCard({ source }: { source: string; isStreaming?: boolean }) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const communicatorRef = useRef<OfficialSandboxCommunicator | null>(null);
  const [loading, setLoading] = useState(true);
  const [readyForContent, setReadyForContent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const theme = resolveOfficialTheme();
  const backgroundColor = theme === "dark" ? "#1f1e1d" : "#f5f4ef";

  const iframeSrc = useMemo(() => {
    const params = new URLSearchParams();
    const domain = typeof window !== "undefined" ? window.location.hostname : "";
    params.set("domain", domain);
    params.set("theme", theme === "dark" ? "dark" : "light");
    if (typeof window !== "undefined") params.set("parentOrigin", window.location.origin);
    return `${OFFICIAL_USER_CONTENT_RENDERER_URL}?${params.toString()}`;
  }, [theme]);

  const onCapabilityAction = useCallback(async (method: string) => {
    // Official eit onCapabilityAction: ReadyForContent → mark ready; other methods no-op.
    if (method === OFFICIAL_SANDBOX_READY_FOR_CONTENT) {
      setReadyForContent(true);
      return { "@type": "type.googleapis.com/google.protobuf.Empty" };
    }
    return { "@type": "type.googleapis.com/google.protobuf.Empty" };
  }, []);

  // Official m6e: bind communicator once iframe mounts / src changes.
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    setReadyForContent(false);
    setLoading(true);
    setError(null);
    const communicator = new OfficialSandboxCommunicator({
      iframe,
      allowedOrigin: OFFICIAL_USER_CONTENT_RENDERER_URL,
      onCapabilityAction,
    });
    communicatorRef.current = communicator;
    return () => {
      communicator.cleanup();
      communicatorRef.current = null;
    };
  }, [onCapabilityAction, iframeSrc]);

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
        await communicator.sendRequest(OFFICIAL_SANDBOX_SET_CONTENT, {
          "@type": "type.googleapis.com/anthropic.claude.usercontent.sandbox.SandboxContent",
          content: source,
          type: OFFICIAL_XM_MERMAID,
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
  }, [readyForContent, source]);

  // Official eit error chrome.
  if (error) {
    return (
      <div className="mb-2 p-4 rounded border border-border-300" style={{ backgroundColor }} data-official-source="index-BELzQL5P.js:eit">
        <div className="text-text-400 text-sm font-mono mb-2">{error}</div>
        <pre className="text-xs text-text-500 overflow-x-auto whitespace-pre-wrap m-0">{source}</pre>
      </div>
    );
  }

  // Official eit body: relative min-h-[100px] rounded + spinner overlay + iframe height 600px.
  return (
    <div className="mb-2 relative min-h-[100px] rounded" style={{ backgroundColor }} data-official-source="index-BELzQL5P.js:eit MermaidIframe">
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center rounded" style={{ backgroundColor }}>
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

export const OfficialMermaidIframe = memo(OfficialMermaidDiagramCard);
