import { createStore, type StoreApi } from "zustand/vanilla";

export type CoworkMcpTool = {
  _meta?: Record<string, unknown>;
  alwaysApprovedKey?: string;
  annotations?: Record<string, unknown>;
  description?: string;
  displayName?: string;
  enabledKey?: string;
  inputSchema?: Record<string, unknown>;
  name: string;
};

export type CoworkMcpServer = {
  iconSrc?: string;
  iconType: "external" | "favicon" | "syncSource";
  isBuiltIn?: boolean;
  name: string;
  type: "local" | "remote";
  url?: string;
  uuid: string;
};

export type CoworkMcpToolMatch = {
  server: CoworkMcpServer;
  tool: CoworkMcpTool;
};

type CoworkLocalClient = {
  isBuiltIn?: boolean;
  uuid?: string;
};

type CoworkRemoteServer = {
  name: string;
  url: string;
  uuid: string;
};

type CoworkRemoteDirectory = {
  iconUrl?: string;
};

export type CoworkMcpRegistryState = {
  getMcpApp: (
    toolName: string,
  ) => { serverUuid: string; toolName: string } | undefined;
  localClients: Record<string, CoworkLocalClient>;
  localTools: Record<string, CoworkMcpTool[]>;
  lookupTool: (toolName?: string) => CoworkMcpToolMatch | undefined;
  remoteDirectories: Record<string, CoworkRemoteDirectory>;
  remoteServers: Record<string, CoworkRemoteServer>;
  remoteTools: Record<string, CoworkMcpTool[]>;
  setLocalClient: (serverName: string, client: CoworkLocalClient) => void;
  setLocalTools: (serverName: string, tools: CoworkMcpTool[]) => void;
  setRemoteDirectory: (
    serverKey: string,
    directory?: CoworkRemoteDirectory,
  ) => void;
  setRemoteServer: (serverKey: string, server: CoworkRemoteServer) => void;
  setRemoteTools: (serverKey: string, tools: CoworkMcpTool[]) => void;
};

export type CoworkMcpRegistryStore = StoreApi<CoworkMcpRegistryState>;

const syncSourceServers = {
  "83fd827c-458e-5143-b2ff-484904737d48": {
    name: "Gmail",
    syncSourceType: "gmail",
  },
  "91beb235-2b5a-506c-ad07-d930c1119fcb": {
    name: "Google Calendar",
    syncSourceType: "gcal",
  },
  "c1fc4002-5f49-5f9d-a4e5-93c4ef5d6a75": {
    name: "Google Drive",
    syncSourceType: "gdrive",
  },
} as const;

function normalizedServerName(name: string): string {
  return name.replace(/[ :]/g, "_");
}

function hasImageIcon(iconUrl: string): boolean {
  if (iconUrl.startsWith("data:image/")) return true;
  if (
    iconUrl.startsWith("https://www.google.com/s2/favicons") ||
    iconUrl.startsWith("https://t0.gstatic.com/faviconV2")
  ) {
    return true;
  }
  try {
    return /\.(svg|png|jpe?g|gif|ico|webp)$/i.test(new URL(iconUrl).pathname);
  } catch {
    return false;
  }
}

function remoteIcon(iconUrl?: string, serverUrl?: string) {
  if (iconUrl && hasImageIcon(iconUrl)) {
    return { iconSrc: iconUrl, iconType: "external" as const };
  }
  return { iconSrc: iconUrl ?? serverUrl, iconType: "favicon" as const };
}

function localToolMatch(
  state: CoworkMcpRegistryState,
  toolName: string,
): CoworkMcpToolMatch | undefined {
  for (const [serverName, tools] of Object.entries(state.localTools)) {
    const normalized = normalizedServerName(serverName);
    const tool = tools.find(
      (item) =>
        `${serverName}:${item.name}` === toolName ||
        `mcp__local_${normalized}__${item.name}` === toolName ||
        `mcp__internal_${normalized}__${item.name}` === toolName ||
        `mcp__${normalized}__${item.name}` === toolName ||
        `mcp__remote-devices__${normalized}__${item.name}` === toolName,
    );
    if (!tool) continue;
    const client = state.localClients[serverName];
    return {
      server: {
        iconSrc: undefined,
        iconType: "external",
        isBuiltIn: client?.isBuiltIn ?? false,
        name: serverName.replace(/^plugin:/, ""),
        type: "local",
        uuid: client?.uuid ?? serverName,
      },
      tool,
    };
  }
}

