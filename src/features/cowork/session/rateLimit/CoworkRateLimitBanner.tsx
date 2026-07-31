/**
 * Official _Be / wBe shell for Local Cowork rate_limit banner
 * (index-BELzQL5P EVe·IVe + pVe action slot).
 * Driven by local messageLimits store.
 *
 * 3p honesty: action row matches official layout (actionButton slot) but CTAs are
 * residual-honest — dismiss / reset_rate_limits / open Setup — never Subscribe / AddCredits.
 */
import { useCallback, useEffect, useState } from "react";
import { useSyncExternalStore } from "react";
import { Icon } from "../../../../shell/icons";
import { OfficialButton } from "../../../shared/OfficialButton";
import {
  canResetRateLimitsFromBootstrap,
  fetchBootstrapPayload,
  organizationUuidFromBootstrap,
  postOrganizationResetRateLimits,
} from "../../../settings/accountSettingsApi";
import {
  buildCoworkRateLimitBannerModel,
  type CoworkRateLimitActionType,
  type CoworkRateLimitBannerModel,
} from "./coworkRateLimitBannerCopy";
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

/** Residual of ConfigHealth degraded states (yW / AQt) — not healthy/not_testable. */
const DEGRADED_CONFIG_HEALTH = new Set([
  "invalid_config",
  "auth_failed",
  "unreachable",
  "provider_error",
  "bootstrap_error",
  "config_model_rejected",
]);

type Custom3pSetupBridge = {
  getConfigHealth?: () => Promise<{ state?: string } | null>;
  openSetupWindow?: () => Promise<unknown>;
};

function custom3pSetupBridge(): Custom3pSetupBridge | undefined {
  try {
    return (
      window as unknown as {
        "claude.settings"?: { Custom3pSetup?: Custom3pSetupBridge };
      }
    )["claude.settings"]?.Custom3pSetup;
  } catch {
    return undefined;
  }
}

function isConfigHealthDegraded(state: string | undefined | null): boolean {
  if (!state) return false;
  return DEGRADED_CONFIG_HEALTH.has(state);
}

function openCustom3pSetup(): void {
  try {
    void custom3pSetupBridge()?.openSetupWindow?.();
  } catch {
    /* ignore */
  }
}

function actionLabel(type: CoworkRateLimitActionType, resetState: string): string {
  switch (type) {
    case "reset":
      if (resetState === "pending") return "Resetting…";
      if (resetState === "done") return "Limits reset";
      if (resetState === "error") return "Reset failed";
      return "Reset limits";
    case "open-setup":
      return "Open Setup";
    case "dismiss":
      return "Dismiss";
    default:
      return "";
  }
}

/**
 * Official _Be shell: body row + optional actionButton column.
 * data-official-source: index-BELzQL5P:_Be
 */
function RateLimitBeShell({
  actionButton,
  dangerText,
  minimalUi,
  children,
}: {
  actionButton: React.ReactNode | null;
  dangerText: boolean;
  minimalUi: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full" data-official-source="index-BELzQL5P:_Be">
      <div className="flex w-full flex-col items-center md:flex-row gap-2">
        <div
          className={
            dangerText
              ? "flex flex-row items-center gap-2 md:w-full text-danger-000"
              : minimalUi
                ? "flex flex-row items-center gap-2 md:w-full text-text-300"
                : "flex flex-row items-center gap-2 md:w-full text-danger-000"
          }
        >
          {minimalUi ? null : (
            <Icon
              aria-label="Warning"
              className="h-4 w-4 shrink-0"
              customSize={16}
              name="Warning"
            />
          )}
          <div className="text-sm">{children}</div>
        </div>
        {actionButton ? (
          <div className="-mt-px w-full whitespace-nowrap md:w-fit">{actionButton}</div>
        ) : null}
      </div>
    </div>
  );
}

