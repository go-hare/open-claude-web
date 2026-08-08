/**
 * Official p6e communicator (index-BELzQL5P) for claudeusercontent sandbox.
 * Shared by eit MermaidIframe and g6e RichSandbox.
 *
 * Residual anchors:
 *   class p6e — MessageChannel handshake, rate limit 30/5s, contentWindow sendRequest
 *   m6e hook constructs p6e after iframe ref ready
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
 * Residual p6e:
 * handshake port transfer + request/response over iframe postMessage / MessageChannel.
 * Rate limit: MAX_MESSAGES_PER_INTERVAL=30, RESET_INTERVAL=5000.
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
  /** Residual requestLog is Map; product keeps Set of requestIds for dup detect. */
  private requestLog = new Set<string>();
  private onCapabilityAction: OfficialSandboxCapabilityHandler;
  private boundHandleWindowMessage: (event: MessageEvent) => void;
  private boundHandlePortMessage: (event: MessageEvent) => void;
  private messageQueue: Array<Record<string, unknown>> = [];
  private isConsumerRunning = false;
  /**
   * Residual p6e.sendRequest has no hang timeout.
   * 0 = disabled (default). Non-zero is product-only hang guard.
   */
  private requestTimeoutMs: number;

  // Residual p6e rate limit
  private messageCount = 0;
  private lastResetTime = Date.now();
  private readonly MAX_MESSAGES_PER_INTERVAL = 30;
  private readonly RESET_INTERVAL = 5_000;
  private onRateLimited: (() => void) | null;

  constructor(args: {
    iframe: HTMLIFrameElement;
    allowedOrigin: string;
    onCapabilityAction: OfficialSandboxCapabilityHandler;
    /** Residual default: 0 (no timeout). */
    requestTimeoutMs?: number;
    /** Residual p6e onRateLimited (g6e “I’m still here” path). */
    onRateLimited?: (() => void) | null;
  }) {
    this.iframe = args.iframe;
    this.allowedOrigin = args.allowedOrigin;
    this.onCapabilityAction = args.onCapabilityAction;
    this.requestTimeoutMs = args.requestTimeoutMs ?? 0;
    this.onRateLimited = args.onRateLimited ?? null;
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

  /** Residual p6e: tick rate limit; return true if over limit (caller should stop). */
  private hitRateLimit(requestId?: string, viaPort?: boolean): boolean {
    const now = Date.now();
    if (now - this.lastResetTime > this.RESET_INTERVAL) {
      this.messageCount = 0;
      this.lastResetTime = now;
    }
    this.messageCount++;
    if (this.messageCount <= this.MAX_MESSAGES_PER_INTERVAL) return false;

    if (requestId) {
      const payload = {
        "@type":
          "type.googleapis.com/anthropic.claude.usercontent.ErrorResponse",
        error: "Message rate limit exceeded. Reload to continue.",
      };
      if (viaPort && this.messageChannel) {
        try {
          this.messageChannel.port1.postMessage({
            channel: "response",
            status: 429,
            requestId,
            payload,
          });
        } catch {
          /* ignore */
        }
      } else {
        this.postResponse(requestId, 429, payload);
      }
    }
    try {
      this.messageChannel?.port1.close();
    } catch {
      /* ignore */
    }
    window.removeEventListener("message", this.boundHandleWindowMessage);
    this.onRateLimited?.();
    return true;
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

  /** Official p6e.restartListening residual (after iframe load / rate-limit recovery). */
  restartListening() {
    window.removeEventListener("message", this.boundHandleWindowMessage);
    this.messageChannel?.port1.close();
    this.messageChannel = null;
    this.handshakeCompleted = false;
    this.messageQueue = [];
    this.isConsumerRunning = false;
    this.requestLog.clear();
    this.messageCount = 0;
    this.lastResetTime = Date.now();
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

    // Residual applies rate limit on window messages too
    const envelope = data as { channel?: string; requestId?: string } | null;
    const rid =
      envelope &&
      typeof envelope === "object" &&
      envelope.channel === "request" &&
      typeof envelope.requestId === "string"
        ? envelope.requestId
        : undefined;
    if (this.hitRateLimit(rid, false)) return;

    this.routeEnvelope(data);
  }

  private handlePortMessage(event: MessageEvent) {
    const data = event.data as { channel?: string; requestId?: string } | null;
    const rid =
      data &&
      typeof data === "object" &&
      data.channel === "request" &&
      typeof data.requestId === "string"
        ? data.requestId
        : undefined;
    if (this.hitRateLimit(rid, true)) return;
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
   * Official p6e.consumeMessages residual (C-slice simplified):
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

  /** Official p6e.sendRequest residual (no timeout in residual). */
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
      // Residual: always contentWindow.postMessage (not port)
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
    this.messageCount = 0;
  }
}
