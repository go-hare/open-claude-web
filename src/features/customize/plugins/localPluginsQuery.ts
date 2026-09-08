/**
 * Official OX / dX / AX residual (index-BELzQL5P.js).
 *
 * dX: queryKey [ET="localPlugins","list", pluginContext], queryFn kT.getPlugins
 * OX: remote eQ isVisible=false in this ion-dist → data = local AX(getPlugins)
 * AX(e, t="local"): maps host kSA plugin → UI plugin (source, skills, mcpServers, …)
 */
import { queryClient } from "../../../app/queryClient";
import {
  asRecord,
  getLocalPlugins,
  isLocalPluginsHostVisible,
  LOCAL_UPLOAD_MARKETPLACE,
} from "../directory/pluginMarketplace";

/** Official ET / IT */
export const LOCAL_PLUGINS_QUERY_KEY = ["localPlugins", "list"] as const;

/** Official rX / iX / oX — dX pluginContext. */
export type PluginListContext =
  | { mode: "ccd"; workspacePath: string }
  | { mode: "ccd" }
  | { mode: "cowork" };

export function pluginListContext(isCcd: boolean, selectedFolder: string | null): PluginListContext {
  if (isCcd && selectedFolder) return { mode: "ccd", workspacePath: selectedFolder };
  if (isCcd) return { mode: "ccd" };
  return { mode: "cowork" };
}

