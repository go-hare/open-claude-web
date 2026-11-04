/**
 * Official cd5a31703 e2 / Kb leftover kinds (Q0 nK xK wK TX dX fX zX VZe MX LX PX NX).
 * Parse helpers for coordinator eke. SKIP channel aX/oX and Computer Pn.
 *
 * Pin evidence:
 * - e2 switch: `cd5a31703-B4nKQMBN.js` `j.kind===`
 * - eke push: `c06cf64bb-BadUL178.js` (local_command / system subtype / assistant stop / user /clear)
 * - remote-control stamp map `dc`/`uc`: `c06cf64bb-BadUL178.js`
 * - prompt-block `xr`: `cb6960d66-5ldJJrEu.js`
 * - peer hold `ac`: `c7d4a4512-Fu8KaFVe.js`
 * - /clear `Js`: `c7d4a4512-Fu8KaFVe.js`
 * - auto-mode apply `Gn`: `c7d4a4512-Fu8KaFVe.js`
 */

export type OfficialRemoteControlNoticeKind =
  | "already_on"
  | "connect_failed"
  | "disconnect_failed"
  | "reconnect_failed";

export type OfficialRemoteControlCause =
  | "needs_subscription"
  | "network"
  | "org_policy"
  | "process_stopped"
  | "retry"
  | "sign_in"
  | "update";

export type OfficialRemoteControlNotice = {
  cause?: OfficialRemoteControlCause;
  hostCli?: "ssh" | "ssh_app" | "wsl";
  kind: OfficialRemoteControlNoticeKind;
  retries?: boolean;
};

export type OfficialAutoModeSetupAppliedResult = {
  autoModeKeysWritten: string[];
  filePath: string;
  permissionsAllowNotFound: string[];
  permissionsAllowSkipped: boolean;
  warnings: string[];
};

export type OfficialPeerHoldState = "dropped" | "held" | "released";

export type OfficialKbNoticeItem =
  | { id: string; kind: "auto_mode_notice"; variant?: string }
  | { id: string; kind: "auto_mode_setup_applied"; raw: string; result: OfficialAutoModeSetupAppliedResult }
  | { id: string; kind: "computer_disconnected"; sentence: string }
  | { id: string; kind: "context_cleared" }
  | { id: string; kind: "gap_fill_failed" }
  | { id: string; kind: "narration_summary"; text: string }
  | {
    actionable?: boolean;
    id: string;
    kind: "remote_control_notice";
    notice: OfficialRemoteControlNotice;
  }
  | {
    cause?: string;
    from: string;
    id: string;
    kind: "peerHold";
    messageUuid: string;
    name?: string;
    outcome?: string;
    state: OfficialPeerHoldState;
  }
  | { id: string; kind: "prompt_blocked"; originalPrompt?: string; reason: string }
  | { id: string; kind: "status" }
  | { id: string; kind: "stop_warning"; stopReason: "prompt_injection_risk" }
  | { id: string; kind: "usage" };

export type OfficialKbNoticeKind = OfficialKbNoticeItem["kind"];

const OFFICIAL_KB_NOTICE_KINDS = new Set<OfficialKbNoticeKind>([
  "auto_mode_notice",
  "auto_mode_setup_applied",
  "computer_disconnected",
  "context_cleared",
  "gap_fill_failed",
  "narration_summary",
  "peerHold",
  "prompt_blocked",
  "remote_control_notice",
  "status",
  "stop_warning",
  "usage",
]);

export function isOfficialKbNoticeItem(item: { kind: string }): item is OfficialKbNoticeItem {
  return OFFICIAL_KB_NOTICE_KINDS.has(item.kind as OfficialKbNoticeKind);
}

