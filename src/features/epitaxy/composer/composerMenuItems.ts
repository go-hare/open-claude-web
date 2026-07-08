import type { OfficialDropdownItem } from "../OfficialEpitaxyComponents";

export function numberComposerMenuItems(items: OfficialDropdownItem[]): OfficialDropdownItem[] {
  let index = 0;
  return items.map((item) => {
    if (item.disabled || item.noQuickKey || index >= 9) return item;
    index += 1;
    return { ...item, shortcut: String(index) };
  });
}
