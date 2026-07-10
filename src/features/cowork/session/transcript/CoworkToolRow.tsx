import type { MouseEvent, ReactNode } from "react";
import { CoworkChevronDownGlyph } from "../../ui/CoworkOfficialGlyphs";
import { CoworkTimelineGroupItem } from "./CoworkTimelinePrimitives";

export type CoworkToolRenderMode = "standard" | "timeline";

type CoworkToolRowProps = {
  children?: ReactNode;
  className?: string;
  handleClick?: () => void;
  hideCaret?: boolean;
  href?: string;
  icon?: ReactNode;
  isDisabled?: boolean;
  isExpanded?: boolean;
  isFirstBlockOfMessage?: boolean;
  isFirstItemInGroup?: boolean;
  isLastBlockOfMessage?: boolean;
  isLastItemInGroup?: boolean;
  isStreaming?: boolean;
  renderMode?: CoworkToolRenderMode;
  secondaryIcon?: ReactNode;
  secondaryText?: ReactNode;
  text: ReactNode;
  wrapperClassName?: string;
};

export function CoworkToolRow({
  children,
  className,
  handleClick,
  hideCaret,
  href,
  icon,
  isDisabled,
  isExpanded,
  isFirstBlockOfMessage,
  isFirstItemInGroup,
  isLastBlockOfMessage,
  isLastItemInGroup,
  isStreaming,
  renderMode = "standard",
  secondaryIcon,
  secondaryText,
  text,
  wrapperClassName,
}: CoworkToolRowProps) {
  const disabled = isDisabled || !handleClick && !href;
  const rowClassName = classes(
    "group/row flex flex-row items-center rounded-lg px-2.5 w-full justify-between",
    renderMode !== "timeline" && "py-2",
    "text-text-300",
    disabled ? "!cursor-default" : "cursor-pointer transition-colors duration-200 hover:text-text-200 hover:text-text-000",
    className,
  );
  const row = href ? (
    <a className={rowClassName} href={href} onClick={handleClick ? preventAndRun(handleClick) : undefined} rel="noopener noreferrer" target="_blank">{renderRowContent({ disabled, hideCaret, icon, isExpanded, isStreaming, renderMode, secondaryIcon, secondaryText, text })}</a>
  ) : (
    <button aria-expanded={isExpanded} className={rowClassName} onClick={disabled ? undefined : handleClick} type="button">{renderRowContent({ disabled, hideCaret, icon, isExpanded, isStreaming, renderMode, secondaryIcon, secondaryText, text })}</button>
  );
  if (renderMode === "timeline") {
    return <CoworkTimelineGroupItem children={children} header={row} icon={icon} isActive={Boolean(isStreaming && isLastBlockOfMessage && isLastItemInGroup)} isExpanded={isExpanded} isFirstItem={Boolean(isFirstItemInGroup)} isLastItem={Boolean(isLastItemInGroup)} showDotFallback={false} />;
  }
  return <div className={classes("ease-out rounded-lg border-[0.5px] flex flex-col font-ui leading-normal my-3 border-border-300", !isDisabled && !isExpanded && "hover:bg-bg-200", isFirstBlockOfMessage ? "mt-2" : "mt-3", isLastBlockOfMessage ? "mb-2" : "mb-3", isExpanded && "bg-bg-000 shadow-sm", wrapperClassName)}>{row}{children}</div>;
}

function renderRowContent({ disabled, hideCaret, icon, isExpanded, isStreaming, renderMode, secondaryIcon, secondaryText, text }: {
  disabled: boolean;
  hideCaret?: boolean;
  icon?: ReactNode;
  isExpanded?: boolean;
  isStreaming?: boolean;
  renderMode: CoworkToolRenderMode;
  secondaryIcon?: ReactNode;
  secondaryText?: ReactNode;
  text: ReactNode;
}) {
  return (
    <>
      <div className="flex flex-row items-center gap-2 min-w-0 flex-1">
        {icon && renderMode !== "timeline" ? <div className="flex items-center justify-center text-text-500 shrink-0">{icon}</div> : null}
        <div className="text-sm text-text-500 text-left truncate w-0 flex-grow">{isStreaming ? <span className="epitaxy-text-shine">{text}</span> : text}</div>
      </div>
      <div className="flex flex-row items-center gap-1.5 shrink-0">
        {secondaryText ? <p className="pl-1 text-text-500 font-small shrink-0 whitespace-nowrap">{secondaryText}</p> : null}
        {secondaryIcon ? <span className="inline-flex">{secondaryIcon}</span> : null}
        {!disabled && !hideCaret && !secondaryIcon ? <span className={classes("inline-flex transition-transform duration-150", isExpanded ? "rotate-180" : "rotate-0")}><CoworkChevronDownGlyph className="text-text-300" size={16} /></span> : null}
      </div>
    </>
  );
}

function preventAndRun(callback: () => void) {
  return (event: MouseEvent<HTMLAnchorElement>) => { event.preventDefault(); callback(); };
}

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}
