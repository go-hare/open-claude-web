import { createElement, type ComponentType, type ReactElement } from "react";
import type { CoworkDropdownItem } from "../ui/CoworkMenuTypes";
import {
  CoworkAddMenuConnectorsIcon,
  CoworkAddMenuFolderAddIcon,
  CoworkAddMenuGlobeIcon,
  CoworkAddMenuPaperclipIcon,
  CoworkAddMenuPluginsIcon,
  CoworkAddMenuProjectsIcon,
  CoworkAddMenuResearchIcon,
  CoworkAddMenuSkillsIcon,
  CoworkAddMenuStyleIcon,
} from "./CoworkAddMenuIcons";

export type CoworkAddMenuProject = {
  checked?: boolean;
  creatorName?: string;
  hostPath?: string;
  name: string;
  uuid: string;
};

/**
 * Official cwt (~178629 index-BELzQL5P):
 * - files: awt/nwt=gy paperclip, optional Qyt=cv Add folder, optional screenshot
 * - agent path e = dqe() || (isAgentNewRoute && considerEnabledForNonUI):
 *   hide project / Drive / GitHub and entire modes group
 * - tools: Skills (eRe=Vv) only if items; Connectors (Fvt=Ky); Plugins (Dv)
 */
export type CreateCoworkAddMenuItemsOptions = {
  /** Official isAgentNewRoute && considerEnabledForNonUI, or dqe agent mode. Default true for /task/new. */
  isAgentRoute?: boolean;
  includeAddFolder?: boolean;
  onAddFiles: () => void;
  onAddFolder?: () => void;
  onNavigate?: (path: string) => void;
  onSelectProject?: (project: CoworkAddMenuProject) => void;
  onToggleWebSearch?: () => void;
  /** When false/undefined, Skills row is omitted (official h returns null if no skill items). */
  skills?: CoworkDropdownItem[];
  projects?: CoworkAddMenuProject[];
  webSearchEnabled?: boolean;
  /** Plugin catalog empty → official "Add plugins..."; with items → Plugins submenu. */
  hasEnabledPlugins?: boolean;
  /** Connectors empty → "Add connectors" button; with items → Connectors submenu. */
  hasConnectors?: boolean;
};

type CoworkAddMenuRoutes = {
  openConnectors: () => void;
  openProjectCreate: () => void;
  openPlugins: () => void;
  openSkills: () => void;
  openStyles: () => void;
};

const noop = () => undefined;
const menuIconSize = 14;

function icon(node: ComponentType<{ size?: number }>): ReactElement {
  return createElement(node, { size: menuIconSize });
}

// Official reference:
// index-BELzQL5P.js:dwt renders the Add popup with align="start",
// alignOffset=-10, side="bottom", sideOffset=4.
// index-BELzQL5P.js:pwt uses "Add files, connectors, and more".
// index-BELzQL5P.js:cwt assembles files/projects, tools and modes groups.
export const coworkAddMenuOfficialSource = "index-BELzQL5P.js:cwt/dwt/pwt";

export function createCoworkAddMenuItems({
  isAgentRoute = true,
  includeAddFolder = false,
  onAddFiles,
  onAddFolder,
  onNavigate,
  onSelectProject,
  onToggleWebSearch,
  skills,
  projects = [],
  webSearchEnabled = false,
  hasEnabledPlugins = false,
  hasConnectors = false,
}: CreateCoworkAddMenuItemsOptions): CoworkDropdownItem[] {
  const routes = createCoworkAddMenuRoutes(onNavigate);
  const fileItems = createCoworkFileItems({
    isAgentRoute,
    includeAddFolder,
    onAddFiles,
    onAddFolder,
    onSelectProject,
    openConnectors: routes.openConnectors,
    openProjectCreate: routes.openProjectCreate,
    projects,
  });
  const toolItems = createCoworkToolItems({
    routes,
    skills,
    hasEnabledPlugins,
    hasConnectors,
  });
  // Official: a = e ? [] : modes… where e = dqe || (isAgentNewRoute && considerEnabledForNonUI)
  const modeItems = isAgentRoute
    ? []
    : createCoworkModeItems({
        onToggleWebSearch,
        openStyles: routes.openStyles,
        webSearchEnabled,
      });

  return [
    ...fileItems,
    ...(toolItems.length > 0 ? [{ label: "separator-tools", type: "separator" as const }, ...toolItems] : []),
    ...(modeItems.length > 0 ? [{ label: "separator-modes", type: "separator" as const }, ...modeItems] : []),
  ];
}

