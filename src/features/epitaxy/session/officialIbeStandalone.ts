/**
 * Official IBe leftover stands-alone kinds (pin 2.31226.1).
 *
 * cd5a31703: IBe.ReportFindings="report_findings", IBe.ClaudeDesign="claude_design"
 * c52b02f3f V() catalog verbs.
 * cc4053f14: PushNotification `n`, unsent `/not sent/i` on output (`a`), sent `o()`.
 * wH: PushNotification + dp → push_notification (rolls-up) else unsent_push_notification (stands-alone).
 *
 * Skip skill_proposal / plugin / env_help / mcp_app / credential / connector / vouched (need aae()).
 */

export const OFFICIAL_IBE_SOURCE_CD5A = "cd5a31703-B4nKQMBN.js";
export const OFFICIAL_IBE_SOURCE_C52B = "c52b02f3f-DbJ5Omt6.js";
export const OFFICIAL_IBE_SOURCE_CC405 = "cc4053f14-DYOgdTR9.js";

export const OFFICIAL_REPORT_FINDINGS_TOOL = "ReportFindings";
export const OFFICIAL_CLAUDE_DESIGN_TOOL = "ClaudeDesign";
export const OFFICIAL_PUSH_NOTIFICATION_TOOL = "PushNotification";

export const OFFICIAL_REPORT_FINDINGS_RUNNING_ID = "TrlDEuTSr5";
export const OFFICIAL_REPORT_FINDINGS_VERB_ID = "ArroQ6rqZj";
export const OFFICIAL_REPORT_FINDINGS_FAILED_ID = "56pe1KCIHb";
export const OFFICIAL_CLAUDE_DESIGN_RUNNING_ID = "8fpDSME39I";
export const OFFICIAL_CLAUDE_DESIGN_VERB_ID = "1aXXpPJFBF";
export const OFFICIAL_PUSH_SENT_ID = "0SIm+asooC";
export const OFFICIAL_PUSH_UNSENT_ID = "IidprNKZ2T";
export const OFFICIAL_PUSH_SENDING_ID = "RnjX9qJ/7E";
export const OFFICIAL_PUSH_FAILED_ID = "IWh33H2E8M";

export type OfficialIbeStandaloneKind =
  | "claude_design"
  | "push_notification"
  | "report_findings"
  | "unsent_push_notification";

export type OfficialIbeToolLike = {
  input: Record<string, unknown>;
  interrupted?: boolean;
  isError?: boolean;
  name: string;
  output?: string;
  policyDenied?: boolean;
  rejected?: boolean;
  status: string;
};

export function isOfficialReportFindingsTool(name: string | undefined | null): boolean {
  return name === OFFICIAL_REPORT_FINDINGS_TOOL;
}

export function isOfficialClaudeDesignTool(name: string | undefined | null): boolean {
  return name === OFFICIAL_CLAUDE_DESIGN_TOOL;
}

export function isOfficialPushNotificationTool(name: string | undefined | null): boolean {
  return name === OFFICIAL_PUSH_NOTIFICATION_TOOL;
}

/** Official cc405 `a(output)`. */
export function officialPushNotificationUnsent(output: string | undefined): boolean {
  return typeof output === "string" && /not sent/i.test(output);
}

/** Official cc405 `o(e)` — sent rolls-up. */
export function officialPushNotificationSent(tool: OfficialIbeToolLike): boolean {
  return tool.status === "completed"
    && tool.isError !== true
    && tool.interrupted !== true
    && tool.rejected !== true
    && tool.policyDenied !== true
    && !officialPushNotificationUnsent(tool.output);
}

export function officialIbeStandaloneKind(tool: OfficialIbeToolLike): OfficialIbeStandaloneKind | null {
  if (isOfficialReportFindingsTool(tool.name)) return "report_findings";
  if (isOfficialClaudeDesignTool(tool.name)) return "claude_design";
  if (isOfficialPushNotificationTool(tool.name)) {
    return officialPushNotificationSent(tool) ? "push_notification" : "unsent_push_notification";
  }
  return null;
}

export function officialIbeStandaloneMeta(input: Record<string, unknown>): string | undefined {
  for (const key of ["title", "file_path", "message"]) {
    const value = input[key];
    if (typeof value === "string" && value.trim() !== "") return value;
  }
  return undefined;
}

export function officialIbeStandaloneVerb(tool: OfficialIbeToolLike): { id: string; text: string } {
  const kind = officialIbeStandaloneKind(tool);
  const failed = tool.status === "error" || tool.isError === true;
  const running = tool.status === "running";
  if (kind === "report_findings") {
    if (failed) return { id: OFFICIAL_REPORT_FINDINGS_FAILED_ID, text: "Failed to report review findings" };
    if (running) return { id: OFFICIAL_REPORT_FINDINGS_RUNNING_ID, text: "Reporting review findings" };
    return { id: OFFICIAL_REPORT_FINDINGS_VERB_ID, text: "Reported review findings" };
  }
  if (kind === "claude_design") {
    if (running) return { id: OFFICIAL_CLAUDE_DESIGN_RUNNING_ID, text: "Using Claude Design" };
    return { id: OFFICIAL_CLAUDE_DESIGN_VERB_ID, text: "Used Claude Design" };
  }
  if (kind === "unsent_push_notification") {
    if (failed) return { id: OFFICIAL_PUSH_FAILED_ID, text: "Failed to send notification" };
    if (running) return { id: OFFICIAL_PUSH_SENDING_ID, text: "Sending notification" };
    return { id: OFFICIAL_PUSH_UNSENT_ID, text: "Notification not sent" };
  }
  if (failed) return { id: OFFICIAL_PUSH_FAILED_ID, text: "Failed to send notification" };
  if (running) return { id: OFFICIAL_PUSH_SENDING_ID, text: "Sending notification" };
  return { id: OFFICIAL_PUSH_SENT_ID, text: "Sent notification" };
}
