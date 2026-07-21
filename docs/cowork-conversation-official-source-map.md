# Cowork conversation official source map

## 目标与硬边界

本文件是 Cowork 对话流生产代码修改前的证据门禁。目标不是近似还原，而是以当前官方 Claude Desktop 包中的实际实现为唯一依据，迁移从桌面壳到 Web 渲染的完整 Cowork 对话链路。

- 当前范围：Cowork 会话详情中的消息流、消息状态、工具、权限、Markdown、composer、流式与异常状态。
- 后续范围：Cowork 会话列表。当前阶段不得提前混入。
- Cowork 必须使用独立业务模块，不得引用 Code/Epitaxy 的业务 store、runner、消息组件或权限组件。
- Code 的 store、runner、组件与行为保持不变。
- `Mfe`、`Nfe`、`Xve` 属于 Code 权限链，禁止用于 Cowork。
- 未在官方源码中确认的行为必须标为 `unresolved`，不得自行补齐。
- 禁止用额外 CSS、替代 icon、近似 DOM、自造事件或自造状态掩盖结构和链路差异。

## 官方证据基线

- 官方 App：`/Users/apple/Downloads/Claude code 汉化mac桌面版/Claude-Deepseek.app/Contents`
- App 版本：`1.6608.2`
- 官方 Web bundle：`Resources/ion-dist/assets/v1/index-BELzQL5P.js`
- 格式化只读副本：`/Users/apple/work-py/hare-code/.codex-runtime/official-analysis/index-BELzQL5P.pretty.js`
- 官方 main bundle：`Resources/app.asar` 中 `.vite/build/index.js`
- 官方 preload bundle：`Resources/app.asar` 中 `.vite/build/mainView.js`
- 共享 UI chunk：`Resources/ion-dist/assets/v1/c5f4e1303-CSqThUeQ.js`
- 共享 UI CSS：`Resources/ion-dist/assets/v1/c5f4e1303-2SC4Q2zq.css`
- Progressive Markdown chunk：`Resources/ion-dist/assets/v1/c93fb40ec-C-L_NkHO.js`

官方 bundle 无 sourcemap。Web 侧位置使用格式化副本行号，main 侧使用 `.vite/build/index.js` byte offset。minified symbol 只作为本版本内的精确定位符，不推断其原始源码名。

## 2026-07-12 当前实现与运行证据

本节记录已经落地并验证的链路；**本节状态优先于矩阵中任何较早“当前偏差”表述**。未列出的官方分支仍按矩阵和完成门禁继续处理，不得据此宣称整个 Cowork 已完成。

### Desktop 活跃链（已落地，非 ClaudeCliRunner）

- **IPC 注册单轨**：`registerDesktopIpc` → `registerCoworkSessionsHandlers` 注册 `claude.web.LocalAgentModeSessions`；`registerLocalSessionsHandlers` **只**注册 Code 的 `LocalSessions`。活跃 Cowork 入口是 `coworkSessionsHandlers.ts` + `CoworkSessionManager`，不是 `createSessionHandlers(..., "LocalAgentModeSessions")`。
- **Manager**：`electron/main/services/coworkSessions/coworkSessionManager.ts` 独立 session Map、long-lived Query、permission broker、buffer/replay、`emit → LocalAgentModeSessions.onEvent`。
- **CLI 仅 Code**：`localSessionRunner.ts` 只暴露 `getLocalSessionRunner` / `dispatchLocalSessionEvent`；无 LocalAgentMode 接口。`ClaudeCliRunner` 的 `{type:"completed"}` 合成 **仅 Code 路径**，不得写回 Cowork 矩阵。
- **Persistence**：`CoworkSessionPersistence` 使用官方目录名 `local-agent-mode-sessions/<account>/<org>`；metadata 含 `hostLoopMode`；transcript 走 JSONL reader，不内联进 flat store。
- **Transcript**：`coworkRuntime/coworkTranscriptJsonl.ts` 按官方 `THi` / `parseTranscriptLines` 读原始 SDK JSONL（`toolUseResult` camel-case、允许类型、compact preserved segment、tail limit）；SDK transcript 仅 fallback。
- **Account**：`CoworkAccountContext.setAccountDetails` + `webMiscHandlers` `Account.setAccountDetails` 已接线；`waitForIdentity(5s)` + bootstrap fallback 存在。Web 侧 renderer `setAccountDetails` effect 与 identity 变化 flush/migrate 仍可能不完整（见矩阵）。
- **Permission broker**：`coworkPermissionBroker` Promise Map + once/always/deny；普通 Write 已实测 exact-once。
- **Host-loop 决策（P0 2026-07-12）**：`coworkHostLoop/coworkHostLoopMode.ts` 纯策略（forceDisable / org full-VM / feature flag `1143815894` / `CLAUDE_FORCE_HOST_LOOP`+dev override）；`createCoworkHostLoopModeResolver` 接 feature store；**新会话默认 feature=false（无 GB 桥时不硬 true）**；resume inherit `existing.hostLoopMode === true`；host-loop+full-VM resume **throw** 官方文案。`requireCoworkFullVmSandbox` 生产仍 stub `() => false`（org payload unresolved）。双执行面（host process + workspace Bash/VM）模块骨架有 `coworkHostProcess`/`coworkHostToolPolicy`，**未宣称 1:1 完成**。

