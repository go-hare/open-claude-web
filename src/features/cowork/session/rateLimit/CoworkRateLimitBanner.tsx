/**
 * Official _Be / wBe shell subset for Local Cowork rate_limit banner
 * (index-BELzQL5P ~94308 / ~94342 / EVe·IVe).
 * Driven by local messageLimits store — no pVe upgrade/admin action invent.
 */
import { useSyncExternalStore } from "react";
import { Icon } from "../../../../shell/icons";
import { organizationUuidFromBootstrap } from "../../../settings/accountSettingsApi";
import { buildCoworkRateLimitBannerModel } from "./coworkRateLimitBannerCopy";
import {
  coworkRateLimitStore,
  type CoworkRateLimitStore,
} from "./coworkRateLimitStore";

function resolveOrgUuid(): string {
  try {
    const w = window as unknown as {
      __CLAUDE_BOOTSTRAP__?: Record<string, unknown>;
      __bootstrap?: Record<string, unknown>;
    };
    return (
      organizationUuidFromBootstrap(w.__CLAUDE_BOOTSTRAP__) ??
      organizationUuidFromBootstrap(w.__bootstrap) ??
      "_"
    );
  } catch {
    return "_";
  }
}

function useCoworkMessageLimit(store: CoworkRateLimitStore = coworkRateLimitStore) {
  return useSyncExternalStore(
    store.subscribe,
    () => store.getState().getMessageLimit(resolveOrgUuid()),
    () => store.getState().getMessageLimit(resolveOrgUuid()),
  );
}

export function CoworkRateLimitBanner({
  store = coworkRateLimitStore,
}: {
  store?: CoworkRateLimitStore;
}) {
  const limit = useCoworkMessageLimit(store);
  const model = buildCoworkRateLimitBannerModel(limit);
  if (!model) return null;

  // Official _Be: minimalUi skips Warning icon; dangerText uses text-danger-000.
  if (model.kind === "exceeded") {
    return (
      <div
        className="w-full"
        data-official-source="index-BELzQL5P:EVe/_Be"
        data-rate-limit-kind="exceeded"
        role="status"
      >
        <div className="flex w-full flex-col items-center md:flex-row gap-2">
          <div
            className={
              model.minimalUi
                ? "flex flex-row items-center gap-2 md:w-full text-text-300"
                : "flex flex-row items-center gap-2 md:w-full text-danger-000"
            }
          >
            {model.minimalUi ? null : (
              <Icon
                aria-label="Warning"
                className="h-4 w-4 shrink-0"
                customSize={16}
                name="Warning"
              />
            )}
            <div className="text-sm">{model.body}</div>
          </div>
        </div>
      </div>
    );
  }

  // Official IVe → wBe warning row.
  return (
    <div
      className="font-normal text-[0.65rem] sm:text-xs w-full flex gap-1.5 items-center justify-between"
      data-official-source="index-BELzQL5P:IVe/wBe"
      data-rate-limit-kind="approaching"
      role="status"
    >
      <span className="text-text-300 text-sm">{model.body}</span>
    </div>
  );
}
