import { asRecord, stringValue } from "../recordUtils";
import type {
  CoworkAssistantSequenceItem,
  CoworkContentBlock,
  CoworkContentSegment,
  CoworkMessageSegment,
  CoworkTimelineSegment,
} from "./coworkMessageTypes";

const organizationTools = new Set([
  "get_organization_settings", "update_organization_settings", "list_organization_members",
  "get_allowed_invite_domains", "update_allowed_invite_domains", "search_organization_members",
  "invite_organization_member", "update_organization_member_role", "remove_organization_member",
  "list_pending_admin_requests", "dismiss_admin_request", "approve_join_request", "list_groups",
  "create_group", "update_group", "delete_group", "list_group_members", "add_group_member",
  "remove_group_member", "get_org_overage_limit", "get_member_overage_limit", "set_member_overage_limit",
  "get_group_spend_limits", "get_billing_status", "get_identity_config", "list_org_connectors",
  "get_cowork_settings", "list_roles", "get_roles_configuration", "create_role", "update_role",
  "delete_role", "list_role_permissions", "add_role_permission", "remove_role_permission",
  "list_role_assignments", "assign_role", "unassign_role",
]);

const widgetTools = new Set([
  "image_search", "weather_fetch", "recipe_display_v0", "places_map_display_v0", "message_compose_v1",
  "recommend_claude_apps", "ask_user_input_v0", "ask_user_free_form_input_v0", "AskUserQuestion",
]);

export function segmentCoworkMessageBlocks(blocks: CoworkContentBlock[]): CoworkMessageSegment[] {
  const segments: CoworkMessageSegment[] = [];
  let timeline: CoworkContentBlock[] = [];
  let content: CoworkContentBlock[] = [];
  let timelineIndex = 0;
  const richToolIds = collectRichToolIds(blocks);
  const askUserSegments = new Map<string, CoworkMessageSegment>();

  const appendTimelineBlock = (block: CoworkContentBlock) => {
    if (timeline.length > 0) timeline.push(block);
    else {
      const previous = [...segments].reverse().find((segment): segment is CoworkTimelineSegment => segment.type === "timeline");
      if (previous) previous.blocks.push(block);
      else timeline.push(block);
    }
  };
  const flushTimeline = () => {
    if (timeline.length === 0) return;
    segments.push({ type: "timeline", blocks: [...timeline], timelineIndex: timelineIndex++ });
    timeline = [];
  };
  const flushContent = () => {
    if (content.length === 0) return;
    segments.push({ type: "content", blocks: [...content] });
    content = [];
  };

  for (const block of blocks) {
    if (block.type === "thinking") {
      if (!block.thinking?.trim() && !block.summaries?.length) continue;
      if (block.alternative_display_type === "working") timeline.push(block);
      else appendTimelineBlock(block);
      continue;
    }
    if (block.type === "tool_use_summary") {
      appendTimelineBlock(block);
      continue;
    }
    if (block.type === "tool_use") {
      if (block.id && richToolIds.has(block.id)) {
        if (block.name === "AskUserQuestion") {
          flushTimeline();
          content.push(block);
          flushContent();
          askUserSegments.set(block.id, segments.at(-1)!);
        } else content.push(block);
      } else timeline.push(block);
      continue;
    }
    if (block.type === "tool_result") {
      if (block.tool_use_id && richToolIds.has(block.tool_use_id)) {
        const askUserSegment = askUserSegments.get(block.tool_use_id);
        if (askUserSegment) {
          askUserSegment.blocks.push(block);
          askUserSegments.delete(block.tool_use_id);
        } else content.push(block);
      }
      continue;
    }
    const text = block.type === "text" ? block.text : block.type === "connector_text" ? block.connector_text : undefined;
    if (text?.trim()) {
      flushTimeline();
      flushContent();
      content.push(block);
      flushContent();
    } else if (block.type !== "text" && block.type !== "connector_text" && block.type !== "token_budget") {
      flushTimeline();
      flushContent();
      content.push(block);
      flushContent();
    }
  }
  flushTimeline();
  flushContent();
  annotateTimelineStatus(segments);
  return segments;
}

export function buildCoworkAssistantSequence(blocks: CoworkContentBlock[]): CoworkAssistantSequenceItem[] {
  return arrangeCoworkAssistantSegments(segmentCoworkMessageBlocks(visibleCoworkAssistantBlocks(blocks)));
}

export function visibleCoworkAssistantBlocks(blocks: CoworkContentBlock[]) {
  return blocks.filter((block) => !(block.type === "process_group_marker"
    || block._isSubagentBlock
    || block.type === "tool_use" && block.name?.toLowerCase().includes("search_plugins")));
}

export function arrangeCoworkAssistantSegments(segments: CoworkMessageSegment[]) {
  const length = segments.length;
  const hasContentFrom = Array.from<boolean>({ length: length + 1 }).fill(false);
  const hasAttachableFrom = Array.from<boolean>({ length: length + 1 }).fill(false);
  const hasTextFrom = Array.from<boolean>({ length: length + 1 }).fill(false);
  const attachable = Array.from<boolean>({ length }).fill(false);

  for (let index = length - 1; index >= 0; index--) {
    const segment = segments[index];
    attachable[index] = segment.type === "content" && isAttachableContent(segment);
    hasContentFrom[index] = hasContentFrom[index + 1] || segment.type === "content";
    hasTextFrom[index] = hasTextFrom[index + 1] || segment.type === "content" && segment.blocks.some(hasVisibleText);
    hasAttachableFrom[index] = hasAttachableFrom[index + 1] || attachable[index];
  }
  return arrangeSequenceItems(segments, hasContentFrom, hasAttachableFrom, hasTextFrom, attachable);
}

