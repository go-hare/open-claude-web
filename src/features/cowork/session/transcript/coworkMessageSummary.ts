import type { CoworkContentBlock } from "./coworkMessageTypes";

export function coworkMessageSummary(blocks: CoworkContentBlock[]) {
  const text = blocks.map((block) => {
    if (block.type === "text") return block.text ?? "";
    if (block.type === "connector_text") return block.connector_text ?? "";
    return "";
  }).filter(Boolean).join(" ").trim();
  return summarizeCoworkText(text);
}

export function summarizeCoworkText(value: string) {
  const lines = value.split("\n");
  let index = 0;
  while (index < lines.length && !lines[index]?.trim()) index += 1;
  if (lines[index]?.trimStart().startsWith("```")) {
    index += 1;
    while (index < lines.length && !lines[index]?.trimStart().startsWith("```")) index += 1;
    index += 1;
  }
  while (index < lines.length && !lines[index]?.trim()) index += 1;
  const normalized = lines.slice(index).join("\n")
    .replace(/^[\s>]*(?:[#]{1,6}|[-*+]|\d+\.)\s+/gm, "")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "$1")
    .replace(/(?<!_)_([^_\n]+)_(?!_)/g, "$1")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .trimStart();
  const firstSentence = (/^[^.!?\n]*[.!?]?/.exec(normalized)?.[0] ?? normalized).trim();
  return firstSentence.length > 160 ? `${firstSentence.slice(0, 159)}…` : firstSentence;
}
