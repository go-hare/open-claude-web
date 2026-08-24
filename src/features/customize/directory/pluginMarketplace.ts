/**
 * Official fusion marketplace helpers (index-BELzQL5P.js):
 *   NX / qX / BX / bJ / I8t / lJ / LT
 * Host CustomPlugins: listMarketplaces / listAvailablePlugins (local disk only).
 */
export const LOCAL_UPLOAD_MARKETPLACE = "local-desktop-app-uploads";

/** Official G6t = github.com + W6t gitlab.com / bitbucket.org. */
export const SUPPORTED_MARKETPLACE_HOSTS = ["github.com", "gitlab.com", "bitbucket.org"] as const;

/** Official lJ */
export const MARKETPLACES_QUERY_KEY = ["marketplaces"] as const;

/** Official LT */
export const MARKETPLACE_PLUGINS_QUERY_KEY = ["marketplacePlugins"] as const;

export type DirectoryPluginSeed = {
  marketplaceName?: string;
  marketplaceSource?: string;
  pluginName?: string;
};

export function asDirectoryPluginSeed(value: unknown): DirectoryPluginSeed {
  const item = asRecord(value);
  return {
    marketplaceName: asString(item.marketplaceName),
    marketplaceSource: asString(item.marketplaceSource),
    pluginName: asString(item.pluginName),
  };
}

export type MarketplaceRecord = {
  displayName?: string;
  id: string;
  isDefault: boolean;
  name: string;
  repo?: string;
  source: "local" | "remote";
  sourceType?: string;
  url?: string;
};

export type MarketplacePluginRecord = {
  authorName?: string;
  availableVersion?: string;
  description?: string;
  id: string;
  isInstalled: boolean;
  marketplaceName?: string;
  name: string;
  source?: string;
};

type CustomPluginsBridge = {
  addMarketplace?: (...args: unknown[]) => Promise<unknown>;
  installPlugin?: (...args: unknown[]) => Promise<unknown>;
  listAvailablePlugins?: (...args: unknown[]) => Promise<unknown>;
  listMarketplaces?: (...args: unknown[]) => Promise<unknown>;
  refreshMarketplace?: (...args: unknown[]) => Promise<unknown>;
  removeMarketplace?: (...args: unknown[]) => Promise<unknown>;
  uninstallPlugin?: (...args: unknown[]) => Promise<unknown>;
};

type LocalPluginsBridge = {
  deletePlugin?: (...args: unknown[]) => Promise<unknown>;
  getPlugins?: (...args: unknown[]) => Promise<unknown>;
  setPluginEnabled?: (...args: unknown[]) => Promise<unknown>;
  uploadPlugin?: (...args: unknown[]) => Promise<unknown>;
};

export function getCustomPlugins(): CustomPluginsBridge | undefined {
  return window["claude.web"]?.CustomPlugins as CustomPluginsBridge | undefined;
}

export function getLocalPlugins(): LocalPluginsBridge | undefined {
  return window["claude.web"]?.LocalPlugins as LocalPluginsBridge | undefined;
}

/** Official JZ residual (cowork / non-CCD): host LocalPlugins methods present. */
export function isLocalPluginsHostVisible(): boolean {
  const local = getLocalPlugins();
  return Boolean(
    local?.getPlugins && local?.uploadPlugin && local?.deletePlugin && local?.setPluginEnabled,
  );
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

/** Official qX */
export function isLocalUploadMarketplaceName(name: string | undefined): boolean {
  return name === LOCAL_UPLOAD_MARKETPLACE;
}

/** Official BX */
export function isManualMarketplace(marketplace: Pick<MarketplaceRecord, "name" | "sourceType">): boolean {
  return marketplace.sourceType === "manual" || marketplace.name === LOCAL_UPLOAD_MARKETPLACE;
}

/** Official bJ — kebab → first-token Title Case. */
export function titleCasePluginName(name: string): string {
  const parts = name.split("-");
  if (parts.length === 0 || (parts.length === 1 && parts[0] === "")) return name;
  const [first, ...rest] = parts;
  return [first.charAt(0).toUpperCase() + first.slice(1), ...rest].join(" ");
}

/** Official Q6t residual — strip `plugin marketplace add` / git clone prefixes. */
export function normalizeMarketplaceInput(raw: string): string {
  let next = raw
    .trim()
    .replace(/^\/?(?:claude\s+)?plugin\s+marketplace(?:\s+add)?\s+/i, "")
    .replace(/^git\s+clone\s+/i, "")
    .replace(/^gh\s+repo\s+clone\s+/i, "")
    .replace(/^npx\s+\S+\s+(?:add|install)?\s*/i, "");
  const first = next.split(/\s/)[0] ?? next;
  const looksLikeRepo = /@/.test(first) || /:\/\//.test(first) || /[^/]\/[^/]/.test(first);
  if (first !== next && looksLikeRepo) next = first;
  const gitAt = next.match(/^git@github\.com:([^/\s]+\/[^/\s]+?)(?:\.git)?$/i);
  if (gitAt) return gitAt[1];
  const gh = next.match(/^github\.com\/([^/\s:@]+\/[^/\s:@]+?)(?:\.git)?$/i);
  if (gh) return gh[1];
  if (/^\/[^/\s:@]+\/[^/\s:@]+$/.test(next)) return next.slice(1);
  return next;
}

/** Official xJ residual — match existing marketplace by name / url / repo. */
export function findExistingMarketplace(
  input: string,
  marketplaces: MarketplaceRecord[],
): MarketplaceRecord | undefined {
  const needle = input.trim().toLowerCase();
  if (!needle) return undefined;
  return marketplaces.find((marketplace) => {
    const names = [marketplace.name, marketplace.displayName, marketplace.url, marketplace.repo]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());
    return names.some((value) => value === needle || value.endsWith(`/${needle}`));
  });
}

