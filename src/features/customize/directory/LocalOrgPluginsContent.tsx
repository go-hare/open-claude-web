/**
 * Official O8t / P8t LocalOrgPluginsContent (index-BELzQL5P.js).
 * Data: `_T = globalThis["claude.web"]?.CustomPlugins` listLocalOrgPlugins.
 */
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "../../../shell/icons";
import { OfficialButton } from "../../shared/OfficialButton";
import { useCustomizeText, type CustomizeText } from "../customizeMessages";

/** Official OT query key. */
export const LOCAL_ORG_PLUGINS_QUERY_KEY = ["localOrgPlugins"] as const;

export type LocalOrgPlugin = {
  description?: string;
  id: string;
  isInstalled?: boolean;
  name: string;
};

type CustomPluginsBridge = {
  installLocalOrgPlugin?: (
    pluginName: string,
  ) => Promise<{ error?: string; pluginId?: string; success: boolean }>;
  listLocalOrgPlugins?: () => Promise<unknown>;
};

function getCustomPlugins(): CustomPluginsBridge | undefined {
  return window["claude.web"]?.CustomPlugins as CustomPluginsBridge | undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeLocalOrgPlugin(raw: unknown): LocalOrgPlugin | null {
  const item = asRecord(raw);
  const name = typeof item.name === "string" ? item.name : "";
  const id =
    typeof item.id === "string" && item.id
      ? item.id
      : name;
  if (!id && !name) return null;
  return {
    id,
    name: name || id,
    description: typeof item.description === "string" ? item.description : undefined,
    isInstalled: item.isInstalled === true,
  };
}

export function LocalOrgPluginsContent({
  externalSearchQuery,
  isOpen,
  onClose,
}: {
  externalSearchQuery?: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [internalQuery, setInternalQuery] = useState("");
  const [installing, setInstalling] = useState(() => new Set<string>());
  const text = useCustomizeText();
  const query = useQuery({
    queryKey: LOCAL_ORG_PLUGINS_QUERY_KEY,
    queryFn: async () => {
      const list = getCustomPlugins()?.listLocalOrgPlugins;
      const raw = list ? await list() : [];
      const rows = Array.isArray(raw) ? raw : [];
      return rows.map(normalizeLocalOrgPlugin).filter((row): row is LocalOrgPlugin => row != null);
    },
    enabled: isOpen,
  });

  const hasExternalQuery = externalSearchQuery !== undefined;
  const search = hasExternalQuery ? externalSearchQuery : internalQuery;

  useEffect(() => {
    if (isOpen) setInternalQuery("");
  }, [isOpen]);

  const plugins = query.data;
  const hasPlugins = !!plugins && plugins.length > 0;

  const filtered = useMemo(() => {
    if (!plugins) return [];
    const needle = search.trim().toLowerCase();
    const next = needle
      ? plugins.filter(
          (plugin) =>
            plugin.name.toLowerCase().includes(needle)
            || plugin.description?.toLowerCase().includes(needle),
        )
      : plugins;
    return [...next].sort((a, b) => a.name.localeCompare(b.name));
  }, [plugins, search]);

  const onInstall = useCallback((pluginName: string) => {
    const install = getCustomPlugins()?.installLocalOrgPlugin;
    if (!install) return;
    setInstalling((prev) => new Set(prev).add(pluginName));
    void install(pluginName)
      .catch(() => undefined)
      .finally(() => {
        setInstalling((prev) => {
          const next = new Set(prev);
          next.delete(pluginName);
          return next;
        });
      });
  }, []);

  const onManage = useCallback(
    (pluginId: string) => {
      onClose();
      window.history.pushState({}, "", `/customize/plugins/${encodeURIComponent(pluginId)}`);
      window.dispatchEvent(new Event("app:navigation"));
    },
    [onClose],
  );

  if (query.isLoading) {
    return (
      <div className="flex h-full items-center justify-center py-12">
        <Icon className="animate-spin text-text-400" customSize={24} name="Spinner" />
      </div>
    );
  }

  if (query.isError) {
    const cannotRead = query.error instanceof Error
      && query.error.message.includes("Cannot read org plugins directory");
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-center">
        <p className="text-text-300 text-sm max-w-md">
          {cannotRead ? text.orgPluginsCannotRead : text.orgPluginsMissingSupport}
        </p>
      </div>
    );
  }

  if (!hasPlugins) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-center">
        <p className="text-text-300 text-sm max-w-md">
          {text.orgPluginsEmpty}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        {hasExternalQuery ? (
          <div className="flex overflow-x-auto gap-2 p-1 -m-1">
            <b className="font-base px-4 py-1.5 rounded-full shrink-0 flex items-center justify-center cursor-default text-text-100 bg-bg-500">
              {text.yourOrganization}
            </b>
          </div>
        ) : (
          <div className="relative flex-1">
            <input
              aria-label={text.searchPlugins}
              className="w-full rounded-lg border border-border-300 bg-bg-000 px-3 py-1.5 pl-9 text-sm text-text-300 placeholder:text-text-400"
              onChange={(event) => setInternalQuery(event.target.value)}
              placeholder={text.searchEllipsis}
              type="text"
              value={internalQuery}
            />
            <Icon
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-300"
              customSize={16}
              name="Search"
            />
          </div>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-text-400 text-sm">{text.noPluginsMatchSearch}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map((plugin) => (
              <LocalOrgPluginCard
                isInstalling={installing.has(plugin.name)}
                key={plugin.name}
                onInstall={onInstall}
                onManage={onManage}
                plugin={plugin}
                text={text}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Official D8t LocalOrgPluginCard → n8t UnifiedDirectoryCard. */
function LocalOrgPluginCard({
  isInstalling,
  onInstall,
  onManage,
  plugin,
  text,
}: {
  isInstalling: boolean;
  onInstall: (name: string) => void;
  onManage: (id: string) => void;
  plugin: LocalOrgPlugin;
  text: CustomizeText;
}) {
  const installed = plugin.isInstalled === true;
  return (
    <div
      className="group/card flex h-full flex-col gap-3 rounded-2xl border-0.5 bg-bg-000 p-4 text-left shadow-sm transition-all hover:bg-bg-200 focus-within:bg-bg-200 border-border-300"
      onClick={installed ? () => onManage(plugin.id) : undefined}
      onKeyDown={
        installed
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onManage(plugin.id);
              }
            }
          : undefined
      }
      role={installed ? "button" : undefined}
      tabIndex={installed ? 0 : undefined}
    >
      <div className="flex gap-3 items-center">
        <div className="flex size-10 shrink-0 items-center justify-center">
          <div className="flex size-10 items-center justify-center rounded-lg border-0.5 border-border-300 bg-bg-100">
            <Icon className="size-6" name="plugin" />
          </div>
        </div>
        <div className="flex min-w-0 grow flex-col gap-0.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm font-medium text-text-100" title={plugin.name}>
              {plugin.name}
            </span>
          </div>
        </div>
        <div
          className="shrink-0"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          role="presentation"
        >
          {installed ? (
            <OfficialButton
              aria-label={text.manage}
              onClick={() => onManage(plugin.id)}
              size="icon_sm"
              variant="ghost"
            >
              <Icon customSize={16} name="Settings" />
            </OfficialButton>
          ) : (
            <OfficialButton
              aria-busy={isInstalling}
              aria-label={text.install}
              disabled={isInstalling}
              onClick={() => onInstall(plugin.name)}
              size="icon_sm"
              variant="ghost"
            >
              {isInstalling ? (
                <Icon className="animate-spin" customSize={16} name="Spinner" />
              ) : (
                <Icon customSize={16} name="Add" />
              )}
            </OfficialButton>
          )}
        </div>
      </div>
      {plugin.description ? (
        <p className="mt-auto line-clamp-2 text-xs text-text-400">{plugin.description}</p>
      ) : null}
    </div>
  );
}
