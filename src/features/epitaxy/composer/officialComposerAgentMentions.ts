/**
 * Official c11959232 Qj `@agent` mention residual.
 *   Yw=["epitaxy","agents",null]
 *   Jw=e=>e.filter(e=>"user"===e.source)
 *   Zw="epitaxy-agents"
 *   agentMentionsEnabled:"draft"===Os&&Us
 *   onSelect → onAgentMention(name) then Promise.resolve(null)
 *     (Ljt insert chip then delete it — agent is Cv pill, not a mention node)
 *
 * Host listLocalAgents writes source:"local". Do not remap to "user".
 * Empty user-source catalog → empty list (honest).
 */
import type { LocalAgentCatalogRow, WorkspaceSshConfig } from "../../../adapters/desktopBridge/types";

export const OFFICIAL_EPITAXY_AGENTS_QUERY_KEY = ["epitaxy", "agents", null] as const;
export const OFFICIAL_EPITAXY_AGENTS_PROVIDER_ID = "epitaxy-agents";
export const OFFICIAL_CCD_FILES_PROVIDER_ID = "ccd-files";
export const OFFICIAL_MENTION_AGENTS_CATEGORY = "Agents";
export const OFFICIAL_AGENT_MENTIONS_STALE_TIME = Number.POSITIVE_INFINITY;

export type OfficialComposerMentionOption = {
  category?: string;
  description?: string;
  icon?: unknown;
  id: string;
  label: string;
  metadata?: { isDirectory?: boolean; path?: string };
  providerId?: string;
  renderedText?: string;
};

export type OfficialComposerMentionSelectResult = {
  additionalText?: string;
  attachments?: unknown[];
  chipText?: string;
} | null;

export type OfficialComposerMentionProvider = {
  fetchOptions: (
    query: string,
  ) => OfficialComposerMentionOption[] | Promise<OfficialComposerMentionOption[]>;
  getIconHtml: (id: string) => unknown;
  id: string;
  onDelete?: (id: string) => void;
  onSelect: (id: string) => Promise<OfficialComposerMentionSelectResult>;
};

export type OfficialComposerMentionState = {
  active: boolean;
  isLoading?: boolean;
  options: OfficialComposerMentionOption[];
  position: { left: number; top: number } | null;
  query: string;
  selectedIndex: number;
};

export const OFFICIAL_COMPOSER_MENTION_IDLE: OfficialComposerMentionState = {
  active: false,
  isLoading: false,
  options: [],
  position: null,
  query: "",
  selectedIndex: 0,
};

/** Official Jw — keep host source as-is. */
export function officialUserSourceAgents(
  rows: LocalAgentCatalogRow[] | null | undefined,
): LocalAgentCatalogRow[] {
  if (!Array.isArray(rows)) return [];
  return rows.filter((row) => row.source === "user");
}

/**
 * Official Us / Dwt: local + ssh true; bridge/cloud/byoc/pool false.
 * Product WorkspaceContext.mode is "local" | "remote" | "ssh".
 */
export function officialAgentMentionsEnvEnabled(mode: string | null | undefined): boolean {
  return mode === "local" || mode === "ssh";
}

/** Official fetchOptions mapper: user-source, query includes, slice 10. */
export function officialEpitaxyAgentMentionOptions(
  rows: LocalAgentCatalogRow[] | null | undefined,
  query: string,
): OfficialComposerMentionOption[] {
  const needle = query.toLowerCase();
  return officialUserSourceAgents(rows)
    .filter((row) => !needle || row.name.toLowerCase().includes(needle))
    .slice(0, 10)
    .map((row) => ({
      category: OFFICIAL_MENTION_AGENTS_CATEGORY,
      description: row.description || undefined,
      id: row.name,
      label: row.name,
      providerId: OFFICIAL_EPITAXY_AGENTS_PROVIDER_ID,
    }));
}

/** Official Ljt insert-chip-then-onSelect. Agent onSelect is null → delete the chip. */
export function officialMentionAtRange(textBefore: string, cursorPos: number) {
  const match = textBefore.match(/(?:^|\s)@(\S*)$/);
  if (!match) return null;
  const from = cursorPos - match[0].length + (match[0].startsWith(" ") ? 1 : 0);
  return { from, to: cursorPos };
}

/** Official `bm` — last `/` split for mention label/dir. */
export function officialMentionPathParts(pathValue: string) {
  const normalized = pathValue.replace(/\\/g, "/");
  const slash = normalized.lastIndexOf("/");
  return slash === -1
    ? { name: pathValue, dir: "" }
    : { name: normalized.slice(slash + 1), dir: normalized.slice(0, slash) };
}

export type OfficialCcdFilesMentionRow = {
  category?: string;
  icon?: string;
  id?: string;
  label?: string;
  metadata?: string;
};

