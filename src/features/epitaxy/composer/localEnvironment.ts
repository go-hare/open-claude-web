export const LOCAL_ENV_PLACEHOLDER = `NODE_ENV=production
GIT_AUTHOR_NAME=Your Name

# Multiline values - wrap in quotes
CONFIG="key1=val1
key2=val2"`;

const envLinePattern = /(?:^|\n)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?=$|\n)/g;
const envKeyPattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const managedEnvKeys = [
  "PATH",
  "CLAUDE_CODE_ENTRYPOINT",
  "CLAUDE_CODE_OAUTH_TOKEN",
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_BASE_URL",
  "DISABLE_AUTOUPDATER",
  "CLAUDE_CODE_EMIT_TOOL_USE_SUMMARIES",
  "CLAUDE_CODE_DISABLE_CRON",
];

export function parseLocalEnvironmentInput(input: string): Record<string, string> {
  const env: Record<string, string> = {};
  const normalized = input.replace(/\r\n?/g, "\n");
  let match: RegExpExecArray | null;
  envLinePattern.lastIndex = 0;

  while ((match = envLinePattern.exec(normalized)) !== null) {
    const key = match[1];
    let value = (match[2] ?? "").trim();
    const quote = value[0];
    value = value.replace(/^(['"`])([\s\S]*)\1$/gm, "$2");
    if (quote === "\"") {
      value = value.replace(/\\n/g, "\n").replace(/\\r/g, "\r");
    }
    env[key] = value;
  }

  return env;
}

export function formatLocalEnvironmentEnv(env: Record<string, string>): string {
  return Object.entries(env)
    .map(([key, value]) => {
      if (
        !value.includes("\n")
        && !value.includes("$")
        && !value.includes("#")
        && !value.includes("\"")
        && !value.includes("'")
        && !value.startsWith(" ")
        && !value.endsWith(" ")
      ) {
        return `${key}=${value}`;
      }
      if (!value.includes("'")) return `${key}='${value}'`;
      return `${key}="${value.replace(/"/g, "\\\"")}"`;
    })
    .join("\n");
}

export function validateLocalEnvironmentInput(input: string): string | undefined {
  if (!input.trim()) return undefined;
  const env = parseLocalEnvironmentInput(input);

  for (const key of Object.keys(env)) {
    if (!envKeyPattern.test(key)) return `Invalid key "${key}". Use letters, numbers, and underscores only.`;
    if (managedEnvKeys.includes(key)) return `"${key}" is managed by Claude Desktop and cannot be overridden.`;
  }

  return undefined;
}
