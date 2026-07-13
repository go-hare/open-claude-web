/**
 * Official customize connectors list item shape (c63a78ed4 Ht/Rt/Vt).
 * Host-loop has no full MCP directory yet; local custom entries use the same
 * surface fields so empty → list transitions match official layout.
 */
export type ConnectorListItem = {
  id: string;
  name: string;
  description?: string;
  isConnected: boolean;
  /** Official iconType: syncSource | extension | remote/custom MCP. */
  iconType: "syncSource" | "extension" | "mcp";
  iconSrc?: string;
  searchTerms?: string[];
  /** Local-only custom connector URL (Add custom connector modal). */
  url?: string;
  source: "local-custom" | "integration" | "extension" | "mcp";
};

export type ConnectorsLoadState = "ready" | "loading" | "error";