### Web 活跃链与 settle（P0 completed 已删）

- **Bridge**：`coworkSessionBridge = desktopBridge.LocalAgentModeSessions`；runtime `coworkSessionRuntime` + `coworkSessionEvents`。
- **Settle/clear（P0）**：`shouldClearCoworkStream` / `shouldSettleCoworkStream` **不再**把 manager 级或 message 级 `type:"completed"` 当 settle/clear；保留 `result` / `close` / `error` / `stopped` / `cleared`。runtime 在 top-level `completed` 上保持 `isResponding`/`pendingTurn`，直到 `result`/`close`/`stopped`。回归：`scripts/tests/cowork-session-events-settle.test.mjs`。
- **pendingTurn / isResponding**：runtime 用 `pendingTurn` + `session.isRunning` 驱动 responding；与官方 end_turn/result 语义对齐中，事件面仍小于官方 `D1e`。
- **Normalization/store**：`coworkMessageStore*` 已迁 `bfe` 相关 command/system 过滤、tool result/summary/metadata/AskUser answers、subagent parent、pending Human、stream merge（`coworkMessageStreamMerge.ts`）。
- **Assistant 入口**：`CoworkConversation → CoworkMessageCell → Human/Assistant`；旧 `CoworkMessages/ToolRuns/ToolDetails/coworkTranscriptParser` **不在活跃入口**（磁盘残留，Phase 4 清理）。
- **Local Cowork thinking**：活跃 timeline 分支按官方 `gst → Net` 渲染，不再误接通用 `O9e ThinkingCell`。`Thought process` 只由外层 `Ist/Ret` summary 输出一次；展开内容为官方 clock glyph、直接 Markdown、连接线与 Done item，不再生成第二个标题、caret 或嵌套折叠卡。桌面展开态已核对实际 DOM、clock path 与 computed color。
- **渲染缺口（非 P0）**：thinking + w0e + O5e + LUt + progressive Le/Oe markdown landed; remaining: full Alluvium `ae` incremental, artifacts multi-edit evidence, IYe full pin API, GB truth；外壳 class 接近 ≠ 1:1。

### 磁盘死代码 / 易误读残留（矩阵勿当活跃）

- Desktop IPC 双轨死分支（`LOCAL_AGENT_METHODS` / `sendCoworkMessage` / `getSessionRunner(iface)`）已于 **2026-07-12** 删除；`localSessionsHandlers` 仅 LocalSessions。
- 旧 Web `CoworkMessages` / `CoworkToolRuns` / `CoworkToolRenderer` 仍在 `transcript/`，不可当活跃入口修完即宣称页面对齐。

### 其它已证实运行点