/** Coordinator merge: eke system subtype → leftover kind (not hook_notice / compacted / task_event). */
export const OFFICIAL_KB_EKE_SUBTYPE_TO_KIND = {
  auto_mode_notice: "auto_mode_notice",
  auto_mode_setup_applied: "auto_mode_setup_applied",
  computer_disconnected: "computer_disconnected",
  context_cleared: "context_cleared",
  gap_fill_failed: "gap_fill_failed",
  informational: "prompt_blocked",
  local_command: "usage",
  local_command_output: "usage",
  narration_summary: "narration_summary",
  peer_message_hold: "peerHold",
  prompt_blocked: "prompt_blocked",
  remote_control_notice: "remote_control_notice",
  stop_warning: "stop_warning",
} as const;

/** Copy ids + English defaultMessage (pin formatMessage). Coordinator may merge into chrome messages. */
export const OFFICIAL_KB_NOTICE_MESSAGES = {
  contextCleared: { defaultMessage: "Context cleared", id: "88OlIQOrZj" },
  gapFillFailed: { defaultMessage: "Some messages may be missing — <a>reload</a>", id: "Gd19zJfyPn" },
  promptBlockedHeadline: { defaultMessage: "A hook blocked your prompt", id: "VkMeXWpsli" },
  promptBlockedStep: { defaultMessage: "Prompt blocked by a hook", id: "2xRJ11ITc6" },
  promptBlockedHint: {
    defaultMessage: "A UserPromptSubmit hook stopped this prompt before it reached Claude.",
    id: "AbqNJg2Rx4",
  },
  editPrompt: { defaultMessage: "Edit prompt", id: "TmqQS2M3WB" },
  stopWarningInjection: {
    defaultMessage: "Claude stopped because the page content may contain a prompt injection. Review the page before continuing.",
    id: "xmXPKqaNPZ",
  },
  usageEmpty: {
    defaultMessage: "No usage data yet — plan usage appears once limits load, and session usage after Claude’s first reply",
    id: "OIASpphXDW",
  },
  usageAria: { defaultMessage: "Usage", id: "/na3E29UgN" },
  statusTitle: { defaultMessage: "Session info", id: "El20cfeNaL" },
  statusLoading: { defaultMessage: "Loading session info…", id: "DXufX1Giis" },
  remoteControlOnNow: { defaultMessage: "Remote Control is on now.", id: "DQPpxkCrL4" },
  remoteControlAlreadyOn: {
    defaultMessage: "Remote Control is already on: this session connected automatically when it started. Send /remote-control again to turn it off.",
    id: "remote_control_already_on",
  },
  turnOff: { defaultMessage: "Turn off", id: "XZ+Fx6Wrzh" },
  turnOnRemoteControl: { defaultMessage: "Turn on Remote Control", id: "L8mn/dFykI" },
  tryAgain: { defaultMessage: "Try again", id: "FazwRldA7z" },
  autoModeSetupApplied: { defaultMessage: "Auto mode settings applied", id: "1d807d8" },
  autoModeSetupWrote: { defaultMessage: "Wrote settings to", id: "j3xrk3" },
  autoModeSetupWarnings: { defaultMessage: "Warnings", id: "1bkenqc" },
  autoModeSetupAllowNotFound: {
    defaultMessage: "{count, plural, one {# permissions.allow entry was not found} other {# permissions.allow entries were not found}}",
    id: "1dhov0j",
  },
  showDetails: { defaultMessage: "Show details", id: "x7sq2x" },
  hideDetails: { defaultMessage: "Hide details", id: "1klrv4e" },
  autoModeDocs: { defaultMessage: "Learn more about permission modes", id: "1ecef6k" },
  autoModeHeadline: { defaultMessage: "Auto mode", id: "auto_mode_headline" },
  autoModeBody: {
    defaultMessage: "Claude can run more tools without asking each time.",
    id: "auto_mode_body",
  },
  peerHoldHeld: { defaultMessage: "Waiting for a reply", id: "1ewyjt4" },
  peerHoldReleased: { defaultMessage: "Hold released", id: "199tx00" },
  peerHoldDefault: { defaultMessage: "Hold", id: "1lmql8p" },
  peerHoldExpired: { defaultMessage: "Hold expired", id: "1ypp69b" },
  peerHoldRefused: { defaultMessage: "Hold refused", id: "13adme2" },
  peerHoldDropped: { defaultMessage: "Message dropped", id: "1h6lsi2" },
  peerHoldDiscarded: { defaultMessage: "Message discarded", id: "184fsav" },
  peerHoldModeMismatch: { defaultMessage: "Mode mismatch", id: "5ffkot" },
  peerHoldNoModeAsserted: { defaultMessage: "No mode asserted", id: "21v84t" },
  peerHoldBypassDefault: { defaultMessage: "Bypass default", id: "hnodav" },
  peerHoldModeUnknown: { defaultMessage: "Unknown mode", id: "13n9nln" },
  peerHoldInvalidSetting: { defaultMessage: "Invalid setting", id: "5qjq08" },
  peerHoldExplicitSetting: { defaultMessage: "From settings", id: "664c75" },
} as const;

