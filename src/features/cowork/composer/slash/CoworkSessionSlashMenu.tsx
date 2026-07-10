import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { SessionSummary } from "../../../../adapters/desktopBridge";
import type { LocalSessionsBridge, SlashCommand } from "../../../../adapters/desktopBridge/types";
import { CoworkSlashMenuSurface } from "./CoworkSlashMenuSurface";
import type { CoworkSlashCommandItem, CoworkSlashCommandMenuProps } from "./CoworkSlashTypes";
import { coworkSlashSkillChipContent } from "./CoworkSlashTypes";

type CoworkSessionSlashMenuProps = CoworkSlashCommandMenuProps & {
  bridge: LocalSessionsBridge;
  session: SessionSummary | null;
  sessionId?: string;
};

export const CoworkSessionSlashMenu = memo(function CoworkSessionSlashMenu({ bridge, clientRect, editor, onClose, query = "", range, session, sessionId }: CoworkSessionSlashMenuProps) {
  const [commands, setCommands] = useState<SlashCommand[]>([]);
  const [isLoading, setLoading] = useState(false);
  const rangeRef = useRef(range);
  rangeRef.current = range;
  useEffect(() => { editor.view.dom.focus(); }, [editor]);
  useCoworkSupportedCommands(bridge, session, sessionId, setCommands, setLoading);
  const items = useCoworkSlashItems({ bridge, commands, editor, isLoading, onClose, rangeRef, sessionId });
  return <CoworkSlashMenuSurface clientRect={clientRect} editor={editor} items={items} onClose={onClose} query={query} />;
});

function useCoworkSupportedCommands(bridge: LocalSessionsBridge, session: SessionSummary | null, sessionId: string | undefined, setCommands: (items: SlashCommand[]) => void, setLoading: (value: boolean) => void) {
  useEffect(() => {
    let alive = true;
    if (!bridge.getSupportedCommands) {
      setCommands([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    void bridge.getSupportedCommands({ cwd: session?.cwd, sessionId }).then((items) => {
      if (alive) setCommands(Array.isArray(items) ? items : []);
    }).catch(() => {
      if (alive) setCommands([]);
    }).finally(() => {
      if (alive) setLoading(false);
    });
    return () => { alive = false; };
  }, [bridge, session?.cwd, sessionId, setCommands, setLoading]);
}

type SlashItemsInput = {
  bridge: LocalSessionsBridge;
  commands: SlashCommand[];
  editor: CoworkSlashCommandMenuProps["editor"];
  isLoading: boolean;
  onClose: () => void;
  rangeRef: React.MutableRefObject<CoworkSlashCommandMenuProps["range"]>;
  sessionId?: string;
};

function useCoworkSlashItems(input: SlashItemsInput) {
  return useMemo(() => {
    const commands = withCoworkCommands(input.commands, input.bridge);
    const items: CoworkSlashCommandItem[] = commands.map((command) => ({
      aliases: command.aliases,
      argumentHint: command.argumentHint,
      label: command.name,
      onAction: () => insertSkillChip(input, command),
      skillDescription: command.description ?? "",
      skillId: command.name,
      type: "skill",
    }));
    if (input.sessionId && input.bridge.clearSession && !input.isLoading) {
      items.push({ label: "clear", onAction: () => { void input.bridge.clearSession?.(input.sessionId!); }, type: "button" });
    }
    if (input.isLoading && items.length === 0) items.push({ label: "loading", type: "loading" });
    return items;
  }, [input]);
}

function withCoworkCommands(commands: SlashCommand[], bridge: LocalSessionsBridge) {
  const base = commands.filter((command) => command.name !== "clear" && command.name !== "schedule");
  const names = new Set(base.map((command) => command.name));
  const extra: SlashCommand[] = [];
  if (!names.has("schedule")) extra.push({ name: "schedule", description: "Create a scheduled task that can run automatically." });
  if (!names.has("btw")) extra.push({ name: "btw", description: "Ask a quick side question without adding to the conversation" });
  if (bridge.forkSession && !names.has("fork")) extra.push({ name: "fork", description: "Fork this conversation into a new session" });
  if (bridge.setMcpServers && !names.has("mcp")) extra.push({ name: "mcp", description: "Manage MCP connectors" });
  if (!names.has("model")) extra.push({ name: "model", description: "Set the model for this session", argumentHint: "model-id" });
  return [...base, ...extra];
}

function insertSkillChip(input: SlashItemsInput, command: SlashCommand) {
  input.editor.chain().focus().deleteRange(input.rangeRef.current).insertContent(
    coworkSlashSkillChipContent(command.name, command.name, command.description ?? "", command.argumentHint ?? ""),
  ).run();
  input.onClose();
}
