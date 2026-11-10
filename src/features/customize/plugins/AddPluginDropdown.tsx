import { Menu } from "@base-ui-components/react/menu";
import { type MessageDescriptors, useI18nText } from "../../../i18n/footerMenuMessages";
import { BaseMenuItem, BaseMenuPopup } from "../../../shell/BaseMenu";
import { Icon } from "../../../shell/icons";

const ADD_PLUGIN_MESSAGES = {
  discover: { defaultMessage: "Discover", id: "6zI3v92cdU" },
  add: { defaultMessage: "Add", id: "alWu/MbgXB" },
  addPlugin: { defaultMessage: "Add plugin", id: "9knX1qH3f1" },
  uploadPlugin: { defaultMessage: "Upload plugin", id: "EtIpiwYn4p" },
  createWithClaude: { defaultMessage: "Create with Claude", id: "PJOomHaesP" },
} as const satisfies MessageDescriptors;

const OVERLAY_ADD_TRIGGER_CLASS =
  "cds-reset group/btn relative isolate inline-flex h-control shrink-0 items-center justify-center gap-1.5 rounded border-0 px-md font-sans text-body font-medium font-control text-on-primary outline-none select-none whitespace-nowrap";

const OVERLAY_DISCOVER_CLASS =
  "cds-reset group/btn relative isolate inline-flex h-control shrink-0 items-center justify-center gap-1.5 rounded border-0 px-md font-sans text-body font-medium font-control text-primary outline-none select-none whitespace-nowrap";

/**
 * Official overlay Oe (cd08e92dc): Discover secondary + Add primary in one actions cluster.
 * Screenshot 20: Discover sits left of Add on the title row — not a Your plugins sibling tab.
 * qs showBrowse = canBrowse && !hideBrowse; Discover onClick is HT DirectoryModal, not a tab.
 * Menu: Upload plugin + Create with Claude.
 */
export function AddPluginDropdown({
  canUpload,
  onCreateWithClaude,
  onDiscover,
  onUpload,
}: {
  canUpload: boolean;
  onCreateWithClaude?: () => void;
  onDiscover?: () => void;
  onUpload?: () => void;
}) {
  const text = useI18nText(ADD_PLUGIN_MESSAGES);
  const add = canUpload ? (
    <Menu.Root>
      <Menu.Trigger
        aria-label={text.addPlugin}
        className={OVERLAY_ADD_TRIGGER_CLASS}
        data-cds="Button"
        data-official-source="cd08e92dc:Oe TriggerButton 9knX1qH3f1"
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-[inherit] bg-fill-primary transition-[background-color] duration-fast group-hover/btn:bg-fill-primary-hover group-[[aria-haspopup][aria-expanded=true]]/btn:bg-fill-primary-hover"
          data-cds-part="paint"
        />
        <span className="relative inline-flex min-w-0 items-center gap-1">
          {text.add}
          <Icon className="shrink-0 opacity-60" name="CaretDown" preferFont size="sm" />
        </span>
      </Menu.Trigger>
      <BaseMenuPopup align="end" side="bottom" sideOffset={4}>
        <BaseMenuItem icon="Upload" onClick={onUpload}>
          {text.uploadPlugin}
        </BaseMenuItem>
        {onCreateWithClaude ? (
          <BaseMenuItem icon="Chat" onClick={onCreateWithClaude}>
            {text.createWithClaude}
          </BaseMenuItem>
        ) : null}
      </BaseMenuPopup>
    </Menu.Root>
  ) : null;

  if (!onDiscover && !add) return null;

  return (
    <div className="flex items-center gap-1.5" data-official-source="cd08e92dc:Oe">
      {onDiscover ? (
        <button
          className={OVERLAY_DISCOVER_CLASS}
          data-cds="Button"
          data-testid="plugins-overlay-discover"
          onClick={onDiscover}
          type="button"
        >
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-[inherit] bg-fill-secondary transition-[background-color] duration-fast group-hover/btn:bg-fill-ghost-hover"
            data-cds-part="paint"
          />
          <span className="relative">{text.discover}</span>
        </button>
      ) : null}
      {add}
    </div>
  );
}