const PROMPT_BLOCKED_PREFIX = /^(?:UserPromptSubmit|UserPromptExpansion) operation blocked by hook:/;
const PROMPT_STOPPED_LABEL = "Operation stopped by hook";
const SYSTEM_REMINDER_OPEN = "<system-reminder>";
const SYSTEM_REMINDER_CLOSE = "</system-reminder>";
const SYSTEM_REMINDER_MAX = 300;
const CONTROL_CHAR = /[\p{C}]/u;

const REMOTE_RECONNECT =
  "Remote Control didn't reconnect after /clear. Turn it on again to keep using this session from your phone or claude.ai.";
const REMOTE_ALREADY_ON =
  "Remote Control is already on: this session connected automatically when it started. Send /remote-control again to turn it off.";
const REMOTE_CONNECT: Record<OfficialRemoteControlCause, string> = {
  sign_in: "Remote Control couldn’t connect. Sign in again, then turn on Remote Control.",
  update: "Remote Control couldn’t connect. Update Claude, then try again.",
  retry: "Remote Control couldn’t connect. Try again in a moment.",
  org_policy: "Remote Control couldn’t connect. Your organization has turned off Remote Control. Ask an admin to turn it on.",
  needs_subscription:
    "Remote Control couldn’t connect. Remote Control needs a Claude subscription. Sign in with an account that has one, then turn on Remote Control.",
  network:
    "Remote Control couldn’t connect. Something on your network blocked Remote Control. Check your VPN or proxy, then try again.",
  process_stopped:
    "Remote Control couldn’t connect. Claude Code stopped before Remote Control connected. Send a message to start it again, then turn on Remote Control.",
};
const REMOTE_CONNECT_RETRY: Partial<Record<OfficialRemoteControlCause, string>> = {
  sign_in: "Remote Control couldn’t connect. Sign in again. Remote Control retries with your next message.",
  process_stopped:
    "Remote Control couldn’t connect. Claude Code stopped before Remote Control connected. Send a message to start it again, and Remote Control retries.",
};
const REMOTE_DISCONNECT: Partial<Record<OfficialRemoteControlCause, string>> = {
  retry: "Remote Control couldn’t turn off. Try again in a moment.",
  process_stopped: "Remote Control is off. Claude Code stopped, so Remote Control turned off with it.",
};
const REMOTE_HOST_UPDATE: Record<NonNullable<OfficialRemoteControlNotice["hostCli"]>, string> = {
  ssh_app:
    "Remote Control couldn’t connect. Update Claude, then start a new session on the remote host and turn on Remote Control.",
  ssh: "Remote Control couldn’t connect. Update Claude Code on the remote host, then start a new session there and turn on Remote Control.",
  wsl: "Remote Control couldn’t connect. Update Claude Code in the distribution, then start a new session there and turn on Remote Control.",
};

const PEER_HOLD_STATES = new Set<OfficialPeerHoldState>(["held", "released", "dropped"]);
const PEER_HOLD_TOKEN = /^[a-z][a-z-]{0,40}$/;

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

function entryId(raw: Record<string, unknown>, index: number, prefix: string) {
  return stringValue(raw.uuid) ?? stringValue(raw.id) ?? `${prefix}-${index}`;
}

function parentToolUseId(raw: Record<string, unknown>) {
  return stringValue(raw.parent_tool_use_id) ?? stringValue(raw.parentToolUseId);
}

