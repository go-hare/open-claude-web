/**
 * Residual of official desktop Cowork Artifacts library surface:
 * - ion-dist index-BELzQL5P `_K = "/cowork-artifact"` (qQt list + UQt detail)
 * - `fSe` (getAllArtifacts + onArtifactsChanged)
 * - `UGt` thumbnail card (group/thumb h-[164px] …)
 * - `kGt` detail host view via oT.showArtifact / hideArtifact bounds residual
 * - settings Visuals gate: preview_feature_uses_artifacts
 * - OGt.title: "Live artifacts"
 *
 * Nav may still use `/artifacts/my`; product aliases map to this page.
 * No Anthropic share/import invent — share CTAs stay honest-disabled.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import type { RouteViewProps } from "../../app/routes";
import { desktopBridge } from "../../adapters/desktopBridge";
import type { CoworkArtifactSummary } from "../../adapters/desktopBridge/types";
import {
  ARTIFACTS_PREF_EVENT,
  readPreviewFeatureUsesArtifacts,
} from "../settings/artifactsPreference";
import { primaryButtonClass, secondaryButtonClass } from "../shared/buttonClasses";

function useArtifactsPreference(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") return () => {};
      const handler = () => onStoreChange();
      window.addEventListener(ARTIFACTS_PREF_EVENT, handler);
      window.addEventListener("storage", handler);
      return () => {
        window.removeEventListener(ARTIFACTS_PREF_EVENT, handler);
        window.removeEventListener("storage", handler);
      };
    },
    () => readPreviewFeatureUsesArtifacts(),
    () => true,
  );
}

/** Official fSe residual. */
function useCoworkArtifactsList(enabled: boolean) {
  const [artifacts, setArtifacts] = useState<CoworkArtifactSummary[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);

  const reload = useCallback(async () => {
    const bridge = desktopBridge.CoworkArtifacts;
    if (!bridge?.getAllArtifacts) {
      setArtifacts([]);
      setIsLoading(false);
      return;
    }
    try {
      const rows = await bridge.getAllArtifacts();
      setArtifacts(Array.isArray(rows) ? rows : []);
    } catch {
      setArtifacts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    void reload();
    const bridge = desktopBridge.CoworkArtifacts;
    const unsub = bridge?.onArtifactsChanged?.(() => {
      void reload();
    });
    return () => {
      unsub?.();
    };
  }, [enabled, reload]);

  return { artifacts, isLoading, reload };
}

function CenteredMessage({
  button,
  description,
  headline,
  onClick,
}: {
  button: string;
  description?: string;
  headline: string;
  onClick: () => void;
}) {
  return (
    <div className="grid place-content-center min-h-min text-center gap-2 pt-24 pb-32 px-4 mx-auto h-screen w-fit">
      <div className="mb-10 h-[26px] text-center" aria-hidden="true" />
      <h2 className="font-ui-serif text-4xl text-text-200">{headline}</h2>
      {description ? <h3 className="font-large text-text-500">{description}</h3> : null}
      <div className="mx-0 mt-4 min-w-[16rem]">
        <button className={primaryButtonClass} onClick={onClick} type="button">
          {button}
        </button>
      </div>
    </div>
  );
}

/** Official UGt thumbnail residual. */
function ArtifactThumb({ artifactId }: { artifactId: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setVisible(true);
      },
      { rootMargin: "80px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    void desktopBridge.CoworkArtifacts?.getArtifactThumbnail?.(artifactId)
      .then((value) => {
        if (cancelled || !value) return;
        setSrc(value.startsWith("data:") ? value : `data:image/png;base64,${value}`);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [artifactId, visible]);

  return (
    <div
      ref={ref}
      className="group/thumb h-[164px] overflow-hidden rounded-xl border-0.5 border-border-300 px-6 pt-6 transition duration-300 hover:border-border-200 hover:bg-bg-000/20 group-focus-within:border-border-200 group-focus-within:bg-bg-000/20"
      data-official-source="index-BELzQL5P.js:UGt"
    >
      <div className="size-full translate-y-1 overflow-hidden rounded-t-xl border-l border-r border-t border-border-300 bg-gradient-to-b from-bg-000 to-bg-000/20 transition-all duration-300 group-hover/thumb:translate-y-0 group-hover/thumb:bg-bg-000 group-hover/thumb:shadow-lg group-focus-within:translate-y-0 group-focus-within:bg-bg-000 group-focus-within:shadow-lg">
        {src ? (
          <img
            alt=""
            className="pointer-events-none size-full select-none object-cover object-top"
            draggable={false}
            onError={() => setSrc(null)}
            src={src}
          />
        ) : (
          <div className="flex size-full flex-col gap-2 p-3">
            <div className="h-2 w-2/3 rounded-sm bg-bg-400" />
            <div className="h-2 w-full rounded-sm bg-bg-300" />
            <div className="h-2 w-5/6 rounded-sm bg-bg-300" />
            <div className="mt-1 flex flex-1 gap-2">
              <div className="flex-1 rounded bg-bg-300" />
              <div className="flex-1 rounded bg-bg-300" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ArtifactCard({
  artifact,
  onOpen,
  onToggleStar,
  onDelete,
}: {
  artifact: CoworkArtifactSummary;
  onOpen: () => void;
  onToggleStar: () => void;
  onDelete: () => void;
}) {
  const missing = artifact.errors?.includes("artifactFolderMissing") === true;
  return (
    <div
      className="group flex flex-col gap-2 rounded-xl text-left"
      data-official-source="index-BELzQL5P.js:UGt card residual"
    >
      <button
        className="block w-full border-0 bg-transparent p-0 text-left"
        disabled={missing}
        onClick={onOpen}
        type="button"
      >
        <ArtifactThumb artifactId={artifact.id} />
      </button>
      <div className="flex items-start gap-2 px-1">
        <button
          className="min-w-0 flex-1 text-left"
          disabled={missing}
          onClick={onOpen}
          type="button"
        >
          <div className="truncate font-medium text-text-100">{artifact.name}</div>
          {missing ? (
            <div className="text-xs text-danger-100">Folder missing on disk</div>
          ) : artifact.description ? (
            <div className="truncate text-xs text-text-400">{artifact.description}</div>
          ) : null}
        </button>
        <button
          aria-label={artifact.isStarred ? "Unstar artifact" : "Star artifact"}
          className="shrink-0 rounded p-1 text-text-400 hover:bg-bg-200 hover:text-text-100"
          onClick={onToggleStar}
          type="button"
        >
          {artifact.isStarred ? "★" : "☆"}
        </button>
        <button
          aria-label="Delete artifact"
          className="shrink-0 rounded p-1 text-text-400 hover:bg-bg-200 hover:text-danger-100"
          onClick={onDelete}
          type="button"
        >
          ×
        </button>
      </div>
    </div>
  );
}

/**
 * Official kGt host preview residual: measure mount rect → showArtifact(id, bounds).
 */
function ArtifactHostPreview({
  artifactId,
  version,
}: {
  artifactId: string;
  version?: number;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const bridge = desktopBridge.CoworkArtifacts;
    const node = mountRef.current;
    if (!bridge?.showArtifact || !node) return;
    let cancelled = false;
    const pushBounds = () => {
      if (cancelled) return;
      const rect = node.getBoundingClientRect();
      void bridge.showArtifact?.(
        artifactId,
        { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        version,
      );
    };
    pushBounds();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(pushBounds) : null;
    observer?.observe(node);
    window.addEventListener("resize", pushBounds);
    return () => {
      cancelled = true;
      observer?.disconnect();
      window.removeEventListener("resize", pushBounds);
      void bridge.hideArtifact?.();
    };
  }, [artifactId, version]);

  return (
    <div
      ref={mountRef}
      className="relative min-h-[320px] flex-1 overflow-hidden rounded-xl border border-border-300 bg-bg-100"
      data-official-source="index-BELzQL5P.js:kGt showArtifact mount"
      style={{ minHeight: 420 } satisfies CSSProperties}
    />
  );
}

function ArtifactDetailPanel({
  artifact,
  onBack,
  onReloadList,
}: {
  artifact: CoworkArtifactSummary;
  onBack: () => void;
  onReloadList: () => void;
}) {
  const missing = artifact.errors?.includes("artifactFolderMissing") === true;
  const [busy, setBusy] = useState(false);

  const reloadView = useCallback(async () => {
    setBusy(true);
    try {
      await desktopBridge.CoworkArtifacts?.reloadArtifactView?.();
    } finally {
      setBusy(false);
    }
  }, []);

  const toggleStar = useCallback(async () => {
    await desktopBridge.CoworkArtifacts?.setArtifactStarred?.(artifact.id, !artifact.isStarred);
    onReloadList();
  }, [artifact.id, artifact.isStarred, onReloadList]);

  const remove = useCallback(async () => {
    setBusy(true);
    try {
      // Official list/detail soft-delete: deleteArtifact(id) → removeFiles undefined/false.
      // Disk folder may remain (isSlugTaken); getAllWithDiskStatus does not re-import it.
      await desktopBridge.CoworkArtifacts?.deleteArtifact?.(artifact.id);
      onReloadList();
      onBack();
    } finally {
      setBusy(false);
    }
  }, [artifact.id, onBack, onReloadList]);

  const versions = Array.isArray(artifact.versions)
    ? artifact.versions.filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    : [];
  const [selectedVersion, setSelectedVersion] = useState<number | "">("");

  const restoreVersion = useCallback(async () => {
    if (selectedVersion === "") return;
    setBusy(true);
    try {
      // Official oT.restoreArtifactVersion(id, version) residual.
      await desktopBridge.CoworkArtifacts?.restoreArtifactVersion?.(
        artifact.id,
        Number(selectedVersion),
      );
      onReloadList();
      await desktopBridge.CoworkArtifacts?.reloadArtifactView?.();
    } finally {
      setBusy(false);
    }
  }, [artifact.id, onReloadList, selectedVersion]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 px-6 pb-8 pt-4" data-official-source="index-BELzQL5P.js:kGt">
      <div className="flex items-center gap-2">
        <button className={secondaryButtonClass} onClick={onBack} type="button">
          Back
        </button>
        <h1 className="min-w-0 flex-1 truncate font-heading text-xl text-text-100">{artifact.name}</h1>
        <button className={secondaryButtonClass} disabled={busy || missing} onClick={() => void reloadView()} type="button">
          Reload
        </button>
        <button className={secondaryButtonClass} disabled={busy} onClick={() => void toggleStar()} type="button">
          {artifact.isStarred ? "Unstar" : "Star"}
        </button>
        <button className={secondaryButtonClass} disabled={busy} onClick={() => void remove()} type="button">
          Delete
        </button>
      </div>
      {versions.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-text-300">
          <label className="text-text-400" htmlFor={`artifact-version-${artifact.id}`}>
            Version
          </label>
          <select
            className="rounded-md border border-border-300 bg-bg-100 px-2 py-1 text-text-100"
            disabled={busy || missing}
            id={`artifact-version-${artifact.id}`}
            onChange={(event) => {
              const value = event.target.value;
              setSelectedVersion(value ? Number(value) : "");
            }}
            value={selectedVersion === "" ? "" : String(selectedVersion)}
          >
            <option value="">Current</option>
            {[...versions].reverse().map((stamp) => (
              <option key={stamp} value={stamp}>
                {new Date(stamp).toLocaleString()}
              </option>
            ))}
          </select>
          <button
            className={secondaryButtonClass}
            disabled={busy || missing || selectedVersion === ""}
            onClick={() => void restoreVersion()}
            type="button"
          >
            Restore
          </button>
        </div>
      ) : null}
      {missing ? (
        <div className="rounded-lg border border-border-300 bg-bg-200 p-4 text-sm text-text-300">
          Artifact folder is missing on disk. Delete the entry or restore files under Documents/Claude/Artifacts.
        </div>
      ) : (
        <ArtifactHostPreview artifactId={artifact.id} />
      )}
    </div>
  );
}

/** Official `_K = "/cowork-artifact"` residual list base. */
const COWORK_ARTIFACT_BASE = "/cowork-artifact";

function subscribeAppLocation(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("popstate", onChange);
  window.addEventListener("app:navigation", onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener("app:navigation", onChange);
  };
}

function readPathname(): string {
  return typeof window === "undefined" ? "/" : window.location.pathname;
}

/** Official UQt: decodeURIComponent(route id) under /cowork-artifact/:id. */
function parseCoworkArtifactId(pathname: string): string | null {
  const match = /^\/cowork-artifact\/([^/]+)\/?$/.exec(pathname);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

/**
 * Cloud/nav aliases (`/artifacts`, `/artifacts/my`) are not the desktop host
 * library path. Rewrite to `_K` whenever pathname is an alias so DesktopFrame
 * mode + deep links align (must re-run on navigation, not only mount).
 */
function useCoworkArtifactCanonicalPath(pathname: string) {
  useEffect(() => {
    const path = pathname || window.location.pathname;
    if (
      path === "/artifacts"
      || path === "/artifacts/"
      || path === "/artifacts/my"
      || path === "/artifacts/my/"
      || (path.startsWith("/artifacts/") && !path.startsWith("/cowork-artifact"))
    ) {
      window.history.replaceState({}, "", COWORK_ARTIFACT_BASE);
      window.dispatchEvent(new Event("app:navigation"));
    }
  }, [pathname]);
}

export function ArtifactsLibraryPage({ onNavigate }: RouteViewProps) {
  const showArtifacts = useArtifactsPreference();
  const { artifacts, isLoading, reload } = useCoworkArtifactsList(showArtifacts);
  const pathname = useSyncExternalStore(subscribeAppLocation, readPathname, () => "/");
  useCoworkArtifactCanonicalPath(pathname);
  const selectedId = useMemo(() => parseCoworkArtifactId(pathname), [pathname]);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return artifacts.find((item) => item.id === selectedId) ?? null;
  }, [artifacts, selectedId]);

  const openArtifact = useCallback(
    (id: string) => {
      // Official qQt → push(`${_K}/${id}`) residual.
      onNavigate(`${COWORK_ARTIFACT_BASE}/${encodeURIComponent(id)}`);
    },
    [onNavigate],
  );

  const backToList = useCallback(() => {
    // Official UQt onClose → push(_K).
    onNavigate(COWORK_ARTIFACT_BASE);
  }, [onNavigate]);

  if (!showArtifacts) {
    return (
      <CenteredMessage
        button="Open Capabilities settings"
        description="Artifacts is turned off in Settings → Capabilities → Visuals. Enable it to use the Artifacts space when available."
        headline="Artifacts disabled"
        onClick={() => onNavigate("/settings/capabilities")}
      />
    );
  }

  if (selectedId) {
    if (isLoading && !selected) {
      return (
        <div className="py-16 text-center text-sm text-text-400" data-official-source="index-BELzQL5P.js:UQt loading">
          Loading artifact…
        </div>
      );
    }
    if (!selected) {
      return (
        <CenteredMessage
          button="Back to Live artifacts"
          description="This artifact is not in the local library bag (deleted or never imported)."
          headline="Artifact not found"
          onClick={backToList}
        />
      );
    }
    return (
      <ArtifactDetailPanel
        artifact={selected}
        onBack={backToList}
        onReloadList={() => void reload()}
      />
    );
  }

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-auto px-6 pb-12 pt-4"
      data-official-source="index-BELzQL5P.js:qQt _K=/cowork-artifact"
    >
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl text-text-100">Live artifacts</h1>
          <p className="mt-1 text-sm text-text-400">
            Create dynamic artifacts that stay up-to-date using live data from your connectors.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-sm text-text-400">Loading artifacts…</div>
      ) : artifacts.length === 0 ? (
        <div className="grid place-content-center gap-2 py-24 text-center">
          <h2 className="font-ui-serif text-3xl text-text-200">No artifacts yet</h2>
          <p className="max-w-md text-text-400">
            Artifacts created in Cowork sessions appear here. Open a session and ask Claude to build a live page to park one.
          </p>
          <div className="mt-4">
            <button className={primaryButtonClass} onClick={() => onNavigate("/task/new")} type="button">
              Go back home
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {artifacts.map((artifact) => (
            <ArtifactCard
              key={artifact.id}
              artifact={artifact}
              onDelete={() => {
                // Official list page: oT.deleteArtifact?.(id) — soft-delete bag only.
                void desktopBridge.CoworkArtifacts?.deleteArtifact?.(artifact.id).then(() =>
                  reload(),
                );
              }}
              onOpen={() => openArtifact(artifact.id)}
              onToggleStar={() => {
                void desktopBridge.CoworkArtifacts?.setArtifactStarred?.(
                  artifact.id,
                  !artifact.isStarred,
                ).then(() => reload());
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
