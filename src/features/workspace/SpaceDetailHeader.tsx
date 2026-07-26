/**
 * Official residual dn (ce28369f9): space title + pin/star + description.
 * Desktop Ds residual uses pin icons (lt/rt); product maps Pin / PinFilled.
 */
import type { CoworkSpaceSummary } from "../../adapters/desktopBridge";
import { OfficialButton } from "../shared/OfficialButton";
import { OfficialTooltip } from "../shared/OfficialTooltip";
import { Icon } from "../../shell/icons";
import type { SpaceDetailText } from "./spaceDetailMessages";

export function SpaceDetailHeader({
  onToggleStarred,
  space,
  starred,
  text,
}: {
  onToggleStarred: () => void;
  space: CoworkSpaceSummary;
  starred: boolean;
  text: SpaceDetailText;
}) {
  const pinLabel = starred ? text.unpinProject : text.pinProject;
  return (
    <div className="mt-4 flex flex-col gap-1" data-official-source="ce28369f9-C9QQvDN-.js:dn">
      <div className="flex items-center gap-2">
        <h1 className="font-display min-w-0 line-clamp-2 text-2xl text-text-200">{space.name}</h1>
        <div className="ml-auto flex flex-shrink-0 items-center gap-1">
          <OfficialTooltip content={pinLabel}>
            <OfficialButton
              aria-label={pinLabel}
              aria-pressed={starred}
              className="relative *:transition *:duration-300 *:ease-in-out"
              onClick={onToggleStarred}
              size="icon_sm"
              type="button"
              variant="ghost"
            >
              <Icon
                className={starred ? "scale-75 opacity-0" : "scale-100 opacity-100"}
                customSize={16}
                name="Pin"
              />
              <Icon
                className={[
                  "absolute",
                  starred ? "scale-100 text-text-100 opacity-100" : "scale-50 opacity-0",
                ].join(" ")}
                customSize={16}
                name="PinFilled"
              />
            </OfficialButton>
          </OfficialTooltip>
        </div>
      </div>
      {space.description ? (
        <p className="mt-1 whitespace-pre-line text-sm text-text-300">{space.description}</p>
      ) : null}
    </div>
  );
}