function localCommandBody(content: string) {
  const stdout = content.match(/<local-command-stdout>([\s\S]*?)<\/local-command-stdout>/)?.[1]?.trim();
  const stderr = content.match(/<local-command-stderr>([\s\S]*?)<\/local-command-stderr>/)?.[1]?.trim();
  return (stderr || stdout || content).trim();
}

function looksLikeContextOrStats(body: string) {
  return /<(?:total_tokens|ctx_window|code-stats)/.test(body);
}

/** Official `xr` (`cb6960d66`). */
export function parseOfficialPromptHookBlock(content: string): {
  kind: "blocked" | "stopped";
  originalPrompt?: string;
  reason: string;
} | null {
  const blocked = PROMPT_BLOCKED_PREFIX.exec(content);
  if (blocked) {
    const rest = content.slice(blocked[0].length);
    const marker = "\n\nOriginal prompt: ";
    const split = rest.indexOf(marker);
    if (split === -1) return { kind: "blocked", reason: rest.trim() };
    return {
      kind: "blocked",
      originalPrompt: rest.slice(split + marker.length),
      reason: rest.slice(0, split).trim(),
    };
  }
  if (content.startsWith(PROMPT_STOPPED_LABEL)) {
    return { kind: "stopped", reason: content.slice(PROMPT_STOPPED_LABEL.length).replace(/^:\s*/, "").trim() };
  }
  return null;
}

/** Official `yi` / `ri` — blocked item fields. */
function promptBlockedItem(id: string, parsed: { originalPrompt?: string; reason: string }): Extract<OfficialKbNoticeItem, { kind: "prompt_blocked" }> {
  return parsed.originalPrompt === undefined
    ? { id, kind: "prompt_blocked", reason: parsed.reason }
    : { id, kind: "prompt_blocked", originalPrompt: parsed.originalPrompt, reason: parsed.reason };
}

/** Official `dc`/`uc` (`c06cf64bb`). */
export function parseOfficialRemoteControlNoticeFromText(text: string): OfficialRemoteControlNotice | undefined {
  if (text === REMOTE_RECONNECT) return { kind: "reconnect_failed" };
  if (text === REMOTE_ALREADY_ON) return { kind: "already_on" };
  for (const cause of Object.keys(REMOTE_CONNECT) as OfficialRemoteControlCause[]) {
    if (text === REMOTE_CONNECT[cause]) return { kind: "connect_failed", cause, retries: false };
  }
  for (const cause of Object.keys(REMOTE_CONNECT_RETRY) as OfficialRemoteControlCause[]) {
    const copy = REMOTE_CONNECT_RETRY[cause];
    if (copy && text === copy) return { kind: "connect_failed", cause, retries: true };
  }
  for (const cause of Object.keys(REMOTE_DISCONNECT) as OfficialRemoteControlCause[]) {
    const copy = REMOTE_DISCONNECT[cause];
    if (copy && text === copy) return { kind: "disconnect_failed", cause };
  }
  for (const hostCli of Object.keys(REMOTE_HOST_UPDATE) as NonNullable<OfficialRemoteControlNotice["hostCli"]>[]) {
    if (text === REMOTE_HOST_UPDATE[hostCli]) return { kind: "connect_failed", cause: "update", retries: false, hostCli };
  }
  return undefined;
}

export function officialRemoteControlNoticeSentence(notice: OfficialRemoteControlNotice): string {
  if (notice.kind === "reconnect_failed") return REMOTE_RECONNECT;
  if (notice.kind === "already_on") return REMOTE_ALREADY_ON;
  if (notice.kind === "disconnect_failed") return REMOTE_DISCONNECT[notice.cause ?? "retry"] ?? REMOTE_DISCONNECT.retry ?? "";
  if (notice.hostCli) return REMOTE_HOST_UPDATE[notice.hostCli];
  if (notice.retries && notice.cause) return REMOTE_CONNECT_RETRY[notice.cause] ?? REMOTE_CONNECT[notice.cause];
  if (notice.cause) return REMOTE_CONNECT[notice.cause];
  return REMOTE_CONNECT.retry;
}

