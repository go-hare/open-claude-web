/**
 * Official Code Artifact → Fu `artifact_surface` (pin 2.31226.1).
 *
 * Kind: cd5a31703-B4nKQMBN.js `IBe.Artifact="artifact_surface"`, `vH.artifact_surface.rollUp="stands-alone"`.
 * Verbs: c52b02f3f-DbJ5Omt6.js `V()` case `"Artifact"` — Published artifact `7uV1fZWnrM`,
 *   meta `X(o("file_path"))` `metaIsCode:!0`; pin/unpin when `!ee(t)` and `re(input)` is boolean.
 * Card: cd5a `DX` → `AX`/`jX` → `kX` (not Cowork chat-artifact pane).
 *
 * `ate` = shared-75 `cC` (action undefined|"publish"|open). `ste` = `iC` (undefined|"publish").
 * This module extracts path/title; the card is `kX`. Coordinator mounts on `tool.name==="Artifact"`.
 */

export const OFFICIAL_ARTIFACT_SURFACE_KIND = "artifact_surface" as const;
export const OFFICIAL_ARTIFACT_TOOL_NAME = "Artifact" as const;

export const OFFICIAL_ARTIFACT_SOURCE_CD5A = "cd5a31703-B4nKQMBN.js";
export const OFFICIAL_ARTIFACT_SOURCE_C52B = "c52b02f3f-DbJ5Omt6.js";
export const OFFICIAL_ARTIFACT_SOURCE_C425 = "c425fb3cf-C8q5-d1_.js";
export const OFFICIAL_ARTIFACT_SOURCE_C26FB = "c26fb8b6b-EDdRebCk.js";

/** c52b `V()` publish verb. */
export const OFFICIAL_ARTIFACT_PUBLISHED_ID = "7uV1fZWnrM";
export const OFFICIAL_ARTIFACT_PUBLISHING_ID = "Ew7dImkRcE";
export const OFFICIAL_ARTIFACT_FAILED_PUBLISH_ID = "hvuWG63j30";
export const OFFICIAL_ARTIFACT_PINNED_ID = "faqpqDCZf/";
export const OFFICIAL_ARTIFACT_UNPINNED_ID = "9h0cIqBkHg";
export const OFFICIAL_ARTIFACT_LISTED_ID = "/WuSgqfey0";
export const OFFICIAL_ARTIFACT_USED_ID = "GNvwmHAgCG";

/** cd5a `kX` aria / fallback. */
export const OFFICIAL_ARTIFACT_OPEN_LABEL_ID = "KwI0wrhHjZ";
export const OFFICIAL_ARTIFACT_UNTITLED_ID = "7tJmPLpUEM";
export const OFFICIAL_ARTIFACT_UNTITLED_LABEL = "Untitled artifact";

/** c425 `z` as `h`/`Sy` — kX inner row. */
export const OFFICIAL_ARTIFACT_KX_ROW =
  "relative isolate flex self-start min-w-[318px] max-w-[318px] items-start gap-xs rounded-lg pl-2.5 pr-xs py-sm text-left";
/** c425 `B` as `m`/`Dy` — only when `onOpen` is set. */
export const OFFICIAL_ARTIFACT_KX_CLICKABLE =
  "group/btn focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus";
export const OFFICIAL_ARTIFACT_KX_OUTER = "flex flex-col w-full my-[6px]";
/** c425 `G` as `T`/`hy`. */
export const OFFICIAL_ARTIFACT_KX_SURFACE =
  "epitaxy-task-card-surface epitaxy-card-outline-inset absolute inset-0 -z-[1] rounded-[inherit] group-hover/btn:bg-fill-ghost-hover";

export type OfficialArtifactSurfaceAction =
  | "publish"
  | "open"
  | "update"
  | "pin"
  | "unpin"
  | "list"
  | "share"
  | string;

export type OfficialArtifactSurfaceExtract = {
  action: OfficialArtifactSurfaceAction;
  filePath: string | undefined;
  title: string | undefined;
  url: string | undefined;
  /** Header text: title, else `file_path` (c52b meta), else Untitled. */
  header: string;
  /** shared-75 `cC` — kX / DX input. */
  isSurfaceInput: boolean;
  /** shared-75 `fC` — true pin, false unpin, else undefined. */
  pin: boolean | undefined;
};

export type OfficialArtifactSurfaceTool = {
  name: string;
  input: Record<string, unknown>;
  output?: string;
  isError?: boolean;
  status?: string;
};

export function isOfficialArtifactTool(name: string | undefined): boolean {
  return name === OFFICIAL_ARTIFACT_TOOL_NAME;
}

/** shared-75 `iC` — action omitted or `"publish"`. */
export function isOfficialArtifactPublishInput(input: Record<string, unknown> | undefined): boolean {
  const action = input?.action;
  return action === undefined || action === "publish";
}

/** shared-75 `aC`. */
export function isOfficialArtifactOpenInput(input: Record<string, unknown> | undefined): boolean {
  return input?.action === "open";
}

