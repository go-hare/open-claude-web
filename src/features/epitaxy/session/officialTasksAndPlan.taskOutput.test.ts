/**
 * Tasks parse contract:
 *   Primary = CLI dual-emit system task_* (official Jp).
 *   TaskOutput = legacy residual only — never invent a Tasks row alone.
 */
import { describe, expect, it } from "vitest";
import type { ChatMessage } from "../../../adapters/desktopBridge/types";
import { parseOfficialTasks } from "./officialTasksAndPlan";

function msg(raw: Record<string, unknown>, id = "m1"): ChatMessage {
  return {
    id,
    role: "assistant",
    text: "",
    createdAt: typeof raw.timestamp === "string" ? raw.timestamp : "2026-08-01T11:20:00.000Z",
    raw,
  } as ChatMessage;
}

describe("parseOfficialTasks dual-emit primary (Jp contract)", () => {
  it("settles from system task_started + task_notification alone", () => {
    const messages = [
      msg({
        type: "system",
        subtype: "task_started",
        task_id: "tid1",
        task_type: "local_agent",
        description: "Agent A",
        tool_use_id: "call-1",
        timestamp: "2026-08-01T11:00:00.000Z",
      }, "s1"),
      msg({
        type: "system",
        subtype: "task_progress",
        task_id: "tid1",
        last_tool_name: "Bash",
        usage: { total_tokens: 100, tool_uses: 1, duration_ms: 2_000 },
        timestamp: "2026-08-01T11:01:00.000Z",
      }, "s1b"),
      msg({
        type: "system",
        subtype: "task_notification",
        task_id: "tid1",
        status: "completed",
        summary: "done",
        usage: { total_tokens: 500, tool_uses: 3, duration_ms: 12_000 },
        timestamp: "2026-08-01T11:05:00.000Z",
      }, "s2"),
    ];
    const tasks = parseOfficialTasks(messages);
    expect(tasks).toHaveLength(1);
    expect(tasks[0]!.status).toBe("completed");
    expect(tasks[0]!.summary).toBe("done");
    expect(tasks[0]!.lastToolName).toBe("Bash");
    expect(tasks[0]!.usage?.durationMs).toBe(12_000);
    expect(tasks[0]!.startedAt).toBe(Date.parse("2026-08-01T11:00:00.000Z"));
    expect(tasks[0]!.completedAt).toBe(Date.parse("2026-08-01T11:05:00.000Z"));
  });
});

describe("parseOfficialTasks TaskOutput residual", () => {
  it("settles legacy async_launched row via TaskOutput (no system bookend)", () => {
    const messages = [
      msg({
        type: "user",
        timestamp: "2026-08-01T11:15:00.000Z",
        toolUseResult: {
          agentId: "a4b5a08fdcac94dde",
          status: "async_launched",
          description: "功能规格分析",
        },
        message: {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: "call-agent-18",
              content: "launched",
            },
          ],
        },
      }, "u1"),
      msg({
        type: "user",
        timestamp: "2026-08-01T11:20:00.000Z",
        message: {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: "call-taskoutput-28",
              content:
                "<retrieval_status>success</retrieval_status>\n"
                + "<task_id>a4b5a08fdcac94dde</task_id>\n"
                + "<task_type>local_agent</task_type>\n"
                + "<status>completed</status>\n"
                + "<output> ## 落盘完成\n1. functional.md</output>",
            },
          ],
        },
      }, "u2"),
    ];

    const tasks = parseOfficialTasks(messages);
    expect(tasks).toHaveLength(1);
    const task = tasks[0]!;
    expect(task.taskId).toBe("a4b5a08fdcac94dde");
    expect(task.status).toBe("completed");
    expect(task.description).toBe("功能规格分析");
    expect(task.toolUseId).toBe("call-agent-18");
    expect(task.taskType).toBe("local_agent");
    expect(task.result).toContain("落盘完成");
    expect(task.completedAt).toBeDefined();
  });

  it("TaskOutput alone does NOT invent a Tasks row (dual-emit is primary)", () => {
    const messages = [
      msg({
        type: "user",
        timestamp: "2026-08-01T11:20:00.000Z",
        message: {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: "call-taskoutput-only",
              content:
                "<task_id>orphan-task-id</task_id>\n"
                + "<task_type>local_agent</task_type>\n"
                + "<status>completed</status>\n"
                + "<output>should not create a row</output>",
            },
          ],
        },
      }, "u-only"),
    ];
    expect(parseOfficialTasks(messages)).toEqual([]);
  });

  it("TaskOutput after official bookend only enriches result (no status clobber)", () => {
    const messages = [
      msg({
        type: "system",
        subtype: "task_started",
        task_id: "a4b5a08fdcac94dde",
        task_type: "local_agent",
        description: "功能规格分析",
        timestamp: "2026-08-01T11:15:00.000Z",
      }, "s1"),
      msg({
        type: "system",
        subtype: "task_notification",
        task_id: "a4b5a08fdcac94dde",
        status: "completed",
        summary: "Agent finished",
        timestamp: "2026-08-01T11:19:00.000Z",
      }, "s2"),
      msg({
        type: "user",
        timestamp: "2026-08-01T11:20:00.000Z",
        message: {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: "call-taskoutput-28",
              content:
                "<task_id>a4b5a08fdcac94dde</task_id>\n"
                + "<task_type>local_agent</task_type>\n"
                + "<status>completed</status>\n"
                + "<output> ## 落盘完成\n1. functional.md</output>",
            },
          ],
        },
      }, "u2"),
    ];
    const tasks = parseOfficialTasks(messages);
    expect(tasks).toHaveLength(1);
    expect(tasks[0]!.status).toBe("completed");
    expect(tasks[0]!.summary).toBe("Agent finished");
    expect(tasks[0]!.result).toContain("落盘完成");
    // Bookend completedAt wins over later TaskOutput residual.
    expect(tasks[0]!.completedAt).toBe(Date.parse("2026-08-01T11:19:00.000Z"));
  });
});