- AskUserQuestion：pending banner + transcript answers 重启可恢复。
- Conversation status：`g$t`/`s$t` 类 avatar/waiting 已部分对齐（class 实测见历史记录）。
- Streaming reducer：message_start/thinking/tool/text delta 与 step message 有桌面样本。
- 3P account：`custom3p-install-id` 稳定 account/org 目录，避免 `Session not found`。
- 运行样本：`local_7102676c-…` AskUser；`local_9cecfcbb-…` Glob/Read；`local_724bccd9-…` Write deny。
- 自动验证（历史水位，改后须重跑）：Web typecheck/build + settle 相关 tests；Desktop vitest host-loop/manager。全量 Desktop `tsc` 仍可能被非 Cowork 文件阻塞。**packaged `.vite/build/index.js` 在 rebuild 前可能仍含旧 hard-true**。

### Activity folders / Browse files（2026-07-19）

- 官方 `xQt`（pretty ~248884）Working folder / Browse files **只**以 `userSelectedFolders` 为 host 根；`listFilesInFolder(sessionId, folderPath)` 的第二参是真实 host path。
- LocalAgentMode `getSession`：`cwd` 常为虚拟 `/sessions/<uuid>`，**无** `folders` 字段时仍有 `userSelectedFolders`。
- **已修**：`coworkSessionFolders`（`session/activity/coworkResourceActivity.ts`）优先 `userSelectedFolders` → `folders` → 非 `/sessions/` host `cwd`；单目录 section title 用 basename（对齐 `Y8`）。composer `browseFiles` defaultPath 同规则。
- 桌面 CDP：`local_724bccd9-…` Browse files 列出 AppAgent 内容；活动栏标题为 `AppAgent` 而非 session id。

### D1e archived + fsDetectedFiles（2026-07-19 续）

- 官方 D1e `fs_file_created|modified|deleted`（pretty ~113624–113662）：`Me` Map upsert/delete；hydrate `n.fsDetectedFiles` → `Me`（~114116）。
- 官方 activity 合并（~60258）：tool resources 之后追加 `operation:"fs_detected"`，跳过已 write/edit/create 覆盖的 hostPath。
- 官方 list/scheduled：`archived` → `isArchived:true`（~39125 / ~65678）；scheduled-task detail reload `session_updated || archived`（~250355）。
- 官方 main `FileSystemWatcher`（app.asar `_v`/`ANA`）：非递归 `fs.watch`；EAA 过滤点文件/`~$`/`~*.tmp`/DS_Store；create 立即、modify 150ms debounce、create-echo 300ms grace；`startFileWatching(sessionId, userSelectedFolders)` 否则 `getOutputsDir`；`fsEvent` → session Map + `emit({type, sessionId, fsFile})`。
- **已落地**：
  - Desktop `CoworkFileSystemWatcher` + manager start/stop/addFolder/resume 接线；`toRendererSession` 暴露非空 `fsDetectedFiles`。
  - Web state Map + runtime `archived` / `fs_file_*`；`mergeCoworkFsDetectedActivity`；scheduled runs 过滤。
  - Unit：watcher + manager fsWatch + web merge/hydrate/runtime。
- **诚实 residual**：需**重启 desktop** 才加载 watcher；host-loop VM 输出路径 / path staging 与官方 full dual-exec 仍非 1:1。

### D1e reverse-RPC + rate_limit + Tke.scanTranscript（2026-07-21）

官方 anchors（pretty `index-BELzQL5P`）：
- D1e ~113478 `rate_limit_event` → `jue` map → `xI(orgUuid)` messageLimits
- Tke ~71033–71058 `emit` / `scanTranscript`（newest→oldest；`within_limit` 或过期 `resetsAt` → 不应用）
- seedTranscript / reseed / appendTail / transcript case 均 `Tke.scanTranscript(messages, sessionId)`
- directory_servers_* ~113664 → `respondDirectoryServers`
- slash_menu_skills_resolve / addable_skills_search ~113738 → `respondSlashMenuSkills`
- plugins_search ~113756 → `respondPluginSearch`
- NVe ~96524 usage banner 依赖完整 account `hc()` / react-query messageLimits + EVe/IVe/AVe — **不发明 banner UI**