function arrangeSequenceItems(
  segments: CoworkMessageSegment[],
  hasContentFrom: boolean[],
  hasAttachableFrom: boolean[],
  hasTextFrom: boolean[],
  attachable: boolean[],
) {
  const output: CoworkAssistantSequenceItem[] = [];
  let isFirst = true;
  for (let index = 0; index < segments.length; index++) {
    const segment = segments[index];
    if (segment.type === "timeline") {
      let contentAfter: CoworkContentSegment | undefined;
      let contentAfterIndex: number | undefined;
      const liveUpdates = !hasAttachableFrom[index + 1];
      if (attachable[index + 1]) {
        contentAfter = segments[++index] as CoworkContentSegment;
        contentAfterIndex = index;
      }
      output.push({
        contentAfter,
        contentAfterIndex,
        contentHasTextAfter: hasTextFrom[index + 1],
        isFirst,
        isLastContent: !hasContentFrom[index + 1],
        kind: "timeline",
        liveUpdates,
        segment,
      });
    } else {
      output.push({
        hasTextAfter: hasTextFrom[index + 1],
        index,
        isLastContent: !hasContentFrom[index + 1],
        kind: "content",
        segment,
      });
    }
    isFirst = false;
  }
  return output;
}

function isAttachableContent(segment: CoworkContentSegment) {
  return segment.blocks.some((block) => hasVisibleText(block)
    || block.type === "tool_use" && block.is_mcp_app !== true && !widgetTools.has(block.name ?? ""));
}

function hasVisibleText(block: CoworkContentBlock) {
  return block.type === "text" && Boolean(block.text?.trim())
    || block.type === "connector_text" && Boolean(block.connector_text?.trim());
}

export function isOfficialCoworkRichTool(block: CoworkContentBlock) {
  if (block.type !== "tool_use" || !block.name) return false;
  const name = block.name;
  const lower = name.toLowerCase();
  return name === "artifacts"
    || name === "orbit_insight"
    || name === "enterprise_analytics"
    || organizationTools.has(name)
    || name === "launch_extended_search_task"
    || name === "launch_code_session"
    || ["suggest_connectors", "list_connectors", "suggest_plugin_install", "list_plugins", "list_skills", "suggest_skills", "propose_skills", "show_onboarding_role_picker", "create_scheduled_task", "save_skill"].some((token) => lower.includes(token))
    || name === "mcp__cowork__create_artifact"
    || name === "mcp__cowork__update_artifact"
    || name === "task_propose"
    || widgetTools.has(name)
    || block.is_mcp_app === true
    || isVisualizeTool(name);
}

function collectRichToolIds(blocks: CoworkContentBlock[]) {
  const optInRequired = new Set<string>();
  for (const block of blocks) {
    if (block.type !== "tool_result" || !block.name?.toLowerCase().includes("search_mcp_registry")) continue;
    const text = Array.isArray(block.content) && block.content[0]?.type === "text" ? block.content[0].text ?? "" : "";
    try {
      if (JSON.parse(text).opt_in_required === true && block.tool_use_id) optInRequired.add(block.tool_use_id);
    } catch {
      // Official source ignores malformed registry results.
    }
  }
  return new Set(blocks.flatMap((block) => block.type === "tool_use" && block.id && (isOfficialCoworkRichTool(block) || optInRequired.has(block.id)) ? [block.id] : []));
}

function annotateTimelineStatus(segments: CoworkMessageSegment[]) {
  segments.forEach((segment, index) => {
    if (segment.type !== "timeline") return;
    const status = timelineStatus(segment.blocks, index > 0);
    segment.statusText = status.text;
    segment.summaryType = status.summaryType;
    segment.blocks = segment.blocks.filter((block) => block.type !== "tool_use_summary");
  });
}

function timelineStatus(blocks: CoworkContentBlock[], allowToolStatus: boolean) {
  const trim = (value: string) => value.trim().replace(/[.!?;:,]+$/, "");
  for (let index = blocks.length - 1; index >= 0; index--) {
    const block = blocks[index];
    if (block.type !== "thinking") continue;
    const summary = block.summaries?.at(-1)?.summary;
    if (summary) return { text: trim(summary), summaryType: "thinking" as const };
  }
  for (let index = blocks.length - 1; index >= 0; index--) {
    const block = blocks[index];
    if (block.type === "tool_use_summary" && block.summary) return { text: trim(block.summary), summaryType: "tool_use_summary" as const };
  }
  let text: string | undefined;
  blocks.forEach((block) => {
    if (block.type === "thinking") text = "Thinking";
    if (block.type !== "tool_use" || !allowToolStatus) return;
    const message = stringValue(block.message);
    const description = stringValue(asRecord(block.input).description);
    const candidate = description ?? (message && message !== block.name ? message : undefined) ?? block.name;
    if (candidate) text = candidate.charAt(0).toUpperCase() + candidate.slice(1);
  });
  return text ? { text } : {};
}

function isVisualizeTool(name: string) {
  return name.startsWith("visualize:")
    || name.startsWith("mcp__visualize__")
    || name.startsWith("mcp__local_visualize__")
    || name.startsWith("mcp__internal_visualize__");
}
