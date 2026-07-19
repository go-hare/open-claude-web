/**
 * Official shell PTY side-pane (Views → Terminal) + module-level terminal cache.
 * Extracted from EpitaxySessionTile — behavior unchanged.
 */
import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import type { LocalSessionsBridge } from "../../../adapters/desktopBridge/types";
import { Icon } from "../../../shell/icons";

type EpitaxySessionRef = {
  id: string;
  type: "local" | "remote" | "bridge";
};

type OfficialShellTerminalEntry = {
  closed: boolean;
  fitAddon: FitAddon;
  fitted: boolean;
  host: HTMLDivElement;
  pendingReplay?: string;
  ptyStarted: boolean;
  terminal: Terminal;
  transport: LocalSessionsBridge;
};

const officialShellTerminalCache = new Map<string, OfficialShellTerminalEntry>();
const officialShellSubscribedBridges = new WeakSet<LocalSessionsBridge>();
const officialShellTerminalCacheLimit = 16;

const terminalReconnectReplay =
  "\x1b[3J\x1b[2J\x1b[H\x1b[2m[shell reconnected — replaying buffered output]\x1b[0m\r\n";

const officialLightTerminalTheme = {
  background: "#ffffff",
  foreground: "#1a1a1a",
  cursor: "#0073e6",
  cursorAccent: "#ffffff",
  black: "#1a1a1a",
  red: "#ff3a30",
  green: "#1e9e3c",
  yellow: "#98801f",
  blue: "#0073e6",
  magenta: "#cd2054",
  cyan: "#8e6bd9",
  white: "#999999",
  brightBlack: "#666666",
  brightRed: "#ff5047",
  brightGreen: "#1e9e3c",
  brightYellow: "#98801f",
  brightBlue: "#0078f0",
  brightMagenta: "#cd2054",
  brightCyan: "#8e6bd9",
  brightWhite: "#d6d6d6",
};

function ensureOfficialShellBridgeSubscription(bridge: LocalSessionsBridge) {
  if (officialShellSubscribedBridges.has(bridge)) return;
  officialShellSubscribedBridges.add(bridge);
  bridge.onShellPtyEvent?.((event) => {
    const entry = officialShellTerminalCache.get(event.sessionId);
    if (!entry) return;
    if (event.type === "shell_pty_data" && event.data) {
      if (entry.fitted) entry.terminal.write(event.data);
      else entry.pendingReplay = (entry.pendingReplay ?? "") + event.data;
      return;
    }
    if (event.type === "shell_pty_close") {
      entry.closed = true;
      entry.terminal.dispose();
      officialShellTerminalCache.delete(event.sessionId);
    }
  });
}

function disposeOfficialShellTerminal(ptyKey: string, stopPty = false) {
  const entry = officialShellTerminalCache.get(ptyKey);
  if (!entry) return;
  if (stopPty && entry.ptyStarted) void entry.transport.stopShellPty?.(ptyKey);
  entry.terminal.dispose();
  entry.host.remove();
  officialShellTerminalCache.delete(ptyKey);
}

function replayOfficialShellBuffer(entry: OfficialShellTerminalEntry, buffered: string | undefined) {
  if (buffered === undefined) return;
  entry.terminal.write(terminalReconnectReplay + buffered);
}

