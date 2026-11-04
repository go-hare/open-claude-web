import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { OfficialIbeStandaloneCard } from "./OfficialIbeStandaloneCard";
import {
  isOfficialClaudeDesignTool,
  isOfficialPushNotificationTool,
  isOfficialReportFindingsTool,
  officialIbeStandaloneKind,
  officialIbeStandaloneMeta,
  officialIbeStandaloneVerb,
  officialPushNotificationSent,
  officialPushNotificationUnsent,
  OFFICIAL_CLAUDE_DESIGN_RUNNING_ID,
  OFFICIAL_CLAUDE_DESIGN_VERB_ID,
  OFFICIAL_IBE_SOURCE_C52B,
  OFFICIAL_IBE_SOURCE_CC405,
  OFFICIAL_IBE_SOURCE_CD5A,
  OFFICIAL_PUSH_FAILED_ID,
  OFFICIAL_PUSH_SENDING_ID,
  OFFICIAL_PUSH_SENT_ID,
  OFFICIAL_PUSH_UNSENT_ID,
  OFFICIAL_REPORT_FINDINGS_FAILED_ID,
  OFFICIAL_REPORT_FINDINGS_RUNNING_ID,
  OFFICIAL_REPORT_FINDINGS_VERB_ID,
  type OfficialIbeToolLike,
} from "./officialIbeStandalone";

const here = path.dirname(fileURLToPath(import.meta.url));
const pinDir = "/Users/apple/work-py/hare-code/open-claude-desktop/resources/ion-dist/assets/v1";
const modelSource = readFileSync(path.join(here, "officialIbeStandalone.ts"), "utf8");
const cardSource = readFileSync(path.join(here, "OfficialIbeStandaloneCard.tsx"), "utf8");
const transcriptSource = readFileSync(path.join(here, "OfficialTranscript.tsx"), "utf8");

const TOOL_ROW_HEADER =
  "relative group/tool flex self-start max-w-full items-center py-0 gap-0.75 text-left focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus rounded-sm";

function tool(partial: Partial<OfficialIbeToolLike> & Pick<OfficialIbeToolLike, "name">): OfficialIbeToolLike {
  return { input: {}, status: "completed", ...partial };
}