**Web 已落地（WIP until 提交）：**
- `rateLimit/coworkRateLimitMap.ts`：`mapCoworkRateLimitInfo` (jue) + `extractRateLimitInfoFromMessageEvent` + `scanCoworkTranscriptRateLimit` (Tke)
- `rateLimit/coworkRateLimitStore.ts`：local `messageLimits[orgUuid]`（非 full account bootstrap）
- runtime live `rate_limit_event` → store；hydrate 后 `scanCoworkTranscriptRateLimit(transcript)` → store（seedTranscript 等价）
- directory / slash skills / plugins reverse-RPC helpers + runtime respond paths
- Tests：`cowork-d1e-reverse-rpc.test.mjs` + runtime reverse-RPC/rate_limit/hydrate-scan；typecheck clean

- `cu_lock_released` (~114004)：session match → rAF `[data-autoscroll-container].scrollTop = scrollHeight`（`applyCoworkCuLockReleasedScroll`；不发明 CU lock 产品状态）

**诚实 residual：**
- Full account messageLimits react-query + NVe usage banner UI（EVe/IVe/AVe）未接
- plugins catalog 无 org 时 empty（honest）
- live CDP agent turn smoke for directory/skills/plugins/rate_limit 未跑
- `local_mcp_servers` / `sdk_mcp_status` 依赖 full mcpCoordinator / a1 remote store — **不发明**
- dual-exec VM / Settings Th / Artifacts yn / full mcpCoordinator **不发明**

## 端到端证据矩阵

> **读法**：先读上一节「当前实现」；矩阵「当前对应」列以 **2026-07-12 重写** 为准。历史“必须新建 manager / 禁止现有路径”等措辞已过时处已改为 **审计/收口现有 Cowork 路径**。

