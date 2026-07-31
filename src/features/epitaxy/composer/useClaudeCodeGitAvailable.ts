import { useEffect, useState } from "react";

/**
 * Official index-BELzQL5P `s7t` residual (exported as `qU` / c119 `Xr`):
 * cT = globalThis["claude.web"]?.ClaudeCode
 * checkGitAvailable().then(s => s.available) → boolean | null while unknown.
 * null = probe missing or pending (do not show bi gate).
 */
type ClaudeCodeGitBridge = {
  checkGitAvailable?: () => Promise<{ available?: boolean } | boolean | null | undefined>;
};

export function useClaudeCodeGitAvailable(): boolean | null {
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    const claudeCode = (window["claude.web"] as { ClaudeCode?: ClaudeCodeGitBridge } | undefined)
      ?.ClaudeCode;
    if (!claudeCode?.checkGitAvailable) {
      setAvailable(null);
      return undefined;
    }
    let cancelled = false;
    void claudeCode
      .checkGitAvailable()
      .then((result) => {
        if (cancelled) return;
        if (typeof result === "boolean") {
          setAvailable(result);
          return;
        }
        if (result && typeof result === "object" && typeof result.available === "boolean") {
          setAvailable(result.available);
          return;
        }
        setAvailable(null);
      })
      .catch(() => {
        if (!cancelled) setAvailable(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return available;
}
