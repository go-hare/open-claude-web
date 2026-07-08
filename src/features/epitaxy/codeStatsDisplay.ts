import type { CodeStats } from "../../adapters/desktopBridge";
import { modelLabel } from "./composer/options";

export type CodeStatsRange = "all" | "30d" | "7d";
export type ModelUsageDisplay = Array<{ input: string; model: string; output: string; tokens: string; totalTokens: number }>;
export type CodeStatsDisplay = ReturnType<typeof buildCodeStatsDisplay>;

export function buildCodeStatsDisplay(stats: CodeStats | null, range: CodeStatsRange) {
  const dailyActivity = filterStatsByRange(stats?.dailyActivity ?? [], range);
  const dailyModelTokens = filterStatsByRange(stats?.dailyModelTokens ?? [], range);
  const modelTotals = modelTokensFromDaily(dailyModelTokens);
  const modelUsage = Object.entries(stats?.modelUsage ?? {})
    .map(([model, usage]) => {
      const totalTokens = usage.inputTokens + usage.outputTokens + usage.cacheReadInputTokens + usage.cacheCreationInputTokens;
      return {
        input: formatCompactNumber(usage.inputTokens + usage.cacheReadInputTokens + usage.cacheCreationInputTokens),
        model,
        output: formatCompactNumber(usage.outputTokens),
        tokens: formatCompactNumber(totalTokens),
        totalTokens,
      };
    })
    .filter((usage) => usage.totalTokens > 0)
    .sort((left, right) => right.totalTokens - left.totalTokens);
  const fallbackTotalTokens = modelUsage.reduce((total, usage) => total + usage.totalTokens, 0);
  const totalTokens = sumRecordValues(modelTotals) || fallbackTotalTokens;
  const favoriteModel = topModelLabel(modelTotals) ?? modelLabel(modelUsage[0]?.model ?? "-");

  return {
    activeDays: formatNumber(dailyActivity.length),
    currentStreak: `${stats?.streaks.currentStreak ?? 0}d`,
    dailyActivity,
    favoriteModel,
    longestStreak: `${stats?.streaks.longestStreak ?? 0}d`,
    messages: formatNumber(dailyActivity.reduce((total, entry) => total + entry.messageCount, 0)),
    modelUsage,
    peakHour: typeof stats?.peakActivityHour === "number" ? `${stats.peakActivityHour}时` : "-",
    sessions: formatNumber(dailyActivity.reduce((total, entry) => total + entry.sessionCount, 0)),
    totalTokens,
    tokens: formatCompactNumber(totalTokens),
  };
}

export function buildHeatmapDates() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setDate(today.getDate() + (6 - today.getDay()));
  const start = new Date(end);
  start.setDate(end.getDate() - 181);
  return Array.from({ length: 26 }, (_, week) => Array.from({ length: 7 }, (_, day) => {
    const date = new Date(start);
    date.setDate(start.getDate() + week * 7 + day);
    return { date: toDateKey(date), future: date > today };
  }));
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

export function formatCompactNumber(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value >= 1_000_000) return `${trimFixed(value / 1_000_000)}M`;
  if (value >= 1_000) return `${trimFixed(value / 1_000)}K`;
  return formatNumber(Math.round(value));
}

export function tokenReferenceFor(totalTokens: number) {
  const references = [
    { title: "The Little Prince", tokens: 22_000 },
    { title: "Animal Farm", tokens: 39_000 },
    { title: "The Great Gatsby", tokens: 62_000 },
    { title: "Harry Potter and the Philosopher's Stone", tokens: 103_000 },
    { title: "The Hobbit", tokens: 123_000 },
    { title: "Pride and Prejudice", tokens: 156_000 },
    { title: "Dune", tokens: 244_000 },
    { title: "Moby-Dick", tokens: 268_000 },
    { title: "The Lord of the Rings", tokens: 576_000 },
    { title: "War and Peace", tokens: 730_000 },
  ];
  const eligible = references.filter((reference) => totalTokens >= reference.tokens);
  return eligible[eligible.length - 1] ?? null;
}

function filterStatsByRange<T extends { date: string }>(items: T[], range: CodeStatsRange): T[] {
  if (range === "all") return items;
  const days = range === "7d" ? 7 : 30;
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (days - 1));
  return items.filter((item) => {
    const value = new Date(`${item.date}T00:00:00`);
    return !Number.isNaN(value.getTime()) && value >= cutoff;
  });
}

function modelTokensFromDaily(items: CodeStats["dailyModelTokens"]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const item of items) {
    for (const [model, tokens] of Object.entries(item.tokensByModel)) totals[model] = (totals[model] ?? 0) + tokens;
  }
  return totals;
}

function topModelLabel(modelTotals: Record<string, number>) {
  const top = Object.entries(modelTotals).sort((left, right) => right[1] - left[1])[0]?.[0];
  return top ? modelLabel(top) : null;
}

function sumRecordValues(record: Record<string, number>) {
  return Object.values(record).reduce((total, value) => total + value, 0);
}

function toDateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function trimFixed(value: number) {
  return value.toFixed(value >= 10 ? 1 : 2).replace(/\.0+$/, "").replace(/(\.\d)0$/, "$1");
}