function remoteToolMatch(
  state: CoworkMcpRegistryState,
  toolName: string,
): CoworkMcpToolMatch | undefined {
  for (const [serverKey, server] of Object.entries(state.remoteServers)) {
    const normalized = normalizedServerName(server.name);
    const tool = state.remoteTools[serverKey]?.find(
      (item) =>
        `${server.name}:${item.name}` === toolName ||
        `mcp__${server.uuid}__${item.name}` === toolName ||
        `mcp__${normalized}__${item.name}` === toolName,
    );
    if (!tool) continue;
    const directory = state.remoteDirectories[serverKey];
    return {
      server: {
        ...remoteIcon(directory?.iconUrl, server.url),
        name: server.name,
        type: "remote",
        url: server.url,
        uuid: serverKey,
      },
      tool,
    };
  }
}

function syncSourceToolMatch(toolName: string): CoworkMcpToolMatch | undefined {
  for (const [serverUuid, server] of Object.entries(syncSourceServers)) {
    const prefix = `mcp__${serverUuid}__`;
    if (!toolName.includes(prefix)) continue;
    const name = toolName.slice(prefix.length);
    const key = `${serverUuid}:${name}`;
    return {
      server: {
        iconSrc: server.syncSourceType,
        iconType: "syncSource",
        name: server.name,
        type: "remote",
        uuid: serverUuid,
      },
      tool: {
        alwaysApprovedKey: key,
        description: "",
        displayName: name,
        enabledKey: key,
        inputSchema: { type: "object" },
        name,
      },
    };
  }
}

function uiResourceUri(tool: CoworkMcpTool): string | undefined {
  const meta = tool._meta;
  const ui = meta?.ui;
  let resourceUri =
    typeof ui === "object" && ui !== null
      ? (ui as Record<string, unknown>).resourceUri
      : undefined;
  resourceUri ??= meta?.["ui/resourceUri"];
  if (typeof resourceUri === "string" && resourceUri.startsWith("ui://")) {
    return resourceUri;
  }
  if (resourceUri !== undefined) {
    throw new Error(`Invalid UI resource URI: ${JSON.stringify(resourceUri)}`);
  }
}

function isMcpToolName(toolName: string): boolean {
  return toolName.includes(":") || toolName.startsWith("mcp__");
}

function mcpAppForTool(
  toolName: string,
  lookupTool: CoworkMcpRegistryState["lookupTool"],
) {
  if (!isMcpToolName(toolName)) return undefined;
  const match = lookupTool(toolName);
  try {
    const resourceUri = match?.tool ? uiResourceUri(match.tool) : undefined;
    return typeof resourceUri === "string" && match?.server.uuid
      ? { serverUuid: match.server.uuid, toolName }
      : undefined;
  } catch {
    return undefined;
  }
}

export function createCoworkMcpRegistryStore(): CoworkMcpRegistryStore {
  return createStore((set, get) => {
    const lookupTool = (toolName?: string) => {
      if (!toolName) return undefined;
      const state = get();
      return (
        localToolMatch(state, toolName) ??
        remoteToolMatch(state, toolName) ??
        syncSourceToolMatch(toolName)
      );
    };
    return {
      getMcpApp: (toolName) => mcpAppForTool(toolName, lookupTool),
      localClients: {},
      localTools: {},
      lookupTool,
      remoteDirectories: {},
      remoteServers: {},
      remoteTools: {},
      setLocalClient: (serverName, client) =>
        set((state) => ({
          localClients: { ...state.localClients, [serverName]: client },
        })),
      setLocalTools: (serverName, tools) =>
        set((state) => ({
          localTools: { ...state.localTools, [serverName]: tools },
        })),
      setRemoteDirectory: (serverKey, directory) =>
        set((state) => ({
          remoteDirectories: directory
            ? { ...state.remoteDirectories, [serverKey]: directory }
            : state.remoteDirectories,
        })),
      setRemoteServer: (serverKey, server) =>
        set((state) => ({
          remoteServers: { ...state.remoteServers, [serverKey]: server },
        })),
      setRemoteTools: (serverKey, tools) =>
        set((state) => ({
          remoteTools: { ...state.remoteTools, [serverKey]: tools },
        })),
    };
  });
}