async function ensureOfficialShellTerminal(ptyKey: string, bridge: LocalSessionsBridge): Promise<OfficialShellTerminalEntry> {
  ensureOfficialShellBridgeSubscription(bridge);
  const cached = officialShellTerminalCache.get(ptyKey);
  if (cached && !cached.closed) {
    officialShellTerminalCache.delete(ptyKey);
    officialShellTerminalCache.set(ptyKey, cached);
    return cached;
  }
  if (cached) disposeOfficialShellTerminal(ptyKey);
  if (officialShellTerminalCache.size >= officialShellTerminalCacheLimit) {
    const oldestKey = officialShellTerminalCache.keys().next().value;
    if (oldestKey !== undefined) disposeOfficialShellTerminal(oldestKey, true);
  }

  const host = document.createElement("div");
  host.style.height = "100%";
  host.style.width = "100%";
  const terminal = new Terminal({
    cursorBlink: true,
    fontFamily: '"SF Mono", Menlo, Monaco, "Courier New", monospace',
    fontSize: 12,
    scrollback: 1000,
    theme: officialLightTerminalTheme,
  });
  terminal.attachCustomKeyEventHandler((event) => {
    if (event.type !== "keydown") return true;
    if (event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.code === "Backquote") return false;
    if (event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && (event.code === "BracketLeft" || event.code === "BracketRight")) {
      event.preventDefault();
      if (!event.repeat) {
        if (event.code === "BracketLeft") window.history.back();
        else window.history.forward();
      }
      return false;
    }
    if ((event.metaKey || (event.ctrlKey && event.shiftKey)) && event.code === "KeyC" && terminal.hasSelection()) {
      event.preventDefault();
      void navigator.clipboard.writeText(terminal.getSelection()).catch(() => {});
      return false;
    }
    return true;
  });
  const fitAddon = new FitAddon();
  terminal.loadAddon(fitAddon);
  terminal.open(host);
  try {
    const webglAddon = new WebglAddon();
    webglAddon.onContextLoss(() => webglAddon.dispose());
    terminal.loadAddon(webglAddon);
  } catch (error) {
    console.warn("WebGL terminal renderer unavailable, using DOM", error);
  }
  terminal.onData((data) => {
    void bridge.writeShellPty?.(ptyKey, data);
  });
  const entry: OfficialShellTerminalEntry = { closed: false, fitAddon, fitted: false, host, ptyStarted: false, terminal, transport: bridge };
  officialShellTerminalCache.set(ptyKey, entry);
  return entry;
}

function officialShellPtyError(error: string | undefined, ptyKey: string, sessionId: string) {
  return ptyKey !== sessionId && error === "Session not found"
    ? "Additional terminal tabs require a newer Claude desktop app. Restart Claude to update."
    : error ?? "Failed to start shell";
}

/**
 * Official ShellTerminal (c6bf19e8f): selection → floating "Ask about this" when onTerminalSelection provided.
 * Side Terminal pane passes attachAsContext as onTerminalSelection (official onTerminalSelection prop).
 */
