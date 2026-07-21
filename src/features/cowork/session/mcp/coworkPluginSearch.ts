/**
 * Official D1e plugins_search reverse-RPC (index-BELzQL5P ~113756–113833):
 * listInstalledOnly → map installedPlugins + optional fuse nZe/rZe
 * else org BFF list-plugins (honest residual: empty when no org/catalog)
 * respondPluginSearch(requestId, JSON.stringify({ results }))
 */

export type CoworkPluginSkill = { name: string; description: string };

export type CoworkPluginSearchResult = {
  commands?: CoworkPluginSkill[];
  description: string;
  id: string;
  marketplaceName: string;
  matchedCapabilities?: Array<{ type: string; name: string }>;
  mcpServerNames?: string[];
  name: string;
  skillDescriptions?: string[];
  skillNames?: string[];
  skills: CoworkPluginSkill[];
};

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "this",
  "that",
  "can",
  "you",
  "help",
  "please",
  "want",
  "need",
  "what",
  "how",
]);

/** Official iZe */
export function pluginId(name: string, marketplaceName?: string): string {
  return `${name}@${marketplaceName || "org"}`;
}

/** Official nZe: keywords + tokenized userIntent (len>2, not stopwords). */
export function buildPluginSearchTerms(
  userIntent: string | undefined,
  keywords: string[] | undefined,
): string[] {
  const fromIntent = userIntent
    ? userIntent
        .toLowerCase()
        .split(/\W+/)
        .filter((t) => t.length > 2 && !STOP_WORDS.has(t))
    : [];
  const fromKeywords = (keywords ?? []).map((k) => k.toLowerCase());
  return [...new Set([...fromKeywords, ...fromIntent])];
}

/** Official oZe: pass-through with empty matchedCapabilities. */
export function mapInstalledPluginResult(
  plugin: CoworkPluginSearchResult,
): CoworkPluginSearchResult {
  return {
    id: plugin.id,
    name: plugin.name,
    description: plugin.description,
    marketplaceName: plugin.marketplaceName,
    matchedCapabilities: [],
    skills: plugin.skills,
    mcpServerNames: plugin.mcpServerNames,
  };
}

/**
 * Lightweight keyword filter (honest subset of official fuse rZe):
 * match name / description / skill names; no full Fuse quality ranking UI.
 */
export function filterPluginsByTerms(
  plugins: CoworkPluginSearchResult[],
  terms: string[],
): CoworkPluginSearchResult[] {
  const cleaned = terms.map((t) => t.trim()).filter((t) => t.length > 0);
  if (cleaned.length === 0) return plugins.map(mapInstalledPluginResult);
  const lower = cleaned.map((t) => t.toLowerCase());
  return plugins
    .filter((p) => {
      const hay = [
        p.name,
        p.description,
        ...(p.skillNames ?? p.skills.map((s) => s.name)),
        ...(p.skillDescriptions ?? p.skills.map((s) => s.description)),
        ...(p.mcpServerNames ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return lower.some((t) => hay.includes(t));
    })
    .map((p) => ({
      ...mapInstalledPluginResult(p),
      matchedCapabilities: lower
        .filter((t) => p.name.toLowerCase().includes(t))
        .map((t) => ({ type: "name", name: p.name || t })),
    }));
}

let installedPlugins: CoworkPluginSearchResult[] = [];
/** Org/catalog plugins for non-installed search — honest empty unless injected. */
let catalogPlugins: CoworkPluginSearchResult[] = [];
let orgUuid: string | null = null;

export function setCoworkInstalledPlugins(
  plugins: CoworkPluginSearchResult[],
): void {
  installedPlugins = Array.isArray(plugins) ? plugins : [];
}

export function setCoworkCatalogPlugins(
  plugins: CoworkPluginSearchResult[],
): void {
  catalogPlugins = Array.isArray(plugins) ? plugins : [];
}

export function setCoworkPluginOrgUuid(uuid: string | null): void {
  orgUuid = uuid;
}

export function getCoworkInstalledPlugins(): CoworkPluginSearchResult[] {
  return installedPlugins;
}

export function searchCoworkPluginsResponse(input: {
  includeInstalled?: boolean;
  keywords?: string[];
  listInstalledOnly?: boolean;
  userIntent?: string;
}): string {
  const terms = buildPluginSearchTerms(input.userIntent, input.keywords);
  if (input.listInstalledOnly) {
    const results =
      terms.length > 0
        ? filterPluginsByTerms(installedPlugins, terms)
        : installedPlugins.map(mapInstalledPluginResult);
    return JSON.stringify({ results });
  }
  // Official: no orgUuid → empty results.
  if (!orgUuid && catalogPlugins.length === 0) {
    return JSON.stringify({ results: [] });
  }
  const base = input.includeInstalled
    ? catalogPlugins
    : catalogPlugins.filter(
        (p) => !installedPlugins.some((i) => i.id === p.id),
      );
  const results = filterPluginsByTerms(base, terms).slice(0, 10);
  return JSON.stringify({ results });
}

export function parsePluginsEventData(data: unknown): {
  includeInstalled: boolean | undefined;
  keywords: string[] | undefined;
  listInstalledOnly: boolean | undefined;
  requestId: string | null;
  userIntent: string | undefined;
  userMessageUuid: string | undefined;
} {
  let raw: Record<string, unknown> = {};
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data) as unknown;
      if (parsed && typeof parsed === "object") {
        raw = parsed as Record<string, unknown>;
      }
    } catch {
      return {
        includeInstalled: undefined,
        keywords: undefined,
        listInstalledOnly: undefined,
        requestId: null,
        userIntent: undefined,
        userMessageUuid: undefined,
      };
    }
  } else if (data && typeof data === "object") {
    raw = data as Record<string, unknown>;
  }
  const requestId =
    typeof raw.requestId === "string" && raw.requestId.length > 0
      ? raw.requestId
      : null;
  const keywords = Array.isArray(raw.keywords)
    ? raw.keywords.filter((k): k is string => typeof k === "string")
    : undefined;
  return {
    includeInstalled:
      typeof raw.includeInstalled === "boolean"
        ? raw.includeInstalled
        : undefined,
    keywords,
    listInstalledOnly:
      typeof raw.listInstalledOnly === "boolean"
        ? raw.listInstalledOnly
        : undefined,
    requestId,
    userIntent:
      typeof raw.userIntent === "string" ? raw.userIntent : undefined,
    userMessageUuid:
      typeof raw.userMessageUuid === "string"
        ? raw.userMessageUuid
        : undefined,
  };
}
