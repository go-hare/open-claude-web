import { createElement, type ComponentType, type ReactElement } from "react";
import { officialDirectoryStore } from "../../customize/directory/officialDirectoryStore";
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
 * Official plus catalog (shared-8 CS/sx + c752 to/Gn):
 *   nx groups: files [uploadFile, addFolder, teach, screenshot, project, github]
 *              tools [skills, connectors, designSystem, plugins, devices]
 *              modes [haystack, research, webSearch, memory, permissionMode]
 *   ix (agentMode): hide project, github, haystack, research, webSearch
 *   CS.addFolder = Ax = kx(isLocalAgentRoute, composerFolderTarget) — hidden on
 *   /task/new (no session) so folder lives on $4t/Akt chin, not plus.
 *   skills omitted when SS() false (no skill items).
 */
export type CreateCoworkAddMenuItemsOptions = {
  /** Official CS.agentMode = Lx = dqe || (isAgentNewRoute && considerEnabledForNonUI). Default true for /task/new. */
  isAgentRoute?: boolean;
  /** Official CS.addFolder / Ax. Default false on /task/new (kx hidden). Session plus may enable. */
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
  /** Plugin catalog empty → official "Add plugins" (u8sCx7LYvW); with items → Plugins submenu. */
  hasEnabledPlugins?: boolean;
  /** Connectors empty → "Add connectors" button; with items → Connectors submenu. */
  hasConnectors?: boolean;
  /** Official cwt/awt/Qyt/Vvt/qCt labels from formatMessage. */
  labels?: Partial<CoworkAddMenuLabels>;
};

export type CoworkAddMenuLabels = {
  addFilesOrPhotos: string;
  addFolder: string;
  addConnectors: string;
  addPlugins: string;
  plugins: string;
  skills: string;
  connectors: string;
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

const DEFAULT_COWORK_ADD_MENU_LABELS: CoworkAddMenuLabels = {
  addFilesOrPhotos: "Add files or photos",
  addFolder: "Add folder",
  addConnectors: "Add connectors",
  addPlugins: "Add plugins",
  plugins: "Plugins",
  skills: "Skills",
  connectors: "Connectors",
};

function resolveCoworkAddMenuLabels(labels?: Partial<CoworkAddMenuLabels>): CoworkAddMenuLabels {
  return { ...DEFAULT_COWORK_ADD_MENU_LABELS, ...labels };
}

function icon(node: ComponentType<{ size?: number }>): ReactElement {
  return createElement(node, { size: menuIconSize });
}

// Official reference:
// shared-8-4Jj8qhmU.js:aC Y.Root plus popup align="start" side="bottom" sideOffset=4
// shared-8-4Jj8qhmU.js:oC OnsnuZtVJO "Add files, connectors, and more"
// shared-8-4Jj8qhmU.js:CS/sx + c752b32f8-DLL-jMVJ.js:to MenuItems
export const coworkAddMenuOfficialSource = "shared-8-4Jj8qhmU.js:CS/sx/aC c752b32f8-DLL-jMVJ.js:to";

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
  labels,
}: CreateCoworkAddMenuItemsOptions): CoworkDropdownItem[] {
  const menuLabels = resolveCoworkAddMenuLabels(labels);
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
    labels: menuLabels,
  });
  const toolItems = createCoworkToolItems({
    routes,
    skills,
    hasEnabledPlugins,
    hasConnectors,
    labels: menuLabels,
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
    // Official qCt: HT.open("plugins"), not /customize/plugins (that route is Not Found).
    openPlugins: () => officialDirectoryStore.getState().open("plugins", { pluginSeed: {} }),
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
  labels,
}: {
  isAgentRoute: boolean;
  includeAddFolder?: boolean;
  onAddFiles: () => void;
  onAddFolder?: () => void;
  onSelectProject?: (project: CoworkAddMenuProject) => void;
  openConnectors: () => void;
  openProjectCreate: () => void;
  projects?: CoworkAddMenuProject[];
  labels: CoworkAddMenuLabels;
}): CoworkDropdownItem[] {
  const items: CoworkDropdownItem[] = [
    {
      icon: icon(CoworkAddMenuPaperclipIcon),
      label: labels.addFilesOrPhotos,
      onSelect: onAddFiles,
      testId: "add-menu-upload-file",
    },
  ];

  if (includeAddFolder && onAddFolder) {
    items.push({
      icon: icon(CoworkAddMenuFolderAddIcon),
      label: labels.addFolder,
      onSelect: onAddFolder,
    });
  }

  // Official sx ix: project / github hidden when agentMode
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
  labels,
}: {
  routes: CoworkAddMenuRoutes;
  skills?: CoworkDropdownItem[];
  hasEnabledPlugins: boolean;
  hasConnectors: boolean;
  labels: CoworkAddMenuLabels;
}): CoworkDropdownItem[] {
  const items: CoworkDropdownItem[] = [];

  // Official Skills (eRe = Vv). Omitted when no skill items.
  if (skills && skills.length > 0) {
    items.push({
      icon: icon(CoworkAddMenuSkillsIcon),
      items: skills,
      label: labels.skills,
      testId: "add-menu-skills",
      type: "submenu",
    });
  }

  // Official Vvt: empty → "Add connectors" button; else Connectors submenu.
  if (hasConnectors) {
    items.push({
      icon: icon(CoworkAddMenuConnectorsIcon),
      label: labels.connectors,
      testId: "add-menu-connectors",
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
      label: labels.addConnectors,
      onSelect: routes.openConnectors,
      testId: "add-menu-connectors",
    });
  }

  // Official qCt: 0 plugins → "Add plugins..."; else Plugins submenu.
  if (hasEnabledPlugins) {
    items.push({
      icon: icon(CoworkAddMenuPluginsIcon),
      label: labels.plugins,
      testId: "add-menu-plugins",
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
      label: labels.addPlugins,
      onSelect: routes.openPlugins,
      testId: "add-menu-plugins",
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
