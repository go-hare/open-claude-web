import { useMemo } from "react";
import {
  type I18nMessages,
  type MessageDescriptor,
  useCurrentLocale,
  useI18nMessages,
} from "../../../i18n/footerMenuMessages";

/**
 * Official index-BELzQL5P TQt / AQt / IQt copy for ConfigHealth banner.
 */
export const COWORK_CONFIG_HEALTH_MESSAGES = {
  configuredModelNotAvailable: {
    defaultMessage: "Configured model not available",
    id: "F3+47beVFp",
  },
  gatewayCouldntServe: {
    defaultMessage:
      "Your gateway couldn't serve {model}. This model may not be configured on your gateway, or access may be restricted.",
    id: "ha5HbvlDOk",
  },
  checkAgain: { defaultMessage: "Check again", id: "1A8Z/lz1lp" },
  checking: { defaultMessage: "Checking…", id: "PfxzLvm3Da" },
  openSetup: { defaultMessage: "Open Setup", id: "ne5uHhIPyk" },
  details: { defaultMessage: "Details", id: "Lv0zJuL1jH" },
  dismiss: { defaultMessage: "Dismiss", id: "TDaF6JVgG6" },
  copied: { defaultMessage: "Copied", id: "p556q3uvbn" },
  copyReportForIt: { defaultMessage: "Copy report for IT", id: "QUbwO4nVxX" },
  yourProvider: { defaultMessage: "your provider", id: "60YXvmzIxf" },
  theProviderEndpoint: { defaultMessage: "the provider endpoint", id: "lI6dUVuWZk" },
  configSyncIssue: { defaultMessage: "Configuration sync issue", id: "h18LHY6fif" },
  configSyncBody: {
    defaultMessage: "Couldn't fetch your organization's configuration. Open Setup to see details and sign in.",
    id: "9rJhEHELoO",
  },
  configCantBeUsed: { defaultMessage: "Configuration can't be used", id: "vauCKKwFnN" },
  configCantBeUsedBody: {
    defaultMessage:
      "An administrator configured Cowork with settings we can't use. You won't be able to start tasks until your IT team fixes it.",
    id: "H7bR0gWKKj",
  },
  providerSetupNeedsFix: { defaultMessage: "Your provider setup needs a fix", id: "c9fsVL9wrY" },
  providerSetupNeedsFixBody: {
    defaultMessage: "Some required fields are missing or malformed. Open Setup to finish configuring it.",
    id: "2/wYS2KHSQ",
  },
  couldntSignIn: { defaultMessage: "Couldn't sign in to {provider}", id: "W7aIoUd18K" },
  authFailedManagedBody: {
    defaultMessage:
      "The provider rejected the credentials IT configured. This usually means an expired key or wrong region.",
    id: "sCm5gNAcvf",
  },
  authFailedLocalBody: {
    defaultMessage: "The provider rejected your credentials. Re-enter them in Setup.",
    id: "BRcD7K7M3Y",
  },
  cantReachHost: { defaultMessage: "Can't reach {host}", id: "Uj5zPEHmrp" },
  unreachableManagedBody: {
    defaultMessage:
      "The provider didn't respond. Check your network or VPN. If the issue persists, your IT team may need to allowlist the host.",
    id: "sPuACPwqmi",
  },
  unreachableLocalBody: {
    defaultMessage: "The provider didn't respond. Check your network or VPN, then try again.",
    id: "4zOvK89/in",
  },
  providerReturnedError: { defaultMessage: "{provider} returned an error", id: "AFXhwydbvF" },
  providerErrorManagedBody: {
    defaultMessage:
      "Your connection works, but the provider rejected a test request. This is often a model-access or quota issue your admin can resolve.",
    id: "omq6PdW3ff",
  },
  providerErrorLocalBody: {
    defaultMessage:
      "Your connection works, but the provider rejected a test request. Often a model-access or quota issue.",
    id: "znCeYD3m6L",
  },
} as const satisfies Record<string, MessageDescriptor>;

export type CoworkConfigHealthText = Record<keyof typeof COWORK_CONFIG_HEALTH_MESSAGES, string>;

export function useCoworkConfigHealthText(): CoworkConfigHealthText {
  const locale = useCurrentLocale();
  const messages = useI18nMessages(locale);
  return useMemo(() => buildCoworkConfigHealthText(messages ?? {}), [messages]);
}

export function buildCoworkConfigHealthText(messages: I18nMessages): CoworkConfigHealthText {
  return Object.fromEntries(
    Object.entries(COWORK_CONFIG_HEALTH_MESSAGES).map(([key, descriptor]) => [
      key,
      messages[descriptor.id] ?? descriptor.defaultMessage,
    ]),
  ) as CoworkConfigHealthText;
}

export function formatCoworkConfigHealthMessage(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? `{${key}}`);
}
