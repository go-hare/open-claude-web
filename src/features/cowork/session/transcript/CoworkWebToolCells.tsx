import { motion } from "motion/react";
import { memo, useCallback, type ReactNode } from "react";
import { CoworkExternalLinkGlyph, CoworkWebGlyph } from "../../ui/CoworkOfficialGlyphs";
import { asRecord, stringValue, toolResultText } from "../recordUtils";
import type { CoworkContentBlock } from "./coworkMessageTypes";
import { CoworkFavicon } from "./CoworkToolPresentation";
import { CoworkToolRow, type CoworkToolRenderMode } from "./CoworkToolRow";

type ToolGroupProps = {
  children?: ReactNode;
  isFirstBlockOfMessage?: boolean;
  isFirstItemInGroup?: boolean;
  isLastBlockOfMessage?: boolean;
  isLastItemInGroup?: boolean;
  isStreaming: boolean;
  renderMode?: CoworkToolRenderMode;
};

type WebToolProps = ToolGroupProps & {
  input: Record<string, unknown>;
  toolResult?: CoworkContentBlock;
};

type SearchResult = { faviconUrl?: string; title: string; url: string };

export const CoworkWebFetchToolCell = memo(function CoworkWebFetchToolCell(props: WebToolProps) {
  const url = stringValue(props.input.url) ?? "";
  const hostname = hostnameForUrl(url);
  const isError = props.toolResult?.is_error === true;
  const title = isError ? null : webFetchTitle(props.toolResult);
  const displayTitle = title || url;
  const complete = Boolean(props.toolResult) || !props.isStreaming;
  const text = fetchText({ complete, displayTitle, hostname, isError });
  return (
    <CoworkToolRow
      {...toolRowProps(props)}
      hideCaret
      href={url || undefined}
      icon={<CoworkFavicon fallback={<CoworkWebGlyph className="text-text-500" size={16} />} size={16} url={url} />}
      isStreaming={!complete}
      secondaryIcon={complete && url ? <CoworkExternalLinkGlyph className="text-text-300" size={16} /> : undefined}
      secondaryText={complete && !isError ? hostname ?? undefined : undefined}
      text={text}
    >
      {props.children}
    </CoworkToolRow>
  );
});

export const CoworkWebSearchToolCell = memo(function CoworkWebSearchToolCell(props: WebToolProps) {
  const results = parseWebSearchResults(props.toolResult);
  const query = stringValue(props.input.query) ?? "";
  const complete = results.length > 0 || !props.isStreaming;
  return (
    <CoworkToolRow
      {...toolRowProps(props)}
      hideCaret
      icon={<CoworkWebGlyph className="text-text-500" size={16} />}
      isStreaming={!complete}
      secondaryText={complete && results.length > 0 ? resultCountText(results.length) : undefined}
      text={complete ? query : "Searching the web"}
    >
      {results.length > 0 ? <SearchResults results={results} /> : null}
    </CoworkToolRow>
  );
});

function SearchResults({ results }: { results: SearchResult[] }) {
  return (
    <motion.div animate={{ height: "auto", opacity: 1 }} className="overflow-hidden" initial={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: "easeOut" }}>
      <div className="border-[0.5px] border-border-300 rounded-lg p-1 mx-2.5 mt-1 mb-2 max-h-[150px] overflow-y-auto bg-bg-000/50">
        <div className="flex flex-col gap-1">{results.map((result, index) => <SearchResultRow key={`${result.url}-${index}`} result={result} />)}</div>
      </div>
    </motion.div>
  );
}

const SearchResultRow = memo(function SearchResultRow({ result }: { result: SearchResult }) {
  const hostname = hostnameForUrl(result.url) ?? result.url;
  const handleClick = useCallback((event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!result.url) event.preventDefault();
  }, [result.url]);
  return (
    <a className="flex flex-row gap-3 items-center px-2 py-1.5 w-full rounded-md cursor-pointer transition-colors hover:bg-bg-200" href={result.url} onClick={handleClick} rel="noopener noreferrer" target="_blank">
      <div className="flex-shrink-0"><CoworkFavicon fallback={<CoworkWebGlyph className="text-text-500" size={12} />} size={12} url={result.faviconUrl || result.url} /></div>
      <div className="w-0 flex-grow font-small text-text-300 truncate">{result.title}</div>
      <div className="text-xs text-text-400 shrink-0">{hostname}</div>
    </a>
  );
});

function parseWebSearchResults(result?: CoworkContentBlock): SearchResult[] {
  if (!result?.content) return [];
  try {
    if (Array.isArray(result.content)) {
      const metadata = result.content.filter(isWebpageMetadata);
      if (metadata.length > 0) return metadata.map(metadataResult);
    }
    return linkResults(toolResultText(result.content));
  } catch {
    return [];
  }
}

function linkResults(text: string): SearchResult[] {
  const marker = text.indexOf("Links:");
  if (marker < 0) return [];
  const json = balancedJsonArray(text.slice(marker + 6).trim());
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.flatMap(normalizeSearchResult) : [];
  } catch {
    return [];
  }
}

function balancedJsonArray(text: string) {
  if (!text.startsWith("[")) return "";
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (escaped) escaped = false;
    else if (char === "\\") escaped = true;
    else if (char === "\"") quoted = !quoted;
    else if (!quoted && char === "[") depth += 1;
    else if (!quoted && char === "]" && --depth === 0) return text.slice(0, index + 1);
  }
  return "";
}

function isWebpageMetadata(value: CoworkContentBlock) {
  return value.type === "knowledge" && asRecord(value.metadata).type === "webpage_metadata";
}

function metadataResult(value: CoworkContentBlock): SearchResult {
  const metadata = asRecord(value.metadata);
  return { faviconUrl: stringValue(metadata.favicon_url), title: stringValue(value.title) ?? "", url: stringValue(value.url) ?? "" };
}

function normalizeSearchResult(value: unknown): SearchResult[] {
  const record = asRecord(value);
  const url = stringValue(record.url);
  return url ? [{ title: stringValue(record.title) ?? "", url }] : [];
}

function webFetchTitle(result?: CoworkContentBlock) {
  if (!Array.isArray(result?.content)) return null;
  const knowledge = result.content.find((item) => item.type === "knowledge" && stringValue(item.title));
  if (knowledge) return stringValue(knowledge.title) ?? null;
  const text = result.content.find((item) => item.type === "text")?.text;
  if (!text) return null;
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? stringValue(asRecord(parsed[0]).title) ?? null : null;
  } catch {
    return null;
  }
}

function fetchText({ complete, displayTitle, hostname, isError }: { complete: boolean; displayTitle: string; hostname: string | null; isError: boolean }) {
  if (!complete) return hostname ? `Fetching from ${hostname}` : "Fetching page";
  if (isError) return <>Failed to fetch <span className="text-text-400">{displayTitle}</span></>;
  return displayTitle;
}

function hostnameForUrl(url: string) {
  try { return new URL(url).hostname; } catch { return null; }
}

function resultCountText(count: number) {
  return `${count} ${count === 1 ? "result" : "results"}`;
}

function toolRowProps(props: ToolGroupProps) {
  return {
    isFirstBlockOfMessage: props.isFirstBlockOfMessage,
    isFirstItemInGroup: props.isFirstItemInGroup,
    isLastBlockOfMessage: props.isLastBlockOfMessage,
    isLastItemInGroup: props.isLastItemInGroup,
    renderMode: props.renderMode,
  };
}
