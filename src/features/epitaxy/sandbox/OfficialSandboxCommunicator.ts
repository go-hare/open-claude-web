/**
 * Official p6e communicator (index-BELzQL5P) for claudeusercontent sandbox.
 * Shared by eit MermaidIframe and g6e RichSandbox.
 */

import {
  OFFICIAL_ALWAYS_PERMITTED,
  OFFICIAL_EMPTY_PAYLOAD,
  OFFICIAL_SANDBOX,
} from "./officialSandboxConstants";

export type OfficialSandboxCapabilityHandler = (
  method: string,
  sendRequest: (method: string, payload: unknown) => Promise<unknown>,
) => Promise<unknown>;

/**
 * Minimal official p6e:
 * handshake port transfer + request/response over iframe postMessage / MessageChannel.
 */
export class OfficialSandboxCommunicator {
  private iframe: HTMLIFrameElement;
  private allowedOrigin: string;
  private messageChannel: MessageChannel | null = null;
  private handshakeCompleted = false;
  private inFlight = new Map<
    string,
    { resolve: (payload: unknown) => void; reject: (error: Error) => void }
  >();
  private requestLog = new Set<string>();
  private onCapabilityAction: OfficialSandboxCapabilityHandler;
  private boundHandleWindowMessage: (event: MessageEvent) => void;
  private boundHandlePortMessage: (event: MessageEvent) => void;
  private messageQueue: Array<Record<string, unknown>> = [];
  private isConsumerRunning = false;
  /** Product safety: reject hang when sandbox never answers (mermaid residual string). */
  private requestTimeoutMs: number;

  constructor(args: {
    iframe: HTMLIFrameElement;
    allowedOrigin: string;
    onCapabilityAction: OfficialSandboxCapabilityHandler;
    /** Default 20s for mermaid eit; g6e can pass 0 to disable. */
    requestTimeoutMs?: number;
  }) {
    this.iframe = args.iframe;
    this.allowedOrigin = args.allowedOrigin;
    this.onCapabilityAction = args.onCapabilityAction;
    this.requestTimeoutMs = args.requestTimeoutMs ?? 20_000;
    this.boundHandleWindowMessage = this.handleWindowMessage.bind(this);
    this.boundHandlePortMessage = this.handlePortMessage.bind(this);
    window.addEventListener("message", this.boundHandleWindowMessage, false);
    this.setupMessageChannel();
    if (this.iframe.contentWindow && this.allowedOrigin) {
      this.sendHandshakeWithPort();
    }
  }

  private setupMessageChannel() {
    this.messageChannel = new MessageChannel();
    this.messageChannel.port1.onmessage = this.boundHandlePortMessage;
  }

  /** Official p6e.sendHandshakeWithPort residual. */
  sendHandshakeWithPort() {
    if (!this.messageChannel) return;
    if (this.handshakeCompleted) {
      this.messageChannel.port1.close();
      this.setupMessageChannel();
    }
    try {
      this.iframe.contentWindow?.postMessage(
        { type: "__sandbox_handshake__" },
        this.allowedOrigin,
        [this.messageChannel.port2],
      );
      this.handshakeCompleted = true;
    } catch {
      this.handshakeCompleted = false;
    }
  }

  /** Official p6e.restartListening residual (after iframe load). */
  restartListening() {
    window.removeEventListener("message", this.boundHandleWindowMessage);
    this.messageChannel?.port1.close();
    this.messageChannel = null;
    this.handshakeCompleted = false;
    this.messageQueue = [];
    this.isConsumerRunning = false;
    this.requestLog.clear();
    window.addEventListener("message", this.boundHandleWindowMessage, false);
    this.setupMessageChannel();
    if (this.iframe.contentWindow && this.allowedOrigin) {
      this.sendHandshakeWithPort();
    }
  }

  private handleWindowMessage(event: MessageEvent) {
    if (event.origin !== this.allowedOrigin) return;
    if (event.source !== this.iframe.contentWindow) return;
    const data = event.data;
    if (
      data &&
      typeof data === "object" &&
      (data as { type?: string }).type === "__sandbox_handshake_request__"
    ) {
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
        pending.reject(
          new Error(errorPayload?.error || `Sandbox error (${envelope.status})`),
        );
        return;
      }
      pending.resolve(envelope.payload);
      return;
    }
    if (
      envelope.channel === "request" &&
      typeof envelope.method === "string" &&
      typeof envelope.requestId === "string"
    ) {
      this.messageQueue.push(envelope as Record<string, unknown>);
      if (!this.isConsumerRunning) void this.consumeMessages();
    }
  }

  /**
   * Official p6e.consumeMessages residual (simplified):
   * always-permitted gate → onCapabilityAction → response to iframe contentWindow.
   */
  private async consumeMessages() {
    this.isConsumerRunning = true;
    while (this.messageQueue.length > 0) {
      const envelope = this.messageQueue.shift();
      if (!envelope) continue;
      const method = envelope.method as string;
      const requestId = envelope.requestId as string;
      if (this.requestLog.has(requestId)) {
        this.postResponse(requestId, 400, {
          "@type":
            "type.googleapis.com/anthropic.claude.usercontent.ErrorResponse",
          error: "Request ID already processed",
        });
        continue;
      }
      this.requestLog.add(requestId);

      if (
        !OFFICIAL_ALWAYS_PERMITTED.has(method) &&
        method !== OFFICIAL_SANDBOX.ReadyForContent
      ) {
        // Residual denies non-alwaysPermitted without host accept; this slice has no permission UI.
        this.postResponse(requestId, 403, {
          "@type":
            "type.googleapis.com/anthropic.claude.usercontent.ErrorResponse",
          error: "Permission denied",
        });
        continue;
      }

      try {
        const payload = await this.onCapabilityAction(
          method,
          this.sendRequest.bind(this),
        );
        this.postResponse(requestId, 200, payload ?? OFFICIAL_EMPTY_PAYLOAD);
      } catch (error: unknown) {
        this.postResponse(requestId, 500, {
          "@type":
            "type.googleapis.com/anthropic.claude.usercontent.ErrorResponse",
          error:
            error instanceof Error
              ? error.message
              : "Internal server error while processing action",
        });
      }
      await new Promise((r) => setTimeout(r, 0));
    }
    this.isConsumerRunning = false;
  }

  private postResponse(requestId: string, status: number, payload: unknown) {
    const response = { channel: "response", status, requestId, payload };
    this.iframe.contentWindow?.postMessage(response, this.allowedOrigin);
  }

  /** Official p6e.sendRequest residual. */
  sendRequest(method: string, payload: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const requestId = Date.now().toString();
      this.inFlight.set(requestId, { resolve, reject });
      const request = {
        channel: "request",
        method,
        requestId,
        payload,
      };
      this.iframe.contentWindow?.postMessage(request, this.allowedOrigin);
      if (this.requestTimeoutMs > 0) {
        window.setTimeout(() => {
          if (!this.inFlight.has(requestId)) return;
          this.inFlight.delete(requestId);
          reject(new Error("Unable to render diagram."));
        }, this.requestTimeoutMs);
      }
    });
  }

  cleanup() {
    window.removeEventListener("message", this.boundHandleWindowMessage);
    this.messageChannel?.port1.close();
    this.messageChannel = null;
    this.handshakeCompleted = false;
    this.inFlight.clear();
    this.messageQueue = [];
    this.isConsumerRunning = false;
    this.requestLog.clear();
  }
}
