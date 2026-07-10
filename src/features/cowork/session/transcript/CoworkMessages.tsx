import { Icon } from "../../../../shell/icons";
import type { CoworkUploadedFile } from "../../newTask/coworkUploadedFiles";
import type { CoworkTranscriptEntry, CoworkTranscriptItem } from "../types";
import { CoworkMarkdown, renderCoworkInlineMarkdown } from "./CoworkMarkdown";
import { CoworkAssistantMessage, CoworkResponseMarkdown, CoworkThinkingBlock, CoworkUserMessage } from "./CoworkMessagePrimitives";
import { CoworkToolRuns } from "./CoworkToolRuns";
import { useCoworkTranscriptActions } from "./CoworkTranscriptActions";

export function CoworkUserEntryMessage({ entry }: { entry: CoworkTranscriptEntry }) {
  const textItems = entry.items.filter((item): item is Extract<CoworkTranscriptItem, { kind: "text" }> => item.kind === "text");
  const bashItems = entry.items.filter((item): item is Extract<CoworkTranscriptItem, { kind: "bash" }> => item.kind === "bash");
  const eventItems = entry.items.filter((item): item is Extract<CoworkTranscriptItem, { kind: "event" }> => item.kind === "event");
  const files = entry.items.filter((item): item is Extract<CoworkTranscriptItem, { kind: "uploaded-file" }> => item.kind === "uploaded-file").map((item) => item.file);
  return (
    <CoworkUserMessage><div className="flex flex-col gap-g4">
      {files.length ? <UserUploadedFiles files={files} /> : null}
      {textItems.map((item) => <p className="text-body whitespace-pre-wrap [overflow-wrap:anywhere] text-pretty" key={item.id}>{renderCoworkInlineMarkdown(item.text, item.id)}</p>)}
      {bashItems.map((item) => <CoworkUserBashBlock item={item} key={item.id} />)}
      {eventItems.map((item) => <p className="text-body text-t7 whitespace-pre-wrap [overflow-wrap:anywhere]" key={item.id}>{item.content}</p>)}
    </div></CoworkUserMessage>
  );
}

export function CoworkAssistantEntryMessage({ entry, isStreaming = false }: { entry: CoworkTranscriptEntry; isStreaming?: boolean }) {
  const visibleItems = entry.items.filter((item) => item.kind !== "uploaded-file");
  if (!visibleItems.length) return null;
  return <CoworkAssistantMessage>{visibleItems.map((item) => <CoworkAssistantItem isStreaming={isStreaming} item={item} key={item.id} />)}</CoworkAssistantMessage>;
}

function CoworkAssistantItem({ isStreaming, item }: { isStreaming: boolean; item: Exclude<CoworkTranscriptItem, { kind: "uploaded-file" }> }) {
  if (item.kind === "thinking") return <CoworkThinkingBlock text={item.text} />;
  if (item.kind === "text") return <CoworkResponseMarkdown><CoworkMarkdown isStreaming={isStreaming} text={item.text} /></CoworkResponseMarkdown>;
  if (item.kind === "tools") return <CoworkToolRuns item={item} />;
  if (item.kind === "error") return <div className="rounded-r3 border border-[var(--fill-destructive-default)] px-p3 py-p2 text-code text-destructive-default whitespace-pre-wrap break-words">{item.text}</div>;
  if (item.kind === "bash") return <CoworkUserBashBlock item={item} />;
  return <div className="text-body text-t6 whitespace-pre-wrap break-words">{item.content}</div>;
}

function UserUploadedFiles({ files }: { files: CoworkUploadedFile[] }) {
  const actions = useCoworkTranscriptActions();
  return <div className="flex flex-wrap gap-g2">{files.map((file) => <button className="inline-flex max-w-full items-center gap-g2 rounded-r4 bg-fill-contained-default px-p4 py-p2 text-footnote text-t8 effect-contained-default" key={`${file.path}-${file.fileUuid ?? "local"}`} onClick={() => actions?.openFile({ path: file.path })} type="button"><Icon name="Document" size="xs" /><span className="max-w-[220px] truncate">{file.fileName}</span></button>)}</div>;
}

function CoworkUserBashBlock({ item }: { item: Extract<CoworkTranscriptItem, { kind: "bash" }> }) {
  return <div className="rounded-r4 bg-t1 px-p6 py-p4 text-code text-t8 whitespace-pre-wrap break-all">{item.command ? <pre className="m-0">{item.command}</pre> : null}{item.output || item.error ? <pre className={`m-0 ${item.command ? "mt-p4" : ""} ${item.error ? "text-destructive-default" : "text-assistant-secondary"}`}>{item.error ?? item.output}</pre> : null}</div>;
}
