import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const officialPath = "/Users/apple/work-py/hare-code/.codex-runtime/official-analysis/index-BELzQL5P.esbuild.js";
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const source = (relativePath) => ({ path: relativePath, text: read(relativePath) });
const failures = [];

const files = {
  assistant: source("src/features/cowork/session/transcript/CoworkAssistantMessage.tsx"),
  assistantBlocks: source("src/features/cowork/session/transcript/CoworkAssistantBlocks.tsx"),
  assistantStore: source("src/features/cowork/session/transcript/coworkAssistantTimelineStore.ts"),
  chains: source("src/features/cowork/session/transcript/coworkMessageChains.ts"),
  content: source("src/features/cowork/session/transcript/CoworkAssistantContent.tsx"),
  conversation: source("src/features/cowork/session/transcript/CoworkConversation.tsx"),
  conversationSpacer: source("src/features/cowork/session/transcript/CoworkConversationBottomSpacer.tsx"),
  fixture: source("src/fixtures/coworkOfficialFixtures.json"),
  glyphs: source("src/features/cowork/ui/CoworkOfficialGlyphs.tsx"),
  messageStore: source("src/features/cowork/session/transcript/coworkMessageStore.ts"),
  messageStoreIndexes: source("src/features/cowork/session/transcript/coworkMessageStoreIndexes.ts"),
  messageCell: source("src/features/cowork/session/transcript/CoworkMessageCell.tsx"),
  permission: source("src/features/cowork/composer/CoworkPermissionApprovals.tsx"),
  primitives: source("src/features/cowork/session/transcript/CoworkTimelinePrimitives.tsx"),
  statusPill: source("src/features/cowork/session/transcript/CoworkStatusPill.tsx"),
  timeline: source("src/features/cowork/session/transcript/CoworkTimeline.tsx"),
  timelineBlock: source("src/features/cowork/session/transcript/CoworkTimelineBlock.tsx"),
  timelineModel: source("src/features/cowork/session/transcript/coworkTimelineModel.ts"),
  timelineSegment: source("src/features/cowork/session/transcript/CoworkTimelineSegment.tsx"),
  toolRow: source("src/features/cowork/session/transcript/CoworkToolRow.tsx"),
};

function requirePattern(file, pattern, description) {
  if (!pattern.test(file.text)) failures.push(`${file.path}: ${description}`);
}

function forbidPattern(file, pattern, description) {
  if (pattern.test(file.text)) failures.push(`${file.path}: ${description}`);
}

function verifyOfficialSource() {
  if (!fs.existsSync(officialPath)) {
    failures.push(`${officialPath}: official ion-dist analysis source is missing`);
    return;
  }
  const official = fs.readFileSync(officialPath, "utf8");
  for (const symbol of ["Rst", "Lst", "Ist", "Ret", "Tet", "Net", "LTe"]) {
    const declaration = new RegExp(`(?:function\\s+${symbol}\\b|\\b${symbol}\\s*=\\s*(?:n\\.memo|n\\.forwardRef|\\())`);
    if (!declaration.test(official)) failures.push(`${officialPath}: missing official ${symbol}`);
  }
}

function verifyOfficialComponentBoundaries() {
  requirePattern(files.messageCell, /data-test-render-count=\{renderCount\}[\s\S]*message\.sender === "human"[\s\S]*CoworkAssistantMessage/, "Cat/wat message dispatch boundary is absent");
  requirePattern(files.assistant, /motion\.div[\s\S]*group relative relative pb-3[\s\S]*data-is-streaming=\{isThisMessageStreaming\}/, "Rst/YYe assistant shell is absent");
  requirePattern(files.assistantBlocks, /segmentCoworkMessageBlocks[\s\S]*arrangeCoworkAssistantSegments/, "Lst segmentation and sequence orchestration are absent");
  requirePattern(files.assistantBlocks, /useCoworkAssistantTimelineStore[\s\S]*useSyncCoworkAssistantTimelineStore/, "Lst/J9e timeline store wiring is absent");
  requirePattern(files.assistantStore, /createStore\(\(\) => initialState\)/, "J9e per-assistant timeline store is absent");
  requirePattern(files.timelineSegment, /<CoworkTimeline[\s\S]*statusPillClassName="pl-2 py-1\.5"[\s\S]*timelineClassName="pl-2"/, "Ist does not pass official Ret props");
  requirePattern(files.timeline, /grid grid-rows-\[auto_auto\] min-w-0/, "Ret grid is absent");
  requirePattern(files.timeline, /row-start-1 col-start-1 relative z-\[2\] min-w-0/, "Ret content-after layer is absent");
  requirePattern(files.timeline, /row-start-1 col-start-1 relative min-w-0 z-\[3\] overflow-hidden/, "Ret live timeline layer is absent");
  requirePattern(files.statusPill, /group\/status flex items-center gap-2 py-1 text-sm transition-colors cursor-pointer text-left/, "Tet status button classes differ");
  requirePattern(files.primitives, /flex flex-col font-ui leading-normal[\s\S]*TimelineContext\.Provider/, "det boundary is absent");
  requirePattern(files.primitives, /flex flex-col shrink-0[\s\S]*w-\[20px\] flex justify-center shrink-0/, "cet boundary is absent");
  requirePattern(files.timelineBlock, /CoworkTimelineThinkingText[\s\S]*CoworkTimelineGroupItem[\s\S]*CoworkTimelineTextContent/, "gst -> Net thinking renderer is absent");
  requirePattern(files.timelineBlock, /CoworkTimelineClockGlyph className="text-text-500" size=\{16\}/, "Net leading clock icon is absent");
  requirePattern(files.glyphs, /M10\.386 2\.51A7\.5 7\.5 0 1 1 2\.5 10/, "official nv clock path is absent");
  requirePattern(files.glyphs, /const vectorSize = vectorSizeOverride \?\? vectorSizes\[size\]/, "official Nx vector-size mapping is absent");
  requirePattern(files.glyphs, /viewBox="0 0 20 20"/, "official Nx viewBox is absent");
  forbidPattern(files.timelineBlock, /CoworkThinkingRow|label = expanded \? "Thought process"/, "old O9e-like timeline thinking row is still active");
  requirePattern(files.toolRow, /group\/row flex flex-row items-center rounded-lg px-2\.5 w-full/, "met tool row classes differ");
}

