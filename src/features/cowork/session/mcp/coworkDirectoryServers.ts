/**
 * Official D1e directory reverse-RPC helpers (index-BELzQL5P ~46977 pae / ~46990 mae / ~113664).
 * tae() returns [] in this bundle — search is firstParty (iae) + custom dae from a1 store.
 */
import Fuse from "fuse.js";
import { coworkMcpRegistryStore } from "./coworkMcpRegistryStoreSingleton";

export type CoworkDirectoryServerResult = {
  description?: string;
  enabledInChat?: boolean;
  iconUrl?: string;
  isConnected?: boolean;
  name: string;
  oneLiner?: string;
  toolNames?: string[];
  url?: string;
  uuid: string;
};

/** Official Tne first-party directory cards (Gmail / Calendar / Drive). */
const FIRST_PARTY_DIRECTORY: Array<{
  description: string;
  name: string;
  oneLiner: string;
  toolNames: string[];
  uuid: string;
}> = [
  {
    uuid: "8c1b41b4-c060-4704-8c17-95c39fa3511c",
    name: "Gmail",
    oneLiner: "Draft replies, summarize threads, & search your inbox",
    description:
      "Connect Gmail to Claude to quickly find important emails and understand long conversations.",
    toolNames: [],
  },
  {
    uuid: "da761fc3-2821-443c-9734-0b53599fda39",
    name: "Google Calendar",
    oneLiner: "Understand your schedule and optimize your time",
    description:
      "Connect Google Calendar to Claude so it can see your schedule, find specific events, and help you prepare for meetings.",
    toolNames: [],
  },
  {
    uuid: "37fb5d42-ef62-45d4-a12e-66551527a003",
    name: "Google Drive",
    oneLiner: "Find and analyze files instantly",
    description:
      "Connect Google Drive to Claude so it can search through your documents, read file contents, and help you work with your files.",
    toolNames: [],
  },
];

const FUSE_OPTIONS = {
  ignoreLocation: true as const,
  threshold: 0.2,
  keys: [
    { name: "name", weight: 0.4 },
    { name: "toolNames", weight: 0.3 },
    { name: "oneLiner", weight: 0.2 },
    { name: "description", weight: 0.1 },
  ],
};

/** Official eae map for first-party / remote cards. */
function mapFirstParty(
  item: (typeof FIRST_PARTY_DIRECTORY)[number],
): CoworkDirectoryServerResult {
  return {
    uuid: item.uuid,
    name: item.name,
    oneLiner: item.oneLiner,
    description: item.description,
    toolNames: item.toolNames,
    isConnected: false,
  };
}

/** Official dae: custom remotes without directory metadata. */
function listCustomRemoteServers(): CoworkDirectoryServerResult[] {
  const state = coworkMcpRegistryStore.getState();
  const out: CoworkDirectoryServerResult[] = [];
  for (const [key, server] of Object.entries(state.remoteServers)) {
    if (!server) continue;
    if (state.remoteDirectories[key]) continue;
    const tools = state.remoteTools[key] ?? [];
    out.push({
      uuid: server.uuid,
      name: server.name,
      oneLiner: "",
      description: "",
      iconUrl: undefined,
      url: server.url,
      toolNames: tools.map((t) => t.name),
      isConnected: false,
    });
  }
  return out;
}

function listInstalledConnected(): CoworkDirectoryServerResult[] {
  const state = coworkMcpRegistryStore.getState();
  const out: CoworkDirectoryServerResult[] = [];
  for (const [key, server] of Object.entries(state.remoteServers)) {
    if (!server) continue;
    const directory = state.remoteDirectories[key];
    const tools = state.remoteTools[key] ?? [];
    out.push({
      uuid: directory ? key : server.uuid,
      name: server.name,
      oneLiner: "",
      description: "",
      iconUrl: directory?.iconUrl,
      url: server.url,
      toolNames: tools.map((t) => t.name),
      isConnected: true,
    });
  }
  return out;
}