function assistantPlainText(raw: Record<string, unknown>): string | undefined {
  const nested = asRecord(raw.message);
  const content = nested.content ?? raw.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content) && content.length === 1) {
    const block = asRecord(content[0]);
    if (block.type === "text" && typeof block.text === "string") return block.text;
  }
  return undefined;
}

/** Official `Hc` stamp: synthetic reply or message without id/model. */
function officialRemoteControlStamp(raw: Record<string, unknown>): "stamped" | "unstamped" | undefined {
  if (raw.isSyntheticReply === true) return "stamped";
  if (!("message" in raw)) return undefined;
  const message = asRecord(raw.message);
  if (!("id" in message && message.id !== undefined) && !("model" in message && message.model !== undefined)) return "unstamped";
  return undefined;
}

/** Official `Gn` apply-result envelope. */
export function parseOfficialAutoModeSetupApplied(stdout: string): OfficialAutoModeSetupAppliedResult | null {
  if (stdout.length > 1e6) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    return null;
  }
  const record = asRecord(parsed);
  if (record.ok !== true) return null;
  if (typeof record.filePath !== "string") return null;
  const keys = record.autoModeKeysWritten;
  const warnings = record.warnings;
  const missing = record.permissionsAllowNotFound;
  if (!Array.isArray(keys) || !keys.every((item) => typeof item === "string")) return null;
  if (!Array.isArray(warnings) || !warnings.every((item) => typeof item === "string")) return null;
  if (!Array.isArray(missing) || !missing.every((item) => typeof item === "string")) return null;
  return {
    autoModeKeysWritten: keys,
    filePath: record.filePath,
    permissionsAllowNotFound: missing,
    permissionsAllowSkipped: record.permissionsAllowSkipped === true,
    warnings,
  };
}

export type OfficialPeerHoldFields = {
  cause?: string;
  from: string;
  messageUuid: string;
  name?: string;
  outcome?: string;
  state: OfficialPeerHoldState;
};

/** Official `ac` peer_message_hold. */
export function parseOfficialPeerHold(raw: Record<string, unknown>): OfficialPeerHoldFields | undefined {
  if (stringValue(raw.type) !== "system" || stringValue(raw.subtype) !== "peer_message_hold") return undefined;
  const messageUuid = stringValue(raw.message_uuid)?.trim();
  const fromRaw = typeof raw.from === "string" ? raw.from.trim() : "";
  const from = fromRaw.length > 0 ? fromRaw : undefined;
  const nameRaw = stringValue(raw.from_name)?.trim();
  const state = stringValue(raw.state);
  if (!messageUuid || !state || !PEER_HOLD_STATES.has(state as OfficialPeerHoldState)) return undefined;
  if (state === "held" && !from) return undefined;
  const cause = stringValue(raw.cause);
  const outcome = stringValue(raw.outcome);
  return {
    messageUuid,
    from: from ?? "",
    ...(nameRaw ? { name: nameRaw } : {}),
    state: state as OfficialPeerHoldState,
    ...(cause && PEER_HOLD_TOKEN.test(cause) ? { cause } : {}),
    ...(outcome && PEER_HOLD_TOKEN.test(outcome) ? { outcome } : {}),
  };
}

/** Official `Js` / `qs` — `/clear` user command. */
export function officialIsClearCommand(text: string) {
  const trimmed = text.trimStart();
  return trimmed.startsWith("/clear") && (trimmed.length === "/clear".length || /\s/.test(trimmed.charAt("/clear".length)));
}

