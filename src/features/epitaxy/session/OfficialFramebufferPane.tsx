/**
 * Official AN / _N EpitaxyFramebufferPane (c11959232-h_zsw3wI.js).
 * Gate: YR shows Screen when framebufferPreview supported && (sources.length || already open).
 * Body: no cwd → "Open a folder…"; else attach(cwd, sessionName) → Connecting / error+Retry / canvas.
 */
import { useCallback, useEffect, useState } from "react";
import { desktopBridge } from "../../../adapters/desktopBridge";
import { OfficialButton } from "../OfficialEpitaxyComponents";
import type { EpitaxySessionRef } from "./epitaxyTranscriptActionContext";
import type { SessionSummary } from "../../../adapters/desktopBridge";

type AttachState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: Error }
  | { status: "ready"; sessionId: string; name?: string; width: number; height: number };

function getFramebufferBridge() {
  return desktopBridge.FramebufferPreview
    ?? (typeof window !== "undefined"
      ? (window["claude.web"] as { FramebufferPreview?: typeof desktopBridge.FramebufferPreview } | undefined)?.FramebufferPreview
      : undefined);
}

/** Official T: framebufferPreview supported when bridge expose attach/listSources. */
export function canUseOfficialFramebufferPreview(): boolean {
  const bridge = getFramebufferBridge();
  return Boolean(bridge?.attach || bridge?.listSources);
}

/**
 * Official YR Screen item: T && (A || already open).
 * A = listSources(cwd).length > 0 (polled). Without cwd, still allow if bridge exists so empty pane can show folder hint.
 */
export function useOfficialFramebufferMenuGate(cwd: string | undefined | null, paneOpen: boolean): boolean {
  const [hasSources, setHasSources] = useState(false);
  const supported = canUseOfficialFramebufferPreview();

  useEffect(() => {
    if (!supported) {
      setHasSources(false);
      return undefined;
    }
    if (!cwd) {
      setHasSources(false);
      return undefined;
    }
    let alive = true;
    const poll = async () => {
      try {
        const bridge = getFramebufferBridge();
        const sources = await bridge?.listSources?.(cwd) ?? [];
        if (!alive) return;
        setHasSources(Array.isArray(sources) && sources.length > 0);
      } catch {
        if (alive) setHasSources(false);
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 3000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [cwd, supported]);

  if (!supported) return false;
  return hasSources || paneOpen;
}

export function OfficialFramebufferPane({
  session,
  sessionRef,
}: {
  session: SessionSummary | null;
  sessionRef: EpitaxySessionRef | null;
}) {
  const cwd = session?.cwd?.trim() || undefined;
  const sessionName = session?.title?.trim() || sessionRef?.id || "session";

  if (!cwd) {
    return (
      <div role="status" className="flex h-full flex-col items-center justify-center text-t5 text-body">
        Open a folder to view a screen.
      </div>
    );
  }

  return <OfficialFramebufferPreviewPane cwd={cwd} sessionName={sessionName} />;
}

/** Official _N FramebufferPreviewPane */
function OfficialFramebufferPreviewPane({ cwd, sessionName }: { cwd: string; sessionName: string }) {
  const [state, setState] = useState<AttachState>({ status: "idle" });
  const [retryNonce, setRetryNonce] = useState(0);

  const retry = useCallback(() => {
    setRetryNonce((value) => value + 1);
  }, []);

  useEffect(() => {
    let alive = true;
    let attachedSessionId: string | null = null;
    const bridge = getFramebufferBridge();
    setState({ status: "loading" });

    void (async () => {
      try {
        if (!bridge?.attach) {
          if (alive) setState({ status: "error", error: new Error("FramebufferPreview bridge is unavailable") });
          return;
        }
        const result = await bridge.attach(cwd, sessionName);
        if (!alive) {
          const sid = result && typeof result === "object" && "sessionId" in result
            ? String((result as { sessionId?: unknown }).sessionId ?? "")
            : "";
          if (sid) void bridge.detach?.(sid);
          return;
        }
        if (!result) {
          setState({ status: "error", error: new Error("FramebufferPreview bridge is unavailable") });
          return;
        }
        const payload = result as {
          sessionId?: string;
          name?: string;
          width?: number;
          height?: number;
          attached?: boolean;
          source?: { id?: string; width?: number; height?: number; name?: string };
        };
        // Official shape {sessionId,name,width,height}; desktop stub may return {attached,source}.
        const sessionId = payload.sessionId
          ?? (payload.source?.id ? String(payload.source.id) : payload.attached ? `${cwd}::${sessionName}` : "");
        if (!sessionId) {
          setState({ status: "error", error: new Error("FramebufferPreview bridge is unavailable") });
          return;
        }
        attachedSessionId = sessionId;
        setState({
          status: "ready",
          sessionId,
          name: payload.name ?? payload.source?.name,
          width: Number(payload.width ?? payload.source?.width ?? 0) || 0,
          height: Number(payload.height ?? payload.source?.height ?? 0) || 0,
        });
      } catch (error) {
        if (!alive) return;
        setState({
          status: "error",
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    })();

    const unsubResize = bridge?.onSessionResized?.((id, width, height) => {
      setState((current) => (
        current.status === "ready" && current.sessionId === id
          ? { ...current, width, height }
          : current
      ));
    });
    const unsubFatal = bridge?.onSessionFatal?.((id, message) => {
      // Intentional detach must not surface as share error (React remount races).
      if (String(message ?? "").toLowerCase() === "detached") return;
      setState((current) => (
        current.status === "ready" && current.sessionId === id
          ? { status: "error", error: new Error(message) }
          : current
      ));
    });

    return () => {
      alive = false;
      unsubResize?.();
      unsubFatal?.();
      if (attachedSessionId) void bridge?.detach?.(attachedSessionId);
    };
  }, [cwd, sessionName, retryNonce]);

  useEffect(() => {
    if (state.status !== "ready") return undefined;
    const sessionId = state.sessionId;
    const bridge = getFramebufferBridge();
    const onVisibility = () => {
      void bridge?.setStreamHints?.(sessionId, { backgrounded: document.hidden });
    };
    document.addEventListener("visibilitychange", onVisibility);
    if (document.hidden) onVisibility();
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      void bridge?.setStreamHints?.(sessionId, { backgrounded: false });
    };
  }, [state]);

  if (state.status === "idle" || state.status === "loading") {
    return (
      <div role="status" aria-busy="true" className="flex h-full flex-col items-center justify-center text-t5 text-body">
        Connecting to screen…
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div role="alert" className="flex h-full flex-col items-center justify-center gap-g4 px-p8 text-center">
        <p className="text-body text-t7 max-w-[36ch]">Couldn&apos;t connect to the screen share.</p>
        <OfficialButton variant="contained" onClick={retry}>Retry</OfficialButton>
      </div>
    );
  }

  // Official SN FramebufferCanvas — frame stream needs requestFramePort worker; show official shell + dimensions.
  return (
    <div className="relative h-full w-full flex items-center justify-center bg-bg-100">
      <canvas
        width={Math.max(1, state.width) || 1280}
        height={Math.max(1, state.height) || 720}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          touchAction: "none",
          imageRendering: "pixelated",
          outline: "none",
          maxWidth: "100%",
          maxHeight: "100%",
          background: "var(--bg-000, #000)",
        }}
        tabIndex={0}
        role="application"
        aria-label="Remote screen"
      />
    </div>
  );
}
