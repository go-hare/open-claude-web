/**
 * Official c63a plugins/$pluginId (+ /skills|/agents|/hooks|/connectors).
 * Ss(pluginId) from OX/dX list; missing plugin → replace /customize.
 */
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { readPersistedFrameMode } from "../../../stores/frameStoreHelpers";
import { getSelectedFolder, subscribeSelectedFolder } from "../selectedFolderStore";
import {
  fetchLocalPlugins,
  localPluginsHostVisible,
  localPluginsQueryKey,
  pluginListContext,
} from "./localPluginsQuery";
import { PluginDetailPanel } from "./PluginDetailPanel";
import { PluginSubroutePanel, type PluginSubroute } from "./PluginSubroutePanel";

export function PluginRoute({
  onNavigate,
  pluginId,
  selectedName,
  subroute,
}: {
  onNavigate: (path: string) => void;
  pluginId: string;
  selectedName?: string | null;
  subroute?: PluginSubroute;
}) {
  const isCcd = readPersistedFrameMode() === "code";
  const selectedFolder = useSyncExternalStore(subscribeSelectedFolder, getSelectedFolder, () => null);
  const context = useMemo(() => pluginListContext(isCcd, selectedFolder), [isCcd, selectedFolder]);
  const query = useQuery({
    queryKey: localPluginsQueryKey(context),
    queryFn: () => fetchLocalPlugins(context),
    enabled: localPluginsHostVisible(),
    staleTime: 300_000,
    gcTime: 600_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });
  const plugin = useMemo(
    () => (query.data ?? []).find((row) => row.id === pluginId),
    [pluginId, query.data],
  );
  const missing = !plugin && !query.isLoading && !query.isFetching;

  useEffect(() => {
    if (!missing) return;
    window.history.replaceState({}, "", "/customize");
    window.dispatchEvent(new Event("app:navigation"));
  }, [missing]);

  if (query.isLoading || (query.isFetching && !plugin)) {
    return <PluginDetailSkeleton />;
  }
  if (!plugin) return null;
  if (subroute) {
    return (
      <PluginSubroutePanel
        onNavigate={onNavigate}
        plugin={plugin}
        selectedName={selectedName}
        subroute={subroute}
      />
    );
  }
  return <PluginDetailPanel onNavigate={onNavigate} plugin={plugin} />;
}

function PluginDetailSkeleton() {
  return (
    <div className="flex flex-col h-full animate-pulse">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="h-6 w-[200px] rounded-md bg-bg-300" />
        <div className="flex items-center gap-3">
          <div className="h-5 w-10 rounded-full bg-bg-300" />
          <div className="size-8 rounded-md bg-bg-300" />
        </div>
      </div>
    </div>
  );
}