describe("official IBe leftover standalone (cd5a / c52b / cc405)", () => {
  it("locks source chunks cd5a31703 / c52b02f3f / cc4053f14", () => {
    expect(OFFICIAL_IBE_SOURCE_CD5A).toBe("cd5a31703-B4nKQMBN.js");
    expect(OFFICIAL_IBE_SOURCE_C52B).toBe("c52b02f3f-DbJ5Omt6.js");
    expect(OFFICIAL_IBE_SOURCE_CC405).toBe("cc4053f14-DYOgdTR9.js");
    expect(modelSource).toMatch(/cd5a31703/);
    expect(modelSource).toMatch(/c52b02f3f/);
    expect(modelSource).toMatch(/cc4053f14/);
    expect(cardSource).toContain(OFFICIAL_IBE_SOURCE_CD5A);
    expect(cardSource).toContain(OFFICIAL_IBE_SOURCE_C52B);
    expect(cardSource).toContain(OFFICIAL_IBE_SOURCE_CC405);
    expect(readFileSync(path.join(pinDir, OFFICIAL_IBE_SOURCE_CD5A), "utf8")).toMatch(
      /IBe=\{[^}]*ReportFindings:"report_findings"[^}]*ClaudeDesign:"claude_design"/,
    );
    expect(readFileSync(path.join(pinDir, OFFICIAL_IBE_SOURCE_C52B), "utf8")).toMatch(/TrlDEuTSr5/);
    expect(readFileSync(path.join(pinDir, OFFICIAL_IBE_SOURCE_CC405), "utf8")).toMatch(/n="PushNotification"/);
  });

  it("maps tool names to IBe kinds", () => {
    expect(isOfficialReportFindingsTool("ReportFindings")).toBe(true);
    expect(isOfficialClaudeDesignTool("ClaudeDesign")).toBe(true);
    expect(isOfficialPushNotificationTool("PushNotification")).toBe(true);
    expect(officialIbeStandaloneKind(tool({ name: "ReportFindings" }))).toBe("report_findings");
    expect(officialIbeStandaloneKind(tool({ name: "ClaudeDesign" }))).toBe("claude_design");
    expect(officialIbeStandaloneKind(tool({
      name: "PushNotification",
      output: "Notification not sent",
    }))).toBe("unsent_push_notification");
    expect(officialIbeStandaloneKind(tool({
      name: "PushNotification",
      output: "ok",
    }))).toBe("push_notification");
    expect(officialIbeStandaloneKind(tool({ name: "Bash" }))).toBeNull();
  });

  it("locks catalog verb ids", () => {
    expect(OFFICIAL_REPORT_FINDINGS_RUNNING_ID).toBe("TrlDEuTSr5");
    expect(OFFICIAL_REPORT_FINDINGS_VERB_ID).toBe("ArroQ6rqZj");
    expect(OFFICIAL_REPORT_FINDINGS_FAILED_ID).toBe("56pe1KCIHb");
    expect(officialIbeStandaloneVerb(tool({ name: "ReportFindings" }))).toEqual({
      id: OFFICIAL_REPORT_FINDINGS_VERB_ID,
      text: "Reported review findings",
    });
    expect(officialIbeStandaloneVerb(tool({ name: "ReportFindings", status: "running" }))).toEqual({
      id: OFFICIAL_REPORT_FINDINGS_RUNNING_ID,
      text: "Reporting review findings",
    });
    expect(officialIbeStandaloneVerb(tool({ name: "ReportFindings", status: "error", isError: true }))).toEqual({
      id: OFFICIAL_REPORT_FINDINGS_FAILED_ID,
      text: "Failed to report review findings",
    });

    expect(OFFICIAL_CLAUDE_DESIGN_RUNNING_ID).toBe("8fpDSME39I");
    expect(OFFICIAL_CLAUDE_DESIGN_VERB_ID).toBe("1aXXpPJFBF");
    expect(officialIbeStandaloneVerb(tool({ name: "ClaudeDesign" })).id).toBe(OFFICIAL_CLAUDE_DESIGN_VERB_ID);
    expect(officialIbeStandaloneVerb(tool({ name: "ClaudeDesign", status: "running" }))).toEqual({
      id: OFFICIAL_CLAUDE_DESIGN_RUNNING_ID,
      text: "Using Claude Design",
    });

    expect(OFFICIAL_PUSH_SENT_ID).toBe("0SIm+asooC");
    expect(OFFICIAL_PUSH_UNSENT_ID).toBe("IidprNKZ2T");
    expect(OFFICIAL_PUSH_SENDING_ID).toBe("RnjX9qJ/7E");
    expect(OFFICIAL_PUSH_FAILED_ID).toBe("IWh33H2E8M");
    expect(officialIbeStandaloneVerb(tool({
      name: "PushNotification",
      output: "Notification not sent to device",
    })).id).toBe(OFFICIAL_PUSH_UNSENT_ID);
    expect(officialIbeStandaloneVerb(tool({
      name: "PushNotification",
      status: "running",
    }))).toEqual({
      id: OFFICIAL_PUSH_SENDING_ID,
      text: "Sending notification",
    });
  });

  it("unsent regex matches cc405 a()", () => {
    expect(officialPushNotificationUnsent("Notification not sent")).toBe(true);
    expect(officialPushNotificationUnsent("NOT SENT")).toBe(true);
    expect(officialPushNotificationUnsent("ok")).toBe(false);
    expect(officialPushNotificationSent(tool({ name: "PushNotification", output: "ok" }))).toBe(true);
    expect(officialPushNotificationSent(tool({ name: "PushNotification", output: "not sent" }))).toBe(false);
  });

  it("meta is title else file_path else message", () => {
    expect(officialIbeStandaloneMeta({ title: "Review", file_path: "/a.md", message: "x" })).toBe("Review");
    expect(officialIbeStandaloneMeta({ file_path: "/a.md", message: "x" })).toBe("/a.md");
    expect(officialIbeStandaloneMeta({ message: "Ship it" })).toBe("Ship it");
  });

  it("sent PushNotification returns null from card (rolls-up)", () => {
    const sent = tool({ name: "PushNotification", input: { message: "hello" }, output: "delivered" });
    expect(officialIbeStandaloneKind(sent)).toBe("push_notification");
    expect(OfficialIbeStandaloneCard({ tool: sent })).toBeNull();
    expect(cardSource).toMatch(/kind === "push_notification"\) return null/);
  });

  it("copies OfficialToolRow header class", () => {
    expect(transcriptSource).toContain(`className="${TOOL_ROW_HEADER}"`);
    expect(cardSource).toContain(TOOL_ROW_HEADER);
    expect(cardSource).not.toMatch(/startVmForPreview/);
    expect(cardSource).not.toMatch(/<iframe/);
  });
});
