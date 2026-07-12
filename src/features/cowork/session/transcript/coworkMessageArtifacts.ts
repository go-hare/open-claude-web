import { asRecord, stringValue } from "../recordUtils";
import type { CoworkChatMessage, CoworkContentBlock } from "./coworkMessageTypes";

export type CoworkArtifactVersion = {
  citations?: unknown[];
  command: "create" | "rewrite" | "update";
  content?: string;
  created_at: string;
  isClosed: boolean;
  message: string;
  new_str?: string;
  old_str?: string;
  resultState?: string;
  source?: "c" | "w";
  uuid?: string;
};

export type CoworkArtifact = {
  id: string;
  language?: string;
  title: string;
  type: string;
  versions: CoworkArtifactVersion[];
};

const artifactTag = "antArtifact";
const artifactStart = `<${artifactTag}(?:\\s+([^>]*)>|(?!>)\\S*)`;
const artifactEnd = `</${artifactTag}>`;
const artifactPattern = new RegExp(`${artifactStart}([\\s\\S]*?)(?:${artifactEnd}|$)`, "g");

export function aggregateCoworkArtifacts(messages: CoworkChatMessage[]) {
  let artifacts: Record<string, CoworkArtifact> = {};
  for (const message of messages) {
    if (message.sender !== "assistant") continue;
    const [updates] = updateCoworkStreamingArtifacts(artifacts, message);
    artifacts = { ...artifacts, ...updates };
  }
  return artifacts;
}

export function updateCoworkStreamingArtifacts(
  committed: Record<string, CoworkArtifact>,
  message: CoworkChatMessage,
): [Record<string, CoworkArtifact>, string | null] {
  const updates: Record<string, CoworkArtifact> = {};
  let lastArtifactId: string | null = null;
  for (const artifact of extractCoworkArtifacts(message)) {
    const versions = updates[artifact.id]?.versions ?? committed[artifact.id]?.versions ?? [];
    const previousState = versions.at(-1)?.resultState;
    const version = {
      ...artifact.currentVersion,
      resultState: applyCoworkArtifactVersion(artifact.currentVersion, previousState),
    };
    updates[artifact.id] = updates[artifact.id]
      ? { ...updates[artifact.id], versions: [...updates[artifact.id].versions, version] }
      : committed[artifact.id]
        ? { ...committed[artifact.id], versions: [...committed[artifact.id].versions, version] }
        : {
            id: artifact.id,
            language: artifact.language,
            title: artifact.title || "Untitled",
            type: artifact.type || "document",
            versions: [version],
          };
    lastArtifactId = artifact.id;
  }
  return [updates, lastArtifactId];
}

function extractCoworkArtifacts(message: CoworkChatMessage) {
  const artifacts: Array<{
    currentVersion: CoworkArtifactVersion;
    id: string;
    language?: string;
    title: string;
    type: string;
  }> = [];
  for (const match of displayText(message).matchAll(artifactPattern)) {
    const [full, attributes, content] = match;
    if (!attributes || !content) continue;
    const parsed = parseArtifactAttributes(attributes);
    artifacts.push({
      ...parsed,
      currentVersion: {
        command: "create",
        content: content.trimStart(),
        created_at: message.created_at,
        isClosed: full.endsWith(artifactEnd),
        message: message.uuid,
      },
    });
  }
  for (const [index, block] of message.content.entries()) {
    const artifact = artifactFromToolUse(block, message, index === message.content.length - 1);
    if (artifact) artifacts.push(artifact);
  }
  return artifacts;
}

function artifactFromToolUse(block: CoworkContentBlock, message: CoworkChatMessage, isLast: boolean) {
  if (block.type !== "tool_use" || block.name !== "artifacts" || !block.input) return undefined;
  const input = asRecord(block.input);
  const id = stringValue(input.id);
  const command = input.command === "create" || input.command === "rewrite" || input.command === "update"
    ? input.command
    : undefined;
  if (!id || !command) return undefined;
  const content = stringValue(input.content) ?? "";
  const citations = Array.isArray(input.md_citations) ? input.md_citations : undefined;
  const version: CoworkArtifactVersion = {
    command,
    created_at: message.created_at,
    isClosed: !isLast,
    message: message.uuid,
    uuid: stringValue(input.version_uuid),
  };
  if (command === "create" || command === "rewrite") {
    version.citations = citations;
    version.content = citations?.length ? content : content.trimStart();
    if (input.source === "c" || input.source === "w") version.source = input.source;
  } else if (content !== "") {
    version.command = "rewrite";
    version.content = content;
  } else {
    version.old_str = stringValue(input.old_str) ?? "";
    version.new_str = stringValue(input.new_str) ?? "";
  }
  return {
    currentVersion: version,
    id,
    language: stringValue(input.language),
    title: stringValue(input.title) ?? "",
    type: stringValue(input.type) ?? "text/plain",
  };
}

function applyCoworkArtifactVersion(version: CoworkArtifactVersion, previous?: string) {
  if (version.command === "create" || version.command === "rewrite") return version.content;
  if (version.command === "update") {
    if (previous === undefined) return version.new_str;
    if (previous.includes(version.old_str ?? "")) {
      return previous.replace(version.old_str ?? "", version.new_str ?? "");
    }
    return previous.replace((version.old_str ?? "").trim(), version.new_str ?? "");
  }
  return previous ?? "";
}

function displayText(message: CoworkChatMessage) {
  let text = "";
  for (const block of message.content) {
    if (block.type === "text") text += block.text ?? "";
    else if (block.type === "connector_text") text += block.connector_text ?? "";
  }
  return text;
}

function parseArtifactAttributes(attributes: string) {
  return {
    id: attribute(attributes, "identifier") ?? "",
    language: attribute(attributes, "language"),
    title: attribute(attributes, "title") ?? "Untitled artifact",
    type: attribute(attributes, "type") ?? "text/plain",
  };
}

function attribute(attributes: string, name: string) {
  return attributes.match(new RegExp(`${name}="([^"]*)"`))?.[1];
}
