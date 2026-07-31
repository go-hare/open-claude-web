import { memo, useCallback, useEffect, useState } from "react";
import type { LocalSessionsBridge } from "../../adapters/desktopBridge/types";
import { ConfirmDialog } from "../../shell/ConfirmDialog";

/**
 * Official EpitaxyInstallGhModal residual (c11959232):
 *   Qy(cwd) = checkGhAvailable(cwd) via react-query ["epitaxy","gh-available",cwd]
 *   Yy: open when available===false && !dismissed (localStorage epitaxy-gh-install-dismissed)
 *   Xy → rp confirm: Install the GitHub CLI / Install with Homebrew | Open cli.github.com / Skip
 *   installGh only on darwin; else window.open https://cli.github.com
 *
 * Product: no react-query dependency — same open/dismiss/install side effects.
 */

const DISMISS_KEY = "epitaxy-gh-install-dismissed";

function readDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (raw === null) return false;
    return JSON.parse(raw) === true || raw === "true";
  } catch {
    return false;
  }
}

function writeDismissed(value: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DISMISS_KEY, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

/** Official en()?.platform === "darwin" residual — navigator when no process bridge. */
function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  const uaData = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
  const platform = uaData?.platform || navigator.platform || "";
  return /Mac|macOS|Macintosh/i.test(platform) || /Mac OS X/i.test(navigator.userAgent || "");
}

const INSTALL_FAIL =
  "Installation failed. Visit cli.github.com to install manually.";

type OfficialEpitaxyInstallGhModalProps = {
  bridge: LocalSessionsBridge;
  /** Official Qy / Yy cwd (repo path). */
  cwd?: string | null;
};

export const OfficialEpitaxyInstallGhModal = memo(function OfficialEpitaxyInstallGhModal({
  bridge,
  cwd,
}: OfficialEpitaxyInstallGhModalProps) {
  const [dismissed, setDismissed] = useState(readDismissed);
  const [ghAvailable, setGhAvailable] = useState<boolean | null>(null);
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);
  const isMac = isMacPlatform();

  const refreshGhAvailable = useCallback(() => {
    if (!cwd || !bridge.checkGhAvailable) {
      setGhAvailable(null);
      return;
    }
    void bridge
      .checkGhAvailable(cwd)
      .then((ok) => setGhAvailable(ok === true))
      .catch(() => setGhAvailable(false));
  }, [bridge, cwd]);

  useEffect(() => {
    let cancelled = false;
    if (!cwd || !bridge.checkGhAvailable) {
      setGhAvailable(null);
      return;
    }
    void bridge
      .checkGhAvailable(cwd)
      .then((ok) => {
        if (!cancelled) setGhAvailable(ok === true);
      })
      .catch(() => {
        if (!cancelled) setGhAvailable(false);
      });
    // Official Qy: refetchOnWindowFocus when not stably true.
    const onFocus = () => {
      if (cancelled) return;
      void bridge
        .checkGhAvailable?.(cwd)
        .then((ok) => {
          if (!cancelled) setGhAvailable(ok === true);
        })
        .catch(() => {
          if (!cancelled) setGhAvailable(false);
        });
    };
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, [bridge, cwd]);

  // Official g = !1===i && !d → open when explicitly false and not dismissed.
  const isOpen = ghAvailable === false && !dismissed && Boolean(cwd);

  const onClose = useCallback(() => {
    setDismissed(true);
    writeDismissed(true);
    setInstallError(null);
  }, []);

  const onConfirm = useCallback(() => {
    // Official: non-darwin or missing installGh → open docs + dismiss.
    if (!isMac || !bridge.installGh) {
      window.open("https://cli.github.com", "_blank", "noopener");
      onClose();
      return;
    }
    setInstallError(null);
    setInstalling(true);
    void bridge
      .installGh()
      .then((result) => {
        const bag = result && typeof result === "object" ? (result as { success?: unknown; error?: unknown }) : null;
        const success = result === true || bag?.success === true;
        if (success) {
          // Official: setQueriesData(["epitaxy","gh-available"], true) then dismiss.
          setGhAvailable(true);
          onClose();
          refreshGhAvailable();
          return;
        }
        const err = typeof bag?.error === "string" && bag.error ? bag.error : INSTALL_FAIL;
        setInstallError(err);
      })
      .catch(() => {
        setInstallError(INSTALL_FAIL);
      })
      .finally(() => {
        setInstalling(false);
      });
  }, [bridge, isMac, onClose, refreshGhAvailable]);

  if (!cwd) return null;

  const confirmText = installing
    ? "Installing…"
    : isMac
      ? "Install with Homebrew"
      : "Open cli.github.com";

  return (
    <ConfirmDialog
      cancelText="Skip"
      closeOnConfirm={false}
      confirmText={confirmText}
      disabled={installing}
      isOpen={isOpen}
      message="The GitHub CLI enables creating PRs, monitoring CI, and merging directly from the desktop app."
      onClose={onClose}
      onConfirm={onConfirm}
      title="Install the GitHub CLI"
      variant="default"
    >
      {installError ? (
        <p className="text-body text-[var(--core-red)] mt-2">{installError}</p>
      ) : null}
    </ConfirmDialog>
  );
});
