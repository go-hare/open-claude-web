/**
 * Residual ultrareview progress extractor (c11959232 gw / pw / mw / hw).
 *
 * we = gw(U) over session messages (system hook_progress / hook_response).
 * Parses <remote-review-progress>…</remote-review-progress> and <review-bug>…</review-bug>
 * from hook stdout; after completion, may attach findings from a following assistant text.
 */

import type { ChatMessage } from "../../../adapters/desktopBridge/types";

export type OfficialReviewProgressStage = "finding" | "verifying" | "synthesizing";

export type OfficialReviewBugStatus = "pending" | "verifying" | "confirmed" | "refuted";

export type OfficialReviewBug = {
  id: string;
  name?: string;
  file?: string;
  line?: number;
  status?: OfficialReviewBugStatus;
  desc?: string;
};

export type OfficialReviewProgress = {
  id: string;
  type: "review_progress";
  hook_id: string;
  status: "running" | "completed" | "error";
  stage: OfficialReviewProgressStage;
  bugs_found: number;
  bugs_verified: number;
  bugs_refuted: number;
  bugs?: OfficialReviewBug[];
  findings?: string;
  errorText?: string;
};

/** Residual SM pipeline stages (display order). */
export const OFFICIAL_ULTRAREVIEW_STAGES = ["setup", "find", "verify", "dedupe"] as const;
export type OfficialUltrareviewDisplayStage = (typeof OFFICIAL_ULTRAREVIEW_STAGES)[number];

/** Residual NM: progress stage → display stage. */
export const OFFICIAL_ULTRAREVIEW_STAGE_MAP: Record<
  OfficialReviewProgressStage,
  OfficialUltrareviewDisplayStage
> = {
  finding: "find",
  verifying: "verify",
  synthesizing: "dedupe",
};

const REMOTE_REVIEW_PROGRESS_RE = /<remote-review-progress>(.*?)<\/remote-review-progress>/gs;
const REVIEW_BUG_RE = /<review-bug>(.+?)<\/review-bug>/g;
/** Residual dw — findings follow this prefix on the assistant turn after complete. */
const REVIEW_COMPLETE_FINDINGS_RE = /^Review complete — \d+ findings?\n/;

const STAGES = new Set<string>(["finding", "verifying", "synthesizing"]);
const BUG_STATUSES = new Set<string>(["pending", "verifying", "confirmed", "refuted"]);

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** Residual pw — last remote-review-progress JSON in stdout. */
export function residualParseRemoteReviewProgress(stdout: string): {
  stage: OfficialReviewProgressStage;
  bugs_found: number;
  bugs_verified: number;
  bugs_refuted: number;
} | null {
  let last: string | null = null;
  for (const match of stdout.matchAll(REMOTE_REVIEW_PROGRESS_RE)) {
    last = match[1] ?? null;
  }
  if (!last) return null;
  try {
    const parsed = asRecord(JSON.parse(last));
    const stage = stringValue(parsed.stage);
    if (!stage || !STAGES.has(stage)) return null;
    return {
      stage: stage as OfficialReviewProgressStage,
      bugs_found: numberValue(parsed.bugs_found) ?? 0,
      bugs_verified: numberValue(parsed.bugs_verified) ?? 0,
      bugs_refuted: numberValue(parsed.bugs_refuted) ?? 0,
    };
  } catch {
    return null;
  }
}

/** Residual mw — all review-bug JSON blobs in stdout. */
export function residualParseReviewBugs(stdout: string): OfficialReviewBug[] {
  const bugs: OfficialReviewBug[] = [];
  for (const match of stdout.matchAll(REVIEW_BUG_RE)) {
    const body = match[1];
    if (!body) continue;
    try {
      const parsed = asRecord(JSON.parse(body));
      const id = stringValue(parsed.id);
      if (!id) continue;
      const status = stringValue(parsed.status);
      bugs.push({
        id,
        name: stringValue(parsed.name),
        file: stringValue(parsed.file),
        line: numberValue(parsed.line),
        status: status && BUG_STATUSES.has(status) ? (status as OfficialReviewBugStatus) : undefined,
        desc: stringValue(parsed.desc),
      });
    } catch {
      // residual: ignore bad bug JSON
    }
  }
  return bugs;
}

/** Residual hw — assistant text blocks only. */
function residualAssistantText(raw: Record<string, unknown>): string | null {
  if (stringValue(raw.type) !== "assistant" && stringValue(asRecord(raw.message).role) !== "assistant") {
    return null;
  }
  const message = asRecord(raw.message);
  const content = message.content ?? raw.content;
  if (!Array.isArray(content)) return null;
  let text = "";
  for (const block of content) {
    const record = asRecord(block);
    if (stringValue(record.type) === "text") {
      text += stringValue(record.text) ?? "";
    }
  }
  return text || null;
}

