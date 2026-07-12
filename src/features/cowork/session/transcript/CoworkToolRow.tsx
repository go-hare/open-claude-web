import { memo, useCallback, type MouseEvent, type ReactNode } from "react";
import { CoworkChevronDownGlyph } from "../../ui/CoworkOfficialGlyphs";
import { CoworkShimmerText } from "./CoworkShimmerText";
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
  secondaryElement?: ReactNode;
  secondaryText?: ReactNode;
  text: ReactNode;
  wrapperClassName?: string;
};

export const CoworkToolRow = memo(function CoworkToolRow({
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
  secondaryElement,
  secondaryText,
  text,
  wrapperClassName,
}: CoworkToolRowProps) {
  const disabled = isDisabled || !handleClick && !href;
  const rowClassName = classes(
    "group/row flex flex-row items-center rounded-lg px-2.5 w-full",
    secondaryElement ? "gap-2" : "justify-between",
    renderMode !== "timeline" && (secondaryElement ? "py-1" : "py-2"),
    "text-text-300",
    disabled ? "!cursor-default" : "cursor-pointer transition-colors duration-200 hover:text-text-200 hover:text-text-000",
    className,
  );
  const linkClick = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    if (!handleClick) return;
    event.preventDefault();
    handleClick();
  }, [handleClick]);
  const row = href ? (
    <a className={rowClassName} href={href} onClick={handleClick ? linkClick : undefined} rel="noopener noreferrer" target="_blank">{renderRowContent({ disabled, hideCaret, icon, isExpanded, isStreaming, renderMode, secondaryElement, secondaryIcon, secondaryText, text })}</a>
  ) : (
    <button aria-expanded={isExpanded} className={rowClassName} onClick={disabled ? undefined : handleClick}>{renderRowContent({ disabled, hideCaret, icon, isExpanded, isStreaming, renderMode, secondaryElement, secondaryIcon, secondaryText, text })}</button>
  );
  if (renderMode === "timeline") {
    return <CoworkTimelineGroupItem children={children} header={row} icon={icon} isActive={Boolean(isStreaming && isLastBlockOfMessage && isLastItemInGroup)} isExpanded={isExpanded} isFirstItem={Boolean(isFirstItemInGroup)} isLastItem={Boolean(isLastItemInGroup)} showDotFallback={false} />;
  }
  return <div className={classes("ease-out rounded-lg border-[0.5px] flex flex-col font-ui leading-normal my-3 border-border-300", !isDisabled && !isExpanded && "hover:bg-bg-200", isFirstBlockOfMessage ? "mt-2" : "mt-3", isLastBlockOfMessage ? "mb-2" : "mb-3", isExpanded && "bg-bg-000 shadow-sm", wrapperClassName)}>{row}{children}</div>;
});

function renderRowContent({ disabled, hideCaret, icon, isExpanded, isStreaming, renderMode, secondaryElement, secondaryIcon, secondaryText, text }: {
  disabled: boolean;
  hideCaret?: boolean;
  icon?: ReactNode;
  isExpanded?: boolean;
  isStreaming?: boolean;
  renderMode: CoworkToolRenderMode;
  secondaryElement?: ReactNode;
  secondaryIcon?: ReactNode;
  secondaryText?: ReactNode;
  text: ReactNode;
}) {
  return (
    <>
      <div className="flex flex-row items-center gap-2 min-w-0 flex-1">
        {icon && renderMode !== "timeline" ? <div className="flex items-center justify-center text-text-500 shrink-0">{icon}</div> : null}
        <div className={classes("text-sm text-text-500 text-left truncate", !secondaryElement && "w-0 flex-grow")}>{isStreaming ? <CoworkShimmerText>{text}</CoworkShimmerText> : text}</div>
        {secondaryElement ? <div className="flex items-center shrink-0 ml-2">{secondaryElement}</div> : null}
      </div>
      <div className="flex flex-row items-center gap-1.5 shrink-0">
        {secondaryText ? <p className="pl-1 text-text-500 font-small shrink-0 whitespace-nowrap">{secondaryText}</p> : null}
        {secondaryIcon ? <span className="inline-flex">{secondaryIcon}</span> : null}
        {/* Official bde caret: duration-400 ease-snappy-out, single rotate. */}
        {!disabled && !hideCaret && !secondaryIcon ? <span className={classes("inline-flex transition-transform duration-400 ease-snappy-out", isExpanded ? "rotate-180" : "rotate-0")}><CoworkChevronDownGlyph className="relative bottom-[0.5px] text-text-300" size={16} /></span> : null}
      </div>
    </>
  );
}

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}
