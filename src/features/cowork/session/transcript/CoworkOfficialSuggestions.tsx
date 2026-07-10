import { Icon } from "../../../../shell/icons";
import { asRecord, stringValue, toolResultText } from "../recordUtils";
import type { CoworkContentBlock } from "./coworkMessageTypes";

type SuggestionItem = { description?: string; name: string };

export function CoworkConnectorSuggestion({ isStreaming, result, source }: { isStreaming: boolean; result?: CoworkContentBlock; source: "list_connectors" | "suggest_connectors" }) {
  const raw = result ? toolResultText(result.content) : "{}";
  const payload = parsePayload(raw);
  const items = suggestionItems(payload?.connectors);
  const loading = isStreaming || !payload && raw === "{}";
  if (source === "list_connectors" && !loading && items.length === 0) return null;
  const keyword = Array.isArray(payload?.keywords) ? stringValue(payload.keywords[0]) : undefined;
  return <ConnectorCard items={items} keyword={keyword} loading={loading} />;
}

export function CoworkPluginSuggestion({ result, source }: { result?: CoworkContentBlock; source: "list_plugins" | "suggest_plugin_install" }) {
  const payload = parsePayload(result ? toolResultText(result.content) : "");
  const items = suggestionItems(payload?.plugins);
  if (!payload || items.length === 0) return null;
  const title = stringValue(payload.contextLabel) ?? (source === "list_plugins" ? "Your installed plugins" : "Recommended plugins");
  return <SuggestionList icon="Plugin" items={items} title={title} />;
}

export function CoworkSkillSuggestion({ result, source }: { result?: CoworkContentBlock; source: "list_skills" | "suggest_skills" }) {
  const payload = parsePayload(result ? toolResultText(result.content) : "");
  const items = suggestionItems(payload?.resolved_skills ?? payload?.skills).slice(0, 5);
  if (!payload || items.length === 0) return null;
  const title = stringValue(payload.contextLabel ?? payload.context_label) ?? (source === "suggest_skills" ? "Skills you can add" : "Your skills");
  return <SuggestionList icon="Book" items={items} title={title} />;
}

function ConnectorCard({ items, keyword, loading }: { items: SuggestionItem[]; keyword?: string; loading: boolean }) {
  return (
    <div className="font-ui overflow-hidden my-3 rounded-2xl border border-border-300 bg-bg-000 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b-0.5 border-border-300">
        <div className="flex items-center gap-3 min-w-0"><Icon className="text-text-300 flex-shrink-0" customSize={20} name="Connectors" />{loading ? <Skeleton height={16} width={160} /> : <div className="text-sm text-text-100 truncate">{keyword && items.length ? `For your ${keyword}` : "Connectors that could help"}</div>}</div>
      </div>
      {loading ? <ConnectorSkeletonRows /> : items.length ? <div className="max-h-96 overflow-y-auto">{items.map((item) => <SuggestionRow icon="Connectors" item={item} key={item.name} />)}</div> : <div className="px-4 py-3 text-sm text-text-400">I didn't find a matching connector, but you can browse all connectors.</div>}
    </div>
  );
}

function ConnectorSkeletonRows() {
  return <div>{[1, 2].map((item) => <div className="flex items-center gap-3 p-4" key={item}><Skeleton height={36} width={36} /><div className="flex-1 space-y-1"><Skeleton height={16} width={96} /><Skeleton height={12} width={160} /></div><Skeleton height={36} width={80} /></div>)}</div>;
}

function SuggestionList({ icon, items, title }: { icon: string; items: SuggestionItem[]; title: string }) {
  return (
    <div className="my-3 overflow-hidden rounded-2xl border border-border-300 bg-bg-000 font-ui shadow-[0_4px_20px_0_hsl(var(--always-black)/4%)]">
      <div className="flex h-11 items-center gap-2 border-b-0.5 border-border-300 px-4"><span className="shrink-0 text-text-300 [&_svg]:size-5"><Icon customSize={20} name={icon} /></span><div className="min-w-0 flex-1 truncate text-sm text-text-100">{title}</div></div>
      <div className="max-h-96 overflow-y-auto">{items.map((item) => <SuggestionRow icon={icon} item={item} key={item.name} />)}</div>
    </div>
  );
}

function SuggestionRow({ icon, item }: { icon: string; item: SuggestionItem }) {
  return <div className="flex items-center gap-3 p-4 hover:bg-bg-200 transition-colors duration-150"><div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-bg-200"><Icon customSize={18} name={icon} /></div><div className="min-w-0 flex-1"><div className="font-semibold text-sm text-text-100">{item.name}</div>{item.description ? <div className="text-xs text-text-400 truncate">{item.description}</div> : null}</div></div>;
}

function Skeleton({ height, width }: { height: number; width: number }) {
  return <div className="relative bg-bg-400 overflow-hidden after:absolute after:inset-0 after:translate-x-[-100%] after:bg-gradient-to-r after:from-bg-000/0 after:from-0% after:via-bg-000/20 after:via-50% after:to-100% after:to-bg-000/0 after:animate-[shimmer_1.5s_infinite] rounded-md" style={{ height, width }}><span className="sr-only">Loading...</span></div>;
}

function parsePayload(value: string) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? asRecord(parsed) : null;
  } catch {
    return null;
  }
}

function suggestionItems(value: unknown): SuggestionItem[] {
  return (Array.isArray(value) ? value : []).flatMap((item) => {
    if (typeof item === "string") return [{ name: item }];
    const record = asRecord(item);
    const name = stringValue(record.name) ?? stringValue(record.pluginName);
    return name ? [{ name, description: stringValue(record.description) }] : [];
  });
}