/** Official Ene keyword filter (fuse multi-keyword score). */
export function filterDirectoryServersByKeywords(
  servers: CoworkDirectoryServerResult[],
  keywords: string[] | undefined,
): CoworkDirectoryServerResult[] {
  const needles = (keywords ?? []).map((k) => k.trim()).filter((k) => k.length > 0);
  if (needles.length === 0) return servers;
  const fuse = new Fuse(servers, FUSE_OPTIONS);
  const scores = new Map<string, { item: CoworkDirectoryServerResult; totalQuality: number }>();
  for (const needle of needles) {
    for (const hit of fuse.search(needle)) {
      const uuid = hit.item.uuid;
      const quality = 1 - (hit.score ?? 1);
      const prev = scores.get(uuid);
      if (prev) prev.totalQuality += quality;
      else scores.set(uuid, { item: hit.item, totalQuality: quality });
    }
  }
  const lower = needles.map((n) => n.toLowerCase());
  for (const entry of scores.values()) {
    const name = entry.item.name.toLowerCase();
    if (lower.some((n) => name.includes(n))) {
      entry.totalQuality += 0.6 * needles.length;
    }
  }
  return [...scores.values()]
    .sort((a, b) => b.totalQuality - a.totalQuality)
    .map((e) => e.item);
}

/** Official pae — tae=[] so remote catalog empty; firstParty + custom only. */
export async function searchCoworkDirectoryServers(
  keywords: string[] | undefined,
  _enabledMcpTools?: Record<string, boolean> | undefined,
): Promise<CoworkDirectoryServerResult[]> {
  void _enabledMcpTools;
  const catalog: CoworkDirectoryServerResult[] = [
    ...FIRST_PARTY_DIRECTORY.map(mapFirstParty),
    ...listCustomRemoteServers(),
  ];
  return filterDirectoryServersByKeywords(catalog, keywords).map((server) => ({
    ...server,
    // Without full tool enabledKey map, leave undefined (official uae needs a1 tools).
    enabledInChat: server.isConnected,
  }));
}

/** Official mae — lookup by uuid in firstParty + custom + remoteServers. */
export async function lookupCoworkDirectoryServers(
  uuids: string[] | undefined,
): Promise<CoworkDirectoryServerResult[]> {
  const wanted = new Set(uuids ?? []);
  if (wanted.size === 0) return [];
  const catalog = [
    ...FIRST_PARTY_DIRECTORY.map(mapFirstParty),
    ...listCustomRemoteServers(),
  ];
  const hits = catalog.filter((s) => wanted.has(s.uuid));
  const found = new Set(hits.map((s) => s.uuid));
  const missing = [...wanted].filter((id) => !found.has(id));
  if (missing.length > 0) {
    const state = coworkMcpRegistryStore.getState();
    for (const id of missing) {
      const server = state.remoteServers[id];
      if (!server) continue;
      const tools = state.remoteTools[id] ?? [];
      hits.push({
        uuid: server.uuid,
        name: server.name,
        oneLiner: "",
        description: "",
        url: server.url,
        toolNames: tools.map((t) => t.name),
        isConnected: false,
      });
    }
  }
  return hits;
}

/** Official list_installed branch: connected remotes (+ optional keyword filter). */
export function listInstalledCoworkDirectoryServers(
  keywords: string[] | undefined,
): CoworkDirectoryServerResult[] {
  const installed = listInstalledConnected();
  return keywords?.length
    ? filterDirectoryServersByKeywords(installed, keywords)
    : installed;
}

export function parseDirectoryEventData(data: unknown): {
  keywords?: string[];
  requestId?: string;
  uuids?: string[];
} {
  let raw: unknown = data;
  if (typeof data === "string") {
    try {
      raw = JSON.parse(data);
    } catch {
      return {};
    }
  }
  if (!raw || typeof raw !== "object") return {};
  const rec = raw as Record<string, unknown>;
  return {
    requestId: typeof rec.requestId === "string" ? rec.requestId : undefined,
    keywords: Array.isArray(rec.keywords)
      ? rec.keywords.filter((k): k is string => typeof k === "string")
      : undefined,
    uuids: Array.isArray(rec.uuids)
      ? rec.uuids.filter((u): u is string => typeof u === "string")
      : undefined,
  };
}
