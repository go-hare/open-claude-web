import { type MessageDescriptors, useI18nText } from "../../../i18n/footerMenuMessages";
import { ConnectorsEmptyPictogram } from "../ConnectorsEmptyPictogram";
import { OfficialButton } from "../../shared/OfficialButton";

const CONNECTORS_EMPTY_MESSAGES = {
  unlockMore: {
    defaultMessage: "Unlock more with Claude when you connect your team's tools.",
    id: "N31B49ewHu",
  },
  learnMore: { defaultMessage: "Learn more", id: "TdTXXf940t" },
  browseConnectors: { defaultMessage: "Browse connectors", id: "XnB63xJ54M" },
  addCustomConnector: { defaultMessage: "Add custom connector", id: "5NO7mmK1QL" },
  couldntLoad: {
    defaultMessage: "Connectors couldn't be loaded. Check your connection and try again.",
    id: "J/AhX4a0AI",
  },
  tryAgain: { defaultMessage: "Try again", id: "FazwRldA7z" },
} as const satisfies MessageDescriptors;

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
  const text = useI18nText(CONNECTORS_EMPTY_MESSAGES);
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <ConnectorsEmptyPictogram size="medium" />
        <p className="text-sm text-text-300 text-center px-6 text-pretty max-w-[300px]">
          {text.unlockMore}{" "}
          <a
            href={LEARN_MORE_HREF}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-text-100"
          >
            {text.learnMore}
          </a>
        </p>
        {canManage ? (
          <div className="flex flex-col gap-3 w-full max-w-[200px] items-center">
            {showBrowse ? (
              <OfficialButton className="w-full" onClick={onBrowseConnectors} variant="primary">
                {text.browseConnectors}
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
                {text.addCustomConnector}
              </OfficialButton>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ConnectorsLoadErrorState({ onRetry }: { onRetry: () => void }) {
  const text = useI18nText(CONNECTORS_EMPTY_MESSAGES);
  // Official c63a78ed4 Jt
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <ConnectorsEmptyPictogram size="medium" />
        <p className="text-sm text-text-300 text-center px-6 text-pretty max-w-[300px]">
          {text.couldntLoad}
        </p>
        <OfficialButton onClick={onRetry} variant="primary">
          {text.tryAgain}
        </OfficialButton>
      </div>
    </div>
  );
}
