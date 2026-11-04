import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  OFFICIAL_KB_EKE_SUBTYPE_TO_KIND,
  officialIsClearCommand,
  parseOfficialAutoModeSetupApplied,
  parseOfficialKbNoticeFromAssistantRaw,
  parseOfficialKbNoticeFromRaw,
  parseOfficialKbNoticeFromSystemRaw,
  parseOfficialKbNoticeFromUserRaw,
  parseOfficialPromptHookBlock,
  parseOfficialRemoteControlNoticeFromText,
} from "./officialKbNoticeKinds";

const here = path.dirname(fileURLToPath(import.meta.url));
const pin = "/Users/apple/work-py/hare-code/open-claude-desktop/resources/ion-dist/assets/v1/cd5a31703-B4nKQMBN.js";
const eke = "/Users/apple/work-py/hare-code/open-claude-desktop/resources/ion-dist/assets/v1/c06cf64bb-BadUL178.js";

function applyStdout(filePath = "/tmp/ccd-auto-mode-abc123/proposal.json") {
  return JSON.stringify({
    ok: true,
    filePath,
    autoModeKeysWritten: ["permissions"],
    warnings: ["w1"],
    permissionsAllowNotFound: ["Bash(*)"],
  });
}

describe("official cd5a Kb leftover kinds", () => {
  it("maps eke system subtypes to leftover kinds", () => {
    expect(parseOfficialKbNoticeFromSystemRaw({ type: "system", subtype: "gap_fill_failed", uuid: "g" }, 0)).toEqual({
      id: "g",
      kind: "gap_fill_failed",
    });
    expect(parseOfficialKbNoticeFromSystemRaw({ type: "system", subtype: "peer_message_hold", message_uuid: "m1", from: "alice", state: "held", uuid: "h" }, 1)).toMatchObject({
      kind: "peerHold",
      from: "alice",
      state: "held",
    });
    expect(OFFICIAL_KB_EKE_SUBTYPE_TO_KIND.peer_message_hold).toBe("peerHold");
    expect(OFFICIAL_KB_EKE_SUBTYPE_TO_KIND.gap_fill_failed).toBe("gap_fill_failed");
    expect(OFFICIAL_KB_EKE_SUBTYPE_TO_KIND.informational).toBe("prompt_blocked");
    expect(OFFICIAL_KB_EKE_SUBTYPE_TO_KIND.local_command).toBe("usage");

    const blocked = parseOfficialKbNoticeFromSystemRaw({
      type: "system",
      subtype: "informational",
      prevent_continuation: true,
      content: "UserPromptSubmit operation blocked by hook:\nnope\n\nOriginal prompt: hello",
      uuid: "b",
    }, 2);
    expect(blocked).toMatchObject({ kind: "prompt_blocked", reason: "nope", originalPrompt: "hello" });

    const usage = parseOfficialKbNoticeFromSystemRaw({
      type: "system",
      subtype: "local_command",
      content: "<local-command-stdout><plan-usage/></local-command-stdout>",
      uuid: "u",
    }, 3);
    expect(usage).toEqual({ id: "u-usage", kind: "usage" });

    const status = parseOfficialKbNoticeFromSystemRaw({
      type: "system",
      subtype: "local_command_output",
      content: "<local-command-stdout><session-status/></local-command-stdout>",
      uuid: "s",
    }, 4);
    expect(status).toEqual({ id: "s-status", kind: "status" });

    const applied = parseOfficialKbNoticeFromSystemRaw({
      type: "system",
      subtype: "local_command",
      content: `<local-command-stdout>${applyStdout()}</local-command-stdout>`,
      uuid: "a",
    }, 5);
    expect(applied).toMatchObject({ kind: "auto_mode_setup_applied", result: { filePath: "/tmp/ccd-auto-mode-abc123/proposal.json" } });
  });

  it("returns null for unknown / already-owned system raw", () => {
    expect(parseOfficialKbNoticeFromSystemRaw({ type: "system", subtype: "init" }, 0)).toBeNull();
    expect(parseOfficialKbNoticeFromSystemRaw({ type: "system", subtype: "compact_boundary" }, 1)).toBeNull();
    expect(parseOfficialKbNoticeFromSystemRaw({ type: "system", subtype: "informational", content: "Claude Code notice:" }, 2)).toBeNull();
    expect(parseOfficialKbNoticeFromSystemRaw({ type: "system", subtype: "ui_log", plugin: "x", text: "y" }, 3)).toBeNull();
    expect(parseOfficialKbNoticeFromSystemRaw({ type: "system", subtype: "away_summary" }, 4)).toBeNull();
    expect(parseOfficialKbNoticeFromSystemRaw({ type: "system", subtype: "not_a_kind" }, 5)).toBeNull();
    expect(parseOfficialKbNoticeFromSystemRaw({ type: "system" }, 6)).toBeNull();
    expect(parseOfficialKbNoticeFromSystemRaw({ foo: 1 }, 7)).toBeNull();
    expect(parseOfficialPromptHookBlock("Operation stopped by hook: x")?.kind).toBe("stopped");
    expect(parseOfficialKbNoticeFromSystemRaw({
      type: "system",
      subtype: "informational",
      prevent_continuation: true,
      content: "Operation stopped by hook: x",
    }, 8)).toBeNull();
  });

  it("parses assistant remote_control / stop_warning and user /clear + computer_disconnected", () => {
    const already = "Remote Control is already on: this session connected automatically when it started. Send /remote-control again to turn it off.";
    expect(parseOfficialRemoteControlNoticeFromText(already)).toEqual({ kind: "already_on" });
    expect(parseOfficialKbNoticeFromAssistantRaw({
      type: "assistant",
      isSyntheticReply: true,
      uuid: "rc",
      content: already,
    }, 0)).toMatchObject({ kind: "remote_control_notice", notice: { kind: "already_on" }, actionable: true });

    expect(parseOfficialKbNoticeFromAssistantRaw({
      type: "assistant",
      uuid: "st",
      message: { stop_reason: "prompt_injection_risk" },
    }, 1)).toMatchObject({ kind: "stop_warning", stopReason: "prompt_injection_risk" });

    expect(officialIsClearCommand("/clear")).toBe(true);
    expect(parseOfficialKbNoticeFromUserRaw({ type: "user", uuid: "c", message: { content: "/clear" } }, 2)).toEqual({
      id: "c-cleared",
      kind: "context_cleared",
    });

    const sentence = "The computer session ended.";
    expect(parseOfficialKbNoticeFromUserRaw({
      type: "user",
      uuid: "d",
      reminderKind: "computer_disconnected",
      inbound_origin: "tool_host_ended_reminder",
      ccr_event: { source: "client" },
      isSynthetic: true,
      isMeta: true,
      message: { content: `<system-reminder>${sentence}</system-reminder>` },
    }, 3)).toEqual({ id: "d", kind: "computer_disconnected", sentence });
  });

  it("parses auto-mode apply envelope (Gn)", () => {
    const parsed = parseOfficialAutoModeSetupApplied(applyStdout());
    expect(parsed?.filePath).toContain("ccd-auto-mode");
    expect(parsed?.warnings).toEqual(["w1"]);
    expect(parseOfficialKbNoticeFromRaw({
      type: "system",
      subtype: "auto_mode_notice",
      variant: "chosen",
      uuid: "n",
    }, 0)?.kind).toBe("auto_mode_notice");
  });

  it("cards + parse residual name official functions (VZe dX MX LX PX NX Q0 nK xK wK TX fX zX)", () => {
    const cards = readFileSync(path.join(here, "OfficialKbNoticeCards.tsx"), "utf8");
    const kinds = readFileSync(path.join(here, "officialKbNoticeKinds.ts"), "utf8");
    for (const name of ["VZe", "dX", "MX", "LX", "PX", "NX", "Q0", "nK", "xK", "wK", "TX", "fX", "zX"]) {
      expect(cards).toContain(name);
      expect(kinds).toContain(name);
    }
    expect(cards).toMatch(/88OlIQOrZj/);
    expect(cards).toMatch(/Gd19zJfyPn/);
    expect(cards).toMatch(/VkMeXWpsli/);
    expect(cards).toMatch(/2xRJ11ITc6/);
    expect(cards).toMatch(/xmXPKqaNPZ/);
    expect(cards).toMatch(/OIASpphXDW/);
    expect(cards).not.toMatch(/startVmForPreview/);
    expect(cards).not.toMatch(/Guest OAuth/);
    expect(cards).not.toMatch(/function OfficialOx/);
    const pinJs = readFileSync(pin, "utf8");
    expect(pinJs).toContain('j.kind==="narration_summary"?k(Q0');
    expect(pinJs).toContain('j.kind==="usage"?k(nK');
    expect(pinJs).toContain('j.kind==="status"?k(xK');
    expect(pinJs).toContain('j.kind==="remote_control_notice"?k(wK');
    expect(pinJs).toContain('j.kind==="computer_disconnected"?k(TX');
    expect(pinJs).toContain('j.kind==="auto_mode_notice"?k(dX');
    expect(pinJs).toContain('j.kind==="auto_mode_setup_applied"?k(fX');
    expect(pinJs).toContain('j.kind==="stop_warning"?k(zX');
    expect(pinJs).toContain('j.kind==="context_cleared"?k(VZe');
    expect(pinJs).toContain('j.kind==="gap_fill_failed"?k(MX');
    expect(pinJs).toContain('j.kind==="prompt_blocked"?f?k(LX');
    expect(pinJs).toContain('j.kind==="peerHold"?k(NX');
    const ekeJs = readFileSync(eke, "utf8");
    expect(ekeJs).toContain('t==="gap_fill_failed"');
    expect(ekeJs).toContain('t==="peer_message_hold"');
    expect(ekeJs).toContain('kind:"prompt_blocked"');
    expect(ekeJs).toContain('kind:"usage"');
    expect(ekeJs).toContain('kind:"status"');
    expect(ekeJs).toContain('kind:"auto_mode_setup_applied"');
    expect(ekeJs).toContain('kind:"context_cleared"');
    expect(ekeJs).toContain('kind:"computer_disconnected"');
    expect(ekeJs).toContain('kind:"remote_control_notice"');
    expect(ekeJs).toContain('kind:"stop_warning"');
  });
});