/** Official `fa` computer_disconnected inner sentence. */
export function parseOfficialComputerDisconnectedSentence(raw: Record<string, unknown>, text: string | undefined) {
  const reminderKind = stringValue(raw.reminderKind);
  const inbound = stringValue(raw.inbound_origin) ?? stringValue(raw.inboundOrigin);
  const ccr = asRecord(raw.ccr_event ?? raw.ccrEvent);
  if (reminderKind !== "computer_disconnected" || inbound !== "tool_host_ended_reminder" || ccr.source !== "client") {
    return null;
  }
  if (text === undefined) return null;
  const trimmed = text.trim();
  if (!trimmed.startsWith(SYSTEM_REMINDER_OPEN) || !trimmed.endsWith(SYSTEM_REMINDER_CLOSE)) return null;
  const inner = trimmed.slice(SYSTEM_REMINDER_OPEN.length, -SYSTEM_REMINDER_CLOSE.length).trim().replace(/\s+/g, " ");
  if (inner === "" || inner.length > SYSTEM_REMINDER_MAX || CONTROL_CHAR.test(inner)) return null;
  return inner;
}

function parseLocalCommandLeftover(raw: Record<string, unknown>, index: number): OfficialKbNoticeItem | null {
  const content = typeof raw.content === "string" ? raw.content : stringValue(raw.content);
  if (!content) return null;
  const stdout = content.match(/<local-command-stdout>([\s\S]*?)<\/local-command-stdout>/)?.[1]?.trim();
  if (stdout) {
    const applied = parseOfficialAutoModeSetupApplied(stdout);
    if (applied && !/<local-command-stderr>/.test(content)) {
      const id = `${entryId(raw, index, "sys")}-amapplied`;
      return { id, kind: "auto_mode_setup_applied", raw: stdout, result: applied };
    }
  }
  const body = localCommandBody(content);
  if (!body) return null;
  if (looksLikeContextOrStats(body)) return null;
  const id = entryId(raw, index, "sys");
  if (body === "<plan-usage/>") return { id: `${id}-usage`, kind: "usage" };
  if (body === "<session-status/>") return { id: `${id}-status`, kind: "status" };
  return null;
}

/**
 * Official eke system leftover kinds (`c06cf64bb` loop).
 * Unknown / hook_notice / compacted / task_event → null.
 */