| 链路节点 | 官方源码依据 | 官方行为 | 当前对应与已证实偏差（2026-07-12） | 结论 |
| --- | --- | --- | --- | --- |
| Cowork namespace | Web `hT = claude.web.LocalAgentModeSessions`，pretty `13062`；Code `CT = claude.web.LocalSessions`，`13072` | Cowork 与 Code 使用不同 IPC namespace | **已拆开**：`registerCoworkSessionsHandlers` 挂 `LocalAgentModeSessions`；`registerLocalSessionsHandlers` 只挂 `LocalSessions`。Web `coworkSessionsBridge` 直连 LocalAgentMode。 | 保持单轨；禁止再让 generic LocalSessions facade 接管 Cowork |
| Manager 身份 | main `Mv extends f6e`，offset `10410648-10558614`；singleton `ai`，`10558901-10558911` | 独立 LocalAgentModeSessionManager、session/permission Map、MCP、watcher、scheduler、health | **已有** `CoworkSessionManager` + repository/persistence/query runtime/permission broker。MCP/watcher/scheduler/health 完整度仍低于官方。**不是** `LocalSessionStore + ClaudeCliRunner`。 | 在现有 manager 上收口缺口；禁止回退 CLI runner |
| Account/org 初始化 | main base `initializeWithAccount/doInitialize`，`9161252-9163094`；account provider `GrA/gbA`；renderer pretty `255625-255644`；adapter `ynt` | Web `setAccountDetails` → 内存 provider；manager wait ≤5s → bootstrap；3P orgUuidOverride；identity 变则 flush/migrate | Desktop `CoworkAccountContext` + `Account.setAccountDetails` **已非 no-op**；wait/bootstrap/3P install-id 有部分实现。Web renderer 官方时序 effect 与 identity 变化全链路仍可能不全。 | 补 Web sync effect 与 identity 变更语义；勿再写 “Desktop no-op” |
| Cowork persistence | main `getAccountStorageDir`/`loadSessions`/`writeSessionToDisk`，`10415886-10428581` | `local-agent-mode-sessions/<account>/<org>`；metadata 独立；transcript 不进 metadata | **`CoworkSessionPersistence` 已用官方目录名与 per-session metadata**（含 hostLoopMode）。Code 的 `LocalSessionStore`/epitaxy-sessions **仅 Code**。 | 禁止 Cowork 使用 LocalSessionStore；继续对齐 metadata 字段与写盘时序 |
| startSession | main `10448018-10455309`；validator `hFt` | canonical SDK user event → buffer/emit → 异步 Query；返回 session id | **`manager.start` + handlers.start** 走独立路径；canonical user event / init 时序已有测试覆盖主干。input 校验与官方 `hFt` 全字段仍可能不全。 | 审计 start 契约与官方 validator，不重建第二 manager |
| sendMessage | main `10505959-10509870`；adapter `11444615-11444943` | 六参；live Query 跨 turn；先 emit user 再 enqueue | **活跃路径**：`coworkSessionsHandlers.sendMessage` → `manager.sendMessage`（含 initializing queue）。六参 contract 有 `coworkSendMessageContract`。images/toolStates/path staging 语义仍有缺口。`localSessionsHandlers.sendCoworkMessage` 为**死分支**。 | 只修 manager 路径；删除死分支防双轨 |
| Long-lived Query | async queue `p2`；init；SDK `bD` | 单 Query + AsyncIterable 跨轮；partial；canUseTool→broker | **`coworkAsyncInputQueue` + `coworkQueryRuntime` / agent query factory** 已接；`ClaudeCliRunner` **仅 Code**（runner API 无 LocalAgentMode）。 | 禁止 CLI 每轮 spawn；继续对齐 partial/canUseTool 边界 |
| Query consumer | main `setupQueryHandlers`，`10534996-10550619` | stream 不进 buffer；result/error/close 状态机；**无** manager 级 `completed` | Manager emit message/result/close；**不**合成 session `completed`。Web P0 已忽略 completed settle/clear。Code runner 仍发 completed——**与 Cowork 无关**。 | 保持无 completed；Web 只认 result/close/error/stopped |
| Buffer/replay | main buffer + getSession replay `bufferedMessages` | user + 非 stream SDK 进 buffer；getSession 默认 replay | Manager `bufferedMessages` + getSession 已有；Web hydration 仍可能简化/漏分支。 | replay 归 manager；Web 只消费官方 shape |
| Transcript | main `parseTranscriptLines/getTranscript`；`THi` | JSONL 过滤、compaction、VM path 翻译 | **`coworkTranscriptJsonl` + transcriptReader** 已接 manager。VM path 翻译与部分 compaction 边角未闭合。 | 在现有 service 上补边角，不新建平行 store transcript |
| Event dispatcher | manager → `dispatchOnEvent` / LocalAgentMode `onEvent` | 统一 onEvent 面 | Manager `emit` 单轨 `onEvent`。`localSessionRunner` 双发 heuristic **仅 Code**。Web runtime 事件子集仍小于官方。 | 扩展 Web reducer；勿把 CLI heuristic 接回 Cowork |
| IPC validation | generated handlers + origin/schema | origin + args/result schema | **`assertCoworkIpcOrigin` + sendMessage contract + start message 校验** 已有；result schema/全方法校验未全覆盖。 | 补全 schema，不换注册入口 |
| Permission broker | main handle/respond/resolve，`10438912-10445866` | Promise Map、exact-once、300s stalled | **`coworkPermissionBroker` 已独立**；Write 实测 once/always/deny。stalled/supersede/部分 return shape 仍可能差。 | 在现有 broker 上对齐，不新建第二套 |
| VM/host-loop | gate cluster；host branch；`UXe`；VM factory | 新会话 policy；resume inherit；双执行面 | **P0：决策层去硬 true**（policy 模块 + resume inherit + full-VM reject）。默认 feature false；org full-VM source stub false；host process/tool policy 有骨架。**双执行面与 VM Swift 路径未 1:1**。 | 先接 GB/org 真源，再补执行面；禁止再 hard-wire true |
| Upload/path translation | main `Rwe/Mwe`… | staging、host/VM 双向 path | 仍明显弱于官方；workspace handlers 局部存在 | 继续按官方建/补 Cowork path 模块 |
| Web session bootstrap | pretty `O3t/D3t/…`；`O0t` | per-session store provider + hydrate + onEvent | `CoworkSessionController/runtime` 已独立；per-pane provider 隔离与官方 `Ete()` 仍可能不等价 | 收口 lifecycle，不混 Code store |
| Web event reducer | pretty `D1e` / `S3t` | 全量 event switch | runtime：message/result/error/close/stopped/**completed ignored**；`rate_limit` live+Tke scan；`fs_file_*`/`archived`；directory/slash/plugins reverse-RPC respond。缺：usage banner UI、CU/full MCP coordinator、VM path | 继续扩面；不造 banner/account bootstrap |
| Message normalization | pretty `bfe` | 全部分支 | 主体已迁独立模块；边角 metadata/MCP 等继续对照 | 继续 diff `bfe`，禁止回退旧 parser 为入口 |
| Message store/index | pretty `Zle` | path/chain index | 独立 message path store 存在；多 conversation 隔离需再审 | 按官方 selector 职责修 |
| Assistant chain | pretty `GLt` / `v$t` | parent/path chain | 活跃链有 timeline/content 分段；规则完整度仍差 | 迁移官方 grouping |
| Conversation layout | pretty `v$t` 等 | 固定 column/permission/status/spacer/composer 序 | DOM 序 keep；LUt 公式 + Je 220 constant export；agent Je.show false | 实启；Je true product path if ever needed |
| Human message | pretty `KYe` 等 | bubble/attachments/collapse/actions | 外壳 class 部分对齐；attachment/collapse/action 不完整 | 按官方组件补全 |
| Assistant message | pretty `Rst`/`YYe`/`ZYe` | motion、streaming、Lst、actions | 外壳部分相似；内部 Markdown/tool/timeline 不等价 | 修内部，不粉刷外壳 |
| Timeline/content split | pretty `Lst`/`G9e` | 稳定分段 | 本地 `CoworkTimeline*` 模型，非完整官方 segmentation | 迁移官方 segmentation |
| Thinking | 通用 `O9e`，pretty `136552-136702`；Local Cowork dispatch `gst → Net`，`143240-143289`、`138995-139019` | Local Cowork timeline 的 summary 由 `Ist/Ret` 输出；thinking block 本身只渲染 clock glyph、timeline Markdown 与连接线 | **active Local Cowork path** 已切到 `Net` 等价结构；桌面展开态只有一个可见 summary，正文左侧 clock path、颜色与连接线均存在 | 已迁移并接入；通用 `O9e` 不进入 Local Cowork 活跃 timeline |
| Tool dispatch | pretty `O5e` → renderToolUseCell | permission null → specialized → generic | **audit**: local OfficialToolRenderer mirrors thin O5e; AskUserQuestion always widget; artifacts multi-edit not invented | 实启 + missing product tools only with evidence |
| Tool primitive | pretty `bde/xde/gde` | header/shimmer/footer 等 | DOM/state 不等价 | 官方 primitive |
| Permission mount | pretty `O0t`→`LTe` | 先本地移除再 respond | 链存在但不完整 | 严格按官方链 |
| Permission cards | pretty `LTe` branches | 多类型卡 | 部分卡；键盘/类型缺口 | 逐 branch |
| Button primitive | shared `LC`/`B` | 完整 variant | `CoworkButton` 不等价 | 对话链官方 primitive |
| Split dropdown | pretty `Tde/Ade` | 双 button + Radix | Base UI 单 trigger | 不可复用 |
| Interruption | pretty `Kfe`/`o2e` | 抑制规则 + Retry | 有部分实现对齐；需持续对照 | 按官方判定 |
| Message actions | pretty `w0e`/`C0e` flow | agent: copy + human rewind; no assistant retry | **agent-mode minimal set** in `CoworkMessageActions`; edit/feedback/debug/pager are !T | 实启核对 hover/hidden |
| Human Markdown | `pat→cat→$nt` | 受限规则 | 与 Assistant 共用风险仍在 | 分离 parser |
| Assistant Markdown | ProgressiveStandardMarkDown (`c93fb40ec` `_e`/`Oe`/`Le`) | flag 动态 alluvium/fade；progressive 行切块 | **Le/Oe line chunker** + dynamic gates landed；Alluvium full `ae` still residual AST; fade = data attr + single tree | 实启；Alluvium 真增量；GB 真源 |
| Composer | pretty store chain | per-conversation send 全字段 | 局部 state/硬编码 model 风险 | 官方 store/DOM/send |
| Icons | shared SVG / Phosphor | 确定来源 | 部分替代 glyph | 只用官方 whitelist |
| Scroll/bottom status | pretty `IYe`/`g$t`/`LUt` | sentinel + spacer + composer 序 | **LUt** formula; **g$t dual** m$t/h$t + ns; **AYe** chatInputTop writer; **IYe** handle + pin re-stick (`coworkAutoscroll` / `useCoworkAutoscroll`); session re-pin via t$t click + streaming near-bottom | 实启；t$t IntersectionObserver button chrome；retryCount product source；chatInputTop readers sparse |

## 当前活跃链与废弃链

当前活跃 Web 链：

```text
CoworkSessionPage
  -> CoworkSessionView
  -> CoworkSessionController / coworkSessionRuntime
  -> CoworkConversation
  -> CoworkMessageCell
  -> CoworkHumanMessage | CoworkAssistantMessage
  -> CoworkTimeline / CoworkAssistantContent / CoworkOfficialToolCell / CoworkMarkdown
```

已证实不在当前活跃入口上的旧链：

```text
CoworkSessionLayout
CoworkMessages
  -> CoworkMessagePrimitives
  -> CoworkToolRuns
  -> CoworkToolDetails
coworkTranscriptParser
旧 completion/stream smoother 路径
```

不能只修改旧链文件后声称页面已对齐。实施时必须从实际 route 入站重新验证活跃调用图，并在替换完成后删除或明确停用重复路径。

## 可复用与禁止复用边界

可复用的仅限机械 transport、已存在的独立 Cowork 模块，或底层依赖：

- Desktop `shared/ipc/channel.ts` 的 channel 格式。
- Desktop `electron/preload/expose.ts` 的 invoke/sync/event transport。
- Desktop `registerIpc.ts` 的基础注册和事件派发机制 + 已有 `assertCoworkIpcOrigin` / sendMessage contract。
- 单一 LocalAgentMode `onEvent` transport（manager `emit`）。
- **已存在的独立 Cowork 栈（应继续审计/收口，禁止平行重写）**：`CoworkSessionManager`、`coworkSessionsHandlers`、`CoworkSessionPersistence`、`coworkPermissionBroker`、`coworkAsyncInputQueue` / query runtime、`coworkTranscriptJsonl`、`coworkHostLoopMode` 策略模块、Web `coworkSessionRuntime` / message store 链。
- 已安装的 `@anthropic-ai/claude-agent-sdk` 作为 Query runtime 基础。
- 已打包的 `@ant/claude-swift` native runtime、Claude binary 定位、少量 env/persistence 外设服务。

明确禁止 Cowork 复用或回退：

- `LocalSessionStore` / flat `epitaxy-sessions.json` 作为 Cowork 会话存储
- `ClaudeCliRunner` 驱动 LocalAgentMode（runner 已无该 API；禁止加回）
- 用 generic `createSessionHandlers` **再次注册** LocalAgentModeSessions（已单轨 `coworkSessionsHandlers`）
- `localSessionRunner` 的 permission/completed heuristic 接到 Cowork
- 自造 manager 级 `type:"completed"` 作为 Web settle/clear 信号
- host-loop **硬编码 `true`**（须走 policy / feature / env；默认无 GB 时 false）
- fake `ClaudeVM` 业务行为冒充官方双执行面
- Code 的 store、renderer、permission chain（`Mfe/Nfe/Xve`）
- 当前不等价的 Button、split dropdown、Markdown、thinking、tool primitive 作为“已 1:1”替身

## Unresolved 节点

以下节点已有边界证据，但没有足够依据实现其内部细节：

1. `claude_ai_alluvium_main`、`claudeai_streaming_fade_in_main` 等 runtime feature gate 的本机实际值。实现必须保留动态 evaluator，不能静态猜 true/false。
2. stable Agent SDK 与官方包 future dev alias 是否存在隐藏行为差异，需要 differential/runtime 验证。
3. `@ant/claude-swift.vm` 的底层 VM transport/daemon 协议，以及当前 dev 和 packaged 环境的实际 guest 启动能力，尚未运行验证。
4. host-loop workspace `web_fetch` 的 claude.ai 服务端实现、SDK 内部触发 `canUseTool` 的具体时点和 Windows 默认 spawn 内部细节无法从 `UXe` 恢复。
5. **GrowthBook / 产品 flag `1143815894` 真源**与 **org `requireCoworkFullVmSandbox` payload 真源**（生产 resolver 仍 env/feature-store 近似 + full-VM stub false）。
6. local-agent composer 对非 `MCP_RESOURCES` sync source 的最终序列化行为，当前证据不足。
7. 部分 minified wrapper 的原始源码名和内部 context 名称无法从无 sourcemap bundle 恢复；只能按已确认行为和 DOM 边界迁移。

任何 unresolved 节点在补到官方源码或运行时证据前不得实现猜测分支。

## 实施顺序（2026-07-12 修订：审计现有，不“发明第二 manager”）

1. **Desktop 收口（Phase 1 残留）**：在现有 `CoworkSessionManager` 上对齐 Query lifecycle（close/result）、permission exact-once 边角；IPC 死分支已删，保持单轨；接 GB/org 真源前保持 host-loop policy 默认 false + 显式 env。
2. **Desktop 执行面**：upload/path、MCP/scheduled、host-loop 双执行面 / VM；unresolved 显式 gate，禁止假完成。
3. **Web data path（Phase 2 残留）**：保持无 `completed` settle；补 pendingTurn/isResponding 与官方 event 面；hydration/replay/normalization 边角；per-session store lifecycle。
4. **Web UI（Phase 3）**：顺序 thinking `O9e`/`bde` → actions `w0e` → 完整 `O5e` → layout spacer/status → Markdown 真值 → composer/attachments；外壳 class 接近不得宣称 1:1。
5. **清理（Phase 4）**：磁盘死链 `CoworkMessages/ToolRuns/...`、死 LocalAgentMode 分支、过时注释/文档；禁止旧路径 fallback 静默生效。
6. **门禁（Phase 5）**：typecheck/tests/build + **桌面实启**；packaged 前 rebuild main；完成会话详情验证后，才进入会话列表。

## 完成门禁

在以下证据全部具备前，不得声明 Cowork 对话流完成、可提交或可推送：

- 边界检查：Cowork 不引用 Code/Epitaxy 业务组件、store、runner、permission；Code diff 为零或仅有明确批准的机械类型适配。
- Contract：官方 start/send/getSession/getTranscript/permission schema、origin、result shape 和 replay 行为有测试。
- Runtime：long-lived Query、canonical user event、partial/result/error/close、buffer/replay、permission exact-once、stop/archive 有回归测试。
- DOM：对官方活跃分支逐节点核对 DOM 层级、class、data/aria、Portal/Popover/Dialog、icon source。
- Computed style：字体、字号、行高、颜色、间距、边框、圆角、动画和尺寸来自官方 class/CSS 组合，不靠补丁 CSS。
- Interaction：thinking/tool 展开、permission shortcut、AskUser、copy/feedback/rewind、scroll、composer files/images/tool states、异常与重连状态完成回归。
- 工程验证：Web 与 Desktop typecheck、相关 tests、build 全部执行并记录真实结果。
- 运行验证：Web dev、Desktop dev、packaged/runtime 路径实际启动；桌面端官方 event/permission/VM 可用性按环境能力验证。