export function marketplaceErrorCode(error: unknown): string | null {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const marker = "MARKETPLACE_ERROR:";
  const index = message.indexOf(marker);
  if (index === -1) return null;
  return message.slice(index + marker.length).split(/\s/)[0] ?? null;
}

export function formatI18n(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");
}

export function normalizeMarketplace(raw: unknown): MarketplaceRecord | null {
  const item = asRecord(raw);
  const nestedSource = asRecord(item.source);
  const name =
    asString(item.name)
    ?? asString(item.id)
    ?? asString(nestedSource.path);
  if (!name) return null;
  const id = asString(item.id) ?? name;
  const sourceKind = asString(nestedSource.source);
  const sourceType =
    asString(item.sourceType)
    ?? asString(item.source_type)
    ?? (name === LOCAL_UPLOAD_MARKETPLACE ? "manual" : sourceKind);
  const remote = item.source === "remote" || sourceKind === "url" || sourceKind === "github";
  return {
    id,
    name,
    displayName: asString(item.displayName) ?? asString(item.display_name),
    sourceType,
    isDefault: item.isDefault === true || item.is_default === true,
    url:
      asString(item.url)
      ?? asString(item.source_url)
      ?? asString(nestedSource.path)
      ?? asString(nestedSource.url),
    source: remote ? "remote" : "local",
    repo: asString(item.repo) ?? asString(nestedSource.repo),
  };
}

export function normalizeMarketplacePlugin(raw: unknown): MarketplacePluginRecord | null {
  const item = asRecord(raw);
  const name = asString(item.name);
  const marketplaceName = asString(item.marketplaceName) ?? asString(item.marketplace);
  const id =
    asString(item.id)
    ?? (name && marketplaceName ? `${name}@${marketplaceName}` : name);
  if (!id && !name) return null;
  const author = asRecord(item.author);
  return {
    id: id ?? name ?? "",
    name: name ?? id ?? "",
    description: asString(item.description),
    marketplaceName,
    isInstalled: item.isInstalled === true,
    availableVersion: asString(item.availableVersion),
    authorName: asString(author.name) ?? asString(item.authorName),
    source: asString(item.source) ?? asString(item.pluginSource),
  };
}

export async function fetchMarketplaces(): Promise<MarketplaceRecord[]> {
  const list = getCustomPlugins()?.listMarketplaces;
  const raw = list ? await list() : [];
  const rows = Array.isArray(raw) ? raw : [];
  const mapped = rows.map(normalizeMarketplace).filter((row): row is MarketplaceRecord => row != null);
  if (!mapped.some((row) => row.name === LOCAL_UPLOAD_MARKETPLACE)) {
    mapped.push({
      id: LOCAL_UPLOAD_MARKETPLACE,
      name: LOCAL_UPLOAD_MARKETPLACE,
      sourceType: "manual",
      isDefault: false,
      source: "local",
    });
  }
  return mapped;
}

export async function fetchMarketplacePlugins(): Promise<MarketplacePluginRecord[]> {
  const list = getCustomPlugins()?.listAvailablePlugins;
  const raw = list ? await list() : [];
  const rows = Array.isArray(raw) ? raw : [];
  const byId = new Map<string, MarketplacePluginRecord>();
  const installedIds = new Set<string>();
  for (const row of rows) {
    const item = asRecord(row);
    const plugin = normalizeMarketplacePlugin(row);
    if (!plugin) continue;
    const installed =
      item.isInstalled === true
      || Boolean(asString(item.installPath))
      || Boolean(asString(item.installedAt));
    if (installed) installedIds.add(plugin.id);
    const existing = byId.get(plugin.id);
    if (!existing) {
      byId.set(plugin.id, { ...plugin, isInstalled: installed });
    } else if (installed) {
      byId.set(plugin.id, { ...existing, ...plugin, isInstalled: true });
    }
  }
  return [...byId.values()].map((plugin) =>
    installedIds.has(plugin.id) ? { ...plugin, isInstalled: true } : plugin,
  );
}

/** Official Re residual — non-default marketplaces; always keep NX so Personal + plus exist. */
export function personalMarketplaceList(
  marketplaces: MarketplaceRecord[],
  plugins: MarketplacePluginRecord[],
): MarketplaceRecord[] {
  return marketplaces
    .filter((marketplace) => {
      if (marketplace.isDefault) return false;
      if (isLocalUploadMarketplaceName(marketplace.name)) return true;
      if (isManualMarketplace(marketplace)) {
        return plugins.some((plugin) => plugin.marketplaceName === marketplace.name);
      }
      return true;
    })
    .sort((left, right) => {
      const leftManual = isManualMarketplace(left);
      const rightManual = isManualMarketplace(right);
      if (leftManual !== rightManual) return leftManual ? -1 : 1;
      return left.name.localeCompare(right.name);
    });
}