export function parseOfficialKbNoticeFromSystemRaw(
  raw: Record<string, unknown>,
  index: number,
): OfficialKbNoticeItem | null {
  const type = stringValue(raw.type);
  const subtype = stringValue(raw.subtype);
  if (type !== "system" && subtype === undefined) return null;
  if (parentToolUseId(raw) && subtype !== "peer_message_hold") return null;

  if (subtype === "local_command" || subtype === "local_command_output") {
    return parseLocalCommandLeftover(raw, index);
  }
  if (subtype === "init") return null;
  if (subtype === "peer_message_hold") {
    const hold = parseOfficialPeerHold(raw);
    if (!hold || hold.state === "released" || !hold.from) return null;
    return { id: entryId(raw, index, "sys"), kind: "peerHold", ...hold };
  }
  if (subtype === "gap_fill_failed") {
    return { id: entryId(raw, index, "sys"), kind: "gap_fill_failed" };
  }
  if (subtype === "informational") {
    const prevent = raw.prevent_continuation === true || raw.preventContinuation === true;
    const content = typeof raw.content === "string" ? raw.content : undefined;
    if (content === undefined) return null;
    const blocked = parseOfficialPromptHookBlock(content);
    if (prevent || blocked?.kind === "blocked") {
      if (blocked?.kind === "stopped") return null;
      return promptBlockedItem(
        entryId(raw, index, "sys"),
        blocked?.kind === "blocked" ? blocked : { reason: content },
      );
    }
    return null;
  }
  if (subtype === "prompt_blocked") {
    const content = stringValue(raw.reason) ?? (typeof raw.content === "string" ? raw.content : "");
    const blocked = parseOfficialPromptHookBlock(content);
    if (blocked?.kind === "stopped") return null;
    return promptBlockedItem(entryId(raw, index, "sys"), blocked?.kind === "blocked" ? blocked : {
      originalPrompt: stringValue(raw.original_prompt) ?? stringValue(raw.originalPrompt),
      reason: content,
    });
  }
  if (subtype === "auto_mode_notice") {
    return { id: entryId(raw, index, "auto"), kind: "auto_mode_notice", variant: stringValue(raw.variant) };
  }
  if (subtype === "auto_mode_setup_applied") {
    const stdout = stringValue(raw.raw) ?? (typeof raw.content === "string" ? raw.content : "");
    const result = asRecord(raw.result);
    const applied = parseOfficialAutoModeSetupApplied(stdout) ?? (
      typeof result.filePath === "string"
        ? {
          autoModeKeysWritten: Array.isArray(result.autoModeKeysWritten) ? result.autoModeKeysWritten.map(String) : [],
          filePath: result.filePath,
          permissionsAllowNotFound: Array.isArray(result.permissionsAllowNotFound)
            ? result.permissionsAllowNotFound.map(String)
            : [],
          permissionsAllowSkipped: result.permissionsAllowSkipped === true,
          warnings: Array.isArray(result.warnings) ? result.warnings.map(String) : [],
        }
        : null
    );
    if (!applied) return null;
    return { id: entryId(raw, index, "auto-setup"), kind: "auto_mode_setup_applied", raw: stdout || JSON.stringify(raw.result ?? {}), result: applied };
  }
  if (subtype === "narration_summary") {
    const text = stringValue(raw.text) ?? (typeof raw.content === "string" ? raw.content : undefined);
    if (!text) return null;
    return { id: entryId(raw, index, "narration"), kind: "narration_summary", text };
  }
  if (subtype === "remote_control_notice") {
    const noticeRaw = asRecord(raw.notice);
    const kind = stringValue(noticeRaw.kind) as OfficialRemoteControlNoticeKind | undefined;
    if (!kind) return null;
    return {
      actionable: raw.actionable === true,
      id: entryId(raw, index, "rc"),
      kind: "remote_control_notice",
      notice: {
        kind,
        ...(stringValue(noticeRaw.cause) ? { cause: stringValue(noticeRaw.cause) as OfficialRemoteControlCause } : {}),
      },
    };
  }
  if (subtype === "computer_disconnected") {
    const sentence = stringValue(raw.sentence) ?? parseOfficialComputerDisconnectedSentence(raw, typeof raw.content === "string" ? raw.content : undefined);
    if (!sentence) return null;
    return { id: entryId(raw, index, "cu"), kind: "computer_disconnected", sentence };
  }
  if (subtype === "context_cleared") {
    return { id: entryId(raw, index, "cleared"), kind: "context_cleared" };
  }
  if (subtype === "stop_warning") {
    const stopReason = stringValue(raw.stop_reason) ?? stringValue(raw.stopReason);
    if (stopReason !== "prompt_injection_risk") return null;
    return { id: entryId(raw, index, "stop"), kind: "stop_warning", stopReason };
  }
  if (subtype === "status" && stringValue(raw.status) === "requesting") return null;
  return null;
}

/** Official eke assistant leftover: remote_control_notice, stop_warning, auto_mode_setup_applied. */
export function parseOfficialKbNoticeFromAssistantRaw(
  raw: Record<string, unknown>,
  index: number,
): OfficialKbNoticeItem | null {
  if (stringValue(raw.type) !== "assistant") return null;
  const id = stringValue(asRecord(raw.message).id) ?? entryId(raw, index, "assistant");
  const stamp = officialRemoteControlStamp(raw);
  const text = assistantPlainText(raw);
  if (stamp && text) {
    const notice = parseOfficialRemoteControlNoticeFromText(text);
    if (notice) {
      return {
        actionable: stamp === "stamped",
        id: typeof raw.content === "string" ? id : `${id}-t0`,
        kind: "remote_control_notice",
        notice,
      };
    }
  }
  if (raw.message && asRecord(raw.message).model === "<synthetic>" && text) {
    const applied = parseOfficialAutoModeSetupApplied(text);
    if (applied) return { id: `${id}-amapplied`, kind: "auto_mode_setup_applied", raw: text, result: applied };
  }
  const stopReason = stringValue(asRecord(raw.message).stop_reason) ?? stringValue(raw.stop_reason);
  if (stopReason === "prompt_injection_risk") {
    return { id: `${entryId(raw, index, "assistant")}-stop`, kind: "stop_warning", stopReason };
  }
  return null;
}

