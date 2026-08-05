/**
 * Official customize connectors list item shape (c63a78ed4 Ht/Rt/Vt).
 * Host-loop Direct MCP statuses (residual mQe) merge into this list for
 * remote URL remotes; local-custom entries use the same surface fields.
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
  source: "local-custom" | "integration" | "extension" | "mcp" | "direct-mcp";
  /** Residual Direct MCP: OAuth configured / authorized (hasAuth). */
  hasAuth?: boolean;
  /** Residual pending OAuth park: hasAuth && !isConnected. */
  needsAuth?: boolean;
  /** Direct MCP tool names (status bag tools). */
  tools?: Array<{ name: string; description?: string; displayName?: string }>;
  error?: string;
  /** Server name used for authorize/disconnect (residual cQe map value). */
  serverName?: string;
};

export type ConnectorsLoadState = "ready" | "loading" | "error";
