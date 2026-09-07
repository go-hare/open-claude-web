/**
 * Connectors store — residual Direct MCP status bag (mQe).
 *
 * Residual ion (index-BELzQL5P.js):
 *   cQe = uuid→name, dQe = name→uuid; mQe(statuses) upserts remoteServers;
 *   hQe(uuid) → authorizeDirectMcpServer(name); disconnect by name.
 *
 * Source of truth is claude.settings.MCP bag + getDirectMcpServerStatuses.
 * Not localStorage.
 */
import type { DirectMcpServerStatus } from "../../../adapters/desktopBridge/types";
import { desktopBridge } from "../../../adapters/desktopBridge";
import { mcpSettingsBridge } from "../../settings/settingsDesktopBridge";
import type { ConnectorListItem } from "./connectorTypes";

/** In-memory until Direct MCP statuses catch the bag write (not persisted). */
type PendingCustom = {
  id: string;
  name: string;
  url: string;
};

/** Residual cQe / dQe: uuid ↔ Direct MCP server name. */
const uuidByName = new Map<string, string>();
const nameByUuid = new Map<string, string>();

let pendingCustoms: PendingCustom[] = [];
let directStatuses: DirectMcpServerStatus[] = [];
let items: ConnectorListItem[] = [];
let hydrated = false;
let hydratePromise: Promise<void> | null = null;
let statusUnsub: (() => void) | null = null;

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function rebuildItems(): void {
  const next: ConnectorListItem[] = [];
  const seenNames = new Set<string>();

  for (const status of directStatuses) {
    seenNames.add(status.name);
    let id = uuidByName.get(status.name);
    if (!id) {
      id = crypto.randomUUID();
      uuidByName.set(status.name, id);
      nameByUuid.set(id, status.name);
    }
    const needsAuth = Boolean(status.hasAuth) && !status.isConnected;
    next.push({
      id,
      name: status.name,
      description: status.url,
      url: status.url,
      isConnected: status.isConnected,
      hasAuth: status.hasAuth,
      needsAuth,
      iconType: "mcp",
      source: "direct-mcp",
      serverName: status.name,
      searchTerms: [status.url, status.name],
      tools: status.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        displayName: tool.title || tool.annotations?.title || tool.name,
      })),
      toolsLoaded: true,
      error: status.error,
    });
  }

  // Drop maps for servers no longer present (residual mQe prune).
  for (const [name, id] of [...uuidByName.entries()]) {
    if (!seenNames.has(name)) {
      uuidByName.delete(name);
      nameByUuid.delete(id);
    }
  }

  pendingCustoms = pendingCustoms.filter(
    (custom) => !seenNames.has(custom.name) && !directStatuses.some((status) => status.url === custom.url),
  );
  for (const custom of pendingCustoms) {
    next.push({
      id: custom.id,
      name: custom.name,
      description: custom.url,
      url: custom.url,
      isConnected: false,
      hasAuth: false,
      needsAuth: false,
      iconType: "mcp",
      source: "local-custom",
      serverName: custom.name,
      searchTerms: [custom.url, custom.name],
    });
  }

  items = next;
  emit();
}

/** Residual mQe(statuses). */
export function applyDirectMcpStatuses(statuses: DirectMcpServerStatus[]): void {
  directStatuses = Array.isArray(statuses) ? statuses : [];
  rebuildItems();
}

export function getConnectorItems(): ConnectorListItem[] {
  return items;
}

export function subscribeConnectorItems(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Residual Rrs: subscribe onOnDirectMcpServerStatusesChanged + initial getDirectMcpServerStatuses.
 * Idempotent; safe to call from ConnectorsRoute mount.
 */
export function ensureDirectMcpHydrated(): Promise<void> {
  if (hydratePromise) return hydratePromise;
  hydratePromise = (async () => {
    const bridge = desktopBridge.LocalAgentModeSessions;
    if (!statusUnsub && bridge.onDirectMcpServerStatusesChanged) {
      statusUnsub = bridge.onDirectMcpServerStatusesChanged((statuses) => {
        applyDirectMcpStatuses(statuses);
      });
    }
    try {
      const statuses = (await bridge.getDirectMcpServerStatuses?.()) ?? [];
      applyDirectMcpStatuses(statuses);
    } catch {
      rebuildItems();
    } finally {
      hydrated = true;
    }
  })();
  return hydratePromise;
}

export function isDirectMcpHydrated(): boolean {
  return hydrated;
}

function bagKeyForCustom(name: string, url: string): string {
  // Prefer stable human name; fall back to host-ish key.
  const cleaned = name.trim() || url;
  return cleaned.replace(/\s+/g, "-").slice(0, 80) || url;
}

/**
 * Persist URL remote into desktop MCP bag so connectFromConfigBag can park/connect.
 * stdio-only BV honesty: URL remotes are passthrough bag entries (type/url), not invent BV stdio.
 */
async function upsertUrlRemoteInMcpBag(
  name: string,
  url: string,
  oauth?: { clientId?: string; clientSecret?: string },
): Promise<void> {
  const mcp = mcpSettingsBridge();
  if (!mcp?.getMcpServersConfig || !mcp.setMcpServerConfigs) return;
  try {
    const current = (await mcp.getMcpServersConfig()) ?? {};
    const key = bagKeyForCustom(name, url);
    // Don't clobber existing stdio command entries under same key.
    const existing = current[key];
    if (
      existing &&
      typeof existing === "object" &&
      !Array.isArray(existing) &&
      typeof (existing as { command?: unknown }).command === "string" &&
      !(existing as { url?: unknown }).url
    ) {
      return;
    }
    const clientId = oauth?.clientId?.trim() ?? "";
    const clientSecret = oauth?.clientSecret?.trim() ?? "";
    const oauthBag = clientId
      ? {
          clientId,
          ...(clientSecret ? { clientSecret } : {}),
        }
      : undefined;
    const next = {
      ...current,
      [key]: {
        ...(typeof existing === "object" && existing && !Array.isArray(existing)
          ? (existing as Record<string, unknown>)
          : {}),
        type: "http",
        url,
        name: name || key,
        ...(oauthBag ? { oauth: oauthBag } : {}),
      },
    };
    await mcp.setMcpServerConfigs(next);
  } catch {
    // Bag write optional when settings bridge missing.
  }
}

async function removeUrlRemoteFromMcpBag(name: string, url?: string): Promise<void> {
  const mcp = mcpSettingsBridge();
  if (!mcp?.getMcpServersConfig || !mcp.setMcpServerConfigs) return;
  try {
    const current = { ...((await mcp.getMcpServersConfig()) ?? {}) };
    let changed = false;
    for (const [key, value] of Object.entries(current)) {
      if (key === name || key === bagKeyForCustom(name, url ?? "")) {
        delete current[key];
        changed = true;
        continue;
      }
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const bag = value as Record<string, unknown>;
        const nested = bag.config && typeof bag.config === "object" ? (bag.config as Record<string, unknown>) : {};
        const entryUrl =
          (typeof bag.url === "string" && bag.url) ||
          (typeof nested.url === "string" && nested.url) ||
          "";
        const entryName =
          (typeof bag.name === "string" && bag.name) ||
          (typeof nested.name === "string" && nested.name) ||
          key;
        if ((url && entryUrl === url) || entryName === name) {
          delete current[key];
          changed = true;
        }
      }
    }
    if (changed) await mcp.setMcpServerConfigs(current);
  } catch {
    /* ignore */
  }
}

