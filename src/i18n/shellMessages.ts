import { useMemo } from "react";
import { type I18nMessages, type MessageDescriptor, useCurrentLocale, useI18nMessages } from "./footerMenuMessages";

type ShellMessageDescriptor = MessageDescriptor & { zhCN?: string };

const SHELL_MESSAGES = {
  all: { defaultMessage: "All", id: "zQvVDJ+j59", zhCN: "全部" },
  allProjects: { defaultMessage: "All projects", id: "NZLQi1PTsg", zhCN: "全部项目" },
  archive: { defaultMessage: "Archive", id: "hrgo+EleAn", zhCN: "归档" },
  archived: { defaultMessage: "Archived", id: "0HT+IbyW6O", zhCN: "已归档" },
  /** Official VYt / $Yt — Archive anyway (RG7DQpwgjC). */
  archiveAnyway: { defaultMessage: "Archive anyway", id: "RG7DQpwgjC", zhCN: "仍要归档" },
  /** Official VYt title rcZ8QdQjDl. */
  archiveWithUncommittedTitle: {
    defaultMessage: "Archive session with uncommitted changes?",
    id: "rcZ8QdQjDl",
    zhCN: "归档含未提交更改的会话？",
  },
  unarchive: { defaultMessage: "Unarchive", id: "__local.unarchive", zhCN: "取消归档" },
  cancel: { defaultMessage: "Cancel", id: "47FYwba+bI", zhCN: "取消" },
  clearFilters: { defaultMessage: "Clear filters", id: "F4gyn3vRX6", zhCN: "清除筛选" },
  closePane: { defaultMessage: "Close pane", id: "__local.closePane", zhCN: "关闭 Pane" },
  closePinHint: { defaultMessage: "Close pin hint", id: "__local.closePinHint", zhCN: "关闭固定提示" },
  closeSplitView: { defaultMessage: "Close split view", id: "fZ4Os59Nh7", zhCN: "关闭分屏" },
  code: { defaultMessage: "Code", id: "/GfNmXqa0P", zhCN: "代码" },
  collapseSidebar: { defaultMessage: "Collapse sidebar", id: "eOJ4QUCTXl", zhCN: "收起侧边栏" },
  confirm: { defaultMessage: "Confirm", id: "__local.confirm", zhCN: "确认" },
  cowork: { defaultMessage: "Cowork", id: "__local.cowork", zhCN: "协作" },
  custom: { defaultMessage: "Custom", id: "Sjo1P40Dgp", zhCN: "自定义" },
  customize: { defaultMessage: "Customize", id: "TXpOBiuxud", zhCN: "自定义" },
  customizeSidebar: { defaultMessage: "Customize sidebar", id: "2E00ityRqc", zhCN: "自定义侧边栏" },
  customizeSidebarDescription: { defaultMessage: "Choose which items appear in your sidebar.", id: "KTKw0eMHnY", zhCN: "选择哪些项目显示在侧边栏中。" },
  date: { defaultMessage: "Date", id: "P7PLVjLe4f", zhCN: "日期" },
  delete: { defaultMessage: "Delete", id: "K3r6DQW7h+", zhCN: "删除" },
  /** Official VYt / $Yt — Delete anyway (9w/oawRjHR). */
  deleteAnyway: { defaultMessage: "Delete anyway", id: "9w/oawRjHR", zhCN: "仍要删除" },
  deleteGroup: { defaultMessage: "Delete group", id: "BpuMwRROLB", zhCN: "删除分组" },
  deleteSession: { defaultMessage: "Delete session", id: "Anjya1uoz1", zhCN: "删除会话" },
  deleteSessionPrefix: { defaultMessage: "Delete", id: "__local.deleteSessionPrefix", zhCN: "删除" },
  deleteSessionSuffix: { defaultMessage: "This can’t be undone.", id: "__local.deleteSessionSuffix", zhCN: "此操作无法撤销。" },
  /** Official VYt title aL/o54ZWx3. */
  deleteWithUncommittedTitle: {
    defaultMessage: "Delete session with uncommitted changes?",
    id: "aL/o54ZWx3",
    zhCN: "删除含未提交更改的会话？",
  },
  /**
   * Official jmqxvZTZAZ body — interpolate `{count}`.
   * Product keeps one string; dialog picks singular/plural EN or CN.
   */
  uncommittedDiscardBody: {
    defaultMessage: "This session's worktree has {count} uncommitted changes that will be permanently discarded.",
    id: "jmqxvZTZAZ",
    zhCN: "此会话的 worktree 有 {count} 个未提交更改，将被永久丢弃。",
  },
  /** Official wHChJytals — interpolate `{more}`. */
  uncommittedAndMore: {
    defaultMessage: "… and {more} more",
    id: "wHChJytals",
    zhCN: "… 以及另外 {more} 项",
  },
  done: { defaultMessage: "Done", id: "JXdbo8GiGF", zhCN: "完成" },
  dragToPin: { defaultMessage: "Drag to pin", id: "__local.dragToPin", zhCN: "拖动以固定" },
  dropToPin: { defaultMessage: "Drop here", id: "__local.dropToPin", zhCN: "拖到这里" },
  releaseToPin: { defaultMessage: "Release to pin", id: "__local.releaseToPin", zhCN: "松开即可固定" },
  dragPinHint: { defaultMessage: "Tip: You can drag conversations here to pin them", id: "__local.dragPinHint", zhCN: "提示：你可以将对话拖到这里以固定" },
  dragToResize: { defaultMessage: "Drag to resize", id: "__local.dragToResize", zhCN: "拖动调整大小" },
  environment: { defaultMessage: "Environment", id: "K7kuIZkkhY", zhCN: "环境" },
  expandSidebar: { defaultMessage: "Expand sidebar", id: "__local.expandSidebar", zhCN: "展开侧边栏" },
  filter: { defaultMessage: "Filter", id: "__local.filter", zhCN: "筛选" },
  filterActive: { defaultMessage: "Filter (active)", id: "__local.filterActive", zhCN: "筛选（已启用）" },
  group: { defaultMessage: "Group", id: "HpoDwkNFk+", zhCN: "分组" },
  groupBy: { defaultMessage: "Group by", id: "__local.groupBy", zhCN: "分组方式" },
  groupName: { defaultMessage: "Group name", id: "gL86bv7Uv2", zhCN: "分组名称" },
  keyboardShortcuts: { defaultMessage: "Keyboard shortcuts", id: "vzYPVXl4by", zhCN: "键盘快捷键" },
  lastActivity: { defaultMessage: "Last activity", id: "__local.lastActivity", zhCN: "最近活动" },
  local: { defaultMessage: "Local", id: "W4SaxYXWRk", zhCN: "本地" },
  cloud: { defaultMessage: "Cloud", id: "fiPvwYljok", zhCN: "云端" },
  more: { defaultMessage: "More", id: "I5NMJ8llIi", zhCN: "更多" },
  /** Interpolate with `{title}` — row ⋯ aria-label. */
  moreOptionsFor: { defaultMessage: "More options for {title}", id: "__local.moreOptionsFor", zhCN: "{title} 的更多选项" },
  movePaneBottomRight: { defaultMessage: "Move pane bottom-right", id: "OMNHDzYzLm", zhCN: "将 Pane 移到右下" },
  movePaneDown: { defaultMessage: "Move pane down", id: "+KfP5/XHxP", zhCN: "将 Pane 下移" },
  movePaneRight: { defaultMessage: "Move pane right", id: "bq6xSZHjaS", zhCN: "将 Pane 右移" },
  newChat: { defaultMessage: "New chat", id: "Ajmo+3Cu3b", zhCN: "新会话" },
  newGroup: { defaultMessage: "New group", id: "HkK3Rtn68P", zhCN: "新建分组" },
  newTask: { defaultMessage: "New task", id: "K4O03zh0vo", zhCN: "新任务" },
  noFilteredSessions: { defaultMessage: "No sessions match these filters", id: "__local.noFilteredSessions", zhCN: "没有符合筛选的会话" },
  noSearchResults: { defaultMessage: "No matching sessions", id: "__local.noSearchResults", zhCN: "没有找到匹配会话" },
  none: { defaultMessage: "None", id: "450Fty8ldn", zhCN: "无" },
  oneDay: { defaultMessage: "1 day", id: "__local.oneDay", zhCN: "1天" },
  threeDays: { defaultMessage: "3 days", id: "__local.threeDays", zhCN: "3天" },
  sevenDays: { defaultMessage: "7 days", id: "__local.sevenDays", zhCN: "7天" },
  thirtyDays: { defaultMessage: "30 days", id: "__local.thirtyDays", zhCN: "30天" },
  openInSplitView: { defaultMessage: "Open in split view", id: "8IBKnZa76A", zhCN: "在分屏中打开" },
  other: { defaultMessage: "Other", id: "__local.other", zhCN: "其他" },
  pin: { defaultMessage: "Pin", id: "puLNUJezx6", zhCN: "固定" },
  pinned: { defaultMessage: "Pinned", id: "fWZYP5U4xZ", zhCN: "已固定" },
  project: { defaultMessage: "Project", id: "k36uSwr4q5", zhCN: "项目" },
  projects: { defaultMessage: "Projects", id: "UxTJRaKagI", zhCN: "项目" },
  recent: { defaultMessage: "Recent", id: "wA4FIMmtlS", zhCN: "最近" },
  viewAll: { defaultMessage: "View all", id: "pFK6bJU0EM", zhCN: "查看全部" },
  recency: { defaultMessage: "Recent activity", id: "YsScAYZTjo", zhCN: "最近活动优先" },
  remoteControl: { defaultMessage: "Remote control", id: "4mv6Z9Tv+V", zhCN: "远程控制" },
  rename: { defaultMessage: "Rename", id: "iXNbPfQDIZ", zhCN: "重命名" },
  renameGroup: { defaultMessage: "Rename group", id: "aSBYhpo0v4", zhCN: "重命名分组" },
  renameSession: { defaultMessage: "Rename session", id: "o96GILnoRP", zhCN: "重命名会话" },
  save: { defaultMessage: "Save", id: "NuymVHsb1A", zhCN: "保存" },
  scheduledTasks: { defaultMessage: "Scheduled tasks", id: "cXAlMRerxW", zhCN: "定时任务" },
  search: { defaultMessage: "Search", id: "xmcVZ0BU63", zhCN: "搜索" },
  searchChatsAndProjects: { defaultMessage: "Search chats and projects", id: "XF3P/8YpTI", zhCN: "搜索对话和项目" },
  searchResults: { defaultMessage: "Search results", id: "79lKyOa3xd", zhCN: "搜索结果" },
  selectedCount: { defaultMessage: "Selected", id: "__local.selectedCount", zhCN: "已选" },
  sessionName: { defaultMessage: "Session name", id: "mvdlXjfNEZ", zhCN: "会话名称" },
  sortBy: { defaultMessage: "Sort by", id: "hDI+JMUhFd", zhCN: "排序方式" },
  sortAlphabetical: { defaultMessage: "Alphabetical", id: "bF46uAWl+6", zhCN: "按字母排序" },
  sortCreated: { defaultMessage: "Created", id: "__local.sortCreated", zhCN: "创建时间" },
  status: { defaultMessage: "Status", id: "tzMNF3jWoU", zhCN: "状态" },
  state: { defaultMessage: "State", id: "__local.state", zhCN: "状态" },
  active: { defaultMessage: "Active", id: "3a5wL8wo40", zhCN: "进行中" },
  switchPane: { defaultMessage: "Switch pane", id: "__local.switchPane", zhCN: "切换 Pane" },
  today: { defaultMessage: "Today", id: "__local.today", zhCN: "今天" },
  tomorrow: { defaultMessage: "Tomorrow", id: "__local.tomorrow", zhCN: "明天" },
  ungrouped: { defaultMessage: "Ungrouped", id: "HcYTMML52V", zhCN: "未分组" },
  unpin: { defaultMessage: "Unpin", id: "opNVQCTN4x", zhCN: "取消固定" },
  yesterday: { defaultMessage: "Yesterday", id: "__local.yesterday", zhCN: "昨天" },
  older: { defaultMessage: "Older", id: "__local.older", zhCN: "更早" },
} satisfies Record<string, ShellMessageDescriptor>;

export type ShellText = Record<keyof typeof SHELL_MESSAGES, string>;

export function useShellText() {
  const locale = useCurrentLocale();
  const messages = useI18nMessages(locale);
  return useMemo(() => buildShellText(messages ?? {}, locale), [locale, messages]);
}

function buildShellText(messages: I18nMessages, locale: string): ShellText {
  const isChinese = locale === "zh-CN";
  return Object.fromEntries(Object.entries(SHELL_MESSAGES).map(([key, descriptor]) => [
    key,
    isChinese ? descriptor.zhCN ?? messages[descriptor.id] ?? descriptor.defaultMessage : messages[descriptor.id] ?? descriptor.defaultMessage,
  ])) as ShellText;
}
