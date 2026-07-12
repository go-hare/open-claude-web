import { AnimatePresence, motion } from "motion/react";
import { memo, useCallback, useMemo, useState } from "react";
import { CoworkTerminalGlyph } from "../../ui/CoworkOfficialGlyphs";
import type { CoworkContentBlock } from "./coworkMessageTypes";
import { CoworkToolBadge, CoworkToolCodeBlock } from "./CoworkToolPresentation";
import { CoworkToolRow, type CoworkToolRenderMode } from "./CoworkToolRow";

type CoworkBashToolCellProps = {
  input?: Record<string, unknown>;
  isFirstBlockOfMessage?: boolean;
  isFirstItemInGroup?: boolean;
  isLastBlockOfMessage?: boolean;
  isLastItemInGroup?: boolean;
  isStreaming: boolean;
  renderMode?: CoworkToolRenderMode;
  toolResult?: CoworkContentBlock;
};

export const CoworkBashToolCell = memo(function CoworkBashToolCell({ input, isFirstBlockOfMessage, isFirstItemInGroup, isLastBlockOfMessage, isLastItemInGroup, isStreaming, renderMode = "standard", toolResult }: CoworkBashToolCellProps) {
  const [expanded, setExpanded] = useState(false);
  const command = typeof input?.command === "string" ? input.command : "";
  const description = typeof input?.description === "string" ? input.description : undefined;
  const isError = toolResult?.is_error || false;
  const output = useMemo(() => bashOutput(toolResult, isError), [isError, toolResult]);
  const complete = Boolean(toolResult) || !isStreaming;
  const outputIsError = isError || Boolean(output?.isStderr);
  const toggle = useCallback(() => setExpanded((value) => !value), []);
  return (
    <CoworkToolRow
      handleClick={toggle}
      hideCaret
      icon={<CoworkTerminalGlyph className="text-text-500" size={16} />}
      isFirstBlockOfMessage={isFirstBlockOfMessage}
      isFirstItemInGroup={isFirstItemInGroup}
      isLastBlockOfMessage={isLastBlockOfMessage}
      isLastItemInGroup={isLastItemInGroup}
      isStreaming={!complete}
      renderMode={renderMode}
      text={description || "Running command"}
    >
      {command ? (
        <div className="mx-2.5 mt-1 mb-2">
          {!expanded ? <button className={classes("flex items-center transition-colors cursor-pointer", outputIsError ? "text-danger-000 hover:text-danger-100" : "text-text-500 hover:text-text-200")} onClick={() => setExpanded(true)}><CoworkToolBadge className={!outputIsError ? "!text-inherit" : undefined} color={outputIsError ? "danger" : "flat"}>Script</CoworkToolBadge></button> : null}
          <AnimatePresence>
            {expanded ? (
              <motion.div animate={{ height: "auto", opacity: 1 }} className="overflow-hidden" exit={{ height: 0, opacity: 0 }} initial={{ height: 0, opacity: 0 }} key="bash-expanded" transition={{ duration: 0.2, ease: [0.19, 1, 0.22, 1] }}>
                <div className="rounded-lg border-[0.5px] border-border-300 bg-bg-000 cursor-pointer" onClick={() => setExpanded(false)}>
                  <div className="p-2 flex flex-col gap-2 max-h-[200px] overflow-y-auto [&_pre]:!text-xs [&_code]:!text-xs"><CoworkToolCodeBlock code={command} language="bash" />{output ? <CoworkToolCodeBlock code={output.content} error={outputIsError} title="Output" /> : null}</div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      ) : null}
    </CoworkToolRow>
  );
});

function bashOutput(result: CoworkContentBlock | undefined, isError: boolean) {
  if (!result) return null;
  const content = typeof result.content === "string" ? result.content : Array.isArray(result.content) && result.content[0]?.type === "text" ? result.content[0].text : undefined;
  if (!content) return null;
  if (isError) return { content, isStderr: true };
  try {
    const parsed = JSON.parse(content) as { returncode?: number; stderr?: string; stdout?: string };
    if (parsed.stdout) return { content: parsed.stdout, isStderr: false };
    if (parsed.stderr) return { content: parsed.stderr, isStderr: true };
    if (typeof parsed.returncode === "number") return { content: `exit code ${parsed.returncode}`, isStderr: false };
  } catch {
    return { content, isStderr: false };
  }
  return null;
}

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}
