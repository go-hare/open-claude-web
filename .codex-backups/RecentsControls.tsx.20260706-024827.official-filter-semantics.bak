import { useMemo } from "react";
import type { SessionSummary } from "../adapters/desktopBridge";
import { type ShellText, useShellText } from "../i18n/shellMessages";
import type { DFrameGroupBy, DFrameSortBy, FrameMode } from "../stores/frameStore";
import { BaseMenuItem, BaseMenuPopup, BaseMenuSeparator, BaseSubmenu, Menu } from "./BaseMenu";
import { Icon } from "./icons";

export type RecentsFilterState = {
  status: "active" | "archived" | "all";
  selectedProjects: string[];
  environment: "all" | "local" | "remote" | "bridge";
  activityDays: "0" | "1" | "3" | "7" | "30";
  groupBy: DFrameGroupBy;
  sortBy: DFrameSortBy;
};

type DisplayGroup = { key: string; label?: string; sessions: SessionSummary[] };
type MenuKey = keyof RecentsFilterState;
type Option<T extends string> = { label: string; value: T };

type FilterRow = { kind: "row"; key: Exclude<MenuKey, "selectedProjects">; label: string; summary: string; value: string; accent?: boolean; options: Option<string>[] };
type SeparatorRow = { kind: "separator"; key: "separator" };

const triggerClassName = "df-chrome-btn relative -my-1";

export const defaultRecentsFilter: RecentsFilterState = {
  status: "active",
  selectedProjects: [],
  environment: "all",
  activityDays: "0",
  groupBy: "none",
  sortBy: "recency",
};

function statusOptions(text: ShellText): Option<RecentsFilterState["status"]>[] {
  return [
    { label: text.active, value: "active" },
    { label: text.archived, value: "archived" },
    { label: text.all, value: "all" },
  ];
}

function environmentOptions(text: ShellText): Option<RecentsFilterState["environment"]>[] {
  return [
    { label: text.local, value: "local" },
    { label: text.cloud, value: "remote" },
    { label: text.remoteControl, value: "bridge" },
    { label: text.all, value: "all" },
  ];
}

function activityOptions(text: ShellText): Option<RecentsFilterState["activityDays"]>[] {
  return [
    { label: text.oneDay, value: "1" },
    { label: text.threeDays, value: "3" },
    { label: text.sevenDays, value: "7" },
    { label: text.thirtyDays, value: "30" },
    { label: text.all, value: "0" },
  ];
}

function codeGroupOptions(text: ShellText): Option<RecentsFilterState["groupBy"]>[] {
  return [
    { label: text.date, value: "date" },
    { label: text.project, value: "project" },
    { label: text.state, value: "state" },
    { label: text.environment, value: "environment" },
    { label: text.custom, value: "custom" },
    { label: text.none, value: "none" },
  ];
}

function coworkGroupOptions(text: ShellText): Option<RecentsFilterState["groupBy"]>[] {
  return [
    { label: text.date, value: "date" },
    { label: text.none, value: "none" },
  ];
}

function sortOptions(text: ShellText): Option<RecentsFilterState["sortBy"]>[] {
  return [
    { label: text.recency, value: "recency" },
    { label: text.sortAlphabetical, value: "alpha" },
    { label: text.sortCreated, value: "created" },
  ];
}

export function RecentsControls({ mode, sessions, value, onChange }: { mode: FrameMode; sessions: SessionSummary[]; value: RecentsFilterState; onChange: (value: RecentsFilterState) => void }) {
  const text = useShellText();
  const active = isFilterActive(value);

  return (
    <Menu.Root>
      <Menu.Trigger aria-label={active ? text.filterActive : text.filter} className={triggerClassName}>
        <Icon name="Filter" />
      </Menu.Trigger>
      <BaseMenuPopup align="end" className="!min-w-[200px]" side="bottom" sideOffset={4}>
        <RecentsFilterMenu mode={mode} sessions={sessions} text={text} value={value} onChange={onChange} />
      </BaseMenuPopup>
    </Menu.Root>
  );
}

export function buildRecentsGroups(sessions: SessionSummary[], value: RecentsFilterState, text?: ShellText): DisplayGroup[] {
  const visible = sessions.filter((session) => includeSession(session, value));
  const sorted = [...visible].sort(sorterFor(value.sortBy));
  if (value.groupBy === "none") return [{ key: "all", sessions: sorted }];
  return groupByValue(sorted, value.groupBy, text);
}