/** Official eke user leftover: /clear → context_cleared; computer_disconnected reminder. */
export function parseOfficialKbNoticeFromUserRaw(
  raw: Record<string, unknown>,
  index: number,
): OfficialKbNoticeItem | null {
  if (stringValue(raw.type) !== "user") return null;
  const nested = asRecord(raw.message);
  const content = nested.content ?? raw.content;
  const text = typeof content === "string" ? content : Array.isArray(content) ? content.map((block) => stringValue(asRecord(block).text) ?? "").join("\n") : undefined;
  const id = entryId(raw, index, "user");
  if (text && officialIsClearCommand(text)) {
    return { id: `${id}-cleared`, kind: "context_cleared" };
  }
  const sentence = parseOfficialComputerDisconnectedSentence(raw, text);
  if (sentence) return { id, kind: "computer_disconnected", sentence };
  return null;
}

export function parseOfficialKbNoticeFromRaw(raw: Record<string, unknown>, index: number): OfficialKbNoticeItem | null {
  const type = stringValue(raw.type);
  if (type === "assistant") return parseOfficialKbNoticeFromAssistantRaw(raw, index);
  if (type === "user") return parseOfficialKbNoticeFromUserRaw(raw, index);
  return parseOfficialKbNoticeFromSystemRaw(raw, index);
}

export function officialPeerHoldStateMessageId(hold: { outcome?: string; state: string }) {
  if (hold.state === "held") return OFFICIAL_KB_NOTICE_MESSAGES.peerHoldHeld.id;
  if (hold.state === "released") return OFFICIAL_KB_NOTICE_MESSAGES.peerHoldReleased.id;
  switch (hold.outcome) {
    case "expired":
      return OFFICIAL_KB_NOTICE_MESSAGES.peerHoldExpired.id;
    case "refused":
      return OFFICIAL_KB_NOTICE_MESSAGES.peerHoldRefused.id;
    case "dropped":
      return OFFICIAL_KB_NOTICE_MESSAGES.peerHoldDropped.id;
    case "discarded":
      return OFFICIAL_KB_NOTICE_MESSAGES.peerHoldDiscarded.id;
    default:
      return OFFICIAL_KB_NOTICE_MESSAGES.peerHoldDefault.id;
  }
}

export function officialPeerHoldCauseMessageId(cause: string | undefined) {
  switch (cause) {
    case "mode-mismatch":
      return OFFICIAL_KB_NOTICE_MESSAGES.peerHoldModeMismatch.id;
    case "no-mode-asserted":
      return OFFICIAL_KB_NOTICE_MESSAGES.peerHoldNoModeAsserted.id;
    case "bypass-default":
      return OFFICIAL_KB_NOTICE_MESSAGES.peerHoldBypassDefault.id;
    case "mode-unknown":
      return OFFICIAL_KB_NOTICE_MESSAGES.peerHoldModeUnknown.id;
    case "invalid-setting":
      return OFFICIAL_KB_NOTICE_MESSAGES.peerHoldInvalidSetting.id;
    case "explicit-setting":
    case "managed-setting":
    case "repo-setting":
      return OFFICIAL_KB_NOTICE_MESSAGES.peerHoldExplicitSetting.id;
    default:
      return undefined;
  }
}

export function officialPeerHoldStateDefaultMessage(hold: { outcome?: string; state: string }) {
  const id = officialPeerHoldStateMessageId(hold);
  const row = Object.values(OFFICIAL_KB_NOTICE_MESSAGES).find((message) => message.id === id);
  return row?.defaultMessage ?? OFFICIAL_KB_NOTICE_MESSAGES.peerHoldDefault.defaultMessage;
}

export function officialPeerHoldCauseDefaultMessage(cause: string | undefined) {
  const id = officialPeerHoldCauseMessageId(cause);
  if (!id) return undefined;
  const row = Object.values(OFFICIAL_KB_NOTICE_MESSAGES).find((message) => message.id === id);
  return row?.defaultMessage;
}