/** shared-75 `cC` = `iC || aC`. cd5a `ate` / `DX`. */
export function isOfficialArtifactSurfaceInput(input: Record<string, unknown> | undefined): boolean {
  return isOfficialArtifactPublishInput(input) || isOfficialArtifactOpenInput(input);
}

/** shared-75 `fC`. */
export function officialArtifactPinState(input: Record<string, unknown> | undefined): boolean | undefined {
  if (typeof input !== "object" || !input) return undefined;
  const action = input.action;
  const pin = input.pin;
  if (action === "pin") return true;
  if (action === "unpin") return false;
  if (isOfficialArtifactPublishInput(input) && pin === true) return true;
  return undefined;
}

function stringField(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function parseOutputRecord(output: string | undefined): Record<string, unknown> | undefined {
  if (!output) return undefined;
  const trimmed = output.trim();
  if (!trimmed) return undefined;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    /* shared-28 `Xk` also accepts "Created a new Artifact at <url>" / Published … at https:// */
  }
  return undefined;
}

/** shared-28 `Xk` URL scrape (publish text / first https URL). Local `file_path` is preferred. */
function parseOutputUrl(output: string | undefined): { url: string; path?: string } | undefined {
  if (!output) return undefined;
  const trimmed = output.trim();
  const record = parseOutputRecord(trimmed);
  if (record) {
    const url = stringField(record.url);
    if (url) {
      return { url, path: stringField(record.path) ?? stringField(record.file_path) };
    }
  }
  const prefixes = [
    "Created a new Artifact at ",
    "Updated the Artifact at ",
    "Opened the Artifact at ",
  ];
  for (const prefix of prefixes) {
    if (trimmed.startsWith(prefix)) {
      const rest = trimmed.slice(prefix.length);
      const token = /^\S+/.exec(rest)?.[0]?.replace(/[.,:;!?)]+$/, "");
      if (token?.startsWith("https://")) {
        const withPath = /^\S+(?: \([^)]*\))? with (.+?) \(and any `files` listed\)/.exec(rest);
        return { url: token, path: withPath?.[1] };
      }
    }
  }
  const published = /^Published (.+) at (https:\/\/\S+)/.exec(trimmed);
  if (published?.[2]) {
    return { url: published[2].replace(/[.,:;!?)]+$/, ""), path: published[1] };
  }
  const https = /https:\/\/\S+/.exec(trimmed);
  if (https?.[0]) {
    return { url: https[0].replace(/[.,:;!?)]+$/, "") };
  }
  return undefined;
}

export function officialArtifactFilePath(
  input: Record<string, unknown> | undefined,
  output?: string,
): string | undefined {
  const fromInput = stringField(input?.file_path) ?? stringField(input?.path);
  if (fromInput) return fromInput;
  const record = parseOutputRecord(output);
  const fromOutput = stringField(record?.file_path) ?? stringField(record?.path);
  if (fromOutput) return fromOutput;
  return parseOutputUrl(output)?.path;
}

export function officialArtifactTitle(
  input: Record<string, unknown> | undefined,
  output?: string,
): string | undefined {
  const fromInput = stringField(input?.title);
  if (fromInput) return fromInput;
  const record = parseOutputRecord(output);
  return stringField(record?.title) ?? stringField(record?.label);
}

export function officialArtifactAction(input: Record<string, unknown> | undefined): OfficialArtifactSurfaceAction {
  const action = input?.action;
  if (typeof action === "string" && action.trim() !== "") return action;
  return "publish";
}

/**
 * Header: `title` if present, else c52b `file_path` meta, else Untitled (`7tJmPLpUEM`).
 * kX uses `cl(label)`; Code local publish has no vanity URL — file_path is the header.
 */
export function officialArtifactHeader(filePath: string | undefined, title: string | undefined): string {
  return title ?? filePath ?? OFFICIAL_ARTIFACT_UNTITLED_LABEL;
}

export function extractOfficialArtifactSurface(tool: OfficialArtifactSurfaceTool): OfficialArtifactSurfaceExtract | null {
  if (!isOfficialArtifactTool(tool.name)) return null;
  const input = tool.input ?? {};
  const filePath = officialArtifactFilePath(input, tool.output);
  const title = officialArtifactTitle(input, tool.output);
  const parsedUrl = parseOutputUrl(tool.output);
  const url = parsedUrl?.url;
  if (!filePath && !url && !title) return null;
  const action = officialArtifactAction(input);
  return {
    action,
    filePath,
    title,
    url,
    header: officialArtifactHeader(filePath, title),
    isSurfaceInput: isOfficialArtifactSurfaceInput(input),
    pin: officialArtifactPinState(input),
  };
}

export function officialArtifactPublishedVerb(status?: string, isError?: boolean): {
  id: string;
  text: string;
} {
  if (isError === true || status === "error" || status === "failed") {
    return { id: OFFICIAL_ARTIFACT_FAILED_PUBLISH_ID, text: "Failed to publish artifact" };
  }
  if (status === "running" || status === "pending") {
    return { id: OFFICIAL_ARTIFACT_PUBLISHING_ID, text: "Publishing artifact" };
  }
  return { id: OFFICIAL_ARTIFACT_PUBLISHED_ID, text: "Published artifact" };
}
