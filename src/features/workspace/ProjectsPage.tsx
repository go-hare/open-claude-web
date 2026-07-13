/**
 * Official projects list `_Component32` (c1b9abf13-BWGqUBhA) cowork branch.
 * Shell EGt/lB, search gYt/lF, grid NGt/lC, card SGt/lD, empty M4t/bF+Kq,
 * create via SpaceOnboardingModal ukt/lG (not /projects/create).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  desktopBridge,
  type CoworkSpaceSummary,
} from "../../adapters/desktopBridge";
import type { RouteViewProps } from "../../app/routes";
import { OfficialButton } from "../shared/OfficialButton";
import { ProjectsEmptyState } from "./ProjectsEmptyState";
import {
  formatProjectRelativeTime,
  ProjectCard,
  ProjectsCardGrid,
  ProjectsExpandableSearch,
  ProjectsPageShell,
  ProjectsSortMenu,
  type ProjectSortBy,
} from "./ProjectsListPrimitives";
import { SpaceOnboardingModal } from "./SpaceOnboardingModal";

type ProjectListItem = {
  createdAtMs: number;
  description: string | null;
  href: string;
  id: string;
  name: string;
  updatedAtMs: number;
};

const SORT_COMPARATORS: Record<
  ProjectSortBy,
  (left: ProjectListItem, right: ProjectListItem) => number
> = {
  recent: (left, right) => right.updatedAtMs - left.updatedAtMs,
  created: (left, right) => right.createdAtMs - left.createdAtMs,
  alphabetical: (left, right) => left.name.localeCompare(right.name),
};

function spaceToItem(space: CoworkSpaceSummary): ProjectListItem {
  return {
    id: space.id,
    name: space.name || "Untitled",
    description: space.description ?? null,
    updatedAtMs: space.updatedAtMs || 0,
    createdAtMs: space.createdAtMs ?? space.updatedAtMs ?? 0,
    href: `/space/${encodeURIComponent(space.id)}`,
  };
}

export function ProjectsPage({ onNavigate }: RouteViewProps) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<ProjectSortBy>("recent");
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [spaces, setSpaces] = useState<CoworkSpaceSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const next = await desktopBridge.CoworkSpaces?.list().catch(() => []);
      setSpaces(next ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!active) return;
      await reload();
    })();
    const unsubscribe = desktopBridge.CoworkSpaces?.onEvent?.(() => {
      void reload();
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [reload]);

  const items = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    let list = spaces.map(spaceToItem);
    if (trimmed) {
      list = list.filter(
        (item) =>
          item.name.toLowerCase().includes(trimmed) ||
          (item.description ?? "").toLowerCase().includes(trimmed),
      );
    }
    return [...list].sort(SORT_COMPARATORS[sortBy]);
  }, [spaces, query, sortBy]);

  const openOnboarding = useCallback(() => setOnboardingOpen(true), []);
  const closeOnboarding = useCallback(() => setOnboardingOpen(false), []);

  const handleCreated = useCallback(
    (spaceId: string) => {
      void reload();
      onNavigate(`/space/${encodeURIComponent(spaceId)}`);
    },
    [onNavigate, reload],
  );

  const hasQuery = query.trim().length > 0;
  const emptyBody =
    !loading && items.length === 0 ? (
      hasQuery ? (
        <div className="text-sm text-text-500 mt-4">No projects match your search.</div>
      ) : (
        <ProjectsEmptyState
          ctaLabel="New project"
          description="Point Claude at a folder on your machine and work on it together."
          headline="Looking to start a project?"
          onCtaClick={openOnboarding}
        />
      )
    ) : null;

  return (
    <div className="h-full" data-official-source="c1b9abf13-BWGqUBhA.js:_Component32">
      <ProjectsPageShell
        action={
          <OfficialButton onClick={openOnboarding} size="sm" variant="primary">
            New project
          </OfficialButton>
        }
        tabsEnd={
          <>
            <div
              aria-hidden={searchExpanded}
              className={[
                "transition-opacity duration-150",
                searchExpanded ? "opacity-0 pointer-events-none" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <ProjectsSortMenu onChange={setSortBy} value={sortBy} />
            </div>
            <ProjectsExpandableSearch
              onChange={setQuery}
              onExpandChange={setSearchExpanded}
              placeholder="Search projects"
              value={query}
            />
          </>
        }
        title="项目"
      >
        {emptyBody}
        {items.length > 0 ? (
          <ProjectsCardGrid>
            {items.map((item) => (
              <ProjectCard
                className="min-h-[7rem]"
                description={item.description || undefined}
                footer={
                  item.updatedAtMs > 0 ? (
                    <span>{formatProjectRelativeTime(item.updatedAtMs)}</span>
                  ) : undefined
                }
                href={item.href}
                key={item.id}
                onClick={() => onNavigate(item.href)}
                title={item.name}
              />
            ))}
          </ProjectsCardGrid>
        ) : null}
      </ProjectsPageShell>
      <SpaceOnboardingModal
        isOpen={onboardingOpen}
        onClose={closeOnboarding}
        onCreated={handleCreated}
      />
    </div>
  );
}
