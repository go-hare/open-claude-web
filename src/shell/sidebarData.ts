import type { FrameMode } from "../stores/frameStore";
import { scheduledTaskIndexPath } from "../features/scheduled/scheduledPaths";

export type SidebarNavItem = {
  key: string;
  label: string;
  icon: string;
  href: string;
  shortcut?: string;
  visibleIn: FrameMode[];
};

export const newSessionItemByMode: Record<FrameMode, SidebarNavItem> = {
  cowork: {
    key: "new-session",
    label: "新任务",
    icon: "Add",
    href: "/task/new",
    visibleIn: ["cowork"],
  },
  code: {
    key: "new-session",
    label: "新会话",
    icon: "Add",
    href: "/epitaxy",
    shortcut: "⌘N",
    visibleIn: ["code"],
  },
};

export const primaryNavItems: SidebarNavItem[] = [
  {
    key: "projects",
    label: "项目",
    icon: "Projects",
    href: "/projects",
    visibleIn: ["cowork"],
  },
  {
    key: "scheduled",
    label: "定时任务",
    icon: "Clock",
    href: scheduledTaskIndexPath,
    visibleIn: ["cowork", "code"],
  },
  {
    key: "customize",
    label: "自定义",
    icon: "Tool",
    href: "/customize",
    visibleIn: ["cowork", "code"],
  },
];

// 原版 code 模式始终显示 More，但在当前可见配置里 overflow 为空，
// flyout 只保留「自定义侧边栏」入口。不要在这里塞猜测出来的假导航。
export const moreNavItems: SidebarNavItem[] = [];
