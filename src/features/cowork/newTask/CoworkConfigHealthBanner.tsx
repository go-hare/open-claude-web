import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Icon } from "../../../shell/icons";
import {
  formatCoworkConfigHealthMessage,
  useCoworkConfigHealthText,
  type CoworkConfigHealthText,
} from "./coworkConfigHealthMessages";

/**
 * Official residual:
 *   yW states on ConfigHealth
 *   SQt → getConfigHealth
 *   AQt → hide Healthy / NotTestable
 *   TQt → warning Kfe banner with Details / Open Setup / Check again
 * Mount: cowork home max-w-2xl, above header (index-BELzQL5P AQt before header block).
 */

export type ConfigHealthState =
  | "healthy"
  | "invalid_config"
  | "auth_failed"
  | "unreachable"
  | "provider_error"
  | "not_testable"
  | "bootstrap_error"
  | "config_model_rejected";

export type ConfigHealth = {
  state: ConfigHealthState | string;
  source?: { type?: "local" | "managed" | "none" | string; remote?: boolean };
  provider?: string | null;
  endpoint?: string | null;
  httpStatus?: number;
  errorCode?: string;
  failingField?: string;
  message?: string;
  requestUrl?: string;
  probedModel?: string;
  responseBody?: string;
  checkedAt?: string;
};

type Custom3pSetupBridge = {
  getConfigHealth?: () => Promise<ConfigHealth | null>;
  recheckConfigHealth?: () => Promise<ConfigHealth | null>;
  openSetupWindow?: () => Promise<unknown>;
};

type BannerAction = "checkAgain" | "openSetup" | "copyReport";

type BannerContent = {
  title: string;
  body: ReactNode;
  actions: BannerAction[];
};

function custom3pSetupBridge(): Custom3pSetupBridge | undefined {
  const settings = (window as unknown as { "claude.settings"?: { Custom3pSetup?: Custom3pSetupBridge } })[
    "claude.settings"
  ];
  return settings?.Custom3pSetup;
}

function providerDisplayName(provider: string | null | undefined, fallback: string): string {
  switch (provider) {
    case "gateway":
      return "Gateway";
    case "vertex":
      return "Vertex";
    case "bedrock":
      return "Bedrock";
    case "foundry":
      return "Foundry";
    default:
      return provider && provider.length > 0 ? provider : fallback;
  }
}

function hostFromEndpoint(endpoint: string | null | undefined, fallback: string): string {
  if (!endpoint) return fallback;
  try {
    return new URL(endpoint).host || fallback;
  } catch {
    return endpoint || fallback;
  }
}

function isManagedSource(health: ConfigHealth | null | undefined): boolean {
  return health?.source?.type === "managed";
}

function resolveBannerContent(
  health: ConfigHealth,
  text: CoworkConfigHealthText,
): BannerContent | null {
  const managed = isManagedSource(health);
  const provider = providerDisplayName(health.provider, text.yourProvider);
  const host = hostFromEndpoint(health.endpoint, text.theProviderEndpoint);
  const model = health.probedModel;

  switch (health.state) {
    case "bootstrap_error":
      return {
        title: text.configSyncIssue,
        body: health.message || text.configSyncBody,
        actions: ["openSetup"],
      };
    case "invalid_config":
      return managed
        ? {
            title: text.configCantBeUsed,
            body: text.configCantBeUsedBody,
            actions: ["copyReport"],
          }
        : {
            title: text.providerSetupNeedsFix,
            body: text.providerSetupNeedsFixBody,
            actions: ["openSetup"],
          };
    case "auth_failed":
      return {
        title: formatCoworkConfigHealthMessage(text.couldntSignIn, { provider }),
        body: managed ? text.authFailedManagedBody : text.authFailedLocalBody,
        actions: managed ? ["copyReport", "checkAgain"] : ["openSetup", "checkAgain"],
      };
    case "unreachable":
      return {
        title: formatCoworkConfigHealthMessage(text.cantReachHost, { host }),
        body: managed ? text.unreachableManagedBody : text.unreachableLocalBody,
        actions: managed ? ["copyReport", "checkAgain"] : ["openSetup", "checkAgain"],
      };
    case "config_model_rejected": {
      const modelLabel = model ?? "model";
      const [before = "", after = ""] = text.gatewayCouldntServe.split("{model}");
      return {
        title: text.configuredModelNotAvailable,
        body: (
          <span>
            {before}
            <code>{modelLabel}</code>
            {after}
          </span>
        ),
        actions: managed ? ["copyReport", "checkAgain"] : ["openSetup", "checkAgain"],
      };
    }
    case "provider_error":
      return {
        title: formatCoworkConfigHealthMessage(text.providerReturnedError, { provider }),
        body: managed ? text.providerErrorManagedBody : text.providerErrorLocalBody,
        actions: managed ? ["copyReport", "checkAgain"] : ["openSetup", "checkAgain"],
      };
    case "healthy":
    case "not_testable":
    default:
      return null;
  }
}

/** Official AQt — loads health and only renders TQt for failing states. */
export function CoworkConfigHealthBanner() {
  const [health, setHealth] = useState<ConfigHealth | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    const bridge = custom3pSetupBridge();
    if (!bridge?.getConfigHealth) {
      setHealth(null);
      return;
    }
    void bridge
      .getConfigHealth()
      .then((value) => {
        if (active) setHealth(value ?? null);
      })
      .catch(() => {
        if (active) setHealth(null);
      });
    return () => {
      active = false;
    };
  }, []);

  if (health === undefined) return null;
  if (!health) return null;
  if (health.state === "healthy" || health.state === "not_testable") return null;
  return <CoworkConfigHealthBannerInner health={health} onHealthChange={setHealth} />;
}