function RecentsFilterMenu({ mode, sessions, text, value, onChange }: { mode: FrameMode; sessions: SessionSummary[]; text: ShellText; value: RecentsFilterState; onChange: (value: RecentsFilterState) => void }) {
  const projectOptions = useMemo(() => makeProjectOptions(sessions), [sessions]);
  const rows = makeRows(mode, value, text);
  const active = isFilterActive(value);
  const reset = () => onChange(defaultRecentsFilter);
  const update = (key: Exclude<MenuKey, "selectedProjects">, next: string) => onChange({ ...value, [key]: next } as RecentsFilterState);

  return (
    <>
      <FilterSubmenu row={rows[0] as FilterRow} onSelect={update} />
      <ProjectSubmenu options={projectOptions} selectedProjects={value.selectedProjects} text={text} onChange={(selectedProjects) => onChange({ ...value, selectedProjects })} />
      {rows.slice(1).map((row, index) => row.kind === "separator" ? <BaseMenuSeparator key={`${row.key}-${index}`} /> : <FilterSubmenu key={row.key} row={row} onSelect={update} />)}
      {active ? <><BaseMenuSeparator /><BaseMenuItem onClick={reset}>{text.clearFilters}</BaseMenuItem></> : null}
    </>
  );
}

function FilterSubmenu({ row, onSelect }: { row: FilterRow; onSelect: (key: Exclude<MenuKey, "selectedProjects">, value: string) => void }) {
  return (
    <BaseSubmenu
      popupAlign="start"
      popupSide="right"
      popupSideOffset={-4}
      trigger={
        <span className="flex w-full items-center gap-sm">
          <span className="flex-1 truncate">{row.label}</span>
          <span className={summaryClassName(row)}>{row.summary}</span>
        </span>
      }
    >
        {row.options.map((option) => <MenuOption checked={option.value === row.value} key={option.value} option={option} onSelect={() => onSelect(row.key, option.value)} />)}
    </BaseSubmenu>
  );
}

function MenuOption({ checked, keepOpen, option, onSelect }: { checked: boolean; keepOpen?: boolean; option: Option<string>; onSelect: () => void }) {
  return <BaseMenuItem checked={checked} checkedRole="radio" keepOpen={keepOpen} onClick={onSelect}>{option.label}</BaseMenuItem>;
}

function ProjectSubmenu({ options, selectedProjects, text, onChange }: { options: Option<string>[]; selectedProjects: string[]; text: ShellText; onChange: (projects: string[]) => void }) {
  const selected = useMemo(() => new Set(selectedProjects), [selectedProjects]);
  const summary = selectedProjects.length === 0 ? text.all : selectedProjects.length === 1 ? options.find((option) => option.value === selectedProjects[0])?.label ?? "1" : `${text.selectedCount} ${selectedProjects.length}`;
  const toggle = (project: string) => onChange(selected.has(project) ? selectedProjects.filter((item) => item !== project) : [...selectedProjects, project]);
  return (
    <BaseSubmenu
      popupAlign="start"
      popupClassName="max-h-[320px]"
      popupSide="right"
      popupSideOffset={-4}
      trigger={<span className="flex w-full items-center gap-sm"><span className="flex-1 truncate">{text.project}</span><span className={`shrink-0 text-footnote max-w-[100px] truncate ${selectedProjects.length > 0 ? "text-accent" : "text-muted"}`}>{summary}</span></span>}
    >
      <BaseMenuItem checked={selectedProjects.length === 0} onClick={() => onChange([])}>{text.allProjects}</BaseMenuItem>
      {options.map((option) => <BaseMenuItem checked={selected.has(option.value)} key={option.value} onClick={() => toggle(option.value)}>{option.label}</BaseMenuItem>)}
    </BaseSubmenu>
  );
}

function makeRows(mode: FrameMode, value: RecentsFilterState, text: ShellText): Array<FilterRow | SeparatorRow> {
  const groupOptions = mode === "code" ? codeGroupOptions(text) : coworkGroupOptions(text);
  return [
    row("status", text.status, value.status, statusOptions(text), value.status !== "all"),
    row("environment", text.environment, value.environment, environmentOptions(text), value.environment !== "all"),
    row("activityDays", text.lastActivity, value.activityDays, activityOptions(text), value.activityDays !== "0"),
    { kind: "separator", key: "separator" },
    row("groupBy", text.groupBy, value.groupBy, groupOptions, value.groupBy !== "none"),
    row("sortBy", text.sortBy, value.sortBy, sortOptions(text), value.sortBy !== "recency"),
  ];
}

