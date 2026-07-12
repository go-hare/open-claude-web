/**
 * Official file tool cell subset.
 * create_file (Wlt ~158228): compact xde when complete or right-pane owns MD stream;
 * expanded bde preview while streaming (unless showingInRightPane + markdown).
 * Blt status via CoworkFileStatusLabel.
 */

import { motion } from "motion/react";
import { memo, useEffect, useRef, useState, type ReactNode } from "react";
import { useCoworkStreamingFile } from "../chatResource/CoworkChatResourceProvider";
import { coworkCreateFileBltTarget } from "./coworkFileToolModel";
import { CoworkFileStatusLabel } from "./CoworkFileStatusLabel";
import { CoworkToolBadge, CoworkToolCodeBlock } from "./CoworkToolPresentation";
import { CoworkToolRow, type CoworkToolRenderMode } from "./CoworkToolRow";
import { CoworkMarkdown } from "./CoworkMarkdown";

export type CoworkFileAction = "create" | "edit" | "present" | "read" | "skill";

type CoworkFileToolCellProps = {
  action: CoworkFileAction;
  description?: string;
  displayFileName?: string;
  displayText?: string;
  fileText?: string;
  handleClick?: () => void;
  icon?: ReactNode;
  isComplete?: boolean;
  isError?: boolean;
  isFirstBlockOfMessage?: boolean;
  isFirstItemInGroup?: boolean;
  isLastBlockOfMessage?: boolean;
  isLastItemInGroup?: boolean;
  isStreaming: boolean;
  path: string;
  renderMode?: CoworkToolRenderMode;
};

const languageByExtension: Record<string, string> = {
  bash: "bash", c: "c", cpp: "cpp", cs: "csharp", css: "css", dockerfile: "dockerfile",
  go: "go", h: "c", hpp: "cpp", html: "html", java: "java", js: "javascript",
  json: "json", jsx: "javascript", kt: "kotlin", less: "less", md: "markdown", php: "php",
  ps1: "powershell", py: "python", rb: "ruby", rs: "rust", scala: "scala", scss: "scss",
  sh: "bash", sql: "sql", swift: "swift", ts: "typescript", tsx: "typescript", xml: "xml",
  yaml: "yaml", yml: "yaml", zsh: "bash",
};

export const CoworkFileToolCell = memo(function CoworkFileToolCell(props: CoworkFileToolCellProps) {
  if (props.action === "create") return <CoworkCreateFileToolCell {...props} />;
  return <CoworkGenericFileToolCell {...props} />;
});

/** Official Wlt create_file. */
function CoworkCreateFileToolCell(props: CoworkFileToolCellProps) {
  const isComplete = props.isComplete ?? false;
  const isError = props.isError === true;
  const streaming = props.isStreaming && !isComplete;
  // Official I: D5e humanized name (or CLAUDE.md instructions label), not raw basename.
  const bltTarget = props.displayFileName || coworkCreateFileBltTarget(props.path) || props.path;
  const streamingEntry = useCoworkStreamingFile(props.path);
  // Official w: showingInRightPane && renderAs Markdown → compact while streaming.
  const rightPaneOwnsMarkdown =
    Boolean(streamingEntry?.showingInRightPane)
    && (streamingEntry?.renderAs === "markdown" || isMarkdownPath(props.path));
  const showExpandedPreview = streaming && !rightPaneOwnsMarkdown;
  const statusText = (
    <CoworkFileStatusLabel
      description={props.description}
      errorAction="Failed to create"
      isError={isError}
      isStreaming={streaming}
      streamingAction="Creating"
      successAction="Created"
      target={bltTarget}
    />
  );
  // Official L = A && !shareType; A = !error && path && messageUuid && P5e.
  // Local session has no shareType → secondary basename only when clickable success path.
  const canOpen = Boolean(props.handleClick) && !isError && Boolean(props.path);
  const secondaryIcon = canOpen
    ? (
      <span className="text-xs text-text-300 max-w-64 truncate shrink-0 min-w-0">
        {basename(props.path)}
      </span>
    )
    : undefined;
  // Official xde handleClick only when A (not on tool error).
  const handleClick = canOpen ? props.handleClick : undefined;

  // Official complete / right-pane compact: xde (row clickable, no expanded children).
  if (!showExpandedPreview) {
    return (
      <CoworkToolRow
        {...toolRowProps(props)}
        handleClick={handleClick}
        hideCaret
        icon={props.icon}
        isStreaming={streaming}
        secondaryIcon={secondaryIcon}
        text={statusText}
      />
    );
  }

  // Official streaming expanded: bde + max-h-[238px] preview.
  return (
    <CoworkToolRow
      {...toolRowProps(props)}
      handleClick={undefined}
      hideCaret
      icon={props.icon}
      isExpanded
      isStreaming={streaming}
      secondaryIcon={secondaryIcon}
      text={statusText}
    >
      <div
        className="flex flex-col gap-3 p-3 pt-1 max-h-[238px] overflow-y-scroll"
        data-official-source="index-BELzQL5P.js:Wlt create_file expanded preview"
        data-testid="repl-output"
      >
        {isMarkdownPath(props.path) ? (
          <div className="markdown-wrapper">
            <div className="font-claude-response prose prose-sm max-w-none">
              <CoworkMarkdown isStreaming={streaming} text={props.fileText ?? ""} />
            </div>
          </div>
        ) : (
          <CoworkToolCodeBlock className="!bg-bg-000" code={props.fileText ?? ""} language={languageForPath(props.path)} title={props.path} />
        )}
      </div>
    </CoworkToolRow>
  );
}

