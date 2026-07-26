import type { MessageDescriptors } from "../../i18n/footerMenuMessages";

/**
 * Official ce28369f9 SpaceRoute / cn residual message ids.
 * Layout: header dn + onpage composer Bs + session list Ia + settings panel qa.
 */
export const SPACE_DETAIL_MESSAGES = {
  notFoundTitle: {
    defaultMessage: "Project not found",
    id: "umf4JIobGv",
  },
  notFoundBody: {
    defaultMessage: "This project may have been removed or doesn't exist.",
    id: "wuDmoQol2j",
  },
  openProjects: { defaultMessage: "Projects", id: "UxTJRaKagI" },
  pinProject: { defaultMessage: "Pin project", id: "3f65Bv1/3o" },
  unpinProject: { defaultMessage: "Unpin project", id: "HhPHH3kNpx" },
  starProject: { defaultMessage: "Star project", id: "IuZiap/Hqt" },
  unstarProject: { defaultMessage: "Unstar project", id: "mZD5psf6pN" },
  composerPlaceholder: {
    defaultMessage: "What would you like to work on in this project?",
    id: "wLFo5icPEr",
  },
  emptySessions: {
    defaultMessage: "Give Claude a task and it'll pick up your project context automatically.",
    id: "AOLw1gnWOh",
  },
  recent: { defaultMessage: "Recent", id: "wA4FIMmtlS" },
  starred: { defaultMessage: "Starred", id: "V7cUPvWFo3" },
  showMore: { defaultMessage: "Show more", id: "aWpBzjCXKS" },
  showLess: { defaultMessage: "Show less", id: "qyJtWyZ0yt" },
  instructions: { defaultMessage: "Instructions", id: "sV2v5LjRpX" },
  editInstructions: { defaultMessage: "Edit instructions", id: "h/hJzTCioT" },
  instructionsEmpty: {
    defaultMessage: "Add tone, formatting, or rules to guide how Claude works.",
    id: "tTjaNMy6AH",
  },
  instructionsPlaceholder: {
    defaultMessage: "Tell Claude how to work in this project (optional)",
    id: "oAhoSbCRtx",
  },
  cancel: { defaultMessage: "Cancel", id: "47FYwba+bI" },
  save: { defaultMessage: "Save", id: "jvo0vs3nF0" },
  saving: { defaultMessage: "Saving…", id: "WUV28A6Pf2" },
  context: { defaultMessage: "Context", id: "V2qutIKrxy" },
  noContext: { defaultMessage: "No context added yet.", id: "2DarRI9rEJ" },
  addContext: { defaultMessage: "Add context", id: "yxfjYMf7qD" },
  onYourComputer: { defaultMessage: "On your computer", id: "nJvCCLhrRX" },
  chooseFolder: { defaultMessage: "Choose a folder", id: "YjjTU9NztP" },
  selectFolders: { defaultMessage: "Select folders", id: "7913SLzMZW" },
  removeFolder: {
    defaultMessage: "Remove folder {name}",
    id: "+4tCWjrGJc",
  },
  memory: { defaultMessage: "Memory", id: "dVx3yznM2C" },
  memoryOn: { defaultMessage: "Memory on", id: "r9XReNbtvW" },
  memoryOff: { defaultMessage: "Memory off", id: "BwJC5IVgSg" },
  /** Residual Ya unsupported host. */
  memoryUpdateDesktop: {
    defaultMessage: "Update the desktop app to enable memory.",
    id: "KnGIr1KELi",
  },
  /** Residual Ya when preferences.enabledCoworkMemory is false. */
  memoryOffHint: {
    defaultMessage:
      "Memory is off in your settings. Any existing memory files are kept but won't be read or written in new sessions.",
    id: "pvKJbPmafj",
  },
  /** Residual Ya empty when memory on. */
  memoryAskClaude: {
    defaultMessage: "Ask Claude to remember something and it'll save it here.",
    id: "X4tpTAKnCj",
  },
  /** Residual Ya empty when memory off. */
  memoryNoFiles: {
    defaultMessage: "No memory files yet.",
    id: "FgnqmhDuh+",
  },
  expandName: { defaultMessage: "Expand {name}", id: "gqupQTNMYN" },
  collapseName: { defaultMessage: "Collapse {name}", id: "G6WKbR76ah" },
  /** Residual Qa section (ce283 hardcoded zh label id cXAlMRerxW). */
  scheduledTasks: { defaultMessage: "定时任务", id: "cXAlMRerxW" },
  addScheduledTask: { defaultMessage: "Add scheduled task", id: "fCiXKq63je" },
  scheduledEmpty: {
    defaultMessage: "Set up recurring tasks for this project.",
    id: "J8QPqJxL3X",
  },
  existingTasks: { defaultMessage: "Existing tasks", id: "cx2aJw+mlV" },
  createNewTask: { defaultMessage: "Create new task", id: "G7GwpGF/45" },
  scheduledActive: { defaultMessage: "进行中", id: "3a5wL8wo40" },
  scheduledPaused: { defaultMessage: "Paused", id: "C2iTEHtK//" },
  unlinkTask: { defaultMessage: "Unlink task {name}", id: "pC9ar7VBXW" },
  links: { defaultMessage: "Links", id: "qCcwo3DU78" },
  pasteUrl: { defaultMessage: "Paste a URL", id: "3dHNlLeKpf" },
  addLink: { defaultMessage: "Add a link", id: "Bem7D1voiW" },
  removeLink: { defaultMessage: "Remove link {url}", id: "NC3N+wnjKr" },
  sourcesOne: { defaultMessage: "1 source", id: "__local.spaceSourcesOne" },
  sourcesOther: {
    defaultMessage: "{count} sources",
    id: "__local.spaceSourcesOther",
  },
  saveInstructionsFailed: {
    defaultMessage: "Failed to save instructions. You can try again.",
    id: "__local.spaceSaveInstructionsFailed",
  },
  addFolderFailed: {
    defaultMessage: "Failed to add folder. You can try again.",
    id: "__local.spaceAddFolderFailed",
  },
  removeFolderFailed: {
    defaultMessage: "Failed to remove folder. You can try again.",
    id: "__local.spaceRemoveFolderFailed",
  },
} satisfies MessageDescriptors;

export type SpaceDetailText = { [K in keyof typeof SPACE_DETAIL_MESSAGES]: string };

export function formatSpaceDetailTemplate(template: string, values: Record<string, string | number>) {
  let out = template;
  for (const [key, value] of Object.entries(values)) {
    out = out.replaceAll(`{${key}}`, String(value));
  }
  return out;
}

export function formatSourceCount(text: SpaceDetailText, count: number) {
  if (count === 1) return text.sourcesOne;
  return formatSpaceDetailTemplate(text.sourcesOther, { count });
}
