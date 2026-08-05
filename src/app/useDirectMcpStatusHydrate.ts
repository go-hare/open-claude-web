import { useEffect } from "react";
import { ensureDirectMcpHydrated } from "../features/customize/connectors/connectorsStore";

/**
 * Residual ion Rrs: app-level once-flag subscribe to
 * onOnDirectMcpServerStatusesChanged + initial getDirectMcpServerStatuses → mQe.
 * Product: hydrate Direct MCP status bag as soon as main SPA mounts (not only
 * when visiting /customize/connectors).
 */
export function useDirectMcpStatusHydrate(): void {
  useEffect(() => {
    void ensureDirectMcpHydrated().catch(() => {
      /* host may be unavailable in browser fake */
    });
  }, []);
}
