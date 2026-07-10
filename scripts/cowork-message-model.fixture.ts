import {
  buildOfficialCoworkMessageChains,
  normalizeSdkMessages,
  segmentCoworkMessageBlocks,
  type CoworkContentBlock,
} from "../src/features/cowork/session/transcript/coworkMessageModel";

const rawMessages: Record<string, unknown>[] = [
  sdk("user", "user-1", [
    { type: "text", text: "<uploaded_files><file><file_path>/tmp/brief.pdf</file_path><file_uuid>file-1</file_uuid></file></uploaded_files>\nHello<system-reminder>hidden</system-reminder>" },
  ]),
  { ...sdk("user", "synthetic", [{ type: "text", text: "hidden" }]), isSynthetic: true },
  sdk("assistant", "assistant-1", [
    { type: "thinking", thinking: "Inspect the source" },
    { type: "tool_use", id: "tool-read", name: "Read", input: { file_path: "/tmp/brief.pdf" } },
  ], "api-1"),
  {
    ...sdk("user", "result-1", [{ type: "tool_result", tool_use_id: "tool-read", content: "source text" }]),
    tool_use_result: { structuredContent: { pageCount: 2 }, _meta: { source: "local" } },
  },
  { type: "tool_use_summary", summary: "Read source material.", preceding_tool_use_ids: ["tool-read"] },
  sdk("assistant", "assistant-2", [{ type: "text", text: "I found the source." }], "api-2"),
  sdk("assistant", "assistant-task", [{ type: "tool_use", id: "task-1", name: "Task", input: { prompt: "Research" } }], "api-task"),
  { ...sdk("assistant", "assistant-child", [{ type: "text", text: "Child detail" }], "api-child"), parent_tool_use_id: "task-1" },
  sdk("assistant", "assistant-after-task", [{ type: "text", text: "Final answer" }], "api-final"),
  sdk("user", "restart", [{ type: "text", text: "Read the output file to retrieve the result: /tmp/result" }]),
];

const messages = normalizeSdkMessages(rawMessages);
equal(messages.length, 3, "visible message count");
equal(messages[0].sender, "human", "first sender");
equal(messages[0].content[0].text, "Hello", "system tags stripped");
equal(messages[0].files_v2[0].path, "/tmp/brief.pdf", "uploaded file parsed");
equal(messages[1].sender, "assistant", "assistant sender");
equal(messages[1].uuid, "assistant-1", "merged assistant keeps first UUID");
deepEqual(messages[1].content.map(blockKey), [
  "thinking", "tool_use:tool-read", "tool_result:tool-read", "tool_use_summary", "text", "tool_use:task-1", "text:subagent",
], "tool result, summary, task, and child ordering");
equal(messages[1].content[2].structured_content && typeof messages[1].content[2].structured_content === "object", true, "structured tool metadata retained");
equal(messages[1].content[6]._parentToolUseId, "task-1", "child block parent retained");
equal(messages[2].uuid, "assistant-after-task", "post-Task assistant starts a new message");

const chains = buildOfficialCoworkMessageChains(messages);
equal(chains.length, 2, "human plus assistant chain");
equal(chains[1].isChain, true, "adjacent assistants form GLt chain");
deepEqual(chains[1].messageUuids, ["assistant-1", "assistant-after-task"], "GLt UUID order");
equal(chains[1].firstMessageUuid, "assistant-1", "GLt first UUID");
equal(chains[1].lastMessageUuid, "assistant-after-task", "GLt last UUID");
equal(chains[1].mergedContent.at(-1)?.text, "Final answer", "GLt merged content");

const timelineInput: CoworkContentBlock[] = [
  { type: "thinking", thinking: "Plan", summaries: [{ summary: "Reviewed requirements." }] },
  { type: "tool_use", id: "regular", name: "Read", input: {} },
  { type: "tool_result", tool_use_id: "regular", content: [{ type: "text", text: "ignored in timeline" }] },
  { type: "tool_use_summary", summary: "Read the brief.", preceding_tool_use_ids: ["regular"] },
  { type: "text", text: "Drafting now." },
  { type: "tool_use", id: "scheduled", name: "create_scheduled_task", input: {} },
  { type: "tool_result", tool_use_id: "scheduled", content: [{ type: "text", text: "created" }] },
  { type: "tool_use", id: "ask", name: "AskUserQuestion", input: { questions: [] } },
  { type: "tool_result", tool_use_id: "ask", content: [{ type: "text", text: "answered" }] },
];
const segments = segmentCoworkMessageBlocks(timelineInput);
deepEqual(segments.map((segment) => `${segment.type}:${segment.blocks.map(blockKey).join(",")}`), [
  "timeline:thinking,tool_use:regular",
  "content:text",
  "content:tool_use:scheduled,tool_result:scheduled,tool_use:ask,tool_result:ask",
], "G9e timeline/content segmentation");
equal(segments[0].type === "timeline" ? segments[0].statusText : undefined, "Reviewed requirements", "thinking summary has official priority");

console.log("Cowork official message model fixture passed.");

function sdk(type: "assistant" | "user", uuid: string, content: CoworkContentBlock[], messageId = uuid) {
  return { type, uuid, message: { id: messageId, role: type, content } };
}

function blockKey(block: CoworkContentBlock) {
  const id = block.type === "tool_use" ? block.id : block.type === "tool_result" ? block.tool_use_id : undefined;
  return `${block.type}${id ? `:${id}` : ""}${block._isSubagentBlock ? ":subagent" : ""}`;
}

function equal(actual: unknown, expected: unknown, label: string) {
  if (Object.is(actual, expected)) return;
  throw new Error(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
}

function deepEqual(actual: unknown, expected: unknown, label: string) {
  equal(JSON.stringify(actual), JSON.stringify(expected), label);
}
