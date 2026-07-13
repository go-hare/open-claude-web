import type { ReactNode } from "react";
import { ConnectorsEmptyPictogram } from "../ConnectorsEmptyPictogram";

/**
 * Official c63a78ed4 Kt — full-page empty when connector list length is 0.
 * Learn more → support article; Browse/Add gated by manage permissions.
 */
const LEARN_MORE_HREF = "https://support.claude.com/en/articles/10168395-setting-up-claude-integrations";

export function ConnectorsEmptyState({
  canManage = true,
  showBrowse = true,
  showAddCustom = true,
  addCustomDisabled = false,
  addCustomTooltip,
  onBrowseConnectors,
  onAddCustomConnector,
}: {
  canManage?: boolean;
  showBrowse?: boolean;
  showAddCustom?: boolean;
  addCustomDisabled?: boolean;
  addCustomTooltip?: string;
  onBrowseConnectors?: () => void;
  onAddCustomConnector?: () => void;
}) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <ConnectorsEmptyPictogram size="medium" />
        <p className="text-sm text-text-300 text-center px-6 text-pretty max-w-[300px]">
          Unlock more with Claude when you connect your team&apos;s tools.{" "}
          <a
            href={LEARN_MORE_HREF}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-text-100"
          >
            Learn more
          </a>
        </p>
        {canManage ? (
          <div className="flex flex-col gap-3 w-full max-w-[200px] items-center">
            {showBrowse ? (
              <ActionButton variant="primary" onClick={onBrowseConnectors}>
                Browse connectors
              </ActionButton>
            ) : null}
            {showAddCustom ? (
              <ActionButton
                variant="secondary"
                onClick={onAddCustomConnector}
                disabled={addCustomDisabled}
                tooltip={addCustomDisabled ? addCustomTooltip : undefined}
              >
                Add custom connector
              </ActionButton>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ConnectorsLoadErrorState({ onRetry }: { onRetry: () => void }) {
  // Official c63a78ed4 Jt
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <ConnectorsEmptyPictogram size="medium" />
        <p className="text-sm text-text-300 text-center px-6 text-pretty max-w-[300px]">
          Connectors couldn&apos;t be loaded. Check your connection and try again.
        </p>
        <ActionButton variant="primary" onClick={onRetry}>
          Try again
        </ActionButton>
      </div>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  variant,
  disabled,
  tooltip,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant: "primary" | "secondary";
  disabled?: boolean;
  tooltip?: string;
}) {
  const classes =
    variant === "primary"
      ? "bg-text-000 text-bg-000 hover:opacity-90"
      : "border border-border-300 bg-bg-000 text-text-100 hover:bg-bg-100";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={`inline-flex h-9 w-full items-center justify-center rounded-lg px-3 text-sm disabled:opacity-50 ${classes}`}
    >
      {children}
    </button>
  );
}
