import { useMemo, useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { officialDirectoryStore } from "../directory/officialDirectoryStore";
import { UploadPluginPage } from "./UploadPluginPage";
import { getSelectedFolder, subscribeSelectedFolder } from "../selectedFolderStore";
import { PluginDetailPanel } from "./PluginDetailPanel";
import { PluginsOverlayList } from "./PluginsOverlayList";
import {
  fetchLocalPlugins,
  localPluginsHostVisible,
  localPluginsQueryKey,
  pluginListContext,
} from "./localPluginsQuery";
import { readPersistedFrameMode } from "../../../stores/frameStoreHelpers";
import { getLocalPlugins } from "../directory/pluginMarketplace";

/**
 * Official overlay plugins page (c6a2a31c4) — W list, not Customize o7t sidebar.
 */
export function PluginsOverlayRoute({
  onCreateWithClaude,
  onNavigate,
}: {
  onCreateWithClaude?: () => void;
  onNavigate: (path: string) => void;
}) {
  const isCcd = readPersistedFrameMode() === "code";
  const selectedFolder = useSyncExternalStore(subscribeSelectedFolder, getSelectedFolder, () => null);
  const context = useMemo(() => pluginListContext(isCcd, selectedFolder), [isCcd, selectedFolder]);
  const localVisible = localPluginsHostVisible();
  const query = useQuery({
    queryKey: localPluginsQueryKey(context),
    queryFn: () => fetchLocalPlugins(context),
    enabled: localVisible,
    staleTime: 300_000,
    gcTime: 600_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });
  const plugins = query.data ?? [];
  const listReady = !query.isLoading;
  const canUpload = Boolean(getLocalPlugins()?.uploadPlugin);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const selected = useMemo(
    () => plugins.find((plugin) => plugin.id === selectedId) ?? null,
    [plugins, selectedId],
  );

  if (uploadOpen) {
    return (
      <UploadPluginPage
        onBack={() => setUploadOpen(false)}
        onSuccess={(result) => {
          setUploadOpen(false);
          if (result?.pluginId) setSelectedId(result.pluginId);
          void query.refetch();
        }}
      />
    );
  }

  if (selected) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col">
        <button
          className="mb-md inline-flex w-fit items-center gap-1 text-body text-secondary hover:text-primary"
          onClick={() => setSelectedId(null)}
          type="button"
        >
          Plugins
        </button>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-lg">
          <PluginDetailPanel onNavigate={onNavigate} plugin={selected} />
        </div>
      </div>
    );
  }

  return (
    <PluginsOverlayList
      canUpload={canUpload}
      listReady={listReady}
      onCreateWithClaude={onCreateWithClaude}
      onDiscover={() => officialDirectoryStore.getState().open("plugins", { pluginSeed: {} })}
      onSelect={setSelectedId}
      onUpload={() => setUploadOpen(true)}
      plugins={plugins}
      selectedId={selectedId}
    />
  );
}