/** Official vm Le.fetchMentionOptions(query, "files") mapper. */
export function officialCcdFilesMentionOptions(
  rows: OfficialCcdFilesMentionRow[] | null | undefined,
): OfficialComposerMentionOption[] {
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row) => {
    const id = row.id;
    if (!id) return [];
    let metadata: { isDirectory?: boolean; path?: string } = {};
    if (row.metadata) {
      try {
        metadata = JSON.parse(row.metadata) as { isDirectory?: boolean; path?: string };
      } catch {
        metadata = {};
      }
    }
    const { name, dir } = officialMentionPathParts(row.label ?? id);
    return [{
      category: row.category,
      description: dir || undefined,
      id,
      label: name,
      metadata,
      providerId: OFFICIAL_CCD_FILES_PROVIDER_ID,
      renderedText: row.label,
    }];
  });
}

/** Official `$t`: `{...y, remoteCwd:p}` when currentSshConfig + folder. */
export type OfficialSshConfigForMentions = WorkspaceSshConfig & { remoteCwd: string };

export type OfficialSshDirectoryListing = {
  entries?: Array<{ isDirectory?: boolean; name: string; path: string }>;
  error?: string | null;
};

/** Official vm SSH branch: listSSHDirectory(e, e.remoteCwd), slice 10, renderedText = name. */
export function officialSshCcdFilesMentionOptions(
  entries: Array<{ isDirectory?: boolean; name: string; path: string }>,
  query: string,
  sshHost?: string,
): OfficialComposerMentionOption[] {
  const needle = query.toLowerCase();
  return entries
    .filter((entry) => !needle || entry.name.toLowerCase().includes(needle) || entry.path.toLowerCase().includes(needle))
    .slice(0, 10)
    .map((entry) => {
      const { dir } = officialMentionPathParts(entry.path);
      return {
        category: sshHost,
        description: dir || undefined,
        id: entry.path,
        label: entry.name,
        metadata: { isDirectory: Boolean(entry.isDirectory) },
        providerId: OFFICIAL_CCD_FILES_PROVIDER_ID,
        renderedText: entry.name,
      };
    });
}

/**
 * Official vm ccd-files.
 * SSH `e.remoteCwd` uses fe.listSSHDirectory (host residual is real).
 * Local uses Le.fetchMentionOptions. Do not invent getFileSuggestions / windows.
 */
export function officialCcdFilesMentionProvider(input: {
  fetchMentionOptions?: (query: string, kind?: string) => Promise<OfficialCcdFilesMentionRow[]>;
  listSSHDirectory?: (sshConfig: unknown, remotePath?: string) => Promise<OfficialSshDirectoryListing | unknown>;
  sshConfigForMentions?: OfficialSshConfigForMentions | null;
}): OfficialComposerMentionProvider | null {
  const ssh = input.sshConfigForMentions;
  if (ssh && !input.listSSHDirectory) return null;
  if (!ssh && !input.fetchMentionOptions) return null;
  return {
    id: OFFICIAL_CCD_FILES_PROVIDER_ID,
    fetchOptions: async (query) => {
      try {
        if (ssh?.remoteCwd) {
          const listed = await input.listSSHDirectory!(ssh, ssh.remoteCwd);
          const raw = listed && typeof listed === "object" ? listed as OfficialSshDirectoryListing : {};
          if (raw.error || !raw.entries) return [];
          return officialSshCcdFilesMentionOptions(
            raw.entries,
            query,
            ssh.sshHost ?? ssh.host,
          );
        }
        if (!input.fetchMentionOptions) return [];
        const rows = await input.fetchMentionOptions(query, "files");
        return officialCcdFilesMentionOptions(rows);
      } catch {
        return [];
      }
    },
    onSelect: (id) => Promise.resolve({ chipText: String(id) }),
    onDelete: () => {},
    getIconHtml: () => {},
  };
}

export function officialSshConfigForMentions(
  sshConfig: WorkspaceSshConfig | null | undefined,
  folder: string | null | undefined,
): OfficialSshConfigForMentions | null {
  if (!sshConfig || !folder) return null;
  return { ...sshConfig, remoteCwd: folder };
}

export function officialEpitaxyAgentsMentionProvider(input: {
  getCachedAgents?: () => LocalAgentCatalogRow[] | undefined;
  getAgents?: () => Promise<LocalAgentCatalogRow[]>;
  onAgentMention?: (name: string) => void;
}): OfficialComposerMentionProvider | null {
  if (!input.getAgents) return null;
  const mapRows = (rows: LocalAgentCatalogRow[] | null | undefined, query: string) =>
    officialEpitaxyAgentMentionOptions(rows, query);
  return {
    id: OFFICIAL_EPITAXY_AGENTS_PROVIDER_ID,
    fetchOptions: (query) => {
      const cached = input.getCachedAgents?.();
      if (cached) return mapRows(cached, query);
      return input
        .getAgents!()
        .then((rows) => mapRows(rows, query))
        .catch(() => []);
    },
    onSelect: (id) => {
      input.onAgentMention?.(String(id));
      return Promise.resolve(null);
    },
    onDelete: () => {},
    getIconHtml: () => {},
  };
}
