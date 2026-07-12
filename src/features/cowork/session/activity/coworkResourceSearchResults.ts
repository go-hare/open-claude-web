export function parseCoworkSearchResults(content: unknown) {
  const knowledge = Array.isArray(content)
    ? content.filter((item) => {
      const entry = asRecord(item);
      return entry.type === "knowledge" && asRecord(entry.metadata).type === "webpage_metadata";
    })
    : [];
  if (knowledge.length > 0) return knowledge.map(knowledgeSearchResult);
  return linksSearchResults(resultText(content));
}

function resultText(content: unknown) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((item) => asRecord(item))
    .filter((item) => item.type === "text")
    .map((item) => stringValue(item.text) ?? "")
    .join("\n");
}

function knowledgeSearchResult(value: unknown) {
  const item = asRecord(value);
  const metadata = asRecord(item.metadata);
  return {
    faviconUrl: stringValue(metadata.favicon_url),
    siteDomain: stringValue(metadata.site_domain),
    title: stringValue(item.title) ?? "",
    url: stringValue(item.url) ?? "",
  };
}

function linksSearchResults(text: string) {
  const linksStart = text.indexOf("Links:");
  if (linksStart < 0) return [];
  const json = balancedJsonArray(text.slice(linksStart + 6).trim());
  if (!json) return [];
  try {
    const links = JSON.parse(json);
    return Array.isArray(links) ? links.flatMap(normalizeSearchLink) : [];
  } catch {
    return [];
  }
}

function balancedJsonArray(value: string) {
  if (!value.startsWith("[")) return undefined;
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (escaped) escaped = false;
    else if (char === "\\") escaped = true;
    else if (char === '"') quoted = !quoted;
    else if (!quoted && char === "[") depth += 1;
    else if (!quoted && char === "]" && --depth === 0) return value.slice(0, index + 1);
  }
}

function normalizeSearchLink(value: unknown) {
  const link = asRecord(value);
  const url = stringValue(link.url);
  if (!url) return [];
  let siteDomain: string | undefined;
  try { siteDomain = new URL(url).hostname; } catch { /* Invalid result URL. */ }
  return [{ siteDomain, title: stringValue(link.title) ?? "", url }];
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}
