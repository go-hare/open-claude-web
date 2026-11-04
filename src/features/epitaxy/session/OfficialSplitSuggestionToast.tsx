/**
 * Official c11959232 `Ed` split-view suggestion toast (CDBo_AYC).
 *
 *   data-testid="epitaxy-split-suggestion"
 *   copy bqh3gSHXRK / 8IBKnZa76A
 *   Banner variant:"neutral" icon:null role:"none" onDismiss
 *   Accept → addPane(..., "suggestion_card")
 *
 * Coordinator (`EpitaxySessionTile`) wires this; do not import the tile here.
 */
import { useEffect } from "react";
import { useStore } from "zustand";
import { useI18nText } from "../../../i18n/footerMenuMessages";
import type { PaneRef } from "../../../stores/paneStore";
import { OfficialButton } from "../OfficialEpitaxyComponents";
import { SPLIT_SUGGESTION_MESSAGES } from "../officialCodeChromeMessages";
import {
  acceptOfficialSplitSuggestion,
  bindOfficialSplitSuggestion,
  officialSplitSuggestionCurrentKey,
  officialSplitSuggestionStore,
} from "./officialSplitSuggestionStore";

export type UseOfficialSplitSuggestionOptions = {
  enabled?: boolean;
  pathname?: string;
  sessionRef?: PaneRef | { id: string } | null;
};

/** Official `Ed` + `Td` (`xd` / `wd` / `bd`). */
export function useOfficialSplitSuggestion({
  enabled = true,
  pathname,
  sessionRef,
}: UseOfficialSplitSuggestionOptions = {}) {
  const partner = useStore(officialSplitSuggestionStore, (state) => state.partner);
  const pairKeys = useStore(officialSplitSuggestionStore, (state) => state.pairKeys);
  const hasExplicitSessionRef = sessionRef !== undefined;
  const sessionId = sessionRef && "id" in sessionRef ? sessionRef.id : undefined;

  useEffect(() => {
    return bindOfficialSplitSuggestion({
      enabled,
      pathname,
      sessionRef: hasExplicitSessionRef
        ? (sessionId ? { kind: "code", id: sessionId } : null)
        : undefined,
    });
  }, [enabled, pathname, sessionId, hasExplicitSessionRef]);

  useEffect(() => {
    if (pairKeys === null) return;
    const state = officialSplitSuggestionStore.getState();
    if (!state.impressionSpent) state.shown();
  }, [pairKeys]);

  const visible = enabled && partner !== null;
  const currentKey = officialSplitSuggestionCurrentKey(
    pathname ?? (typeof window === "undefined" ? "" : window.location.pathname),
    sessionRef,
  );

  return {
    partner,
    visible,
    currentKey,
    accept: () => acceptOfficialSplitSuggestion(currentKey),
    dismiss: () => officialSplitSuggestionStore.getState().dismiss(),
  };
}

export function OfficialSplitSuggestionToast(options: UseOfficialSplitSuggestionOptions = {}) {
  const text = useI18nText(SPLIT_SUGGESTION_MESSAGES);
  const { visible, accept, dismiss } = useOfficialSplitSuggestion(options);
  if (!visible) return null;

  return (
    <div
      className="draggable-none fixed bottom-[calc(var(--dev-dashboard-height,0px)_+_var(--session-expiry-banner-height,0px)_+_1rem)] w-[420px] max-w-[calc(100vw-2rem)] right-[calc(var(--launch-drawer-width,0px)_+_1rem)]"
      data-testid="epitaxy-split-suggestion"
      style={{ zIndex: 9000 }}
    >
      <div
        className="flex items-start gap-xs py-md px-lg font-sans text-body font-normal rounded-card bg-surface-1 text-primary shadow-card-ring"
        data-action-align="first-line"
        data-cds="Banner"
        data-cta-layout="inline"
        data-icon-layout="first-line"
      >
        <div className="flex min-w-0 flex-wrap items-start gap-y-sm gap-x-md flex-1">
          <div className="max-w-full min-w-0 flex-auto">
            <div className="flex flex-col items-start gap-2">
              <span data-intl-id="bqh3gSHXRK">{text.seeMultipleSessions}</span>
              <OfficialButton onClick={accept} size="small">
                <span data-intl-id="8IBKnZa76A">{text.openInSplitView}</span>
              </OfficialButton>
            </div>
          </div>
        </div>
        <span className="-me-[calc(var(--cds-pad-md)-2px)] flex h-[1lh] shrink-0 items-center">
          <OfficialButton
            ariaLabel="Dismiss"
            icon="X"
            mode="icon"
            onClick={dismiss}
            size="small"
            tooltip={null}
            variant="ghost"
          />
        </span>
      </div>
    </div>
  );
}
