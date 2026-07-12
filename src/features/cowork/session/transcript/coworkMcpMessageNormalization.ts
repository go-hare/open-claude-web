import type { CoworkMcpToolMatch } from "../mcp/coworkMcpRegistryStore";
import { asRecord, stringValue } from "../recordUtils";
import type { CoworkContentBlock, CoworkMessageStoreOptions } from "./coworkMessageTypes";

const mcpAuthErrorCodes = new Set([
  "mcp_auth_required",
  "mcp_unauthorized",
  "mcp_unauthorized_no_token",
  "mcp_unauthorized_after_token_refresh",
  "mcp_oauth_token_refresh_failed",
  "mcp_oauth_no_refresh_token",
  "mcp_invalid_oauth_token",
  "mcp_insufficient_scope",
]);

export function markCoworkMcpApp(
  block: CoworkContentBlock,
  lookupMcpTool?: CoworkMessageStoreOptions["lookupMcpTool"],
) {
  if (block.is_mcp_app || !isMcpApp(block.name, lookupMcpTool)) return block;
  return { ...block, is_mcp_app: true };
}

export function syntheticCoworkReconnectBlocks(
  tool: CoworkContentBlock,
  result: CoworkContentBlock | undefined,
  options: CoworkMessageStoreOptions,
  serverUuids: Set<string>,
  isLive: boolean,
): CoworkContentBlock[] {
  if (!options.syntheticReconnectEnabled || !tool.id || !tool.name || !result) return [];
  const errorCode = stringValue(asRecord(result.meta).anthropic_error_code);
  if (!errorCode || !mcpAuthErrorCodes.has(errorCode)) return [];
  const match = options.lookupMcpTool?.(tool.name);
  if (!match || match.server.type !== "remote" || serverUuids.has(match.server.uuid)) return [];
  serverUuids.add(match.server.uuid);
  if (isLive) options.reportedAuthErrorBlockIds?.add(tool.id);
  return createReconnectBlocks(tool.id, errorCode, match, isLive);
}

function isMcpApp(
  toolName: string | undefined,
  lookupMcpTool?: CoworkMessageStoreOptions["lookupMcpTool"],
) {
  if (!toolName || !(toolName.includes(":") || toolName.startsWith("mcp__"))) return false;
  const meta = lookupMcpTool?.(toolName)?.tool._meta;
  const resourceUri = asRecord(meta?.ui).resourceUri ?? meta?.["ui/resourceUri"];
  return typeof resourceUri === "string" && resourceUri.startsWith("ui://");
}

function createReconnectBlocks(
  toolUseId: string,
  errorCode: string,
  match: CoworkMcpToolMatch,
  isLive: boolean,
): CoworkContentBlock[] {
  const id = `synthetic-reconnect-${toolUseId}`;
  const server = match.server;
  const payload = {
    connectors: [{
      connected: false,
      description: "",
      directoryUuid: server.uuid,
      iconUrl: server.iconSrc,
      name: server.name,
      url: server.url,
    }],
    keywords: [],
    _authErrorOverride: { errorCode, isLive, serverUuid: server.uuid },
  };
  return [
    { id, input: { uuids: [server.uuid] }, name: "suggest_connectors", type: "tool_use" },
    {
      content: [{ text: JSON.stringify(payload), type: "text" }],
      is_error: false,
      name: "suggest_connectors",
      tool_use_id: id,
      type: "tool_result",
    },
  ];
}
