import type { ReactNode } from "react";

export type CoworkDropdownItem = {
  checked?: boolean;
  closeOnClick?: boolean;
  disabled?: boolean;
  hint?: ReactNode;
  icon?: string;
  items?: CoworkDropdownItem[];
  keepOpen?: boolean;
  label: ReactNode;
  noQuickKey?: boolean;
  onSelect?: () => void;
  separatorBefore?: boolean;
  shortcut?: string | string[];
  status?: ReactNode;
  submenuFooterItems?: CoworkDropdownItem[];
  subtitle?: ReactNode;
  suffix?: ReactNode;
  trailing?: ReactNode;
  type?: "button" | "checkbox" | "loading" | "section-header" | "separator" | "submenu";
};
