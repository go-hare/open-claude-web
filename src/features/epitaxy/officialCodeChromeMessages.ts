import type { MessageDescriptors } from "../../i18n/footerMenuMessages";

/** Official YR residual (c11959232) — Views menu + open pane titles. */
export const VIEWS_MENU_MESSAGES = {
  views: { defaultMessage: "Views", id: "akF0LyBDxT" },
  preview: { defaultMessage: "Preview", id: "TJo5E6JuIN" },
  diff: { defaultMessage: "Diff", id: "Fm3StihZV6" },
  terminal: { defaultMessage: "Terminal", id: "GAHVEi8lHA" },
  files: { defaultMessage: "Files", id: "m4vqJl0/FT" },
  tasks: { defaultMessage: "Tasks", id: "yhU1etXT1A" },
  plan: { defaultMessage: "Plan", id: "fz0z4cb6fQ" },
  runs: { defaultMessage: "Runs", id: "W1Qs5OAf+0" },
  screen: { defaultMessage: "Screen", id: "kzaYlDwmLT" },
  file: { defaultMessage: "File", id: "gyrIElu9qY" },
  agent: { defaultMessage: "Agent", id: "QGVI63s1dJ" },
} satisfies MessageDescriptors;

/** Official Qj residual — Send / Stop aria. */
export const COMPOSER_SEND_STOP_MESSAGES = {
  send: { defaultMessage: "Send", id: "9WRlF4R2gm" },
  stop: { defaultMessage: "Stop", id: "q/uwLTb3Zf" },
} satisfies MessageDescriptors;

/** Official Vv / Uv residual (c11959232). */
export const MESSAGE_ACTION_MESSAGES = {
  copyMessage: { defaultMessage: "Copy message", id: "8Rj4WgXPcB" },
  copied: { defaultMessage: "Copied", id: "p556q3uvbn" },
  pinAsChapter: { defaultMessage: "Pin as chapter", id: "Ek0ZOtz8EI" },
  unpinChapter: { defaultMessage: "Unpin chapter", id: "HElwNPiecu" },
  rewindToHere: { defaultMessage: "Rewind to here", id: "jlXY1qCwxf" },
  forkFromHere: { defaultMessage: "Fork from here", id: "qjMB66sXZ2" },
  goodResponse: { defaultMessage: "Good response", id: "OSbNg+1qqF" },
  badResponse: { defaultMessage: "Bad response", id: "tuJiA0ZNUD" },
  copyLink: { defaultMessage: "Copy link", id: "lbr3Lq2Lnm" },
  copyAsMarkdown: { defaultMessage: "Copy as Markdown", id: "aRsvyMHQOT" },
  attachSelection: { defaultMessage: "Attach selection as context", id: "UcMOyoVqDG" },
  attachMessage: { defaultMessage: "Attach message as context", id: "fe2GgpDxRl" },
} as const satisfies MessageDescriptors;

/** Official oN / Terminal title residual (c11959232). */
export const SIDE_PANE_CHROME_MESSAGES = {
  newTerminal: { defaultMessage: "New terminal", id: "EmFCpBoR7n" },
  renameTerminal: { defaultMessage: "Rename terminal", id: "EcAvDUnycA" },
  terminalName: { defaultMessage: "Terminal name", id: "YqygSYX+GY" },
  terminals: { defaultMessage: "Terminals", id: "TcmH/mEEcz" },
  closeTerminal: { defaultMessage: "Close terminal", id: "gO6Ri0QD54" },
  hideFiles: { defaultMessage: "Hide files", id: "ZU8NF+Epvo" },
  showFiles: { defaultMessage: "Show files", id: "vuTg/99D1y" },
  servers: { defaultMessage: "Servers", id: "QOxktDjUiT" },
} satisfies MessageDescriptors;