export function addCustomConnector(input: {
  clientId?: string;
  clientSecret?: string;
  name: string;
  url: string;
}): ConnectorListItem {
  const name = input.name.trim() || input.url.trim();
  const url = input.url.trim();
  const existing =
    items.find((item) => item.url === url || item.name === name) ??
    pendingCustoms.find((entry) => entry.url === url || entry.name === name);
  const entry: PendingCustom = existing
    ? { id: existing.id, name, url }
    : {
        id: `custom-${crypto.randomUUID()}`,
        name,
        url,
      };
  if (!pendingCustoms.some((item) => item.id === entry.id)) {
    pendingCustoms = [...pendingCustoms, entry];
  }
  rebuildItems();

  void (async () => {
    await upsertUrlRemoteInMcpBag(name, url, {
      clientId: input.clientId,
      clientSecret: input.clientSecret,
    });
    try {
      const statuses =
        (await desktopBridge.LocalAgentModeSessions.getDirectMcpServerStatuses?.()) ?? [];
      applyDirectMcpStatuses(statuses);
    } catch {
      rebuildItems();
    }
  })();

  return (
    items.find((item) => item.url === url || item.name === name) ?? {
      id: entry.id,
      name,
      description: url,
      url,
      isConnected: false,
      iconType: "mcp",
      source: "local-custom",
      serverName: name,
      searchTerms: [url, name],
    }
  );
}

export async function removeConnector(id: string): Promise<void> {
  const item = items.find((entry) => entry.id === id);
  const serverName = item?.serverName ?? nameByUuid.get(id);
  pendingCustoms = pendingCustoms.filter((entry) => entry.id !== id);

  if (serverName) {
    try {
      await desktopBridge.LocalAgentModeSessions.disconnectDirectMcpServer?.(serverName);
    } catch {
      /* disconnect optional if never connected */
    }
    await removeUrlRemoteFromMcpBag(serverName, item?.url);
  }

  try {
    const statuses =
      (await desktopBridge.LocalAgentModeSessions.getDirectMcpServerStatuses?.()) ?? [];
    applyDirectMcpStatuses(statuses);
  } catch {
    rebuildItems();
  }
}

export async function authorizeConnector(id: string): Promise<{
  ok: boolean;
  error?: string;
  cancelled?: boolean;
}> {
  const item = items.find((entry) => entry.id === id);
  const serverName = item?.serverName ?? nameByUuid.get(id);
  if (!serverName) return { ok: false, error: "Unknown connector" };
  const result = await desktopBridge.LocalAgentModeSessions.authorizeDirectMcpServer?.(
    serverName,
  );
  if (!result) return { ok: false, error: "Desktop bridge not available" };
  // Residual hQe refreshes tools from live bag after ok.
  try {
    const statuses =
      (await desktopBridge.LocalAgentModeSessions.getDirectMcpServerStatuses?.()) ?? [];
    applyDirectMcpStatuses(statuses);
  } catch {
    /* status push may still arrive */
  }
  return result;
}

export async function disconnectConnector(id: string): Promise<boolean> {
  const item = items.find((entry) => entry.id === id);
  const serverName = item?.serverName ?? nameByUuid.get(id);
  if (!serverName) return false;
  const ok =
    (await desktopBridge.LocalAgentModeSessions.disconnectDirectMcpServer?.(serverName)) ===
    true;
  try {
    const statuses =
      (await desktopBridge.LocalAgentModeSessions.getDirectMcpServerStatuses?.()) ?? [];
    applyDirectMcpStatuses(statuses);
  } catch {
    rebuildItems();
  }
  return ok;
}

rebuildItems();
