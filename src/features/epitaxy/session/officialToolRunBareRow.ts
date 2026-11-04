/**
 * Official cd57a9664 `K` (`HC`) + cd5a31703 `B1` (`rendersBareRow`).
 *
 * A default tool run paints t2e/Zg standalone only when every tool shares the
 * same Read/Write/Edit file key (or the run is a single tool). Two Bash (or
 * two Reads of different files) are a group card — header `rhe` "Ran 2 commands".
 */

const OFFICIAL_SAME_FILE_COALESCE_NAMES = new Set([
  "Read",
  "Write",
  "Edit",
  "MultiEdit",
  "NotebookEdit",
]);

export type OfficialBareRowTool = {
  id: string;
  input: Record<string, unknown>;
  name: string;
  precedingThinking?: string[];
};

/** Official cd57 `W`/`G`: `${Read|Write|Edit} ${file_path}` or null. */
export function officialSameFileCoalesceKey(tool: OfficialBareRowTool): string | null {
  if (!OFFICIAL_SAME_FILE_COALESCE_NAMES.has(tool.name)) return null;
  const name = tool.name === "MultiEdit" ? "Edit" : tool.name;
  const path = tool.input.file_path ?? tool.input.notebook_path;
  if (typeof path !== "string") return null;
  return `${name} ${path}`;
}

/** Official cd57 `K` / cd5a `HC`. Empty → false; one tool → true even when key is null. */
export function officialHcSameFileRun(tools: OfficialBareRowTool[]): boolean {
  if (tools.length === 0) return false;
  const key = officialSameFileCoalesceKey(tools[0]!);
  for (let index = 1; index < tools.length; index += 1) {
    if (key === null || officialSameFileCoalesceKey(tools[index]!) !== key) return false;
  }
  return true;
}

/**
 * Official cd5a `B1(e, t, n)` without the `t` coalesce-groups argument (callers
 * pass the run's tools; `hSe` same-file splits happen only inside o2e).
 * `events` is unused on the product run object.
 */
export function officialRendersBareRow({
  memoryOps,
  showThinking = false,
  taskEvents,
  tools,
}: {
  memoryOps?: unknown;
  showThinking?: boolean;
  taskEvents?: unknown[] | null;
  tools: OfficialBareRowTool[];
}): boolean {
  if (memoryOps || taskEvents?.length) return false;
  if (showThinking) {
    for (let index = 1; index < tools.length; index += 1) {
      if (tools[index]?.precedingThinking?.length) return false;
    }
  }
  return officialHcSameFileRun(tools);
}
