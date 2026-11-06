/**
 * Official index-BELz `Grt` shell-run store (c119 `Ts`).
 *
 *   queueCommand(sessionId, cmd) → pendingCommand:{sessionId, command:`${cmd}\r`}
 *   runInline(id, sessionId, cmd) → pendingCommand + inlineRun (fence paint)
 *   BR default tab writes after onPtyReady, then clearPendingCommand.
 *   PTY cache subscription appendInlineOutput / setInlineError("Shell exited").
 *
 * Play `kb/xewgjJn` uses runInline + setSidePane("terminal").
 * `.cast` open uses queueCommand(`asciinema play -- '${path}'`).
 */
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import {
  OFFICIAL_DEFAULT_TERMINAL_TAB_ID,
  officialTerminalPtyKey,
} from "./officialEpitaxyTerminalTabsStore";

export const OFFICIAL_INLINE_RUN_OUTPUT_CAP = 102400;
export const OFFICIAL_INLINE_RUN_SETTLE_MS = 750;

export type OfficialPendingShellCommand = {
  command: string;
  sessionId: string;
};

export type OfficialInlineRun = {
  error: string | null;
  id: string;
  output: string;
  prevOutput: string | null;
  sessionId: string;
  settled: boolean;
};

type OfficialEpitaxyShellRunState = {
  appendInlineOutput: (sessionId: string, data: string) => void;
  cancelInlineRun: () => void;
  clearPendingCommand: () => void;
  /** Official gt.current — default-tab BR already onPtyReady for this session. */
  defaultTabReadySessionId: string | null;
  inlineRun: OfficialInlineRun | null;
  markDefaultTabReady: (sessionId: string) => void;
  pendingCommand: OfficialPendingShellCommand | null;
  queueCommand: (sessionId: string, command: string) => void;
  runInline: (id: string, sessionId: string, command: string) => void;
  setInlineError: (sessionId: string, error: string) => void;
};

let officialInlineRunSettleTimer: ReturnType<typeof setTimeout> | undefined;

function clearOfficialInlineRunSettleTimer() {
  if (officialInlineRunSettleTimer !== undefined) {
    clearTimeout(officialInlineRunSettleTimer);
    officialInlineRunSettleTimer = undefined;
  }
}

export const officialEpitaxyShellRunStore = createStore<OfficialEpitaxyShellRunState>()((set, get) => ({
  defaultTabReadySessionId: null,
  pendingCommand: null,
  inlineRun: null,
  queueCommand: (sessionId, command) => {
    set({
      pendingCommand: { sessionId, command: `${command}\r` },
    });
  },
  runInline: (id, sessionId, command) => {
    clearOfficialInlineRunSettleTimer();
    const prev = get().inlineRun;
    set({
      pendingCommand: { sessionId, command: `${command}\r` },
      inlineRun: {
        id,
        sessionId,
        output: "",
        error: null,
        settled: false,
        prevOutput: prev?.id === id && prev.output ? prev.output : null,
      },
    });
  },
  appendInlineOutput: (sessionId, data) => {
    const current = get().inlineRun;
    if (!current || current.sessionId !== sessionId || current.settled) return;
    const output = (current.output + data).slice(-OFFICIAL_INLINE_RUN_OUTPUT_CAP);
    set({ inlineRun: { ...current, output } });
    clearOfficialInlineRunSettleTimer();
    officialInlineRunSettleTimer = setTimeout(() => {
      const next = get().inlineRun;
      if (next && next.sessionId === sessionId) {
        set({ inlineRun: { ...next, settled: true, prevOutput: null } });
      }
    }, OFFICIAL_INLINE_RUN_SETTLE_MS);
  },
  setInlineError: (sessionId, error) => {
    const current = get().inlineRun;
    if (!current || current.sessionId !== sessionId || current.output) return;
    const pending = get().pendingCommand;
    set({
      inlineRun: { ...current, error, settled: true },
      pendingCommand: pending?.sessionId === sessionId ? null : pending,
    });
  },
  clearPendingCommand: () => set({ pendingCommand: null }),
  cancelInlineRun: () => {
    clearOfficialInlineRunSettleTimer();
    const current = get().inlineRun;
    const pending = get().pendingCommand;
    set({
      pendingCommand: pending?.sessionId === current?.sessionId ? null : pending,
      inlineRun: current ? { ...current, settled: true, prevOutput: null } : null,
    });
  },
  markDefaultTabReady: (sessionId) => set({ defaultTabReadySessionId: sessionId }),
}));

export function useOfficialPendingShellCommand(sessionId: string | undefined) {
  return useStore(officialEpitaxyShellRunStore, (state) =>
    sessionId && state.pendingCommand?.sessionId === sessionId ? state.pendingCommand : null,
  );
}

/**
 * Stable idle snapshot for OfficialAssistantCodeFence.
 * Returning a fresh `{ error:null, output:null, running:false }` every select tick
 * forceStoreRerenders every code fence → Ho Maximum update depth.
 */
export const OFFICIAL_IDLE_INLINE_RUN = {
  error: null as string | null,
  output: null as string | null,
  running: false,
};

export function useOfficialInlineRunForFence(runId: string) {
  return useStore(officialEpitaxyShellRunStore, (state) => {
    if (state.inlineRun?.id !== runId) return OFFICIAL_IDLE_INLINE_RUN;
    const run = state.inlineRun;
    return {
      error: run.error,
      output: run.prevOutput ?? run.output,
      running: !run.settled,
    };
  });
}

export function officialFlushPendingShellCommand(
  sessionId: string,
  write: (ptyKey: string, data: string) => void,
) {
  const pending = officialEpitaxyShellRunStore.getState().pendingCommand;
  if (!pending || pending.sessionId !== sessionId) return false;
  write(officialTerminalPtyKey(sessionId, OFFICIAL_DEFAULT_TERMINAL_TAB_ID), pending.command);
  officialEpitaxyShellRunStore.getState().clearPendingCommand();
  return true;
}

/** Official ab trailing-prompt strip of inlineRun output. */
export function officialStripInlineRunTrailingPrompt(output: string | null | undefined): string | null {
  if (!output) return null;
  const lines = output.replace(/\r\n?/g, "\n").trimStart().trimEnd().split("\n");
  const trim = (line: string) => line.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "").trim();
  let prompt: string | null = null;
  let cut = lines.length;
  let end = lines.length;
  let repeats = 0;
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const cleaned = trim(lines[i]!);
    if (cleaned === "") continue;
    if (prompt !== null) {
      if (cleaned !== prompt) break;
      repeats += 1;
      end = i + 1;
      cut = i;
    } else {
      prompt = cleaned;
      cut = i;
      end = i + 1;
    }
  }
  if (repeats > 0) end = cut;
  return lines.slice(0, end).join("\n").trimEnd();
}

export function officialAsciinemaPlayCommand(absPath: string): string {
  const quoted = absPath.replace(/'/g, "'\\''");
  return `asciinema play -- '${quoted}'`;
}

export function resetOfficialEpitaxyShellRunStoreForTests() {
  clearTimeout(officialInlineRunSettleTimer);
  officialInlineRunSettleTimer = undefined;
  officialEpitaxyShellRunStore.setState({
    defaultTabReadySessionId: null,
    inlineRun: null,
    pendingCommand: null,
  });
}
