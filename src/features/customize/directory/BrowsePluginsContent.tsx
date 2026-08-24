/**
 * Official L8t / R8t BrowsePluginsContent (index-BELzQL5P.js).
 * Residual: local-only E8t path (v=!jd()&&false). No Code tab, no org page,
 * no gitMissing/egressBlocked, no g8t drill (cards Install/Manage only).
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Menu } from "@base-ui-components/react/menu";
import { Icon } from "../../../shell/icons";
import { ConfirmDialog } from "../../../shell/ConfirmDialog";
import { BaseMenuItem, BaseMenuPopup } from "../../../shell/BaseMenu";
import { OfficialButton } from "../../shared/OfficialButton";
import { useErrorsOptional } from "../../settings/errorsToast";
import { useCustomizeText } from "../customizeMessages";
import { AddMarketplaceModal } from "./AddMarketplaceModal";
import { DirectoryChip, DirectoryChipRow } from "./DirectoryChips";
import { DirectoryCardSkeleton, PluginDirectoryCard } from "./UnifiedDirectoryCard";
import { PluginUploadModal } from "./PluginUploadModal";
import {
  asRecord,
  fetchMarketplacePlugins,
  fetchMarketplaces,
  findExistingMarketplace,
  formatI18n,
  getCustomPlugins,
  isManualMarketplace,
  MARKETPLACE_PLUGINS_QUERY_KEY,
  MARKETPLACES_QUERY_KEY,
  personalMarketplaceList,
  titleCasePluginName,
  type DirectoryPluginSeed,
  type MarketplacePluginRecord,
  type MarketplaceRecord,
} from "./pluginMarketplace";

type BrowseTab = "default" | "personal";

export function BrowsePluginsContentInner({
  initialConfig,
  isOpen,
  onClose,
  searchQuery = "",
}: {
  drillDownPluginId?: string | null;
  initialConfig?: DirectoryPluginSeed;
  isOpen: boolean;
  onClose: () => void;
  onDrillDownChange?: (id: string | null) => void;
  searchQuery?: string;
}) {
  const text = useCustomizeText();
  const errors = useErrorsOptional();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<BrowseTab>("default");
  const [selectedMarketplace, setSelectedMarketplace] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [installing, setInstalling] = useState(() => new Set<string>());
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const seededRef = useRef(false);
  const missingSourceRef = useRef(false);

  const customPlugins = getCustomPlugins();
  const missingHost = isOpen && !customPlugins?.listAvailablePlugins;

  const marketplacesQuery = useQuery({
    queryKey: MARKETPLACES_QUERY_KEY,
    queryFn: fetchMarketplaces,
    enabled: isOpen,
    retry: 3,
  });
  const pluginsQuery = useQuery({
    queryKey: MARKETPLACE_PLUGINS_QUERY_KEY,
    queryFn: fetchMarketplacePlugins,
    enabled: isOpen,
    retry: 3,
  });

  const marketplaces = marketplacesQuery.data ?? [];
  const plugins = pluginsQuery.data ?? [];
  const personal = useMemo(
    () => personalMarketplaceList(marketplaces, plugins),
    [marketplaces, plugins],
  );
  const defaultNames = useMemo(
    () => new Set(marketplaces.filter((row) => row.isDefault).map((row) => row.name)),
    [marketplaces],
  );
  const hasPersonal = personal.length > 0;
  const selectedRecord = useMemo(
    () => (selectedMarketplace ? personal.find((row) => row.name === selectedMarketplace) : undefined),
    [personal, selectedMarketplace],
  );
  const selectedIsManual = !!selectedRecord && isManualMarketplace(selectedRecord);

  const refetchAll = useCallback(() => {
    void marketplacesQuery.refetch();
    void pluginsQuery.refetch();
  }, [marketplacesQuery, pluginsQuery]);

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: MARKETPLACES_QUERY_KEY });
    await queryClient.invalidateQueries({ queryKey: MARKETPLACE_PLUGINS_QUERY_KEY });
  }, [queryClient]);

  useEffect(() => {
    if (!isOpen) {
      seededRef.current = false;
      missingSourceRef.current = false;
      return;
    }
    if (!initialConfig?.marketplaceName && !initialConfig?.marketplaceSource) {
      setTab("default");
      setSelectedMarketplace(null);
    }
  }, [isOpen, initialConfig?.marketplaceName, initialConfig?.marketplaceSource]);

  useEffect(() => {
    if (!hasPersonal && tab === "personal") setTab("default");
  }, [hasPersonal, tab]);

  useEffect(() => {
    if (tab === "personal" && !selectedMarketplace && personal.length > 0) {
      setSelectedMarketplace(personal[0].name);
    }
  }, [tab, selectedMarketplace, personal]);

  useEffect(() => {
    if (!isOpen || seededRef.current || marketplacesQuery.isLoading) return;
    if (initialConfig?.marketplaceName) {
      const found = marketplaces.find((row) => row.name === initialConfig.marketplaceName);
      if (!found) return;
      seededRef.current = true;
      if (found.isDefault) setTab("default");
      else {
        setTab("personal");
        setSelectedMarketplace(found.name);
      }
      return;
    }
    if (initialConfig?.marketplaceSource && marketplaces.length > 0) {
      const found = findExistingMarketplace(initialConfig.marketplaceSource, marketplaces);
      seededRef.current = true;
      if (!found) return;
      if (found.isDefault) setTab("default");
      else {
        setTab("personal");
        setSelectedMarketplace(found.name);
      }
    }
  }, [
    isOpen,
    initialConfig?.marketplaceName,
    initialConfig?.marketplaceSource,
    marketplaces,
    marketplacesQuery.isLoading,
  ]);

  useEffect(() => {
    if (missingSourceRef.current || !initialConfig?.marketplaceSource || marketplacesQuery.isLoading) return;
    if (findExistingMarketplace(initialConfig.marketplaceSource, marketplaces)) return;
    missingSourceRef.current = true;
    setAddOpen(true);
  }, [initialConfig?.marketplaceSource, marketplaces, marketplacesQuery.isLoading]);

  const fatalMessage = missingHost
    ? text.customPluginsDesktopOnly
    : marketplacesQuery.error instanceof Error
      ? marketplacesQuery.error.message
      : pluginsQuery.error instanceof Error
        ? pluginsQuery.error.message
        : marketplacesQuery.error || pluginsQuery.error
          ? text.failedToLoadMarketplaces
          : null;
  const loading = marketplacesQuery.isLoading || pluginsQuery.isLoading;
  const ready = !fatalMessage && !loading && marketplacesQuery.isSuccess && pluginsQuery.isSuccess;
  const state: "loading" | "fatalError" | "ready" = fatalMessage
    ? "fatalError"
    : ready
      ? "ready"
      : "loading";

  const filtered = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    let rows: MarketplacePluginRecord[] =
      tab === "default"
        ? plugins.filter((plugin) => defaultNames.has(plugin.marketplaceName ?? ""))
        : selectedMarketplace
          ? plugins.filter((plugin) => plugin.marketplaceName === selectedMarketplace)
          : plugins.filter((plugin) => plugin.source !== "remote");
    rows = [...rows].sort((left, right) => left.name.localeCompare(right.name));
    if (needle) {
      rows = rows.filter((plugin) =>
        [plugin.name, titleCasePluginName(plugin.name), plugin.description ?? "", plugin.authorName ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      );
    }
    const seedName = initialConfig?.pluginName;
    if (seedName) {
      const index = rows.findIndex((plugin) => plugin.name === seedName);
      if (index > 0) {
        const [hit] = rows.splice(index, 1);
        rows.unshift(hit);
      }
    }
    return rows;
  }, [defaultNames, initialConfig?.pluginName, plugins, searchQuery, selectedMarketplace, tab]);

  const marketplaceLabel = useCallback(
    (marketplace: MarketplaceRecord | undefined, fallback: string) =>
      marketplace?.displayName ?? marketplace?.name ?? fallback,
    [],
  );

  const onInstall = useCallback(
    (plugin: MarketplacePluginRecord) => {
      const install = getCustomPlugins()?.installPlugin;
      if (!install) return;
      setInstalling((prev) => new Set(prev).add(plugin.id));
      void install(plugin.id)
        .then((raw) => {
          const result = asRecord(raw);
          if (result.success === false) {
            const message = typeof result.error === "string" ? result.error : "";
            errors?.addError(message || text.failedToLoadMarketplaces);
            return;
          }
          errors?.addSuccess(
            formatI18n(text.pluginInstalledReady, { pluginName: titleCasePluginName(plugin.name) }),
            { uniqueKey: `plugin-install-${plugin.id}` },
          );
          void invalidate();
        })
        .catch((caught: unknown) => {
          const message = caught instanceof Error ? caught.message : String(caught ?? "");
          errors?.addError(message || text.failedToLoadMarketplaces);
        })
        .finally(() => {
          setInstalling((prev) => {
            const next = new Set(prev);
            next.delete(plugin.id);
            return next;
          });
        });
    },
    [errors, invalidate, text.failedToLoadMarketplaces, text.pluginInstalledReady],
  );

  const onManage = useCallback(
    (pluginId: string) => {
      onClose();
      window.history.pushState({}, "", `/customize/plugins/${encodeURIComponent(pluginId)}`);
      window.dispatchEvent(new Event("app:navigation"));
    },
    [onClose],
  );

  const onRefresh = useCallback(
    (marketplace: MarketplaceRecord) => {
      const refresh = getCustomPlugins()?.refreshMarketplace;
      if (!refresh) return;
      setRefreshing(marketplace.name);
      void refresh(marketplace.id)
        .then((raw) => {
          if (raw == null) {
            errors?.addError(text.failedToUpdateMarketplace);
            return;
          }
          const result = asRecord(raw);
          if (result.success === false) {
            const message = typeof result.error === "string" ? result.error : "";
            errors?.addError(message || text.failedToUpdateMarketplace);
            return;
          }
          errors?.addSuccess(text.marketplaceUpdated);
          void invalidate();
        })
        .catch((caught: unknown) => {
          const message = caught instanceof Error ? caught.message : String(caught ?? "");
          errors?.addError(message || text.failedToUpdateMarketplace);
        })
        .finally(() => {
          setRefreshing(null);
        });
    },
    [errors, invalidate, text.failedToUpdateMarketplace, text.marketplaceUpdated],
  );

  const onConfirmRemove = useCallback(() => {
    if (!removeTarget) return;
    const marketplace = marketplaces.find((row) => row.name === removeTarget);
    const remove = getCustomPlugins()?.removeMarketplace;
    if (!marketplace || !remove) {
      errors?.addError(text.failedToRemoveMarketplace);
      setRemoveTarget(null);
      return;
    }
    void remove(marketplace.id)
      .then((raw) => {
        if (raw === false) {
          errors?.addError(text.failedToRemoveMarketplace);
          return;
        }
        errors?.addSuccess(
          formatI18n(text.marketplaceRemoved, { marketplaceName: marketplace.name }),
        );
        if (selectedMarketplace === marketplace.name) {
          const next = personal.filter((row) => row.name !== marketplace.name);
          setSelectedMarketplace(next.length > 0 ? next[0].name : null);
        }
        void invalidate();
      })
      .catch((caught: unknown) => {
        const message = caught instanceof Error ? caught.message : String(caught ?? "");
        errors?.addError(message || text.failedToRemoveMarketplace);
      })
      .finally(() => {
        setRemoveTarget(null);
      });
  }, [
    errors,
    invalidate,
    marketplaces,
    personal,
    removeTarget,
    selectedMarketplace,
    text.failedToRemoveMarketplace,
    text.marketplaceRemoved,
  ]);

  const onAddedMarketplace = useCallback((name: string) => {
    setTab("personal");
    setSelectedMarketplace(name);
    void invalidate();
  }, [invalidate]);

  const searching = searchQuery.trim() !== "";
  const emptyCopy =
    searching
      ? text.noPluginsMatchSearch
      : tab === "default"
        ? text.noPluginsAvailable
        : selectedIsManual
          ? text.uploadPluginsAppearHere
          : text.addPluginsToMarketplaceAppearHere;

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="flex flex-col gap-4 flex-1 min-h-0">
          <div className="flex items-center justify-between">
            <DirectoryChipRow>
              <DirectoryChip
                isActive={tab === "default"}
                onClick={() => setTab("default")}
              >
                {text.anthropicAndPartners}
              </DirectoryChip>
              {hasPersonal ? (
                <DirectoryChip
                  isActive={tab === "personal"}
                  onClick={() => {
                    setTab("personal");
                    if (!selectedMarketplace && personal.length > 0) {
                      setSelectedMarketplace(personal[0].name);
                    }
                  }}
                >
                  {text.personal}
                </DirectoryChip>
              ) : null}
            </DirectoryChipRow>
          </div>

          {tab === "personal" ? (
            <div className="flex items-center gap-2">
              {personal.length > 0 ? (
                <DirectoryChipRow>
                  {personal.map((marketplace) => {
                    const active = selectedMarketplace === marketplace.name;
                    return (
                      <DirectoryChip
                        className="pl-3"
                        isActive={active}
                        key={marketplace.name}
                        onClick={() => {
                          setSelectedMarketplace(marketplace.name);
                          setOptionsOpen(false);
                        }}
                        size="sm"
                      >
                        <span className="flex items-center gap-1">
                          {marketplaceLabel(marketplace, marketplace.name)}
                          {active && !isManualMarketplace(marketplace) ? (
                            <Menu.Root onOpenChange={setOptionsOpen} open={optionsOpen}>
                              <Menu.Trigger
                                aria-label={text.marketplaceOptions}
                                className={[
                                  "flex items-center justify-center ml-0.5 rounded-full transition-colors",
                                  optionsOpen
                                    ? "text-text-000 bg-always-black/10"
                                    : "text-inherit hover:text-text-100",
                                ].join(" ")}
                                onClick={(event) => event.stopPropagation()}
                                type="button"
                              >
                                {refreshing === marketplace.name ? (
                                  <Icon className="animate-spin" customSize={14} name="Spinner" />
                                ) : (
                                  <Icon customSize={14} name="DotsHorizontal" />
                                )}
                              </Menu.Trigger>
                              <BaseMenuPopup align="start">
                                <BaseMenuItem
                                  icon="Reload"
                                  onClick={() => onRefresh(marketplace)}
                                >
                                  {text.checkForUpdates}
                                </BaseMenuItem>
                                <BaseMenuItem
                                  className="text-danger-000"
                                  icon="Trash"
                                  onClick={() => setRemoveTarget(marketplace.name)}
                                >
                                  {text.remove}
                                </BaseMenuItem>
                              </BaseMenuPopup>
                            </Menu.Root>
                          ) : null}
                        </span>
                      </DirectoryChip>
                    );
                  })}
                </DirectoryChipRow>
              ) : null}
              {state !== "fatalError" ? (
                <Menu.Root>
                  <Menu.Trigger
                    aria-label={text.addMarketplace}
                    className="flex items-center justify-center w-7 h-7 rounded-full text-text-500 hover:text-text-100 hover:bg-bg-300 transition-colors"
                    type="button"
                  >
                    <Icon customSize={16} name="Add" />
                  </Menu.Trigger>
                  <BaseMenuPopup align="start">
                    <BaseMenuItem icon="Globe" onClick={() => setAddOpen(true)}>
                      {text.addMarketplace}
                    </BaseMenuItem>
                    <BaseMenuItem icon="FileUpload" onClick={() => setUploadOpen(true)}>
                      {text.uploadPlugin}
                    </BaseMenuItem>
                  </BaseMenuPopup>
                </Menu.Root>
              ) : null}
            </div>
          ) : null}

          <div className="flex-1 min-h-0 overflow-y-auto">
            {state === "fatalError" ? (
              <div className="flex items-center justify-center py-8 px-4">
                <div className="bg-bg-200 border-0.5 border-border-200 rounded-xl p-4 w-full max-w-2xl">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center pl-1.5 pt-0.5">
                      <Icon className="w-5 h-5 text-danger-000 shrink-0" name="WarningCircle" />
                    </div>
                    <div className="flex flex-col gap-2 flex-1">
                      <span className="text-sm font-medium text-text-000">
                        {text.failedToLoadMarketplaces}
                      </span>
                      <span className="text-sm text-text-300 break-words">{fatalMessage}</span>
                      <div className="flex gap-2 mt-1">
                        <OfficialButton onClick={refetchAll} size="sm" variant="secondary">
                          {text.tryAgain}
                        </OfficialButton>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {state === "loading" ? (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                {[1, 2, 3, 4, 5, 6].map((key) => (
                  <DirectoryCardSkeleton key={key} />
                ))}
              </div>
            ) : null}

            {state === "ready" && filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-sm text-text-300">{emptyCopy}</p>
              </div>
            ) : null}

            {state === "ready" && filtered.length > 0 ? (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                {filtered.map((plugin) => {
                  const marketplace = marketplaces.find(
                    (row) => row.name === plugin.marketplaceName,
                  );
                  const authorName =
                    plugin.authorName
                    ?? (tab === "personal"
                      ? marketplaceLabel(marketplace, plugin.marketplaceName ?? "")
                      : undefined);
                  return (
                    <PluginDirectoryCard
                      authorName={authorName || undefined}
                      description={plugin.description}
                      isHighlighted={plugin.name === initialConfig?.pluginName}
                      isInstalled={plugin.isInstalled}
                      isInstalling={installing.has(plugin.id)}
                      key={plugin.id}
                      name={plugin.name}
                      onInstall={() => onInstall(plugin)}
                      onManage={() => onManage(plugin.id)}
                    />
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <ConfirmDialog
        confirmText={text.remove}
        isOpen={removeTarget != null}
        message={text.removeMarketplaceFromList}
        onClose={() => setRemoveTarget(null)}
        onConfirm={onConfirmRemove}
        title={text.removeMarketplaceQuestion}
        variant="danger"
      />
      <AddMarketplaceModal
        existingMarketplaces={marketplaces}
        initialInput={initialConfig?.marketplaceSource}
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={onAddedMarketplace}
      />
      <PluginUploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={() => {
          void invalidate();
          refetchAll();
        }}
      />
    </>
  );
}

export const BrowsePluginsContent = memo(BrowsePluginsContentInner);
BrowsePluginsContent.displayName = "BrowsePluginsContent";