function createCoworkAddMenuRoutes(onNavigate?: (path: string) => void): CoworkAddMenuRoutes {
  return {
    openConnectors: openCoworkAddMenuRoute("/customize/connectors", onNavigate),
    openProjectCreate: openCoworkAddMenuRoute("/projects/create", onNavigate),
    openPlugins: openCoworkAddMenuRoute("/customize/plugins", onNavigate),
    openSkills: openCoworkAddMenuRoute("/customize/skills", onNavigate),
    openStyles: openCoworkAddMenuRoute("/settings/general", onNavigate),
  };
}

function createCoworkFileItems({
  isAgentRoute,
  includeAddFolder,
  onAddFiles,
  onAddFolder,
  onSelectProject,
  openConnectors,
  openProjectCreate,
  projects,
}: {
  isAgentRoute: boolean;
  includeAddFolder?: boolean;
  onAddFiles: () => void;
  onAddFolder?: () => void;
  onSelectProject?: (project: CoworkAddMenuProject) => void;
  openConnectors: () => void;
  openProjectCreate: () => void;
  projects?: CoworkAddMenuProject[];
}): CoworkDropdownItem[] {
  const items: CoworkDropdownItem[] = [
    {
      // Official awt icon nwt = gy
      icon: icon(CoworkAddMenuPaperclipIcon),
      label: "Add files or photos",
      onSelect: onAddFiles,
    },
  ];

  if (includeAddFolder && onAddFolder) {
    items.push({
      // Official Qyt = cv
      icon: icon(CoworkAddMenuFolderAddIcon),
      label: "Add folder",
      onSelect: onAddFolder,
    });
  }

  // Official: project / Drive / GitHub only when !(dqe || agentNewRoute)
  if (!isAgentRoute) {
    items.push(...createProjectSubmenuItem(projects ?? [], onSelectProject, openProjectCreate));
    items.push(createDriveMenuItem());
    items.push({
      icon: "GitBranch",
      label: "Add from GitHub",
      onSelect: openConnectors,
    });
  }

  return items;
}

function createProjectSubmenuItem(
  projects: CoworkAddMenuProject[],
  onSelectProject: ((project: CoworkAddMenuProject) => void) | undefined,
  openProjectCreate: () => void,
): CoworkDropdownItem[] {
  if (!projects.length && !onSelectProject) return [];
  return [
    {
      icon: icon(CoworkAddMenuProjectsIcon),
      items: createProjectMenuItems(projects, onSelectProject, openProjectCreate),
      label: "Add to project",
      type: "submenu",
    },
  ];
}

function createProjectMenuItems(
  projects: CoworkAddMenuProject[],
  onSelectProject: ((project: CoworkAddMenuProject) => void) | undefined,
  openProjectCreate: () => void,
): CoworkDropdownItem[] {
  const projectItems = projects.slice(0, 8).map(
    (project): CoworkDropdownItem => ({
      checked: Boolean(project.checked),
      closeOnClick: true,
      icon: icon(CoworkAddMenuProjectsIcon),
      label: project.name,
      onSelect: () => onSelectProject?.(project),
      subtitle: project.creatorName ?? project.hostPath,
      type: "checkbox",
    }),
  );
  return [
    ...projectItems,
    ...(projectItems.length ? [{ label: "projects-separator", type: "separator" } satisfies CoworkDropdownItem] : []),
    { icon: "Add", label: "Start a new project", onSelect: openProjectCreate },
  ];
}

