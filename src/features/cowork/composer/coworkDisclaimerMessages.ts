/**
 * Official composer disclaimer residual (index-BELzQL5P data-disclaimer):
 * - Hz3uf5n9Ga base (no feedback window)
 * - JyEEg0ExZX + aQPexOUJ+Y when openFeedbackWindow present
 *
 * Catalog lookup via spa /i18n/{locale}.json (+ overrides); never hardcode EN in UI.
 */
import { useMemo } from "react";
import {
  type I18nMessages,
  type MessageDescriptor,
  useCurrentLocale,
  useI18nMessages,
} from "../../../i18n/footerMenuMessages";

export const COWORK_DISCLAIMER_MESSAGES = {
  base: {
    defaultMessage: "Claude is AI and can make mistakes. Please double-check responses.",
    id: "Hz3uf5n9Ga",
  },
  withFeedback: {
    defaultMessage:
      "Claude is AI and can make mistakes. Please double-check responses. {giveFeedback}",
    id: "JyEEg0ExZX",
  },
  giveFeedback: {
    defaultMessage: "Give us feedback",
    id: "aQPexOUJ+Y",
  },
} as const satisfies Record<string, MessageDescriptor>;

export type CoworkDisclaimerText = Record<keyof typeof COWORK_DISCLAIMER_MESSAGES, string>;

export function buildCoworkDisclaimerText(messages: I18nMessages): CoworkDisclaimerText {
  return Object.fromEntries(
    Object.entries(COWORK_DISCLAIMER_MESSAGES).map(([key, descriptor]) => [
      key,
      messages[descriptor.id] ?? descriptor.defaultMessage,
    ]),
  ) as CoworkDisclaimerText;
}

export function useCoworkDisclaimerText(): CoworkDisclaimerText {
  const locale = useCurrentLocale();
  const messages = useI18nMessages(locale);
  return useMemo(() => buildCoworkDisclaimerText(messages ?? {}), [messages]);
}

/**
 * Official ICU residual for JyEEg0ExZX: embed feedback CTA at `{giveFeedback}`.
 * Fallback when catalog omits the placeholder: base + trailing CTA.
 */
export function splitDisclaimerFeedbackTemplate(template: string): {
  before: string;
  after: string;
} {
  const token = "{giveFeedback}";
  const index = template.indexOf(token);
  if (index < 0) {
    return { before: template.trimEnd() + (template.endsWith(" ") ? "" : " "), after: "" };
  }
  return {
    before: template.slice(0, index),
    after: template.slice(index + token.length),
  };
}
