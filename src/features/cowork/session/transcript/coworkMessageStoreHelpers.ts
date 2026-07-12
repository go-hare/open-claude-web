import { asRecord, stringValue } from "../recordUtils";
import type { CoworkContentBlock, CoworkFile } from "./coworkMessageTypes";

const restartNudgePattern = /^\s*Read the output file to retrieve the result:\s/;

export function messageContent(message: Record<string, unknown>) {
  const content = asRecord(message.message).content;
  if (Array.isArray(content)) return content.map(contentBlock).filter(isContentBlock);
  return typeof content === "string" ? [{ type: "text", text: content }] : [];
}

export function contentBlock(value: unknown): CoworkContentBlock {
  const block = asRecord(value) as CoworkContentBlock;
  return { ...block, type: stringValue(block.type) ?? "unknown" };
}

export function normalizeSubagentContent(message: Record<string, unknown>) {
  return messageContent(message).map((block) => block.type === "tool_result"
    ? { ...block, content: normalizeResultContent(block.content) }
    : block);
}

export function normalizeResultContent(content: unknown): CoworkContentBlock[] {
  if (Array.isArray(content)) return content.map(contentBlock);
  return [{ type: "text", text: typeof content === "string" ? content : "" }];
}

export function normalizeHumanMessage(message: Record<string, unknown>, pluginsEnabled: boolean) {
  if (message.isCompactSummary || message.isVisibleInTranscriptOnly) return null;
  if (pluginsEnabled && (message.isSynthetic || message.isMeta)) return null;
  const rawContent = asRecord(message.message).content;
  const singleText = typeof rawContent === "string"
    ? rawContent
    : Array.isArray(rawContent) && rawContent.length === 1 && asRecord(rawContent[0]).type === "text"
      ? stringValue(asRecord(rawContent[0]).text)
      : undefined;
  if (singleText && restartNudgePattern.test(singleText)) return null;
  const parsed = parseHumanContent(message);
  if (parsed.content.length === 0) return null;
  return parsed;
}

export function parseHumanContent(message: Record<string, unknown>) {
  const raw = asRecord(message.message).content;
  const content = Array.isArray(raw)
    ? raw.map(contentBlock).filter((block) => block.type === "text" || block.type === "image")
    : [{ type: "text", text: typeof raw === "string" ? raw : "" }];
  const text = content.find((block) => block.type === "text")?.text ?? "";
  const files = parseUploadedFiles(text);
  const syncSources = parseSyncSources(text);
  return {
    content: content.map((block) => block.type === "text" && block.text
      ? { ...block, text: normalizeCommandText(stripSystemTags(block.text)) }
      : block),
    files,
    syncSources,
  };
}

export function localCommandOutput(message: Record<string, unknown>) {
  const raw = asRecord(message.message).content;
  const text = typeof raw === "string"
    ? raw
    : Array.isArray(raw) && raw.length === 1 && asRecord(raw[0]).type === "text"
      ? stringValue(asRecord(raw[0]).text)
      : undefined;
  return text?.match(/^<local-command-std(?:out|err)>([\s\S]*)<\/local-command-std(?:out|err)>$/)?.[1]?.trim();
}

export function messageUuid(message: Record<string, unknown>, fallback: string) {
  return stringValue(message.uuid) ?? stringValue(message.id) ?? fallback;
}

export function apiMessageId(message: Record<string, unknown>) {
  return stringValue(asRecord(message.message).id);
}

function stripSystemTags(value: string) {
  return value
    .replace(/<uploaded_files>[\s\S]*?<\/uploaded_files>\s*/g, "")
    .replace(/\s*<cu_window_hints>[\s\S]*?<\/cu_window_hints>/g, "")
    .replace(/\s*<widget_context_hint>[\s\S]*?<\/widget_context_hint>/g, "")
    .replace(/\s*<system-reminder>[\s\S]*?<\/system-reminder>\s*/g, "")
    .replace(/<sync_sources>[\s\S]*?<\/sync_sources>\s*/g, "");
}

function normalizeCommandText(value: string) {
  if (!value.includes("<command-name>") && !value.includes("<command-message>")) return value;
  const name = value.match(/<command-name>([\s\S]*?)<\/command-name>/)?.[1]?.trim();
  const message = value.match(/<command-message>([\s\S]*?)<\/command-message>/)?.[1]?.trim();
  const args = value.match(/<command-args>([\s\S]*?)<\/command-args>/)?.[1]?.trim();
  const command = name || (message ? `/${message}` : undefined);
  return command ? [command, args].filter(Boolean).join(" ") : value;
}

function parseUploadedFiles(text: string): CoworkFile[] {
  const section = text.match(/<uploaded_files>([\s\S]*?)<\/uploaded_files>/)?.[1];
  if (!section) return [];
  return Array.from(section.matchAll(/<file>([\s\S]*?)<\/file>/g)).flatMap((match) => {
    const xml = match[1] ?? "";
    const path = xml.match(/<file_path>(.*?)<\/file_path>/)?.[1]?.trim();
    if (!path) return [];
    const fileUuid = xml.match(/<file_uuid>(.*?)<\/file_uuid>/)?.[1]?.trim() ?? "";
    return [{ created_at: null, file_kind: "wiggle_vm", file_name: basename(path), file_uuid: fileUuid, path }];
  });
}

function parseSyncSources(text: string) {
  const encoded = text.match(/<sync_sources>[\s\S]*?<refs>(.*?)<\/refs>/)?.[1];
  if (!encoded) return [];
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(encoded));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function basename(path: string) {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? path;
}

function isContentBlock(block: CoworkContentBlock) {
  return block.type !== "unknown";
}
