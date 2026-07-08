import { useEffect, useMemo, useState } from "react";
import { Tabs } from "@base-ui-components/react/tabs";
import { desktopBridge, type CodeStats } from "../../adapters/desktopBridge";
import { modelLabel } from "./composer/options";
import {
  buildCodeStatsDisplay,
  buildHeatmapDates,
  formatNumber,
  tokenReferenceFor,
  type CodeStatsDisplay,
  type CodeStatsRange,
  type ModelUsageDisplay,
} from "./codeStatsDisplay";

export function CodeStatsCard() {
  const [stats, setStats] = useState<CodeStats | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [view, setView] = useState<"overview" | "models">("overview");
  const [range, setRange] = useState<CodeStatsRange>("all");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void desktopBridge.LocalSessions.getCodeStats?.().then((nextStats) => {
      if (alive) setStats(nextStats);
    }).finally(() => {
      if (alive) setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const display = useMemo(() => buildCodeStatsDisplay(stats, range), [range, stats]);
  if (isLoading || !stats) return <CodeStatsSkeletonCard />;

  return (
    <div className="flex flex-col gap-[20px] p-[12px] pt-[8px] rounded-r6 bg-t1 max-w-[480px]">
      <div className="flex items-center gap-g4 min-w-0">
        <SegmentedTabs items={[{ label: "概览", value: "overview" }, { label: "模型", value: "models" }]} onValueChange={(value) => setView(value === "models" ? "models" : "overview")} value={view} />
        <span className="flex-1" />
        <SegmentedTabs items={[{ label: "全部", value: "all" }, { label: "30天", value: "30d" }, { label: "7天", value: "7d" }]} onValueChange={(value) => setRange(value === "7d" ? "7d" : value === "30d" ? "30d" : "all")} value={range} />
      </div>
      <div className="flex flex-col gap-g5">
        {view === "models" ? <ModelUsagePanel modelUsage={display.modelUsage} /> : <CodeStatsOverview display={display} />}
      </div>
    </div>
  );
}

function CodeStatsSkeletonCard() {
  return (
    <div className="flex flex-col gap-[20px] p-[12px] pt-[8px] rounded-r6 bg-t1 max-w-[480px] animate-pulse" aria-busy="true">
      <div className="flex items-center gap-g4 min-w-0"><div className="h-small w-[120px] rounded-r3 bg-t2" /><span className="flex-1" /><div className="h-small w-[100px] rounded-r3 bg-t2" /></div>
      <div className="flex flex-col gap-g5"><div className="grid grid-cols-4 gap-g3">{Array.from({ length: 8 }, (_, index) => <div className="h-[44px] rounded-r4 bg-t2" key={index} />)}</div><div className="h-[120px] rounded-r1 bg-t2" /><div className="h-[12px] w-[240px] rounded-r2 bg-t2 mt-[4px]" /></div>
    </div>
  );
}

function SegmentedTabs<T extends string>({ items, onValueChange, value }: { items: Array<{ label: string; value: T }>; onValueChange: (value: T) => void; value: T }) {
  return (
    <Tabs.Root value={value} onValueChange={(nextValue) => onValueChange(nextValue as T)}>
      <Tabs.List aria-label={items.map((item) => item.label).join(" / ")} className="inline-flex items-center gap-g1">
        {items.map((item) => {
          const selected = item.value === value;
          return (
            <Tabs.Tab className="group/tab relative isolate inline-flex items-center justify-center border-0 outline-none bg-transparent cursor-default select-none hide-focus-ring ring-focus text-uncontained-default hover:text-uncontained-hover disabled:text-uncontained-disabled data-[selected]:text-[var(--text-uncontained-selected)] h-small px-p6 gap-g3 rounded-r3 text-footnote" data-selected={selected || undefined} key={item.value} type="button" value={item.value}>
              <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] bg-fill-uncontained-default group-hover/tab:bg-fill-uncontained-hover group-disabled/tab:bg-fill-uncontained-disabled group-data-[selected]/tab:bg-t2" />
              <span>{item.label}</span>
            </Tabs.Tab>
          );
        })}
      </Tabs.List>
    </Tabs.Root>
  );
}

function CodeStatsOverview({ display }: { display: CodeStatsDisplay }) {
  return (
    <>
      <div className="grid grid-cols-4 gap-g3">
        <StatTile label="会话数" value={display.sessions} /><StatTile label="消息数" value={display.messages} /><StatTile label="总 Tokens" value={display.tokens} /><StatTile label="活跃天数" value={display.activeDays} />
        <StatTile label="当前连续天数" value={display.currentStreak} /><StatTile label="最长连续天数" value={display.longestStreak} /><StatTile label="高峰时段" value={display.peakHour} /><StatTile label="最常用模型" value={display.favoriteModel} small />
      </div>
      <Heatmap dailyActivity={display.dailyActivity} />
      <TokenReferenceText totalTokens={display.totalTokens} />
    </>
  );
}

function StatTile({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return <div className="flex flex-col gap-g1 p-p3 rounded-r4 bg-t2"><span className="text-footnote text-t6 truncate">{label}</span><span className={`tabular-nums text-t9 truncate ${small ? "text-footnote" : "text-body-semibold"}`}>{value}</span></div>;
}

function Heatmap({ dailyActivity }: { dailyActivity: CodeStats["dailyActivity"] }) {
  const activityByDate = useMemo(() => new Map(dailyActivity.map((entry) => [entry.date, entry.messageCount])), [dailyActivity]);
  const maxActivity = Math.max(0, ...activityByDate.values());
  const weeks = useMemo(() => buildHeatmapDates(), []);
  return (
    <div role="img" aria-label="Daily activity heatmap" className="flex gap-[3px] w-full">
      {weeks.map((week, weekIndex) => <div className="flex flex-col gap-[3px] flex-1 min-w-0" key={weekIndex}>{week.map(({ date, future }) => {
        if (future) return <div className="aspect-square rounded-r1" key={date} />;
        const activity = activityByDate.get(date) ?? 0;
        const ratio = maxActivity === 0 ? 0 : activity / maxActivity;
        const lightness = ratio === 0 ? null : 80 - Math.ceil(ratio * 4) * 8;
        return <div className="aspect-square rounded-r1 bg-t2" key={date} style={lightness === null ? undefined : { backgroundColor: `hsl(217 70% ${lightness}%)` }} />;
      })}</div>)}
    </div>
  );
}

function ModelUsagePanel({ modelUsage }: { modelUsage: ModelUsageDisplay }) {
  if (modelUsage.length === 0) return <div className="flex min-h-[128px] items-center justify-center rounded-r4 bg-t2 text-body text-t6">No model usage yet.</div>;
  return <div className="flex flex-col gap-g3">{modelUsage.map((usage) => <div className="grid grid-cols-[1fr_auto] gap-g4 rounded-r4 bg-t2 p-p3" key={usage.model}><span className="truncate text-body text-t9">{modelLabel(usage.model)}</span><span className="tabular-nums text-body-semibold text-t9">{usage.tokens}</span><span className="text-footnote text-t6">Input {usage.input}</span><span className="text-footnote text-t6">Output {usage.output}</span></div>)}</div>;
}

function TokenReferenceText({ totalTokens }: { totalTokens: number }) {
  const reference = useMemo(() => tokenReferenceFor(totalTokens), [totalTokens]);
  if (!reference) return null;
  const times = Math.floor(totalTokens / reference.tokens);
  return <span className="text-caption text-t6 pt-[4px]">{times >= 2 ? <>你使用的 Tokens 大约是 {reference.title} 的 {formatNumber(times)} 倍。</> : <>你使用的 Tokens 大约和 {reference.title} 一样多。</>}</span>;
}