function row<T extends string>(key: Exclude<MenuKey, "selectedProjects">, label: string, value: T, options: Option<T>[], accent: boolean): FilterRow {
  const summary = options.find((option) => option.value === value)?.label ?? value;
  return { kind: "row", key, label, value, accent, summary, options };
}

function summaryClassName(row: FilterRow) {
  const colorClass = row.accent ? "text-accent" : "text-muted";
  const truncateClass = "";
  return `shrink-0 text-footnote ${truncateClass} ${colorClass}`;
}

function makeProjectOptions(sessions: SessionSummary[]): Option<string>[] {
  const names = new Set(sessions.map((session) => projectLabel(session)).filter(Boolean));
  return [...names].sort().map((name) => ({ label: name, value: name }));
}

function includeSession(session: SessionSummary, value: RecentsFilterState) {
  return includeByStatus(session, value.status) && includeByProject(session, value.selectedProjects) && includeByEnvironment(session, value.environment) && includeByActivity(session, value.activityDays);
}

function includeByStatus(session: SessionSummary, status: RecentsFilterState["status"]) {
  const archived = Boolean(session.isArchived);
  if (status === "all") return true;
  return status === "archived" ? archived : !archived;
}

function includeByProject(session: SessionSummary, selectedProjects: string[]) {
  return selectedProjects.length === 0 || selectedProjects.includes(projectLabel(session));
}

function includeByEnvironment(session: SessionSummary, environment: RecentsFilterState["environment"]) {
  if (environment === "all") return true;
  if (environment === "bridge") return session.sessionKind === "code" && session.cwd?.startsWith("remote-control:") === true;
  return environment === "local" ? Boolean(session.cwd) : !session.cwd;
}

function includeByActivity(session: SessionSummary, days: RecentsFilterState["activityDays"]) {
  if (days === "0") return true;
  return Date.now() - session.updatedAtMs <= Number(days) * 24 * 60 * 60 * 1000;
}

function sorterFor(sortBy: RecentsFilterState["sortBy"]) {
  if (sortBy === "alpha") return (left: SessionSummary, right: SessionSummary) => left.title.localeCompare(right.title, "zh-CN");
  if (sortBy === "created") return (left: SessionSummary, right: SessionSummary) => (right.createdAtMs ?? right.updatedAtMs) - (left.createdAtMs ?? left.updatedAtMs);
  return (left: SessionSummary, right: SessionSummary) => right.updatedAtMs - left.updatedAtMs;
}

function groupByValue(sessions: SessionSummary[], groupBy: Exclude<RecentsFilterState["groupBy"], "none">, text?: ShellText) {
  const groups = new Map<string, DisplayGroup>();
  for (const session of sessions) {
    const label = groupLabel(session, groupBy, text);
    const group = groups.get(label) ?? { key: label, label, sessions: [] };
    group.sessions.push(session);
    groups.set(label, group);
  }
  return [...groups.values()];
}

function groupLabel(session: SessionSummary, groupBy: Exclude<RecentsFilterState["groupBy"], "none">, text?: ShellText) {
  if (groupBy === "project" || groupBy === "homespace") return projectLabel(session, text);
  if (groupBy === "environment") return session.cwd ? text?.local ?? "本地" : text?.cloud ?? "云端";
  if (groupBy === "state") return session.isArchived ? text?.archived ?? "已归档" : text?.active ?? "进行中";
  if (groupBy === "custom") return text?.ungrouped ?? "Ungrouped";
  return dateLabel(session.updatedAtMs, text);
}

function projectLabel(session: SessionSummary, text?: ShellText) {
  return session.repo?.name || session.cwd?.split("/").filter(Boolean).at(-1) || text?.other || "Other";
}

function dateLabel(updatedAtMs: number, text?: ShellText) {
  const age = Date.now() - updatedAtMs;
  if (age < 24 * 60 * 60 * 1000) return text?.today ?? "今天";
  if (age < 48 * 60 * 60 * 1000) return text?.yesterday ?? "昨天";
  return text?.older ?? "更早";
}

function isFilterActive(value: RecentsFilterState) {
  return value.status !== "active" || value.selectedProjects.length > 0 || value.environment !== "all" || value.activityDays !== "0" || value.groupBy !== "none" || value.sortBy !== "recency";
}