export function localPluginsQueryKey(context: PluginListContext) {
  return [...LOCAL_PLUGINS_QUERY_KEY, context] as const;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Official Wnt queryKey [ET, "skillFiles", pluginId, skillName, oX]. */
export function pluginSkillFilesQueryKey(
  pluginId: string,
  skillName: string,
  context: PluginListContext,
) {
  return ["localPlugins", "skillFiles", pluginId, skillName, context] as const;
}

export type PluginSkillFile = {
  content?: string;
  path: string;
};

/** Official Wnt / ga → kT.listSkillFiles(pluginId, skillName, oX). */
export async function fetchPluginSkillFiles(
  pluginId: string,
  skillName: string,
  context?: PluginListContext,
): Promise<{ error: string | null; files: PluginSkillFile[]; success: boolean }> {
  const listSkillFiles = getLocalPlugins()?.listSkillFiles;
  if (!listSkillFiles) {
    return { error: "Not available", files: [], success: false };
  }
  const raw = await listSkillFiles(pluginId, skillName, context);
  const result = asRecord(raw);
  if (result.success === false) {
    return {
      error: asString(result.error) ?? "Failed to load skill files",
      files: [],
      success: false,
    };
  }
  const files = asArray(result.files).flatMap((entry) => {
    const item = asRecord(entry);
    const path = asString(item.path);
    if (!path) return [];
    return [{ path, content: asString(item.content) }];
  });
  return { error: null, files, success: true };
}

export type PluginSkill = {
  argumentHint?: string;
  content?: string;
  description: string;
  hostFilesystemLocation?: string;
  location?: string;
  name: string;
  source: "legacy-commands" | "skills";
  userInvocable?: boolean;
};

export type PluginMcpServer = {
  config?: unknown;
  hostFilesystemLocation?: string;
  isMcpb?: boolean;
  name: string;
  type?: string;
  url?: string;
};

export type PluginHook = {
  commands: unknown[];
  event: string;
  hostFilesystemLocation?: string;
  matcher?: string;
};

export type PluginAgent = {
  content?: string;
  description: string;
  disallowedTools?: string[];
  hostFilesystemLocation?: string;
  model?: string;
  name: string;
  permissionMode?: string;
  skills?: string[];
  tools?: string[];
};

export type InstalledPlugin = {
  agents: PluginAgent[];
  author?: string;
  clis?: unknown[];
  description?: string;
  enabled: boolean;
  hooks: PluginHook[];
  id: string;
  installationPreference?: string;
  installedBy?: string;
  installPath?: string;
  isFromManualMarketplace?: boolean;
  marketplaceName?: string;
  mcpServers: PluginMcpServer[];
  name: string;
  readmePath?: string;
  scope?: string;
  skills: PluginSkill[];
  source: "local" | "org" | "default";
  updatedAt?: string;
  version?: string;
};

/** Official nQ — split name@marketplace. */
export function splitPluginId(id: string): { marketplace?: string; name: string } {
  if (!id.includes("@")) return { name: id };
  const at = id.lastIndexOf("@");
  return { name: id.slice(0, at), marketplace: id.slice(at + 1) };
}

function mapSkills(raw: unknown): PluginSkill[] {
  return asArray(raw).flatMap((entry) => {
    const item = asRecord(entry);
    const name = asString(item.name);
    if (!name) return [];
    const source = item.source === "legacy-commands" ? "legacy-commands" : "skills";
    return [
      {
        name,
        description: asString(item.description) ?? "",
        argumentHint: asString(item.argumentHint),
        location: asString(item.location),
        hostFilesystemLocation: asString(item.hostFilesystemLocation),
        content: asString(item.content),
        source,
        userInvocable: item.userInvocable !== false,
      },
    ];
  });
}

function mapMcp(raw: unknown): PluginMcpServer[] {
  return asArray(raw).flatMap((entry) => {
    const item = asRecord(entry);
    const name = asString(item.name);
    if (!name) return [];
    const config = item.config;
    const configRec = asRecord(config);
    return [
      {
        name,
        config,
        hostFilesystemLocation: asString(item.hostFilesystemLocation),
        isMcpb: item.isMcpb === true,
        type: asString(configRec.type) ?? (asString(configRec.command) ? "stdio" : undefined),
        url: asString(configRec.url),
      },
    ];
  });
}

function mapHooks(raw: unknown): PluginHook[] {
  return asArray(raw).flatMap((entry) => {
    const item = asRecord(entry);
    const event = asString(item.event);
    if (!event) return [];
    return [
      {
        event,
        matcher: asString(item.matcher),
        commands: asArray(item.commands),
        hostFilesystemLocation: asString(item.hostFilesystemLocation),
      },
    ];
  });
}

function mapAgents(raw: unknown): PluginAgent[] {
  return asArray(raw).flatMap((entry) => {
    const item = asRecord(entry);
    const name = asString(item.name);
    if (!name) return [];
    return [
      {
        name,
        description: asString(item.description) ?? "",
        model: asString(item.model),
        tools: asArray(item.tools).filter((value): value is string => typeof value === "string"),
        disallowedTools: asArray(item.disallowedTools).filter(
          (value): value is string => typeof value === "string",
        ),
        permissionMode: asString(item.permissionMode),
        skills: asArray(item.skills).filter((value): value is string => typeof value === "string"),
        content: asString(item.content),
        hostFilesystemLocation: asString(item.hostFilesystemLocation),
      },
    ];
  });
}

/**
 * Official AX(e, t="local").
 * org-provisioned marketplace → source "org"; else caller default ("local" for getPlugins).
 */
export function mapHostPlugin(raw: unknown, defaultSource: "local" | "org" | "default" = "local"): InstalledPlugin | null {
  const item = asRecord(raw);
  const id = asString(item.id);
  const name = asString(item.name);
  if (!id || !name) return null;
  const marketplaceName = asString(item.marketplaceName) ?? splitPluginId(id).marketplace;
  const source = marketplaceName === "org-provisioned" ? "org" : defaultSource;
  const authorRec = asRecord(item.author);
  const installationPreference = asString(item.installationPreference);
  const enabled = installationPreference === "required" || item.enabled !== false;
  const skills = [
    ...mapSkills(item.skills),
    ...mapSkills(item.commands).map((skill) => ({ ...skill, source: "legacy-commands" as const, userInvocable: true })),
  ];
  return {
    id,
    name,
    source,
    skills,
    mcpServers: mapMcp(item.mcpServers),
    hooks: mapHooks(item.hooks),
    agents: mapAgents(item.agents),
    enabled,
    updatedAt: asString(item.lastUpdated) ?? asString(item.updatedAt),
    installedBy:
      item.installedBy === "auto" || item.installedBy === "user"
        ? item.installedBy
        : undefined,
    installationPreference:
      installationPreference === "auto_install"
      || installationPreference === "required"
      || installationPreference === "available"
      || installationPreference === "not_available"
        ? installationPreference
        : undefined,
    scope: asString(item.scope),
    installPath: asString(item.installPath),
    readmePath: asString(item.readmePath),
    marketplaceName,
    description: asString(item.description),
    version: asString(item.version),
    author: asString(authorRec.name) ?? asString(item.author),
    clis: asArray(item.clis),
    isFromManualMarketplace: marketplaceName === LOCAL_UPLOAD_MARKETPLACE,
  };
}

/** Official EX / Ls — local zip upload, not every AX source:"local". */
export function isLocalUploadPlugin(plugin: Pick<InstalledPlugin, "id" | "isFromManualMarketplace" | "source">): boolean {
  if (plugin.isFromManualMarketplace) return true;
  return plugin.source === "local" && splitPluginId(plugin.id).marketplace === LOCAL_UPLOAD_MARKETPLACE;
}

export async function fetchLocalPlugins(context?: PluginListContext): Promise<InstalledPlugin[]> {
  const getPlugins = getLocalPlugins()?.getPlugins;
  if (!getPlugins) return [];
  const raw = await getPlugins(undefined, context);
  const rows = Array.isArray(raw) ? raw : [];
  return rows.map((row) => mapHostPlugin(row, "local")).filter((row): row is InstalledPlugin => row != null);
}

export function invalidateLocalPlugins(): void {
  void queryClient.invalidateQueries({ queryKey: LOCAL_PLUGINS_QUERY_KEY });
}

export function localPluginsHostVisible(): boolean {
  return isLocalPluginsHostVisible();
}
