import { Menu } from "@base-ui-components/react/menu";
import { type MessageDescriptors, useI18nText } from "../../../i18n/footerMenuMessages";
import { BaseMenuItem, BaseMenuPopup } from "../../../shell/BaseMenu";
import { Icon } from "../../../shell/icons";
import { OfficialButton } from "../../shared/OfficialButton";
import { officialButtonClass } from "../../shared/buttonClasses";

const ADD_CONNECTOR_MESSAGES = {
  add: { defaultMessage: "Add", id: "alWu/MbgXB" },
  addConnector: { defaultMessage: "Add connector", id: "jdCrxH65Tm" },
  browseConnectors: { defaultMessage: "Browse connectors", id: "XnB63xJ54M" },
  addCustomConnector: { defaultMessage: "Add custom connector", id: "5NO7mmK1QL" },
} as const satisfies MessageDescriptors;

const OVERLAY_ADD_TRIGGER_CLASS =
  "cds-reset group/btn relative isolate inline-flex h-control shrink-0 items-center justify-center gap-1.5 rounded border-0 px-md font-sans text-body font-medium font-control text-on-primary outline-none select-none whitespace-nowrap";

/**
 * Official c63a78ed4 Bt — header "+" for Connectors list (Rt).
 *
 * 0 options → null
 * 1 option → ghost icon_sm "Add connector" runs that action
 * 2 options → Ce dropdown: Browse connectors + Add custom connector
 *
 * Must not treat "+" as Directory open. Browse is onBrowse; this ion-dist
 * `$T` remaps connectors → plugins only when Browse is chosen.
 */
export function AddConnectorMenu({
  addCustomDisabled = false,
  addCustomTooltip,
  onAddCustom,
  onBrowse,
  showAddCustom = true,
  showBrowse = true,
  variant = "page",
}: {
  addCustomDisabled?: boolean;
  addCustomTooltip?: string;
  onAddCustom?: () => void;
  onBrowse?: () => void;
  showAddCustom?: boolean;
  showBrowse?: boolean;
  /** Overlay Ko (c40525e86): primary Add + Add custom connector; Discover is a tab. */
  variant?: "page" | "overlay";
}) {
  const text = useI18nText(ADD_CONNECTOR_MESSAGES);
  if (variant === "overlay") {
    return (
      <Menu.Root>
        <Menu.Trigger
          aria-label={text.addConnector}
          className={OVERLAY_ADD_TRIGGER_CLASS}
          data-cds="Button"
          data-official-source="cd08e92dc:Oe TriggerButton jdCrxH65Tm"
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
          <BaseMenuItem
            className={addCustomDisabled ? "opacity-50 pointer-events-none" : undefined}
            icon="Add"
            onClick={addCustomDisabled ? undefined : onAddCustom}
          >
            {text.addCustomConnector}
          </BaseMenuItem>
        </BaseMenuPopup>
      </Menu.Root>
    );
  }

  const optionCount = [showBrowse, showAddCustom].filter(Boolean).length;
  if (optionCount === 0) return null;

  if (optionCount === 1) {
    const onClick = showBrowse ? onBrowse : onAddCustom;
    return (
      <OfficialButton
        aria-label={text.addConnector}
        disabled={!showBrowse && addCustomDisabled}
        onClick={onClick}
        size="icon_sm"
        title={!showBrowse && addCustomDisabled ? addCustomTooltip : undefined}
        variant="ghost"
      >
        <Icon customSize={16} name="Add" />
      </OfficialButton>
    );
  }

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={text.addConnector}
        className={officialButtonClass({ variant: "ghost", size: "icon_sm" })}
      >
        <Icon customSize={16} name="Add" />
      </Menu.Trigger>
      <BaseMenuPopup align="end" side="bottom" sideOffset={4}>
        {showBrowse ? (
          <BaseMenuItem icon="plugin" onClick={onBrowse}>
            {text.browseConnectors}
          </BaseMenuItem>
        ) : null}
        {showAddCustom ? (
          <BaseMenuItem
            className={addCustomDisabled ? "opacity-50 pointer-events-none" : undefined}
            icon="Add"
            onClick={addCustomDisabled ? undefined : onAddCustom}
          >
            {text.addCustomConnector}
          </BaseMenuItem>
        ) : null}
      </BaseMenuPopup>
    </Menu.Root>
  );
}
