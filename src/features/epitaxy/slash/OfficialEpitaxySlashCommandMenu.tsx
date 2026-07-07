import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { SessionSummary } from "../../../adapters/desktopBridge";
import type { LocalSessionsBridge, SlashCommand } from "../../../adapters/desktopBridge/types";
import { filterOfficialSlashCommandItems, OfficialSlashCommandMenuProvider, OfficialSlashCommandPositioner, OfficialSlashInlineFilterHint } from "./OfficialSlashCommandMenu";
import type { OfficialSlashCommandItem, OfficialSlashCommandMenuProps } from "./OfficialSlashTypes";
import { officialSlashSkillChipContent } from "./OfficialSlashTypes";

type EpitaxySessionRef = { id: string; type: "local" | "remote" | "bridge" };

type OfficialEpitaxySlashCommandMenuProps = OfficialSlashCommandMenuProps & {
  bridge: LocalSessionsBridge;
  session: SessionSummary | null;
  sessionRef: EpitaxySessionRef | null;
};

export const OfficialEpitaxySlashCommandMenu = memo(function OfficialEpitaxySlashCommandMenu({ bridge, clientRect, editor, onClose, query = "", range, session, sessionRef }: OfficialEpitaxySlashCommandMenuProps) {
  const [commands, setCommands] = useState<SlashCommand[]>([]);
  const [isLoading, setLoading] = useState(false);
  const rangeRef = useRef(range);
  rangeRef.current = range;

  useEffect(() => {
    editor.view.dom.focus();
  }, [editor]);

  useEffect(() => {
    let alive = true;
    if (!bridge.getSupportedCommands) {
      setCommands([]);
      setLoading(false);
      return () => {
        alive = false;
      };
    }
    setLoading(true);
    void bridge.getSupportedCommands({ cwd: session?.cwd ?? undefined, sessionId: sessionRef?.id ?? undefined })
      .then((items) => {
        if (alive) setCommands(Array.isArray(items) ? items : []);
      })
      .catch(() => {
        if (alive) setCommands([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [bridge, session?.cwd, sessionRef?.id]);

  const items = useMemo(() => {
    const isLocalSession = sessionRef?.type === "local";
    const base = isLocalSession ? commands.filter((command) => command.name !== "clear" && command.name !== "schedule") : commands;
    const names = new Set(base.map((command) => command.name));
    const extra: SlashCommand[] = [];

    if (isLocalSession && !names.has("schedule")) {
      extra.push({
        name: "schedule",
        description: "Create a scheduled task that can be run on demand or automatically on an interval.",
      });
    }
    if (isLocalSession && !names.has("btw")) {
      extra.push({ name: "btw", description: "Ask a quick side question without adding to the conversation" });
    }
    if (isLocalSession && bridge.launchUltrareview && !names.has("ultrareview")) {
      extra.push({ name: "ultrareview", description: "Request an ultrareview of the current changes" });
    }
    if (isLocalSession && bridge.rewind && !names.has("rewind")) {
      extra.push({ name: "rewind", description: "Rewind the conversation to a previous turn" });
    }
    if (isLocalSession && bridge.forkSession && !names.has("fork")) {
      extra.push({ name: "fork", description: "Fork this conversation into a new session" });
    }
    if (isLocalSession && bridge.setMcpServers && !names.has("mcp")) {
      extra.push({ name: "mcp", description: "Manage MCP servers for this session" });
    }
    if (isLocalSession && bridge.submitFeedback && !names.has("feedback")) {
      extra.push({
        name: "feedback",
        description: "Submit feedback about Claude Code",
        argumentHint: "[report]",
        aliases: ["bug", "share"],
      });
    }
    if (!names.has("model")) extra.push({ name: "model", description: "Set the model for this session", argumentHint: "model-id" });

    const commandItems: OfficialSlashCommandItem[] = [...base, ...extra].map((command) => ({
      type: "skill",
      skillId: command.name,
      label: command.name,
      skillDescription: command.description ?? "",
      argumentHint: command.argumentHint,
      aliases: command.aliases,
      onAction: () => {},
    }));
    if (isLocalSession && sessionRef?.id && bridge.clearSession && !isLoading) {
      const targetSessionId = sessionRef.id;
      commandItems.push({
        type: "button",
        label: "clear",
        onAction: () => {
          void bridge.clearSession?.(targetSessionId);
        },
      });
    }
    if (isLoading && commandItems.length === 0) commandItems.push({ type: "loading", label: "loading" });
    return commandItems;
  }, [
    bridge.clearSession,
    bridge.forkSession,
    bridge.launchUltrareview,
    bridge.rewind,
    bridge.setMcpServers,
    bridge.submitFeedback,
    commands,
    isLoading,
    sessionRef,
  ]);

  const filtered = useMemo(() => filterOfficialSlashCommandItems(items, query), [items, query]);
  const resolvedItems = useMemo(() => filtered.map((item): OfficialSlashCommandItem => {
    if (item.type === "skill") {
      return {
        ...item,
        onAction: () => {
          const targetRange = rangeRef.current;
          editor.chain().focus().deleteRange(targetRange).insertContent(officialSlashSkillChipContent(item.skillId, item.label ?? item.skillId, item.skillDescription ?? "", item.argumentHint ?? "")).run();
          onClose();
        },
      };
    }
    if (item.type === "separator" || item.type === "section-header" || item.type === "search-input" || item.type === "loading") return item;
    if (item.type === "submenu") return item;
    const itemAction = item.onAction;
    return {
      ...item,
      onAction: () => {
        const targetRange = rangeRef.current;
        editor.chain().focus().deleteRange(targetRange).run();
        itemAction?.();
        onClose();
      },
    };
  }), [editor, filtered, onClose]);

  const hasVisibleItems = resolvedItems.length > 0 && resolvedItems.some((item) => item.type !== "loading" && item.type !== "separator" && item.type !== "section-header");
  useEffect(() => {
    const storage = (editor.storage as unknown as Record<string, unknown>)["slash-command-suggestion"] as { hasVisibleItems?: boolean } | undefined;
    if (storage) storage.hasVisibleItems = hasVisibleItems;
  }, [editor, hasVisibleItems]);

  if (!hasVisibleItems) return null;
  return (
    <>
      <OfficialSlashInlineFilterHint editor={editor} query={query || ""} />
      <OfficialSlashCommandMenuProvider items={resolvedItems} onClose={onClose} resetKey={query}>
        <OfficialSlashCommandPositioner clientRect={clientRect} maxHeightCap={384} />
      </OfficialSlashCommandMenuProvider>
    </>
  );
});