function verifyMessageAndPermissionFlow() {
  requirePattern(files.conversation, /relative w-full min-h-full flex flex-col/, "IYe inner scroll container is absent");
  requirePattern(files.conversation, /Math\.floor\(node\.scrollHeight - node\.scrollTop - node\.clientHeight\) < 8/, "official pin-to-bottom threshold is absent");
  requirePattern(files.conversation, /\{permissionApprovals\}[\s\S]*<CoworkConversationStatus/, "LTe is not between messages and status");
  requirePattern(files.conversation, /className="h-12"[\s\S]*<CoworkConversationBottomSpacer/, "h-12 and LUt bottom spacer order differs");
  requirePattern(files.conversationSpacer, /containerHeight - humanHeight - assistantHeight - composerHeight - extrasHeight - 98/, "LUt height calculation differs");
  requirePattern(files.permission, /visibleRequests\.length > 0 \? "mb-6"[\s\S]*AnimatePresence/, "LTe permission boundary is absent");
  requirePattern(files.permission, /-mx-1 overflow-hidden px-1/, "LTe permission item wrapper differs");
  requirePattern(files.permission, /Schedule task/, "scheduled-task approval branch is absent");
  requirePattern(files.permission, /Save skill/, "save-skill approval branch is absent");
}

function verifyMessageModel() {
  requirePattern(files.chains, /mergedContent: messages\.flatMap/, "GLt assistant chain merge is absent");
  requirePattern(files.chains, /firstMessageUuid[\s\S]*lastMessageUuid/, "GLt chain identities are absent");
  requirePattern(files.messageStore, /buildCoworkChatMessages/, "official message store entry is absent");
  requirePattern(files.messageStoreIndexes, /collectToolResults/, "tool-result index is absent");
  requirePattern(files.messageStoreIndexes, /collectToolSummaries/, "tool-summary index is absent");
  requirePattern(files.timelineModel, /process_group_marker/, "Lst process-group filtering is absent");
  requirePattern(files.timelineModel, /search_plugins/, "Lst plugin-search filtering is absent");
  requirePattern(files.timelineModel, /contentAfter/, "Lst timeline/content arrangement is absent");
}

function verifyCoworkBoundary() {
  const coworkRoot = path.join(root, "src/features/cowork");
  for (const filePath of walk(coworkRoot)) {
    if (!/\.(?:ts|tsx)$/.test(filePath)) continue;
    const text = fs.readFileSync(filePath, "utf8");
    if (/from\s+["'][^"']*(?:features\/code|\/code\/)[^"']*["']/.test(text)) failures.push(`${path.relative(root, filePath)}: Cowork imports a Code business component`);
  }
}

function verifyFixture() {
  const fixture = JSON.parse(files.fixture.text);
  if (!Array.isArray(fixture.messages) || fixture.messages.length < 8) failures.push(`${files.fixture.path}: representative message stream is missing`);
  if (!fixture.messages.some((message) => message.raw?.message?.content?.some?.((block) => block.type === "thinking"))) failures.push(`${files.fixture.path}: thinking block is missing`);
  if (!fixture.messages.some((message) => message.raw?.message?.content?.some?.((block) => block.type === "tool_use"))) failures.push(`${files.fixture.path}: tool-use block is missing`);
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

verifyOfficialSource();
verifyOfficialComponentBoundaries();
verifyMessageAndPermissionFlow();
verifyMessageModel();
verifyCoworkBoundary();
verifyFixture();

if (failures.length) {
  console.error(`Cowork official rendering verification failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Cowork official rendering verification passed.");
