import { createElement, useCallback, useEffect, useState, type ReactNode } from "react";
import { RelaunchInterstitialOverlay } from "./RelaunchInterstitial";

type Custom3pSetupBridge = {
  confirmProcessRelaunch?: () => Promise<unknown>;
  relaunchApp?: () => Promise<unknown>;
  /**
   * Preload event subscription (settingsBridge events).
   * Main process dispatches after Setup Apply closes the small window.
   */
  applyRelaunchRequested?: (cb: (payload?: { variant?: string }) => void) => () => void;
  onApplyRelaunchRequested?: (cb: (payload?: { variant?: string }) => void) => () => void;
};

function custom3pSetupBridge(): Custom3pSetupBridge | undefined {
  return (window as unknown as { "claude.settings"?: { Custom3pSetup?: Custom3pSetupBridge } })[
    "claude.settings"
  ]?.Custom3pSetup;
}

/**
 * Official residual after Setup "Relaunch now":
 *   close Setup (main) → main SPA h2t/d2t apply countdown → process relaunch.
 *
 * Product: main process closes Setup + emits applyRelaunchRequested; this hook
 * mounts RelaunchInterstitial variant "apply" on the main product SPA, then
 * confirmProcessRelaunch (single-flight exit in main).
 *
 * Plain .ts (createElement) — open-claude-web vite/rolldown rejects JSX in .ts.
 */
export function useApplyRelaunchFromSetup(): {
  overlay: ReactNode;
} {
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const bridge = custom3pSetupBridge();
    const subscribe = bridge?.applyRelaunchRequested ?? bridge?.onApplyRelaunchRequested;
    if (!subscribe) return;
    return subscribe(() => {
      setPending(true);
    });
  }, []);

  // Also accept a same-window CustomEvent for tests / soft path.
  useEffect(() => {
    const onEvent = () => setPending(true);
    window.addEventListener("app:apply-relaunch-requested", onEvent);
    return () => window.removeEventListener("app:apply-relaunch-requested", onEvent);
  }, []);

  const onDone = useCallback(() => {
    // Keep overlay mounted until process exits (same as sign-out residual).
    const bridge = custom3pSetupBridge();
    void Promise.resolve(
      bridge?.confirmProcessRelaunch?.() ?? bridge?.relaunchApp?.(),
    ).catch(() => {
      /* process may already be exiting */
    });
  }, []);

  const onCancel = useCallback(() => {
    setPending(false);
  }, []);

  return {
    overlay: createElement(RelaunchInterstitialOverlay, {
      open: pending,
      variant: "apply",
      onDone,
      onCancel,
    }),
  };
}
