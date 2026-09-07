import { Menu } from "@base-ui-components/react/menu";
import { BaseMenuItem, BaseMenuPopup } from "../../../shell/BaseMenu";
import { Icon } from "../../../shell/icons";
import { OfficialButton } from "../../shared/OfficialButton";
import { officialButtonClass } from "../../shared/buttonClasses";

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
}: {
  addCustomDisabled?: boolean;
  addCustomTooltip?: string;
  onAddCustom?: () => void;
  onBrowse?: () => void;
  showAddCustom?: boolean;
  showBrowse?: boolean;
}) {
  const optionCount = [showBrowse, showAddCustom].filter(Boolean).length;
  if (optionCount === 0) return null;

  if (optionCount === 1) {
    const onClick = showBrowse ? onBrowse : onAddCustom;
    return (
      <OfficialButton
        aria-label="Add connector"
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
        aria-label="Add connector"
        className={officialButtonClass({ variant: "ghost", size: "icon_sm" })}
      >
        <Icon customSize={16} name="Add" />
      </Menu.Trigger>
      <BaseMenuPopup align="end" side="bottom" sideOffset={4}>
        {showBrowse ? (
          <BaseMenuItem icon="plugin" onClick={onBrowse}>
            Browse connectors
          </BaseMenuItem>
        ) : null}
        {showAddCustom ? (
          <BaseMenuItem
            className={addCustomDisabled ? "opacity-50 pointer-events-none" : undefined}
            icon="Add"
            onClick={addCustomDisabled ? undefined : onAddCustom}
          >
            Add custom connector
          </BaseMenuItem>
        ) : null}
      </BaseMenuPopup>
    </Menu.Root>
  );
}
