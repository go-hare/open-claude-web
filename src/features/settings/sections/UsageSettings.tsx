/**
 * Official Usage page W (c71860c77-29nOu6oI.js).
 * Query `["custom3p-usage-summary", days]` → Custom3pUsage.getSummary(days).
 * Fallback: LocalSessions.getCodeStats mapped onto the Code surface only
 * (no invent of Chat/Cowork token tables or 1p billing).
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { desktopBridge } from "../../../adapters/desktopBridge";
import { useI18nText, type MessageDescriptors } from "../../../i18n/footerMenuMessages";
import { SegmentedControl } from "../SettingsControls";
import {
  custom3pUsageBridge,
  type Custom3pUsageBar,
  type Custom3pUsageSummary,
  type Custom3pUsageSurface,
} from "../settingsDesktopBridge";

const USAGE_MESSAGES = {
  chat: { defaultMessage: "Chat", id: "WTrOy36sdu" },
  cowork: { defaultMessage: "Cowork", id: "+MH0VdRCHz" },
  code: { defaultMessage: "Code", id: "h2vipunVVd" },
  tokensPerDay: { defaultMessage: "Tokens per day", id: "aPPYuKQ5If" },
  tokensPerWeek: { defaultMessage: "Tokens per week", id: "XmoFtBj/Um" },
  tokensByTab: {
    defaultMessage: "Input and output tokens by tab, last {days} days",
    id: "Nj/DoxqwbR",
  },
  inputPlusOutput: { defaultMessage: "input + output tokens", id: "ClSk6cFhAb" },
  webSearches: {
    defaultMessage: "{searches, plural, one {# web search} other {# web searches}}",
    id: "g7jGYqiRbd",
  },
  onThisDevice: {
    defaultMessage: "Token usage on this device across Chat, Cowork, and Code.",
    id: "0+Aj0ugFBR",
  },
  onThisDeviceNoCost: {
    defaultMessage:
      "Token usage on this device across Chat, Cowork, and Code. Costs aren’t shown — your organization is billed at its own provider rates.",
    id: "51DhvTY0YH",
  },
  timeRange: { defaultMessage: "Time range", id: "74vgSJLU7n" },
  daysN: { defaultMessage: "{days}d", id: "sSynIO3ThU" },
  couldntLoad: { defaultMessage: "Couldn’t load usage", id: "dTBTl5fGS7" },
  restartAndTry: { defaultMessage: "Restart the app and try again.", id: "ICdjEiB9jt" },
  noUsageYet: { defaultMessage: "No usage yet", id: "nGZEz6M5RL" },
  noUsageYetDescription: {
    defaultMessage: "Once you use Chat, Cowork, or Code on this device, token usage will show up here.",
    id: "NNcFW0Jd7l",
  },
  tokenLimit: { defaultMessage: "Token limit", id: "HOkdCgNnub" },
  usedOfCap: { defaultMessage: "{used} of {cap} tokens used", id: "G2opnDc87H" },
  capWindow: {
    defaultMessage: "Set by your organization for a {hours}-hour window. Counts input and output tokens.",
    id: "H2ou3q/uTg",
  },
} as const satisfies MessageDescriptors;

const WINDOW_DAYS = [7, 30, 90] as const;
const SURFACE_KEYS = ["chat", "cowork", "code"] as const;
type SurfaceKey = (typeof SURFACE_KEYS)[number];
const SURFACE_FILL: Record<SurfaceKey, string> = {
  chat: "bg-fill-accent",
  cowork: "bg-fill-secondary",
  code: "bg-fill-primary",
};

const emptySurface = (): Custom3pUsageSurface => ({
  inputTokens: 0,
  outputTokens: 0,
  webSearchRequests: 0,
});

function compactTokens(value: number): string {
  return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function interpolate(template: string, values: Record<string, string | number>): string {
  let out = template;
  for (const [key, value] of Object.entries(values)) {
    out = out.replaceAll(`{${key}}`, String(value));
  }
  return out;
}

function formatWebSearches(template: string, searches: number): string {
  const match = /\{searches, plural, one \{([^}]*)\} other \{([^}]*)\}\}/.exec(template);
  if (!match) return interpolate(template, { searches });
  const picked = (searches === 1 ? match[1] : match[2]).replace("#", String(searches));
  return template.replace(match[0], picked);
}

export function UsageSettings() {
  const text = useI18nText(USAGE_MESSAGES);
  const [windowDays, setWindowDays] = useState(30);
  const host = custom3pUsageBridge();
  const summaryQuery = useQuery({
    queryKey: ["custom3p-usage-summary", windowDays],
    queryFn: async () => {
      if (typeof host?.getSummary === "function") {
        return (await host.getSummary(windowDays)) ?? null;
      }
      return fallbackSummaryFromCodeStats(windowDays);
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const summary = summaryQuery.data ?? null;
  const intro = summary && summary.cost ? text.onThisDevice : summary ? text.onThisDeviceNoCost : text.onThisDevice;
  const rangeOptions = WINDOW_DAYS.map((days) => ({
    value: String(days),
    label: interpolate(text.daysN, { days }),
  }));
  const header = (
    <div className="flex items-start justify-between gap-md">
      <p className="max-w-prose text-body text-secondary">{intro}</p>
      <SegmentedControl
        ariaLabel={text.timeRange}
        onChange={(value) => setWindowDays(Number(value))}
        options={rangeOptions}
        value={String(windowDays)}
      />
    </div>
  );

  if (summaryQuery.isPending) {
    return (
      <main className="flex flex-col gap-7">
        {header}
        <div className="flex flex-col gap-md">
          <div className="h-20 w-full animate-pulse rounded-card bg-alpha-1" />
          <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
            <div className="h-24 w-full animate-pulse rounded-card bg-alpha-1" />
            <div className="h-24 w-full animate-pulse rounded-card bg-alpha-1" />
            <div className="h-24 w-full animate-pulse rounded-card bg-alpha-1" />
          </div>
          <div className="h-60 w-full animate-pulse rounded-card bg-alpha-1" />
        </div>
      </main>
    );
  }

  if (summaryQuery.isError || !summary) {
    return (
      <main className="flex flex-col gap-7">
        {header}
        <UsageCallout headline={text.couldntLoad} description={text.restartAndTry} />
      </main>
    );
  }

  if (summary.turns === 0) {
    return (
      <main className="flex flex-col gap-7">
        {header}
        {summary.cap ? <TokenLimitCard cap={summary.cap} text={text} /> : null}
        <UsageCallout headline={text.noUsageYet} description={text.noUsageYetDescription} />
      </main>
    );
  }

  // Official z()+visible: show a surface if the product arm is on OR it has tokens.
  // Desktop Claudex always has Chat / Cowork / Code — match screenshot three cards.
  const visible = {
    chat: true,
    cowork: true,
    code: true,
  };
  const shown = SURFACE_KEYS.filter((key) => visible[key]);
  const gridClass =
    shown.length === 3 ? "sm:grid-cols-3" : shown.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-1";
  const labels: Record<SurfaceKey, string> = {
    chat: text.chat,
    cowork: text.cowork,
    code: text.code,
  };

  return (
    <main className="flex flex-col gap-7">
      {header}
      {summary.cap ? <TokenLimitCard cap={summary.cap} text={text} /> : null}
      <div className="flex flex-col gap-sm">
        <div className={`grid grid-cols-1 gap-md ${gridClass}`}>
          {shown.map((key) => (
            <SurfaceTotalsCard
              key={key}
              label={labels[key]}
              searchesTemplate={text.webSearches}
              subtitle={text.inputPlusOutput}
              totals={summary.surfaces[key]}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-md">
        <UsageBars
          bars={summary.bars}
          bucketDays={summary.bucketDays}
          description={interpolate(text.tokensByTab, { days: windowDays })}
          title={windowDays > 1 ? text.tokensPerWeek : text.tokensPerDay}
          visible={visible}
        />
      </div>
    </main>
  );
}

function TokenLimitCard({
  cap,
  text,
}: {
  cap: NonNullable<Custom3pUsageSummary["cap"]>;
  text: {
    capWindow: string;
    tokenLimit: string;
    usedOfCap: string;
  };
}) {
  const pct = cap.cap > 0 ? Math.min(cap.used / cap.cap, 1) : 0;
  return (
    <section className="flex flex-col gap-md rounded-card bg-surface-1 p-lg shadow-card-ring">
      <div className="flex items-baseline justify-between gap-md">
        <span className="text-body text-primary">{text.tokenLimit}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-alpha-1">
        <div className="h-full bg-fill-accent" style={{ width: `${pct * 100}%` }} />
      </div>
      <div className="flex items-baseline justify-between gap-md text-body">
        <span className="tabular-nums text-secondary">
          {interpolate(text.usedOfCap, { used: compactTokens(cap.used), cap: compactTokens(cap.cap) })}
        </span>
        <span className="text-muted tabular-nums">{Math.round(pct * 100)}%</span>
      </div>
      <p className="text-caption text-muted">{interpolate(text.capWindow, { hours: cap.windowHours })}</p>
    </section>
  );
}

function SurfaceTotalsCard({
  label,
  searchesTemplate,
  subtitle,
  totals,
}: {
  label: string;
  searchesTemplate: string;
  subtitle: string;
  totals: Custom3pUsageSurface;
}) {
  const tokens = totals.inputTokens + totals.outputTokens;
  return (
    <div className="flex flex-col gap-xs rounded-card bg-surface-1 p-lg shadow-card-ring">
      <span className="text-body text-secondary">{label}</span>
      <span className="text-heading text-primary tabular-nums">
        {compactTokens(tokens)} <span className="text-caption text-muted">{subtitle}</span>
      </span>
      <span className="text-caption text-muted tabular-nums">
        {formatWebSearches(searchesTemplate, totals.webSearchRequests)}
      </span>
    </div>
  );
}

function UsageBars({
  bars,
  bucketDays,
  description,
  title,
  visible,
}: {
  bars: Custom3pUsageBar[];
  bucketDays: number;
  description: string;
  title: string;
  visible: Record<SurfaceKey, boolean>;
}) {
  const max = Math.max(
    1,
    ...bars.map((bar) =>
      SURFACE_KEYS.reduce((sum, key) => (visible[key] ? sum + bar[key].inputTokens + bar[key].outputTokens : sum), 0),
    ),
  );
  void bucketDays;
  return (
    <div className="flex flex-col gap-md">
      <div>
        <h3 className="text-heading-medium text-primary">{title}</h3>
        <p className="text-footnote text-secondary">{description}</p>
      </div>
      <div className="flex h-[240px] items-end gap-px">
        {bars.map((bar) => {
          const parts = SURFACE_KEYS.filter((key) => visible[key]).map((key) => ({
            key,
            tokens: bar[key].inputTokens + bar[key].outputTokens,
          }));
          const total = parts.reduce((sum, part) => sum + part.tokens, 0);
          const height = `${(total / max) * 100}%`;
          return (
            <div className="flex min-w-0 flex-1 flex-col justify-end" key={bar.start} style={{ height: "100%" }}>
              <div className="flex w-full flex-col-reverse overflow-hidden rounded-sm" style={{ height }}>
                {parts.map((part) =>
                  part.tokens > 0 ? (
                    <div
                      className={SURFACE_FILL[part.key]}
                      key={part.key}
                      style={{ height: `${(part.tokens / Math.max(total, 1)) * 100}%` }}
                    />
                  ) : null,
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UsageCallout({ description, headline }: { description: string; headline: string }) {
  return (
    <div className="flex flex-col gap-sm rounded-card bg-surface-1 p-lg shadow-card-ring">
      <p className="text-heading-medium text-primary">{headline}</p>
      <p className="text-body text-secondary">{description}</p>
    </div>
  );
}

async function fallbackSummaryFromCodeStats(windowDays: number): Promise<Custom3pUsageSummary> {
  const stats = await desktopBridge.LocalSessions.getCodeStats?.();
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (windowDays - 1));
  const daily = (stats?.dailyModelTokens ?? []).filter((entry) => {
    const date = new Date(`${entry.date}T00:00:00`);
    return !Number.isNaN(date.getTime()) && date >= cutoff;
  });
  const byDate = new Map<string, number>();
  for (const entry of daily) {
    const tokens = Object.values(entry.tokensByModel).reduce((sum, value) => sum + value, 0);
    byDate.set(entry.date, (byDate.get(entry.date) ?? 0) + tokens);
  }
  const bars: Custom3pUsageBar[] = [];
  const cursor = new Date(cutoff);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  while (cursor <= today) {
    const start = localDateKey(cursor);
    const tokens = byDate.get(start) ?? 0;
    bars.push({
      start,
      chat: emptySurface(),
      cowork: emptySurface(),
      code: { inputTokens: tokens, outputTokens: 0, webSearchRequests: 0 },
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  const codeTokens = bars.reduce((sum, bar) => sum + bar.code.inputTokens, 0);
  return {
    bars,
    bucketDays: 1,
    cap: null,
    cost: null,
    surfaces: {
      chat: emptySurface(),
      cowork: emptySurface(),
      code: { inputTokens: codeTokens, outputTokens: 0, webSearchRequests: 0 },
    },
    turns: codeTokens > 0 ? 1 : 0,
  };
}

function localDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