function CoworkGenericFileToolCell(props: CoworkFileToolCellProps) {
  const isComplete = props.isComplete ?? false;
  const fileName = props.displayFileName ?? basename(props.path);
  const label = props.displayText || fileActionLabel(props.action, fileName, !(isComplete || !props.isStreaming));
  const renderPreview = useFilePreview(isComplete);
  return (
    <CoworkToolRow {...toolRowProps(props)} handleClick={props.handleClick} hideCaret icon={props.icon} isStreaming={props.isStreaming && !isComplete} text={<span className="truncate">{label}</span>}>
      <CoworkFileToolContent {...props} fileName={fileName} isComplete={isComplete} renderPreview={renderPreview} />
    </CoworkToolRow>
  );
}

function useFilePreview(isComplete: boolean) {
  const [renderPreview, setRenderPreview] = useState(!isComplete);
  const timerRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (isComplete) timerRef.current = window.setTimeout(() => setRenderPreview(false), 100);
    else setRenderPreview(true);
    return () => { if (timerRef.current) window.clearTimeout(timerRef.current); };
  }, [isComplete]);
  return renderPreview;
}

function CoworkFileToolContent(props: CoworkFileToolCellProps & { fileName: string; isComplete: boolean; renderPreview: boolean }) {
  const showFileText = Boolean(props.fileText) && !props.isComplete;
  return (
    <>
      {props.action === "edit" && props.fileText ? (
        <div>
          {props.renderPreview ? (
            <div className={classes("grid transition-[grid-template-rows,opacity] duration-100 ease-out mx-2.5 mt-1 mb-2", props.isComplete ? "grid-rows-[0fr] opacity-0 pointer-events-none" : "grid-rows-[1fr] opacity-100")}>
              <div className="overflow-hidden min-h-0">
                <div className="border-[0.5px] border-border-300 rounded-xl overflow-hidden bg-bg-000/30 text-xs">
                  <div className="max-h-[150px] overflow-y-auto"><CoworkToolCodeBlock className="!bg-bg-000" code={props.fileText} language={languageForPath(props.path)} /></div>
                </div>
              </div>
            </div>
          ) : null}
          {props.isComplete ? <button className="cursor-pointer transition-colors text-text-500 hover:text-text-200 mx-2.5 mt-1" onClick={props.handleClick} type="button"><CoworkToolBadge className="!text-inherit">{props.fileName}</CoworkToolBadge></button> : null}
        </div>
      ) : null}
      {props.displayFileName && props.action !== "create" && props.action !== "edit" && props.isComplete ? (
        <div className="mx-2.5 mt-1 flex items-center gap-2">
          <button className={classes("flex items-center transition-colors text-text-500", props.handleClick ? "cursor-pointer hover:text-text-200" : "")} disabled={!props.handleClick} onClick={props.handleClick} type="button">
            <CoworkToolBadge className="!text-inherit">{props.fileName}</CoworkToolBadge>
          </button>
        </div>
      ) : null}
      {props.action !== "create" && props.action !== "edit" && showFileText ? (
        <motion.div animate={{ height: "auto", opacity: 1 }} className="overflow-hidden" initial={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: "easeOut" }}>
          <div className="border-[0.5px] border-border-300 rounded-xl mx-2.5 mt-1 mb-2 overflow-hidden bg-bg-000/30">
            <div className="max-h-[150px] overflow-y-auto"><CoworkToolCodeBlock code={props.fileText ?? ""} language={languageForPath(props.path)} /></div>
          </div>
        </motion.div>
      ) : null}
    </>
  );
}

function fileActionLabel(action: CoworkFileAction, fileName: string, streaming: boolean) {
  if (action === "create") return `${streaming ? "Creating" : "Created"} ${fileName}`;
  if (action === "read") return `${streaming ? "Reading" : "Read"} ${fileName}`;
  if (action === "edit") return `${streaming ? "Editing" : "Edited"} ${fileName}`;
  if (action === "present") return streaming ? "Presenting file(s)..." : "Presented file(s)";
  if (action === "skill") return streaming ? "Loading skill" : "Loaded skill";
  return fileName;
}

function languageForPath(path: string) {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  return languageByExtension[extension] || "text";
}

function isMarkdownPath(path: string) {
  return /\.(md|mdx|markdown)$/i.test(path.split(/[/\\]/).pop() ?? path);
}

function toolRowProps(props: CoworkFileToolCellProps) {
  return {
    isFirstBlockOfMessage: props.isFirstBlockOfMessage,
    isFirstItemInGroup: props.isFirstItemInGroup,
    isLastBlockOfMessage: props.isLastBlockOfMessage,
    isLastItemInGroup: props.isLastItemInGroup,
    renderMode: props.renderMode ?? "standard",
  };
}

function basename(path: string) {
  return path.split("/").pop() || path;
}

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}
