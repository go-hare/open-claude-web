/**
 * Official c9a7e510b CustomizeDetailPanel `o` + metadata `i` / DescriptionRow `c`.
 */
import type { ReactNode } from "react";
import { Icon } from "../../shell/icons";
import { OfficialTooltip } from "../shared/OfficialTooltip";
import { useCustomizeText } from "./customizeMessages";

export type CustomizeAddedBy = "user" | "admin" | "anthropic" | "shared";

export function formatCustomizeDateMed(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function CustomizeDetailPanel({
  actionsSlot,
  addedBy,
  children,
  description,
  lastUpdated,
  name,
  userInvocable,
}: {
  actionsSlot?: ReactNode;
  addedBy?: CustomizeAddedBy;
  children?: ReactNode;
  description?: { content: string; tooltip: string };
  lastUpdated?: string;
  name: string;
  userInvocable?: boolean;
}) {
  const showMeta = Boolean(addedBy || description);
  return (
    <div className="flex flex-col h-full px-6 pb-6 gap-2">
      <div className="flex items-start justify-between pt-4 pb-3 min-h-14">
        <div className="flex-1 min-w-0">
          <h2 className="font-large-bold text-text-100 truncate">{name}</h2>
        </div>
        {actionsSlot}
      </div>
      {addedBy ? (
        <CustomizeDetailMetadata
          addedBy={addedBy}
          lastUpdated={lastUpdated}
          userInvocable={userInvocable}
        />
      ) : null}
      {description ? (
        <DescriptionRow content={description.content} tooltip={description.tooltip} />
      ) : null}
      {showMeta ? (
        <div className="flex items-center h-8">
          <hr className="flex-1 border-border-300" />
        </div>
      ) : null}
      {children}
    </div>
  );
}

function CustomizeDetailMetadata({
  addedBy,
  lastUpdated,
  userInvocable,
}: {
  addedBy: CustomizeAddedBy;
  lastUpdated?: string;
  userInvocable?: boolean;
}) {
  const text = useCustomizeText();
  const triggerAuto = userInvocable === false;
  return (
    <div className="flex gap-8">
      <div className="flex flex-col gap-1">
        <span className="font-small text-text-500">{text.addedBy}</span>
        <span className="font-base text-text-100">{addedByLabel(addedBy, text)}</span>
      </div>
      {lastUpdated ? (
        <div className="flex flex-col gap-1">
          <span className="font-small text-text-500">{text.lastUpdated}</span>
          <span className="font-base text-text-100">{lastUpdated}</span>
        </div>
      ) : null}
      {userInvocable !== undefined ? (
        <div className="flex flex-col gap-1">
          <span className="font-small text-text-500">{text.trigger}</span>
          <OfficialTooltip tooltipContent={triggerAuto ? text.triggerAutoTooltip : text.triggerSlashTooltip}>
            <span
              className="font-base text-text-100 cursor-help underline decoration-dotted decoration-border-300 underline-offset-4"
              tabIndex={0}
            >
              {triggerAuto ? text.triggerAuto : text.triggerSlashAndAuto}
            </span>
          </OfficialTooltip>
        </div>
      ) : null}
    </div>
  );
}

function DescriptionRow({ content, tooltip }: { content: string; tooltip: string }) {
  const text = useCustomizeText();
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-0.5">
        <h3 className="font-small text-text-500 leading-4">{text.description}</h3>
        <OfficialTooltip tooltipContent={tooltip}>
          <span className="flex items-center cursor-default">
            <Icon className="w-4 h-4 text-text-500" name="Info" />
          </span>
        </OfficialTooltip>
      </div>
      <p className="font-base text-text-300 whitespace-pre-wrap">{content.replace(/\\n/g, "\n")}</p>
    </div>
  );
}

function addedByLabel(
  source: CustomizeAddedBy,
  text: ReturnType<typeof useCustomizeText>,
): string {
  if (source === "admin") return text.addedByAdmin;
  if (source === "anthropic") return text.addedByAnthropic;
  if (source === "shared") return text.addedByShared;
  return text.addedByYou;
}
