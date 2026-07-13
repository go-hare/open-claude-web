import type { ReactNode } from "react";

export type CoworkDropdownItem = {
  checked?: boolean;
  closeOnClick?: boolean;
  disabled?: boolean;
  hint?: ReactNode;
  /** Official menus pass JSX icons (cwt/Oqe); string names still resolve via shell Icon. */
  icon?: ReactNode;
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
