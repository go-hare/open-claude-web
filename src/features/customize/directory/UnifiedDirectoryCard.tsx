/**
 * Official n8t / a8t UnifiedDirectoryCard (index-BELzQL5P.js).
 */
import type { KeyboardEvent, ReactNode } from "react";
import { Icon } from "../../../shell/icons";
import { OfficialButton } from "../../shared/OfficialButton";
import { OfficialTooltip } from "../../shared/OfficialTooltip";
import { useCustomizeText } from "../customizeMessages";
import { titleCasePluginName } from "./pluginMarketplace";

export function UnifiedDirectoryCard({
  badges,
  className,
  customCta,
  description,
  icon,
  installDisabled,
  installDisabledTooltip,
  isHighlighted,
  isInstalled,
  isInstalling,
  metadata,
  onClick,
  onInstall,
  onManage,
  title,
}: {
  badges?: ReactNode;
  className?: string;
  customCta?: ReactNode;
  description?: string;
  icon?: ReactNode;
  installDisabled?: boolean;
  installDisabledTooltip?: string;
  isHighlighted?: boolean;
  isInstalled?: boolean;
  isInstalling?: boolean;
  metadata?: ReactNode;
  onClick?: () => void;
  onInstall?: () => void;
  onManage?: () => void;
  title: string;
}) {
  const text = useCustomizeText();
  const clickable = onClick !== undefined;

  let cta: ReactNode = null;
  if (customCta) {
    cta = customCta;
  } else if (onInstall) {
    if (isInstalled) {
      cta = (
        <OfficialButton
          aria-label={onManage ? text.manage : text.installed}
          disabled={!onManage}
          onClick={onManage}
          size="icon_sm"
          variant="ghost"
        >
          <Icon customSize={16} name="Settings" />
        </OfficialButton>
      );
    } else {
      const button = (
        <OfficialButton
          aria-busy={isInstalling}
          aria-label={text.install}
          disabled={installDisabled || isInstalling}
          onClick={onInstall}
          size="icon_sm"
          variant="ghost"
        >
          {isInstalling ? (
            <span className="inline-flex" role="status">
              <Icon aria-hidden="true" className="animate-spin" customSize={16} name="Spinner" />
              <span className="sr-only">{text.installing}</span>
            </span>
          ) : (
            <Icon customSize={16} name="Add" />
          )}
        </OfficialButton>
      );
      cta =
        installDisabled && installDisabledTooltip ? (
          <OfficialTooltip tooltipContent={installDisabledTooltip}>
            <div>{button}</div>
          </OfficialTooltip>
        ) : (
          button
        );
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!clickable) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onClick();
  };

  return (
    <div
      className={[
        "group/card flex h-full flex-col gap-3 rounded-2xl border-0.5 bg-bg-000 p-4 text-left shadow-sm transition-all",
        clickable
          ? "can-focus cursor-pointer hover:border-border-200 hover:shadow-[0_4px_20px_0_hsl(var(--always-black)/4%)]"
          : "",
        isHighlighted ? "border-border-200" : "border-border-300",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
      onKeyDown={clickable ? onKeyDown : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      <div className={["flex gap-3", metadata ? "items-start" : "items-center"].join(" ")}>
        {icon ? <div className="flex size-10 shrink-0 items-center justify-center">{icon}</div> : null}
        <div className="flex min-w-0 grow flex-col gap-0.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm font-medium text-text-100" title={title}>
              {title}
            </span>
            {badges}
          </div>
          {metadata ? (
            <div className="flex items-center gap-1.5 text-xs text-text-500">{metadata}</div>
          ) : null}
        </div>
        {cta ? (
          <div
            className="shrink-0"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
            role="presentation"
          >
            {cta}
          </div>
        ) : null}
      </div>
      {description ? <p className="mt-auto line-clamp-2 text-xs text-text-400">{description}</p> : null}
    </div>
  );
}

/** Official l8t / c8t PluginDirectoryCard → n8t. */
export function PluginDirectoryCard({
  authorName,
  description,
  hasUpdateAvailable,
  installDisabled,
  isHighlighted,
  isInstalled,
  isInstalling,
  name,
  onClick,
  onInstall,
  onManage,
}: {
  authorName?: string;
  description?: string;
  hasUpdateAvailable?: boolean;
  installDisabled?: boolean;
  isHighlighted?: boolean;
  isInstalled?: boolean;
  isInstalling?: boolean;
  name: string;
  onClick?: () => void;
  onInstall?: () => void;
  onManage?: () => void;
}) {
  const text = useCustomizeText();
  return (
    <UnifiedDirectoryCard
      description={description}
      icon={
        <div className="flex size-10 items-center justify-center rounded-lg border-0.5 border-border-300 bg-bg-100">
          <Icon className="size-6" name="plugin" />
        </div>
      }
      installDisabled={installDisabled}
      isHighlighted={isHighlighted}
      isInstalled={isInstalled}
      isInstalling={isInstalling}
      metadata={authorName ? <span className="truncate">{authorName}</span> : undefined}
      badges={
        hasUpdateAvailable ? (
          <span className="inline-flex items-center" title={text.updateAvailable}>
            <span aria-hidden="true" className="w-2 h-2 bg-brand-000 rounded-full flex-shrink-0" />
            <span className="sr-only">{text.updateAvailable}</span>
          </span>
        ) : undefined
      }
      onClick={onClick}
      onInstall={onInstall}
      onManage={onManage}
      title={titleCasePluginName(name)}
    />
  );
}

/** Official i8t marketplace card skeleton. */
export function DirectoryCardSkeleton({ showIcon = true }: { showIcon?: boolean } = {}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border-0.5 border-border-300 bg-bg-000 p-4">
      <div className="flex items-start gap-3">
        {showIcon ? <div className="size-10 shrink-0 animate-pulse rounded-lg bg-bg-300" /> : null}
        <div className="flex grow flex-col gap-1.5">
          <div className="h-4 w-1/2 animate-pulse rounded bg-bg-300" />
          <div className="h-3 w-1/3 animate-pulse rounded bg-bg-300" />
        </div>
        <div className="size-8 shrink-0 animate-pulse rounded-lg bg-bg-300" />
      </div>
      <div className="h-3 w-full animate-pulse rounded bg-bg-300" />
      <div className="h-3 w-4/5 animate-pulse rounded bg-bg-300" />
    </div>
  );
}