export function CoworkRateLimitBanner({
  store = coworkRateLimitStore,
}: {
  store?: CoworkRateLimitStore;
}) {
  const limit = useCoworkMessageLimit(store);
  const orgUuid = resolveOrgUuid();
  const [canReset, setCanReset] = useState(false);
  const [resetOrgUuid, setResetOrgUuid] = useState<string | null>(null);
  const [resetState, setResetState] = useState<"idle" | "pending" | "done" | "error">(
    "idle",
  );
  // 3p residual: async getConfigHealth (same bridge as CoworkConfigHealthBanner).
  // Must not stay hard-false — open-setup CTA is residual of billing/account fix.
  const [configDegraded, setConfigDegraded] = useState(false);

  useEffect(() => {
    let alive = true;
    void fetchBootstrapPayload().then((bootstrap) => {
      if (!alive) return;
      const uuid = organizationUuidFromBootstrap(bootstrap);
      setResetOrgUuid(uuid);
      // Official GrowthBook can_reset_rate_limits; product fails closed if no org.
      setCanReset(Boolean(uuid) && canResetRateLimitsFromBootstrap(bootstrap));
    });
    return () => {
      alive = false;
    };
  }, [limit?.type]);

  useEffect(() => {
    let alive = true;
    const bridge = custom3pSetupBridge();
    if (!bridge?.getConfigHealth) {
      setConfigDegraded(false);
      return;
    }
    void bridge
      .getConfigHealth()
      .then((health) => {
        if (!alive) return;
        setConfigDegraded(isConfigHealthDegraded(health?.state));
      })
      .catch(() => {
        if (alive) setConfigDegraded(false);
      });
    return () => {
      alive = false;
    };
  }, [limit?.type]);

  const model: CoworkRateLimitBannerModel | null = buildCoworkRateLimitBannerModel(
    limit,
    Date.now() / 1000,
    {
      canResetRateLimits: canReset,
      configDegraded,
      allowSelfUpgrade: true,
    },
  );

  const dismiss = useCallback(() => {
    store.getState().dismissMessageLimit(orgUuid);
  }, [orgUuid, store]);

  const runReset = useCallback(async () => {
    if (!resetOrgUuid || resetState === "pending" || resetState === "done") return;
    setResetState("pending");
    const result = await postOrganizationResetRateLimits(resetOrgUuid);
    if (result.ok) {
      setResetState("done");
      store.getState().dismissMessageLimit(orgUuid);
    } else {
      setResetState("error");
    }
  }, [orgUuid, resetOrgUuid, resetState, store]);

  if (!model) return null;

  const actionType = model.actionType;
  let actionButton: React.ReactNode | null = null;
  if (actionType !== "none") {
    // Official gVe/v3 uses primary sm button; product uses OfficialButton (Dc residual).
    // text-sm link style for dismiss matches JC className:"text-sm" residual when not primary upgrade.
    if (actionType === "dismiss") {
      actionButton = (
        <button
          className="text-sm text-text-300 hover:text-text-200 underline-offset-2 hover:underline"
          data-rate-limit-action="dismiss"
          onClick={dismiss}
          type="button"
        >
          {actionLabel("dismiss", resetState)}
        </button>
      );
    } else {
      actionButton = (
        <OfficialButton
          data-rate-limit-action={actionType}
          disabled={
            actionType === "reset" &&
            (resetState === "pending" || resetState === "done" || !resetOrgUuid)
          }
          onClick={() => {
            if (actionType === "reset") void runReset();
            else if (actionType === "open-setup") openCustom3pSetup();
          }}
          size="sm"
          variant={actionType === "reset" ? "primary" : "secondary"}
        >
          {actionLabel(actionType, resetState)}
        </OfficialButton>
      );
    }
  }

  // g$t-adjacent slot: only emit outer spacing when a limit model is live (no empty mb wrapper).
  if (model.kind === "exceeded") {
    return (
      <div className="ml-1 mb-1.5 w-full max-w-xl">
        <div
          data-official-source="index-BELzQL5P:EVe/_Be/pVe"
          data-rate-limit-kind="exceeded"
          role="status"
        >
          <RateLimitBeShell
            actionButton={actionButton}
            dangerText={model.dangerText}
            minimalUi={model.minimalUi}
          >
            {model.body}
          </RateLimitBeShell>
        </div>
      </div>
    );
  }

  // Official IVe → wBe warning row (+ optional action).
  return (
    <div className="ml-1 mb-1.5 w-full max-w-xl">
      <div
        className="font-normal text-[0.65rem] sm:text-xs w-full flex gap-1.5 items-center justify-between"
        data-official-source="index-BELzQL5P:IVe/wBe/pVe"
        data-rate-limit-kind="approaching"
        role="status"
      >
        <span className="text-text-300 text-sm">{model.body}</span>
        {actionButton}
      </div>
    </div>
  );
}

export { isConfigHealthDegraded };