function systemEnvelopeFromMessage(message: ChatMessage | Record<string, unknown>): {
  type: string;
  subtype?: string;
  hook_id?: string;
  uuid?: string;
  stdout?: string;
  outcome?: string;
} | null {
  const raw = asRecord("raw" in message ? message.raw : message);
  const nested = asRecord(raw.message);
  // Prefer outer CLI envelope (type/subtype on raw).
  const type = stringValue(raw.type) ?? stringValue(nested.type);
  if (type !== "system") {
    // ChatMessage.role system with raw still may carry envelope.
    if (!("role" in message) || (message as ChatMessage).role !== "system") return null;
  }
  const subtype = stringValue(raw.subtype) ?? stringValue(nested.subtype);
  if (subtype !== "hook_progress" && subtype !== "hook_response") {
    // Only system hook_* participate in gw.
    if (type === "system") return { type: "system", subtype };
    return null;
  }
  return {
    type: "system",
    subtype,
    hook_id: stringValue(raw.hook_id) ?? stringValue(nested.hook_id),
    uuid:
      stringValue(raw.uuid)
      ?? stringValue(raw.id)
      ?? ("id" in message ? stringValue((message as ChatMessage).id) : undefined),
    stdout:
      stringValue(raw.stdout)
      ?? stringValue(nested.stdout)
      ?? ("text" in message ? stringValue((message as ChatMessage).text) : undefined)
      ?? "",
    outcome: stringValue(raw.outcome) ?? stringValue(nested.outcome),
  };
}

/**
 * Residual gw(e): walk messages; return last review_progress state (or null).
 * Accepts ChatMessage[] (product) or raw CLI events.
 */
export function residualExtractUltrareviewProgress(
  messages: ReadonlyArray<ChatMessage | Record<string, unknown>>,
): OfficialReviewProgress | null {
  const byHook = new Map<string, OfficialReviewProgress>();
  const bugsByHook = new Map<string, Map<string, OfficialReviewBug>>();
  let last: OfficialReviewProgress | null = null;

  const ensure = (hookId: string, uuid: string): OfficialReviewProgress => {
    let progress = byHook.get(hookId);
    if (!progress) {
      progress = {
        id: uuid,
        type: "review_progress",
        hook_id: hookId,
        status: "running",
        stage: "finding",
        bugs_found: 0,
        bugs_verified: 0,
        bugs_refuted: 0,
      };
      byHook.set(hookId, progress);
      bugsByHook.set(hookId, new Map());
    }
    return progress;
  };

  for (const item of messages) {
    const raw = asRecord("raw" in item ? (item as ChatMessage).raw : item);
    const envelope = systemEnvelopeFromMessage(item as ChatMessage);

    if (!envelope || (envelope.subtype !== "hook_progress" && envelope.subtype !== "hook_response")) {
      // Residual: after a non-running progress, scrape findings from assistant text.
      if (last && last.status !== "running") {
        const text = residualAssistantText(raw) ?? (
          "role" in item && (item as ChatMessage).role === "assistant"
            ? stringValue((item as ChatMessage).text) ?? null
            : null
        );
        if (text) {
          const match = text.match(REVIEW_COMPLETE_FINDINGS_RE);
          if (match) {
            last.findings = text.slice(match[0].length).trim();
          }
        }
      }
      continue;
    }

    const hookId = envelope.hook_id;
    if (!hookId) continue;
    const stdoutFull = envelope.stdout ?? "";
    const stdout = stdoutFull.length > 65536 ? stdoutFull.slice(-65536) : stdoutFull;
    const progressPatch = residualParseRemoteReviewProgress(stdout);
    const bugs = residualParseReviewBugs(stdout);
    const existing = byHook.get(hookId);
    if (!progressPatch && bugs.length === 0 && !existing) continue;

    const progress = ensure(hookId, envelope.uuid ?? hookId);
    if (progressPatch) {
      progress.stage = progressPatch.stage;
      progress.bugs_found = progressPatch.bugs_found;
      progress.bugs_verified = progressPatch.bugs_verified;
      progress.bugs_refuted = progressPatch.bugs_refuted;
    }
    if (bugs.length > 0) {
      const map = bugsByHook.get(hookId)!;
      for (const bug of bugs) {
        map.set(bug.id, { ...map.get(bug.id), ...bug });
      }
      progress.bugs = [...map.values()].sort((a, b) => a.id.localeCompare(b.id));
    }
    if (envelope.subtype === "hook_response") {
      progress.status = envelope.outcome === "success" ? "completed" : "error";
      if (progress.status === "error") {
        const stripped = stdout
          .replace(REMOTE_REVIEW_PROGRESS_RE, "")
          .replace(REVIEW_BUG_RE, "")
          .trim();
        progress.errorText = stripped || undefined;
      }
      last = progress;
    } else {
      last = progress;
    }
  }

  return last;
}

/** Residual NM + stage index helpers for TM. */
export function residualUltrareviewDisplayStage(
  progress: OfficialReviewProgress,
): OfficialUltrareviewDisplayStage {
  return OFFICIAL_ULTRAREVIEW_STAGE_MAP[progress.stage] ?? "find";
}

export type OfficialUltrareviewStepStatus =
  | "done"
  | "error"
  | "active"
  | "stopped"
  | "pending";

export function residualUltrareviewStepStatus(
  step: OfficialUltrareviewDisplayStage,
  active: OfficialUltrareviewDisplayStage,
  progress: OfficialReviewProgress,
  isStopped: boolean,
): OfficialUltrareviewStepStatus {
  const stepIndex = OFFICIAL_ULTRAREVIEW_STAGES.indexOf(step);
  const activeIndex = OFFICIAL_ULTRAREVIEW_STAGES.indexOf(active);
  if (progress.status === "error" && stepIndex === activeIndex) return "error";
  if (progress.status === "completed" || stepIndex < activeIndex) return "done";
  if (stepIndex > activeIndex) return "pending";
  if (isStopped) return "stopped";
  return "active";
}
