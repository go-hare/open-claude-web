import { useCallback, useId, useMemo, useState, useSyncExternalStore } from "react";
import { Menu } from "@base-ui-components/react/menu";
import { BaseMenuItem, BaseMenuPopup } from "../../../shell/BaseMenu";
import { Icon } from "../../../shell/icons";
import { officialButtonClass } from "../../shared/buttonClasses";
import { SegmentedControl } from "../../settings/SettingsControls";
import type { ConnectorListItem } from "./connectorTypes";
import {
  GROUP_PERMISSION_ICONS,
  TOOL_PERMISSION_ICONS,
  TOOL_PERMISSION_LABELS,
  TOOL_PERMISSIONS,
  groupPermissionForTools,
  permissionForTool,
  setToolsPermission,
  subscribeConnectorToolPermissions,
  getConnectorToolPermissionBag,
  type ConnectorToolRef,
  type ToolPermission,
} from "./connectorToolPermissionStore";

/**
 * Official index-BELzQL5P lXt / cXt / dXt / pXt / mXt / wXt / XD.
 * Direct MCP tools have no annotation groups — unspecified = Other tools.
 */
export function ConnectorToolPermissions({ item }: { item: ConnectorListItem }) {
  const headingId = useId();
  const tools = item.tools ?? [];
  if (tools.length === 0) return null;

  const refs: ConnectorToolRef[] = tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    displayName: tool.displayName,
    serverName: item.serverName || item.name,
  }));

  return (
    <section aria-labelledby={headingId} className="flex flex-col">
      <div className="flex items-start justify-between gap-2" id={headingId}>
        <div className="flex flex-col w-full gap-2">
          <legend className="font-base-bold text-text-100">Tool permissions</legend>
          <p className="font-base text-text-500">Choose when Claude is allowed to use these tools.</p>
        </div>
      </div>
      <ConnectorToolGroup title="Other tools" tools={refs} />
    </section>
  );
}

function ConnectorToolGroup({ title, tools }: { title: string; tools: ConnectorToolRef[] }) {
  useSyncExternalStore(
    subscribeConnectorToolPermissions,
    getConnectorToolPermissionBag,
    getConnectorToolPermissionBag,
  );
  const groupId = useId();
  const [expanded, setExpanded] = useState(true);
  const [customOverride, setCustomOverride] = useState(false);
  const derived = groupPermissionForTools(tools);
  const current: ToolPermission | "custom" = customOverride ? "custom" : derived;

  const onSelectGroup = useCallback(
    (next: ToolPermission | "custom") => {
      setCustomOverride(next === "custom");
      if (next !== "custom") setToolsPermission(tools, next);
      if (next === "custom" && !expanded) setExpanded(true);
    },
    [expanded, tools],
  );

  return (
    <div
      aria-labelledby={groupId}
      className="flex flex-col w-full border-b border-border-300/15 last:border-b-0"
      role="group"
    >
      <div className="flex gap-2.5 items-center py-2 px-0">
        <button
          aria-expanded={expanded}
          className="flex gap-2.5 items-center flex-1 min-w-0"
          onClick={() => setExpanded((open) => !open)}
          type="button"
        >
          <span
            className={`shrink-0 text-text-300 transition-transform duration-200 ${expanded ? "rotate-0" : "-rotate-90"}`}
          >
            <Icon customSize={14} name="CaretDown" />
          </span>
          <span className="text-sm font-normal text-text-100" id={groupId}>
            {title}
          </span>
          <span className="inline-flex items-center align-middle leading-tight flex-shrink-0 bg-gradient-to-bl from-bg-500/30 to-bg-500/70 text-text-300 h-4 px-1 rounded text-[0.625rem]">
            {tools.length}
          </span>
        </button>
        <GroupPermissionDropdown current={current} onSelect={onSelectGroup} />
      </div>
      {expanded
        ? tools.map((tool) => <ConnectorToolRow key={tool.name} describedBy={groupId} tool={tool} />)
        : null}
    </div>
  );
}

/** Official pXt — uO secondary dropdown allow|ask|blocked|custom. */
function GroupPermissionDropdown({
  current,
  onSelect,
}: {
  current: ToolPermission | "custom";
  onSelect: (value: ToolPermission | "custom") => void;
}) {
  const items: Array<ToolPermission | "custom"> = [...TOOL_PERMISSIONS, "custom"];
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="Blanket permission for group"
        className={officialButtonClass({ variant: "secondary", size: "sm" })}
      >
        <span className="inline-flex items-center gap-1.5">
          <Icon customSize={16} name={GROUP_PERMISSION_ICONS[current]} />
          {TOOL_PERMISSION_LABELS[current]}
        </span>
      </Menu.Trigger>
      <BaseMenuPopup align="end" side="bottom" sideOffset={4}>
        {items.map((value) => (
          <BaseMenuItem
            checked={value === current}
            checkedRole="radio"
            icon={GROUP_PERMISSION_ICONS[value]}
            key={value}
            onClick={() => onSelect(value)}
          >
            {TOOL_PERMISSION_LABELS[value]}
          </BaseMenuItem>
        ))}
      </BaseMenuPopup>
    </Menu.Root>
  );
}

/** Official mXt — name + XD allow/ask/blocked. */
function ConnectorToolRow({ describedBy, tool }: { describedBy: string; tool: ConnectorToolRef }) {
  const labelId = useId();
  const permission = permissionForTool(tool);
  const label = tool.displayName || tool.name;
  const options = useMemo(
    () =>
      TOOL_PERMISSIONS.map((value) => ({
        value,
        icon: TOOL_PERMISSION_ICONS[value],
        tooltip: TOOL_PERMISSION_LABELS[value],
      })),
    [],
  );

  return (
    <div
      aria-describedby={describedBy}
      aria-labelledby={labelId}
      className="flex gap-4 items-center min-h-14 py-2 ps-6 border-b border-border-300/15 last:border-b-0"
      role="group"
    >
      <div className={`flex-1 flex flex-col min-w-0 ${permission === "blocked" ? "opacity-50" : ""}`}>
        <span className="text-sm font-normal text-text-300" id={labelId}>
          {label}
        </span>
      </div>
      <SegmentedControl
        ariaLabel={label}
        onChange={(value) => setToolsPermission([tool], value as ToolPermission)}
        options={options}
        value={permission}
      />
    </div>
  );
}
