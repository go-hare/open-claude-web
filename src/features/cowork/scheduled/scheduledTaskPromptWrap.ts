/**
 * Official scheduled-task automated-run prompt residual (index-BELzQL5P Lwe/Fwe/Uwe/pYt).
 * Mirror of desktop host helper so Cowork / Code Run now wraps the same message shape.
 * Do not invent remote jEe or session_started host rewrite here — wrap only.
 */

/** Official Lwe. */
export const SCHEDULED_TASK_AUTOMATED_RUN_PROMPT =
  'This is an automated run of a scheduled task. The user is not present to answer questions. For implementation details, execute autonomously without asking clarifying questions — make reasonable choices and note them in your output. "write" actions (e.g. MCP tools that send, post, create, update, or delete), only take them if the task file asks for that specific action. When in doubt, producing a report of what you found is the correct output.';

/** Official Pwe — skill slash at body start. */
const SCHEDULED_TASK_SKILL_PREFIX = /^\/([a-zA-Z][\w:.-]*)/;

/** Official Uwe: drop leading YAML frontmatter fence. */
export function stripScheduledTaskFrontmatter(content: string): string {
  return content.replace(/^---\n[\s\S]*?\n---\n+/, "").trim();
}

/**
 * Official pYt inner wrap (extends Fwe with optional skill invoke).
 * name residual = scheduledTaskId; file residual = task.filePath (may be empty product-side).
 */
export function wrapScheduledTaskRunPrompt(
  name: string,
  file: string,
  body: string,
): string {
  const skillMatch = body.match(SCHEDULED_TASK_SKILL_PREFIX);
  const skillPrefix = skillMatch
    ? `Invoke the skill "${skillMatch[1]}" using the Skill tool, then follow the remaining instructions.\n\n`
    : "";
  return `<scheduled-task name="${name}" file="${file}">\n${SCHEDULED_TASK_AUTOMATED_RUN_PROMPT}\n\n${skillPrefix}${body}\n</scheduled-task>`;
}

/**
 * Resolve fire message for UI Run now (residual pYt body).
 * Prefer file content when bridge returns it; else task.prompt.
 */
export function resolveScheduledTaskRunMessage(input: {
  taskId: string;
  filePath?: string;
  fileContent?: string;
  prompt?: string;
}): string | null {
  const raw =
    (typeof input.fileContent === "string" && input.fileContent.trim().length > 0
      ? input.fileContent
      : undefined)
    ?? (typeof input.prompt === "string" && input.prompt.trim().length > 0
      ? input.prompt
      : undefined)
    ?? "";
  const body = stripScheduledTaskFrontmatter(raw);
  if (!body) return null;
  return wrapScheduledTaskRunPrompt(
    input.taskId,
    typeof input.filePath === "string" ? input.filePath : "",
    body,
  );
}
