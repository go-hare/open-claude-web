import type { CoworkDropdownItem } from "../ui/CoworkMenuTypes";

export type CoworkAddMenuProject = {
  checked?: boolean;
  creatorName?: string;
  hostPath?: string;
  name: string;
  uuid: string;
};

type CreateCoworkAddMenuItemsOptions = {
  includeAddFolder?: boolean;
  onAddFiles: () => void;
  onAddFolder?: () => void;
  onNavigate?: (path: string) => void;
  onSelectProject?: (project: CoworkAddMenuProject) => void;
  onToggleWebSearch?: () => void;
  projects?: CoworkAddMenuProject[];
  webSearchEnabled?: boolean;
};

type CoworkAddMenuRoutes = {
  openConnectors: () => void;
  openProjectCreate: () => void;
  openPlugins: () => void;
  openSkills: () => void;
  openStyles: () => void;
};

const noop = () => undefined;

// Official reference:
// index-BELzQL5P.js:dwt renders the Add popup with align="start",
// alignOffset=-10, side="bottom", sideOffset=4.
// index-BELzQL5P.js:pwt uses "Add files, connectors, and more".
// index-BELzQL5P.js:cwt assembles files/projects, tools and modes groups.
export const coworkAddMenuOfficialSource = "index-BELzQL5P.js:cwt/dwt/pwt";

export function createCoworkAddMenuItems({
  includeAddFolder = false,
  onAddFiles,
  onAddFolder,
  onNavigate,
  onSelectProject,
  onToggleWebSearch,
  projects = [],
  webSearchEnabled = false,
}: CreateCoworkAddMenuItemsOptions): CoworkDropdownItem[] {
  const routes = createCoworkAddMenuRoutes(onNavigate);
  return [
    ...createCoworkFileItems({ includeAddFolder, onAddFiles, onAddFolder, onSelectProject, openConnectors: routes.openConnectors, openProjectCreate: routes.openProjectCreate, projects }),
    { label: "separator-tools", type: "separator" },
    ...createCoworkToolItems(routes),
    { label: "separator-modes", type: "separator" },
    ...createCoworkModeItems({ onToggleWebSearch, openStyles: routes.openStyles, webSearchEnabled }),
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
  includeAddFolder,
  onAddFiles,
  onAddFolder,
  onSelectProject,
  openConnectors,
  openProjectCreate,
  projects,
}: Pick<CreateCoworkAddMenuItemsOptions, "includeAddFolder" | "onAddFiles" | "onAddFolder" | "onSelectProject" | "projects"> & { openConnectors: () => void; openProjectCreate: () => void }): CoworkDropdownItem[] {
  return [
    {
      icon: "FileAdd",
      label: "Add files or photos",
      onSelect: onAddFiles,
    },
    ...(includeAddFolder && onAddFolder ? [{
      icon: "Folder1",
      label: "Add folder",
      onSelect: onAddFolder,
    } satisfies CoworkDropdownItem] : []),
    ...createProjectSubmenuItem(projects ?? [], onSelectProject, openProjectCreate),
    createDriveMenuItem(),
    {
      icon: "GitBranch",
      label: "Add from GitHub",
      onSelect: openConnectors,
    },
  ];
}

function createProjectSubmenuItem(projects: CoworkAddMenuProject[], onSelectProject: ((project: CoworkAddMenuProject) => void) | undefined, openProjectCreate: () => void): CoworkDropdownItem[] {
  if (!projects.length && !onSelectProject) return [];
  return [{
    icon: "Projects",
    items: createProjectMenuItems(projects, onSelectProject, openProjectCreate),
    label: "Add to project",
    type: "submenu",
  }];
}

function createProjectMenuItems(projects: CoworkAddMenuProject[], onSelectProject: ((project: CoworkAddMenuProject) => void) | undefined, openProjectCreate: () => void): CoworkDropdownItem[] {
  const projectItems = projects.slice(0, 8).map((project): CoworkDropdownItem => ({
    checked: Boolean(project.checked),
    closeOnClick: true,
    icon: "Projects",
    label: project.name,
    onSelect: () => onSelectProject?.(project),
    subtitle: project.creatorName ?? project.hostPath,
    type: "checkbox",
  }));
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

function createCoworkToolItems({ openConnectors, openPlugins, openSkills }: CoworkAddMenuRoutes): CoworkDropdownItem[] {
  return [
    {
      icon: "Plugin",
      items: [
        {
          icon: "Plugin",
          label: "Add skills",
          onSelect: openSkills,
        },
        {
          icon: "Settings",
          label: "Manage skills",
          onSelect: openSkills,
        },
      ],
      label: "Skills",
      type: "submenu",
    },
    {
      icon: "Connectors",
      label: "Add connectors",
      onSelect: openConnectors,
    },
    {
      icon: "Plugin",
      items: [
        {
          icon: "Settings",
          label: "Manage plugins",
          onSelect: openPlugins,
        },
        {
          icon: "Add",
          label: "Add plugin",
          onSelect: openPlugins,
        },
      ],
      label: "Plugins",
      type: "submenu",
    },
  ];
}

function createCoworkModeItems({
  onToggleWebSearch,
  openStyles,
  webSearchEnabled,
}: Pick<CreateCoworkAddMenuItemsOptions, "onToggleWebSearch" | "webSearchEnabled"> & { openStyles: () => void }): CoworkDropdownItem[] {
  return [
    {
      checked: webSearchEnabled,
      closeOnClick: true,
      icon: "Globe",
      label: "Web search",
      onSelect: onToggleWebSearch ?? noop,
      type: "checkbox",
    },
    {
      checked: false,
      disabled: true,
      icon: "Research",
      label: "Research",
      subtitle: "Enable a search integration to use research",
      type: "checkbox",
    },
    {
      icon: "Styles",
      items: [
        {
          checked: true,
          closeOnClick: true,
          icon: "Styles",
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