/** Official TQt residual. */
function CoworkConfigHealthBannerInner({
  health: initialHealth,
  onHealthChange,
}: {
  health: ConfigHealth;
  onHealthChange: (health: ConfigHealth | null) => void;
}) {
  const text = useCoworkConfigHealthText();
  const [override, setOverride] = useState<ConfigHealth | undefined>();
  const [dismissed, setDismissed] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const [copied, setCopied] = useState(false);
  const health = override ?? initialHealth;
  const content = useMemo(() => resolveBannerContent(health, text), [health, text]);

  const recheck = useCallback(async () => {
    const bridge = custom3pSetupBridge();
    if (!bridge?.recheckConfigHealth) return;
    setRechecking(true);
    try {
      const next = await bridge.recheckConfigHealth();
      if (next) {
        setOverride(next);
        onHealthChange(next);
      }
    } catch {
      // keep previous health
    } finally {
      setRechecking(false);
    }
  }, [onHealthChange]);

  const openSetup = useCallback(() => {
    void custom3pSetupBridge()?.openSetupWindow?.();
  }, []);

  const copyReport = useCallback(async () => {
    const report = {
      state: health.state,
      provider: health.provider,
      endpoint: health.endpoint,
      httpStatus: health.httpStatus,
      errorCode: health.errorCode,
      failingField: health.failingField,
      requestUrl: health.requestUrl,
      probedModel: health.probedModel,
      responseBody: health.responseBody,
      message: health.message,
      checkedAt: health.checkedAt,
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // ignore clipboard failures
    }
  }, [health]);

  if (dismissed || !content) return null;

  const isAlert =
    health.state === "invalid_config"
    || health.state === "auth_failed"
    || health.state === "bootstrap_error";

  return (
    <div
      className="mx-auto mb-6 w-full max-w-2xl"
      data-official-source="index-BELzQL5P.js:AQt/TQt ConfigHealth banner"
    >
      <div role={isAlert ? "alert" : "status"}>
        <div
          className="flex w-full rounded-xl p-3 gap-3 items-start text-sm border-0.5 border-warning-200 bg-warning-900 text-warning-000"
          data-color-context="warning"
        >
          <div className="h-8 ml-1 flex items-center">
            <Icon className="text-warning-000" customSize={20} name="Warning" />
          </div>
          <div className="mt-[0.35rem] ml-3 flex-1 min-w-0">
            <div className="flex flex-col gap-1.5">
              <p className="font-bold">{content.title}</p>
              <p>{content.body}</p>
              <ConfigHealthDetails health={health} text={text} />
            </div>
            <div className="mt-3">
              <div className="flex flex-wrap gap-2">
                {content.actions.map((action) => {
                  if (action === "checkAgain") {
                    return (
                      <button
                        key={action}
                        className="inline-flex items-center justify-center rounded-[0.6rem] border-0.5 border-border-300 bg-bg-000/40 px-2.5 py-1 text-xs font-medium text-warning-000 hover:bg-bg-000/60 disabled:opacity-60"
                        disabled={rechecking}
                        onClick={() => void recheck()}
                        type="button"
                      >
                        {rechecking ? text.checking : text.checkAgain}
                      </button>
                    );
                  }
                  if (action === "openSetup") {
                    return (
                      <button
                        key={action}
                        className="inline-flex items-center justify-center rounded-[0.6rem] border-0.5 border-border-300 bg-bg-000/40 px-2.5 py-1 text-xs font-medium text-warning-000 hover:bg-bg-000/60"
                        onClick={openSetup}
                        type="button"
                      >
                        {text.openSetup}
                      </button>
                    );
                  }
                  return (
                    <button
                      key={action}
                      className="inline-flex items-center justify-center rounded-[0.6rem] border-0.5 border-border-300 bg-bg-000/40 px-2.5 py-1 text-xs font-medium text-warning-000 hover:bg-bg-000/60"
                      onClick={() => void copyReport()}
                      type="button"
                    >
                      {copied ? <span aria-live="polite">{text.copied}</span> : text.copyReportForIt}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <button
            aria-label={text.dismiss}
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border-0 bg-transparent text-warning-000/80 hover:text-warning-000 hover:bg-bg-000/20"
            onClick={() => setDismissed(true)}
            type="button"
          >
            <Icon customSize={16} name="X" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Official IQt Details expander. */
function ConfigHealthDetails({
  health,
  text,
}: {
  health: ConfigHealth;
  text: CoworkConfigHealthText;
}) {
  const [open, setOpen] = useState(false);
  const rows = useMemo(
    () =>
      (
        [
          ["message", health.message],
          ["httpStatus", health.httpStatus],
          ["errorCode", health.errorCode],
          ["failingField", health.failingField],
          ["requestUrl", health.requestUrl],
          ["probedModel", health.probedModel],
          ["responseBody", health.responseBody],
          ["endpoint", health.endpoint],
          ["checkedAt", health.checkedAt],
        ] as Array<[string, string | number | undefined | null]>
      ).filter(([, value]) => value !== undefined && value !== null && value !== ""),
    [health],
  );

  if (rows.length === 0) return null;

  return (
    <div className="mt-1.5">
      <button
        aria-expanded={open}
        className="text-xs underline underline-offset-2 opacity-80 hover:opacity-100 border-0 bg-transparent p-0 text-inherit cursor-default"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {text.details}
      </button>
      {open ? (
        <pre className="mt-1.5 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded bg-bg-000/40 p-2 font-mono text-xs">
          {rows.map(([key, value]) => `${key}: ${value}`).join("\n")}
        </pre>
      ) : null}
    </div>
  );
}