export function OfficialShellPtyPane({
  bridge,
  onTerminalSelection,
  ptyKey,
  sessionRef,
}: {
  bridge: LocalSessionsBridge;
  /** Official onTerminalSelection — selection text → Ask about this. */
  onTerminalSelection?: (text: string) => void;
  ptyKey: string;
  sessionRef: EpitaxySessionRef;
}) {
  const [closed, setClosed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restartNonce, setRestartNonce] = useState(0);
  const [selectionAnchor, setSelectionAnchor] = useState<{ x: number; y: number } | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<OfficialShellTerminalEntry | null>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  // Keep last non-empty selection text — button mousedown can clear xterm selection before click.
  const lastSelectionTextRef = useRef("");
  const onTerminalSelectionRef = useRef(onTerminalSelection);
  onTerminalSelectionRef.current = onTerminalSelection;

  useEffect(() => {
    let alive = true;
    let resizeFrame = 0;
    let resizeObserver: ResizeObserver | null = null;
    let selectionDisposable: { dispose: () => void } | undefined;
    setClosed(false);
    setError(null);
    setSelectionAnchor(null);
    hostRef.current?.replaceChildren();

    const closeUnsubscribe = bridge.onShellPtyEvent?.((event) => {
      if (event.sessionId === ptyKey && event.type === "shell_pty_close") setClosed(true);
    });

    const refitAndStart = () => {
      resizeFrame = 0;
      const entry = terminalRef.current;
      if (!alive || !entry || entry.closed || !hostRef.current || hostRef.current.offsetHeight === 0) return;
      try {
        entry.fitAddon.fit();
      } catch {
        return;
      }
      const { cols, rows } = entry.terminal;
      if (cols <= 0 || rows <= 0) return;
      entry.fitted = true;
      if (entry.ptyStarted) {
        void bridge.resizeShellPty?.(ptyKey, cols, rows);
        if (entry.pendingReplay !== undefined) {
          entry.terminal.write(entry.pendingReplay);
          entry.pendingReplay = undefined;
          entry.terminal.focus();
        }
        return;
      }
      entry.ptyStarted = true;
      void bridge
        .startShellPty?.(ptyKey, cols, rows)
        .then((result) => {
          if (!alive) return;
          if (!result?.ok) {
            entry.ptyStarted = false;
            setError(officialShellPtyError(result?.error, ptyKey, sessionRef.id));
            return;
          }
          replayOfficialShellBuffer(entry, result.buffered);
          if (entry.pendingReplay !== undefined) {
            entry.terminal.write(entry.pendingReplay);
            entry.pendingReplay = undefined;
          }
          entry.terminal.focus();
        })
        .catch(() => {
          entry.ptyStarted = false;
          if (alive) setError("Failed to start shell");
        });
    };

    ensureOfficialShellTerminal(ptyKey, bridge)
      .then((entry) => {
        if (!alive || !hostRef.current) return;
        terminalRef.current = entry;
        hostRef.current.replaceChildren(entry.host);
        setClosed(entry.closed);
        if (entry.closed) return;
        // Official: onSelectionChange → hasSelection ? P(pointer) : P(null)
        selectionDisposable = entry.terminal.onSelectionChange(() => {
          if (!alive) return;
          if (entry.terminal.hasSelection()) {
            lastSelectionTextRef.current = entry.terminal.getSelection();
            setSelectionAnchor(lastPointerRef.current);
          } else {
            setSelectionAnchor(null);
          }
        });
        resizeObserver = new ResizeObserver(() => {
          if (!resizeFrame) resizeFrame = requestAnimationFrame(refitAndStart);
        });
        resizeObserver.observe(hostRef.current);
        requestAnimationFrame(refitAndStart);
      })
      .catch((err) => {
        if (alive) setError(err instanceof Error ? err.message : "Failed to load terminal");
      });

    return () => {
      alive = false;
      closeUnsubscribe?.();
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      resizeObserver?.disconnect();
      selectionDisposable?.dispose();
      terminalRef.current?.host.remove();
      terminalRef.current = null;
      setSelectionAnchor(null);
    };
  }, [bridge, ptyKey, restartNonce, sessionRef.id]);

  const restartShell = useCallback(() => {
    disposeOfficialShellTerminal(ptyKey);
    setClosed(false);
    setError(null);
    setRestartNonce((value) => value + 1);
  }, [ptyKey]);

  // Official O: getSelection → onTerminalSelection → clearSelection
  // Prefer lastSelectionTextRef when click steals xterm selection before getSelection.
  const askAboutSelection = useCallback(() => {
    const entry = terminalRef.current;
    if (!entry || entry.closed) return;
    const text = (entry.terminal.getSelection() || lastSelectionTextRef.current).trim();
    if (!text) return;
    onTerminalSelectionRef.current?.(text);
    entry.terminal.clearSelection();
    lastSelectionTextRef.current = "";
    setSelectionAnchor(null);
  }, []);

  const onHostMouseUp = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    lastPointerRef.current = {
      x: event.clientX - rect.left,
      y: Math.max(36, event.clientY - rect.top),
    };
  }, []);

  const hidden = Boolean(error || closed);
  const showAskAbout = Boolean(selectionAnchor && onTerminalSelection && !hidden);

  return (
    <div style={{ height: "100%", padding: "var(--p6)", backgroundColor: officialLightTerminalTheme.background }} className="relative w-full">
      <div
        ref={hostRef}
        className="h-full w-full [&_.xterm-viewport]:!bg-transparent [&_textarea]:[caret-color:transparent]"
        style={{ display: hidden ? "none" : undefined }}
        onMouseDown={() => terminalRef.current?.terminal.focus()}
        onMouseUp={onHostMouseUp}
      />
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-bg-100 text-text-300">
          <p className="text-sm max-w-[320px] px-4 text-center text-balance">{error}</p>
        </div>
      ) : null}
      {!error && closed ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-g3 bg-bg-100 text-text-400">
          <p className="text-body text-t6">Shell exited.</p>
          <button
            type="button"
            onClick={restartShell}
            className="rounded-md border-0.5 border-border-300 bg-bg-000 px-3 py-1.5 text-xs text-text-200 hover:bg-bg-200 transition-colors"
          >
            Restart shell
          </button>
        </div>
      ) : null}
      {showAskAbout && selectionAnchor ? (
        <button
          type="button"
          onMouseDown={(event) => {
            // Keep xterm selection until askAboutSelection reads it.
            event.preventDefault();
          }}
          onClick={askAboutSelection}
          style={{ left: selectionAnchor.x, top: selectionAnchor.y }}
          className="absolute -translate-x-1/2 -translate-y-full -mt-2 flex items-center gap-1.5 rounded-md bg-bg-000 border-0.5 border-border-300 px-2 py-1 text-xs text-text-200 shadow-lg hover:bg-bg-100 transition-colors z-10 whitespace-nowrap"
        >
          <Icon name="Chat" size="sm" />
          Ask about this
        </button>
      ) : null}
    </div>
  );
}
