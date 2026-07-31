/**
 * Official index-BELzQL5P MAt / SAt residual (Cowork session error banner).
 * retryHelps gates Try again — product banner should honor it even if some
 * call sites always pass onTryAgain.
 */
export type CoworkSessionErrorCopy = {
  body: string;
  isKnownCategory: boolean;
  /** Official MAt.retryHelps — false → do not show Try again. */
  retryHelps: boolean;
  title: string;
};

const generic: CoworkSessionErrorCopy = {
  body: "Try sending your message again. If it keeps happening, share feedback so we can investigate.",
  isKnownCategory: false,
  retryHelps: true,
  title: "Something went wrong",
};

const reinstall = "The Claude Code binary is missing or damaged. Reinstall Claude Desktop to continue.";
const tryAgain = "Try sending your message again.";
const tryAgainOrReport = generic.body;

type CategoryCopy = Omit<CoworkSessionErrorCopy, "isKnownCategory">;

const errorCopies: Record<string, CategoryCopy> = {
  sdk_binary_missing: { title: "Claude Code couldn't start", body: reinstall, retryHelps: false },
  sdk_binary_arch_mismatch: {
    title: "Claude Code couldn't start",
    body: "The Claude Code binary doesn't match this computer's architecture. Reinstall Claude Desktop for your platform.",
    retryHelps: false,
  },
  sdk_binary_corrupt: { title: "Claude Code couldn't start", body: tryAgain, retryHelps: true },
  disclaimer_binary_missing: { title: "Claude Code couldn't start", body: reinstall, retryHelps: false },
  spawn_failed: {
    title: "Claude Code couldn't start",
    body: "Restarting Claude Desktop may resolve this.",
    retryHelps: true,
  },
  segfault: { title: "Claude Code crashed", body: tryAgainOrReport, retryHelps: true },
  process_crashed: { title: "Claude Code crashed", body: tryAgainOrReport, retryHelps: true },
  renderer_cascade: { title: "Session was interrupted", body: tryAgain, retryHelps: true },
  process_interrupted: { title: "Session was interrupted", body: tryAgain, retryHelps: true },
  endpoint_security_blocked: {
    title: "Blocked by endpoint security",
    body: "Your endpoint-security software blocked Claude Code. Ask your IT team to allowlist signing Team ID Q6L2SF6YDW.",
    retryHelps: false,
  },
  cli_fastfail: { title: "Claude Code crashed", body: tryAgainOrReport, retryHelps: true },
  cli_shutdown_crash_benign: { title: "Session was interrupted", body: tryAgain, retryHelps: true },
  dll_not_found: {
    title: "Missing system library",
    body: "A Windows system library is missing. Reinstall Claude Desktop or repair the Visual C++ Redistributable.",
    retryHelps: false,
  },
  bun_crash: { title: "Claude Code crashed", body: tryAgainOrReport, retryHelps: true },
  auth_error: {
    title: "You've been signed out",
    body: "Sign in again to continue, then resend your message.",
    retryHelps: false,
  },
  github_auth: {
    title: "GitHub access check failed",
    body: "Your GitHub credentials were rejected. Reconnect GitHub, then send your message again.",
    retryHelps: false,
  },
  rate_limit: {
    title: "Usage limit reached",
    body: "You've reached your usage limit. Try again after your limit resets.",
    retryHelps: true,
  },
  network_error: {
    title: "Can't reach Anthropic",
    body: "Check your internet connection (and VPN or proxy if you use one), then try again.",
    retryHelps: true,
  },
  connection_refused: {
    title: "Connection refused",
    body: "Check that your SSH host or local proxy is reachable, then try again.",
    retryHelps: true,
  },
  json_parse_error: {
    title: "Unexpected output from Claude Code",
    body: "Restarting Claude Desktop may resolve this.",
    retryHelps: true,
  },
  filesystem_error: {
    title: "Disk error",
    body: "Reading or writing the session folder failed. Check disk space and permissions, then try again.",
    retryHelps: true,
  },
  cli_stdout_pollution: {
    title: "Unexpected output from Claude Code",
    body: "A shell hook or tool wrote unexpected output. Check your shell startup files and Claude Code hooks for stray stdout writes.",
    retryHelps: false,
  },
  cli_resume_not_found: {
    title: "Couldn't restore the previous session",
    body: "The previous transcript couldn't be found on disk. Send your message again — it will start a fresh session.",
    retryHelps: true,
  },
  stream_ended_no_result: { title: "Claude Code stopped responding", body: tryAgain, retryHelps: true },
  git_not_found: {
    title: "Git is required",
    body: "Install Git (Xcode Command Line Tools on macOS, Git for Windows on Windows), then try again.",
    retryHelps: false,
  },
  cwd_not_found: {
    title: "Folder not found",
    body: "This session's working folder no longer exists. Choose a different folder or start a new session.",
    retryHelps: false,
  },
  timeout: { title: "Claude Code stopped responding", body: tryAgain, retryHelps: true },
  trust_required: {
    title: "Workspace trust needed",
    body: "Approve this folder in the trust prompt to continue.",
    retryHelps: true,
  },
  bun_cwd_eperm: {
    title: "Folder access denied",
    body: "Claude can't read this folder. Grant access in System Settings → Privacy & Security → Files and Folders, then try again.",
    retryHelps: false,
  },
  os_too_old: {
    title: "macOS version not supported",
    body: "Claude Code requires a newer version of macOS. Update macOS to continue.",
    retryHelps: false,
  },
  claudecode_nested: {
    title: "Nested session detected",
    body: "Claude Code can't run inside another Claude Code session. Close the outer session and try again.",
    retryHelps: false,
  },
  otel_console_exporter: {
    title: "Telemetry config conflict",
    body: "An OTEL console exporter in settings.json is interfering with Claude Code. Remove the OTEL_*_EXPORTER=console setting and try again.",
    retryHelps: false,
  },
  bridge_offline: {
    title: "Remote Control disconnected",
    body: "Your terminal's Claude Code session stopped responding. Check your terminal for errors, then resend your message.",
    retryHelps: true,
  },
};

/** Official SAt(formatMessage, category) residual. */
export function coworkSessionErrorCopy(category?: string | null): CoworkSessionErrorCopy {
  const copy = category ? errorCopies[category] : undefined;
  return copy ? { ...copy, isKnownCategory: true } : generic;
}