function createDriveMenuItem(): CoworkDropdownItem {
  return {
    icon: "Cloud",
    items: [
      { disabled: true, icon: "Search", label: "Search Drive", subtitle: "Search documents..." },
      { disabled: true, icon: "Files", label: "No recent Drive documents" },
    ],
    label: "Add from Google Drive",
    type: "submenu",
  };
}

function createCoworkToolItems({
  routes,
  skills,
  hasEnabledPlugins,
  hasConnectors,
}: {
  routes: CoworkAddMenuRoutes;
  skills?: CoworkDropdownItem[];
  hasEnabledPlugins: boolean;
  hasConnectors: boolean;
}): CoworkDropdownItem[] {
  const items: CoworkDropdownItem[] = [];

  // Official Skills (eRe = Vv). Omitted when no skill items.
  if (skills && skills.length > 0) {
    items.push({
      icon: icon(CoworkAddMenuSkillsIcon),
      items: skills,
      label: "Skills",
      type: "submenu",
    });
  }

  // Official Vvt: empty → "Add connectors" button; else Connectors submenu.
  if (hasConnectors) {
    items.push({
      icon: icon(CoworkAddMenuConnectorsIcon),
      label: "Connectors",
      type: "submenu",
      items: [
        {
          icon: "Settings",
          label: "Manage connectors",
          onSelect: routes.openConnectors,
        },
      ],
    });
  } else {
    items.push({
      icon: icon(CoworkAddMenuConnectorsIcon),
      label: "Add connectors",
      onSelect: routes.openConnectors,
    });
  }

  // Official qCt: 0 plugins → "Add plugins..."; else Plugins submenu.
  if (hasEnabledPlugins) {
    items.push({
      icon: icon(CoworkAddMenuPluginsIcon),
      label: "Plugins",
      type: "submenu",
      items: [
        {
          icon: "Settings",
          label: "Manage plugins",
          onSelect: routes.openPlugins,
        },
        {
          icon: "Add",
          label: "Add plugin",
          onSelect: routes.openPlugins,
        },
      ],
    });
  } else {
    items.push({
      icon: icon(CoworkAddMenuPluginsIcon),
      label: "Add plugins...",
      onSelect: routes.openPlugins,
    });
  }

  return items;
}

function createCoworkModeItems({
  onToggleWebSearch,
  openStyles,
  webSearchEnabled,
}: Pick<CreateCoworkAddMenuItemsOptions, "onToggleWebSearch" | "webSearchEnabled"> & {
  openStyles: () => void;
}): CoworkDropdownItem[] {
  return [
    {
      checked: webSearchEnabled,
      closeOnClick: true,
      icon: icon(CoworkAddMenuGlobeIcon),
      label: "Web search",
      onSelect: onToggleWebSearch ?? noop,
      type: "checkbox",
    },
    {
      checked: false,
      disabled: true,
      icon: icon(CoworkAddMenuResearchIcon),
      label: "Research",
      subtitle: "Enable a search integration to use research",
      type: "checkbox",
    },
    {
      icon: icon(CoworkAddMenuStyleIcon),
      items: [
        {
          checked: true,
          closeOnClick: true,
          icon: icon(CoworkAddMenuStyleIcon),
          label: "Default",
          type: "checkbox",
        },
        { label: "styles-separator", type: "separator" },
        {
          icon: "Add",
          label: "Create & edit styles",
          onSelect: openStyles,
        },
      ],
      label: "Use style",
      type: "submenu",
    },
  ];
}

function openCoworkAddMenuRoute(path: string, onNavigate?: (path: string) => void) {
  return () => {
    if (onNavigate) {
      onNavigate(path);
      return;
    }
    if (typeof window === "undefined") return;
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };
}
