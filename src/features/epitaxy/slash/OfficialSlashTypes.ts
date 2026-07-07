import type { Editor, Range } from "@tiptap/core";
import type { ReactNode } from "react";

export type OfficialSlashSuggestionPlacement = "onpage" | "top-start" | "bottom-start";

export type OfficialSlashCommandMenuProps = {
  clientRect?: (() => DOMRect | null) | null;
  editor: Editor;
  onClose: () => void;
  placement?: OfficialSlashSuggestionPlacement;
  query?: string;
  range: Range;
};

export type OfficialSlashCommandItem =
  | { label?: string; type: "separator" }
  | { label: string; type: "section-header" }
  | { label?: string; type: "loading" }
  | { type: "search-input" }
  | {
      aliases?: string[];
      argumentHint?: string;
      disabled?: boolean;
      icon?: ReactNode;
      label: string;
      onAction?: () => void;
      skillDescription?: string;
      skillId: string;
      sourcePluginName?: string;
      type: "skill";
    }
  | {
      closeOnClick?: boolean;
      disabled?: boolean;
      icon?: ReactNode;
      label: string;
      onAction?: () => void;
      suffix?: ReactNode;
      subtitle?: ReactNode;
      type: "button";
    }
  | {
      checked?: boolean;
      closeOnClick?: boolean;
      disabled?: boolean;
      icon?: ReactNode;
      label: string;
      onAction?: () => void;
      subtitle?: ReactNode;
      type: "checkbox" | "toggle";
    }
  | {
      disabled?: boolean;
      icon?: ReactNode;
      items: OfficialSlashCommandItem[];
      label: string;
      submenuTitle?: string;
      subtitle?: ReactNode;
      type: "submenu";
    }
  | {
      connectorName?: string;
      disabled?: boolean;
      icon?: ReactNode;
      label: string;
      onAction?: () => void;
      toolName: string;
      type: "connector-tool";
    };

export type OfficialActionableSlashCommandItem = Extract<OfficialSlashCommandItem, { onAction?: () => void }>;

export function isOfficialSlashStaticItem(item: OfficialSlashCommandItem) {
  return item.type === "separator" || item.type === "section-header" || item.type === "search-input" || item.type === "loading";
}

export function officialSlashItemLabel(item: OfficialSlashCommandItem) {
  return "label" in item && typeof item.label === "string" ? item.label : "";
}

export function officialSlashSkillChipContent(skillId: string, skillDisplayName: string, skillDescription: string, skillArgumentHint = "", trailingText = " ") {
  return [
    {
      type: "skillChip",
      attrs: {
        skillId,
        skillDisplayName,
        skillDescription,
        skillArgumentHint,
      },
    },
    { type: "text", text: trailingText },
  ];
}
