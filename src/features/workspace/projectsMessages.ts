import type { MessageDescriptors } from "../../i18n/footerMenuMessages";

/**
 * Official projects list residual (c1b9abf13 _Component32 / index-BELzQL5P):
 * title UxTJRaKagI, New project lJMkinm1YS, empty headline LnKqo+X3BJ,
 * web empty body ldzvy7zpnr, search Dw9BaeKr5H / doPT7U8q21,
 * sort aria 9rVGvCDexf, sort-by hDI+JMUhFd, no-match bzYWNlBFMV.
 *
 * Desktop cowork empty description is hardcode in residual (C=true branch):
 * "Point Claude at a folder on your machine and work on it together." — no catalog id.
 * Search-empty hardcode: "No projects match your search."
 * Sort option labels Ge hardcode Recent/Created/Alphabetical; nearest catalog ids used.
 */
export const PROJECTS_MESSAGES = {
  title: { defaultMessage: "Projects", id: "UxTJRaKagI" },
  newProject: { defaultMessage: "New project", id: "lJMkinm1YS" },
  emptyHeadline: {
    defaultMessage: "Looking to start a project?",
    id: "LnKqo+X3BJ",
  },
  /** Residual desktop C=true empty body (no official catalog id). */
  emptyDescriptionDesktop: {
    defaultMessage: "Point Claude at a folder on your machine and work on it together.",
    id: "__local.projectsDesktopEmptyDescription",
  },
  /** Residual web empty body (ldzvy7zpnr) — kept for non-desktop parity. */
  emptyDescriptionWeb: {
    defaultMessage: "Upload materials, set custom instructions, and organize conversations in one space.",
    id: "ldzvy7zpnr",
  },
  searchPlaceholder: {
    defaultMessage: "Search projects...",
    id: "Dw9BaeKr5H",
  },
  searchLabel: { defaultMessage: "Search projects", id: "doPT7U8q21" },
  sortProjects: { defaultMessage: "Sort projects", id: "9rVGvCDexf" },
  sortBy: { defaultMessage: "Sort by", id: "hDI+JMUhFd" },
  sortRecent: { defaultMessage: "Recent", id: "iXpep1vGVo" },
  sortCreated: { defaultMessage: "Created", id: "ORGv1Q6rL/" },
  sortAlphabetical: { defaultMessage: "Alphabetical", id: "bF46uAWl+6" },
  clearFilter: { defaultMessage: "Clear filter", id: "OhgOkHumT3" },
  /** Residual desktop search-empty hardcode (no catalog id). */
  noMatchSearch: {
    defaultMessage: "No projects match your search.",
    id: "__local.projectsNoMatchSearch",
  },
  /** Residual bzYWNlBFMV with {search} — alternate list residual. */
  noMatchSearchQuery: {
    defaultMessage: "No projects matching “{search}”",
    id: "bzYWNlBFMV",
  },

  // ── SpaceOnboardingModal ukt residual (index-BELzQL5P pkt/wkt/jkt) ──
  createNewProjectTitle: {
    defaultMessage: "Create a new project",
    id: "VbuX/vbFrq",
  },
  createNewProjectBody: {
    defaultMessage:
      "A dedicated place for ongoing work, where context builds over time. Files and instructions stay in a folder on your computer.",
    id: "kxSxtueSxg",
  },
  startFromScratch: { defaultMessage: "Start from scratch", id: "fGhwMpK3XG" },
  startFromScratchDesc: {
    defaultMessage: "Set up a new folder with instructions and files.",
    id: "A1xExKGuBb",
  },
  useExistingFolder: {
    defaultMessage: "Use an existing folder",
    id: "91hqu65Knr",
  },
  useExistingFolderDesc: {
    defaultMessage: "Give Claude a folder you already work from.",
    id: "CvsQhRcksA",
  },
  startNewProjectTitle: {
    defaultMessage: "Start a new project",
    id: "0y7bg6nA29",
  },
  existingFolderStepBody: {
    defaultMessage:
      "Pick a folder and Claude will treat its files as project context. Add instructions to shape how Claude approaches the work.",
    id: "N6SurW4a3O",
  },
  nameLabel: { defaultMessage: "Name", id: "HAlOn1ZsuY" },
  projectNamePlaceholder: { defaultMessage: "Project name", id: "D5RCKikEyZ" },
  instructionsLabel: { defaultMessage: "Instructions", id: "sV2v5LjRpX" },
  instructionsPlaceholder: {
    defaultMessage: "Tell Claude how to work in this project (optional)",
    id: "oAhoSbCRtx",
  },
  chooseProjectLocation: {
    defaultMessage: "Choose project location",
    id: "YlJpwDdK76",
  },
  chooseFolder: { defaultMessage: "Choose folder", id: "fe9AdTFbT4" },
  /** Residual jkt browseFolder dialog title (not the field label). */
  chooseExistingFolderDialog: {
    defaultMessage: "Choose a folder for the project",
    id: "L4h25odOzL",
  },
  selectFolder: { defaultMessage: "Select a folder...", id: "mhujxmvowT" },
  cancel: { defaultMessage: "Cancel", id: "47FYwba+bI" },
  /** Residual create CTA on onboarding forms (VzzYJkHnLP "Create"). */
  create: { defaultMessage: "Create", id: "VzzYJkHnLP" },
  goBack: { defaultMessage: "Go back", id: "orvpWhO3rI" },
  /** Residual toast string — no catalog id in space_onboarding path. */
  createFailed: {
    defaultMessage: "Failed to create project. You can try again.",
    id: "__local.projectsCreateFailed",
  },
  addFiles: { defaultMessage: "Add files", id: "xrAjmQ72mN" },
  dropFiles: {
    defaultMessage: "Drop files here or click to browse",
    id: "1gXjXRIYmT",
  },
  chooseProjectFolderTitle: {
    defaultMessage: "Choose where to create the project folder",
    id: "GPLwJZ3v+C",
  },
  memoryOn: { defaultMessage: "Memory is on", id: "zM8FpgXDgq" },
  memoryOff: { defaultMessage: "Memory is off", id: "p4rU4vt35w" },
  memoryOnTooltip: {
    defaultMessage:
      "Claude will remember context across conversations in this project. Turn this off in settings.",
    id: "HyWzYH08yU",
  },
  memoryOffTooltip: {
    defaultMessage: "Turn on memory in settings to let Claude remember context in this project.",
    id: "6fvtWClSA2",
  },
} satisfies MessageDescriptors;

export type ProjectsText = { [K in keyof typeof PROJECTS_MESSAGES]: string };

/** Simple residual brace fill (same pattern as scheduledDetailMessages). */
export function formatProjectsTemplate(template: string, values: Record<string, string>) {
  let out = template;
  for (const [key, value] of Object.entries(values)) {
    out = out.replaceAll(`{${key}}`, value);
  }
  return out;
}
