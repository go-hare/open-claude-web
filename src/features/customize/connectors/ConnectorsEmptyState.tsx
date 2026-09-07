import { ConnectorsEmptyPictogram } from "../ConnectorsEmptyPictogram";
import { OfficialButton } from "../../shared/OfficialButton";

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
              <OfficialButton className="w-full" onClick={onBrowseConnectors} variant="primary">
                Browse connectors
              </OfficialButton>
            ) : null}
            {showAddCustom ? (
              <OfficialButton
                className="w-full"
                disabled={addCustomDisabled}
                onClick={onAddCustomConnector}
                title={addCustomDisabled ? addCustomTooltip : undefined}
                variant="secondary"
              >
                Add custom connector
              </OfficialButton>
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
        <OfficialButton onClick={onRetry} variant="primary">
          Try again
        </OfficialButton>
      </div>
    </div>
  );
}
