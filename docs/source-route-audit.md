# 原 JS 路由/页面迁移证据清单

> 目标：以后改页面前先按本表回原 JS 找证据，不再按截图猜。路径基准为 `../decompiled/*/deobfuscated.js`。

## Shell / Frame

| 区域 | 原始证据 | 当前迁移状态 |
| --- | --- | --- |
| DFrame 外壳 | `cbc59a8af-CuvmBWRn.js`，`dframe-root` / `dframe-sidebar` / `dframe-content` | 已接入原 CSS，React 组件在 `src/shell/*`；本轮移除非原始 UI 的源码浮层，Pane host 固定为 `dframe-pane-host flex-1 min-h-0 relative isolate` + `dframe-pane dframe-pane-primary min-w-0 relative flex flex-col` |
| 侧边栏导航/最近 | `ca0135bc5-Cab670j1.js` + `cf52a4cc1-Cp3wVf85.js` | 部分复刻，仍需继续按函数迁移数据状态 |
| Footer 用户菜单 | `cbc59a8af-CuvmBWRn/deobfuscated.js:1718-1735`（DFrame footer 触发器传 `Gns/Ce align="start" className="w-[17rem]"`）；`index-BELzQL5P/deobfuscated.js:17243-17414`（`uO` Menu primitive：外层 `z-popover`、内层 `data-cds="Menu"`、item class）；`c43c5949a-vQe16vbD/deobfuscated.js:10498-10504`（`ra("popover")` surface class）；`index-BELzQL5P/deobfuscated.js:334807-335248`（`Hns/Gns` 菜单项与条件展示） | 已按原 JS 菜单 primitive/class 调整，组件拆到 `src/shell/SidebarFooter.tsx`：默认 mock 态只展示 header、设置 / Organization settings / Analytics / 语言 / 了解更多；Get help / feedback / downloads / invite / join / sign out 按原 `Gns` 条件默认隐藏；5175/5176 CDP 比对 menu rect `272x159`、radius `10px`、row `24px` 已对齐 |

## 顶级路由

| React 路由 | 原 Route id / chunk | 原函数/结构证据 | 当前状态 |
| --- | --- | --- | --- |
| `/epitaxy` | `ids` / `cf52a4cc1-Cp3wVf85.js` | `cf52a4cc1:93-94` export `EpitaxyRoute`；`c11959232:32237-32943` `EpitaxyFramePage`；`c009a87a0:50-60` error fallback；5175 live 当前为 fallback | 已迁移当前 5175 状态：tile shell + `Something went wrong loading this session.` + `Back to landing page`，关键 rect 与 5175 对齐 |
| `/epitaxy/:sessionId` | `rds` group + `cf52a4cc1` + `c11959232-h_zsw3wI.js` | `c11959232:30398-30415` chat panel loading/landing branch；`c11959232:31334-31855` tile shell；5175 live 任意 session 当前为 loading conversation | 已迁移当前 5175 状态：tile shell、header skeleton、`Loading conversation`、底部 composer/footer；修正 route matcher，不再把 session 当首页 fallback |
| `/epitaxy/scheduled*` | `ods/lds/cds` + `c705e2e19-CdkFb_TH.js` | `cf52a4cc1:5,90,94` route export/group；`c705e2e19:3369-3700` list 文案/card/empty state；`c705e2e19:3959-4052` `new/new-local/detail` 分支；lazy `c0243d234-BHUzHV1X.js` local create form；lazy `cfc18e0f4-BP16E1oT.js` local detail sections | 已迁移 scheduled list、空态、新任务进入 `/new-local`、创建表单、缺失 detail 回列表、fake bridge 创建/暂停/删除基础行为；5175/5176 CDP 已比对 list/new-local 主要 class 与文案 |
| `/epitaxy/dispatch` | `dds` + `c705e2e19-CdkFb_TH.js` | `c705e2e19:3086-3091` dispatch body gate；`c705e2e19:4009-4025` `Li` wrapper；`c705e2e19:4054-4055` dispatch route export | 已迁移当前本机 flag 关闭态：只保留 `Li` 的 epitaxy wrapper/draggable/flex slot，body 返回 null；5175/5176 body 均只有 DFrame shell/side bar，无 dispatch 主体 |
| `/epitaxy/tasks` | `pds/mds` + `c5da08b62-CJhbL6NF.js` | `c5da08b62:2822-2846` tasks body/gateName；`c5da08b62:2875-2923` gate false 回 `bI`；`index-BELzQL5P:2260-2278` NotFound | 已迁移当前本机 gate 关闭态：渲染原 NotFound 文案与按钮；5175/5176 NotFound wrapper、标题、说明、按钮 rect 已对齐 |
| `/epitaxy/apps` / `/epitaxy/dev/*` / `/epitaxy/pull-requests` | `uds/hds/mds` + `cf52a4cc1`，`c705e2e19:4057-4063` apps/dev 回 `bI`；`c5da08b62` pull_requests 共用 gate route | 已按 5175 当前状态接入 NotFound；避免这些路径误落到 `:sessionId` loading 页 |
| `/code*` | `xls/yls/vls/Mls/Sls/...` + `c9500abe8-DTVxpCXN.js` | `c9500abe8:8613-8723` disabled/family cards；`c9500abe8:9208-9274` code route group；5175 live `/code*` redirect `/code/disabled` | 已按当前 org-disabled 态迁移 standalone `/code/disabled`；`/code`、`/code/tasks`、`/code/enroll`、`/code/family` 在 5175 均跳 disabled，5176 同步跳转；card/image/button/command box class 与主要 rect 已 CDP 对齐 |
| `/customize*` | `jos` + `c63a78ed4-M1yh4U9h.js` | `c63a78ed4:905-907` standalone layout；`index-BELzQL5P:315780-316033` standalone customize side nav；`c63a78ed4:959-981` index cards + feature flags；`c63a78ed4:829-857` connectors empty route；`c63a78ed4:2815-2868` skills route；`c63a78ed4:2884-3282` plugin route map | 已改为 standalone，不再包 DFrame；按 5175 当前 flag 态隐藏 Skills 入口/卡片，`/customize/skills` 回到 index；connectors 空态无按钮；`/customize/plugins` 按 5175 显示 warning + Not Found；`/plugins/new` 无 marketplace 参数回 `/customize`；pluginId 详情/子路由无真实数据源时回 `/customize` |
| `/settings*` | `Cos` + `cf4f70727-B4IcTbZO.js` | `cf4f70727:1246-1324` (`Qs` settings layout)；`cc989143e:3103-3231` settings nav groups；`c43c5949a` exports `rl/nl` nav classes | 已迁移 5175 当前桌面态：DFrame experimental shell、header、settings grid/nav、capabilities/connectors/Claude Code/desktop/extensions/developer/extension subroutes；`/settings/general` 按 live 进入 outage page，`/settings/connectors/foo` 进入全局 PageNotFound |
| `/admin-settings/organization` | settings admin link | `cc989143e:3223-3229` adminLink；`cc989143e:2914-2923` Team overview；`cc989143e:2916-2920` metrics grid | 已迁移 admin shell/nav 与 Organization 面板：Team overview 首行 + 三列 metric grid、Organization ID chip、删除说明；5176 CDP 关键 rect 与 5175 对齐 |

| `/space` / `/space/:spaceId` | `Wos/Gos` + `ce28369f9-C9QQvDN-.js` | `index-BELzQL5P:344761-344770`; `ce28369f9:2907-2957` list；`:2597-2616` not-found | 已迁移当前 5175 状态：`/space` 项目列表空态、搜索、New project 触发创建弹层；`/space/foo` 为 Project not found，header/body rect 与 5175 对齐 |
| `/knowledge` | `sls` + `c4829262c-BTq0Z261.js` | `index-BELzQL5P:344811-344815`; live 当前为 DFrame PageNotFound | 已迁移 DFrame 内 PageNotFound，含 header spacer、原文案与按钮 |
| `/meeting-assistant` | `nls` + `c4829262c-BTq0Z261.js` | `index-BELzQL5P:344816-344820`; `c4829262c:252-308` 表单源码；live 当前为 standalone PageNotFound | 已迁移当前 live gate 态：不包 DFrame 的 standalone PageNotFound |
| `/analytics*` | `qos/Bos` + `ca768caa9-D20-r2DS.js` | `index-BELzQL5P:344736-344745`; `ca768caa9:1188-1227` layout/nav/activity；`:5494` usage；`:1285` API keys | 已迁移 analytics shell、nav、`/analytics` -> `/analytics/activity` redirect、activity/usage/claude-code/api-keys 当前空/失败数据态 |
| `/admin-settings/members` | `Fos/Uos` + `cf400e6a4-B2Ow-PiK.js` | `index-BELzQL5P:344726-344735`; `cf400e6a4:16464` admin layout/nav；5175 live members failed-load | 已补 members 页当前失败加载态；`/admin-settings/billing`、`/admin-settings/usage` 按 5175 redirect 到 `/settings` |

## Workspace / Space / Analytics 细节证据

- Space routes：`index-BELzQL5P/deobfuscated.js:344761-344770` 定义 `/space` 与 `/space/$spaceId`；`ce28369f9-C9QQvDN-/deobfuscated.js:2907-2957` 的 `SpaceIndexRoute` 使用 `项目` header、`New project` 按钮、`Search projects...`、空态 `Create your first project`；`:2597-2616` 的 `SpaceRoute` 在无项目数据时渲染 `Project not found` 与说明。
  - 5175 证据：`/tmp/routes5175-batch1.txt` 中 `/space` pane host `x296 y0 w904 h813`、header `x296 y48 h52`、H1 `x316 y64`、New project `x1058 y56 w122 h36`、main `x300 y124 w896`；`/space/foo` not-found 标题 `x674 y413`、说明 `x575 y445`。
  - 5176 验证：`/tmp/space5176-fix.txt` 中 `/space` header/H1/button/main rect 对齐；`/space/foo` not-found 标题/说明 rect 与 5175 一致。
- Knowledge / Meeting Assistant：`index-BELzQL5P/deobfuscated.js:344811-344820` 挂载 `KnowledgeRoute` 和 `MeetingAssistantRoute`；`c4829262c-BTq0Z261/deobfuscated.js:252-308` 是 Meeting Assistant 表单源码，但当前 5175 live `/meeting-assistant` 被 gate 到 standalone PageNotFound；`/knowledge` 是 DFrame 内 PageNotFound。
  - 5176 验证：`/tmp/space5176-fix.txt` `/knowledge` H2/H3/button rect `x474 y386`、`x474 y434`、`x685 y481`；`/tmp/newroutes5176.txt` `/meeting-assistant` H2/H3/button rect `x326 y362`、`x326 y410`、`x537 y457`，与 5175 live 一致。
- Analytics：`index-BELzQL5P/deobfuscated.js:344736-344745` 定义 layout 与 activity/usage/api keys 等子路由；`ca768caa9-D20-r2DS/deobfuscated.js:1205-1227` 是 layout/nav，`:1188` 是 All activity，`:5494` 是 Claude.ai usage，`:1285` 是 Analytics API keys。
  - 5175 live `/analytics` 最终 URL `/analytics/activity`，显示 Analytics shell、All activity、Apps、Analytics API、`Unable to load activity data`；`/analytics/usage` 显示 Claude.ai + Chats/项目/Artifacts 三组零数据。
  - 5176 验证：`/tmp/newroutes5176.txt` 已确认 `/analytics` redirect、activity/usage/claude-code/api-keys body 文案与主要 nav rect。
- Admin members：`index-BELzQL5P/deobfuscated.js:344726-344735` 定义 admin-settings 子路由；`cf400e6a4-B2Ow-PiK/deobfuscated.js:16464` 是 admin layout/nav。5175 live `/admin-settings/members` 当前失败加载，body 为 `Members / 进行中 / Pending / Role 全部 / Failed to load members. Retry.`；`/admin-settings/billing` 与 `/admin-settings/usage` 最终 redirect `/settings`。
  - 5176 验证：`/tmp/newroutes5176.txt` members/body 与 redirect URL 均对齐当前 5175 live。

## Settings / Admin Settings 细节证据

- Layout：`cf4f70727-B4IcTbZO/deobfuscated.js:1246-1324`
  - `Qs` 桌面态会进入 nested `_Component32`，5175 live 外层为 `grid w-full overflow-hidden` + `dframe-root draggable-none`，`data-experiment=true data-frame-mode=code`，`main.dframe-content` rect `x0 y0 w1200 h813`。
  - header class：`flex h-12 shrink-0 items-center gap-1 pr-4 border-b-[0.5px] border-border-200 draggable pl-24`；settings 内容 wrapper：`mx-auto mt-4 w-full flex-1 px-4 md:px-8 lg:mt-6 max-w-7xl !mt-0 lg:!mt-0`。
  - inner grid：`grid grid-cols-1 md:grid-cols-[220px_minmax(0px,_1fr)] gap-x-8 w-full pt-6`；nav：`min-w-0 w-full -ml-3 self-start md:sticky ... md:top-6`。
- Nav source：`cc989143e-BItqjsPF/deobfuscated.js:3103-3231`
  - personal groups：`General / Capabilities / Connectors / Claude Code`，`Desktop app -> General / Extensions / Developer`，admin link title 使用组织名并显示 `Organization settings`。
  - nav primitive class 来自 `c43c5949a-vQe16vbD/deobfuscated.js`：group title `text-text-400 font-small mx-3 mt-8 mb-1 break-all line-clamp-1`；link `font-base block whitespace-nowrap transition-colors ease-in-out rounded-lg px-3 h-9 line-clamp-1 flex gap-3 items-center`。
- Personal pages：
  - `/settings/general`：5175 live 为全局 outage page；原 fatal boundary 在 `index-BELzQL5P/deobfuscated.js:2190-2240`，文案 `Claude will return soon`、status link、`Try again`、`Go to home`。
  - `/settings/capabilities`：`c71860c77-CQj8rzol/deobfuscated.js:122-174` 的 Visuals/Artifacts；当前 5175 flag 只展示 `视觉内容 / Artifacts` 一行。
  - `/settings/connectors`：`cc989143e-BItqjsPF/deobfuscated.js:1024-1045`，包含 `Connectors have moved to Customize`、无 connectors 空态与 desktop extensions link；`/settings/connectors/foo` live 进入全局 PageNotFound，不包 settings shell。
  - `/settings/claude-code`：`cc989143e-BItqjsPF/deobfuscated.js:717,770,786`；迁移本地会话、worktree 位置、分支前缀、PR 自动创建开关。
  - `/settings/desktop/extensions`：overview source 在 `c71860c77-CrCPjj7D/deobfuscated.js:203-209`，空列表先渲染 `extensions-overview` spacer，再渲染 `Advanced settings` 按钮；5175/5176 关键 rect：button `x284 y313 w80 h32`。
  - `/settings/desktop/developer`：`cadc35a07-DqmNVATl/deobfuscated.js:180-205`，空态为 `flex flex-col gap-3 items-center justify-center text-center flex-1 gap-4`；5176 已对齐按钮 `y260`。
  - `/settings/desktop/extensions/advanced`：`cf4f70727-B4IcTbZO/deobfuscated.js:162-225`；包含 `All extensions` back header、Extension Settings、Detected tools、扩展开发者按钮组。
  - `/settings/desktop/extensions/manage-directory`：`cf4f70727-B4IcTbZO/deobfuscated.js:623-629`；包含 search input、upload card、空态 `No extensions found`。
- Admin organization：
  - shell/nav live 仍在 DFrame 下，但内容 grid 使用 `cds-root text-primary grid grid-cols-1 md:grid-cols-[220px_minmax(0px,_1fr)] gap-x-8 w-full my-4 md:my-8`，nav top `y80`。
  - Team overview source `cc989143e-BItqjsPF/deobfuscated.js:2914-2923`：title 后先渲染 Team name 行，再渲染 `grid grid-cols-2 gap-lg py-md md:grid-cols-3` 的 Allowed email domains / Total seats / Total members。
  - Organization ID chip / Delete organization live rect：section `x284 y323 h151`，ID row `y359 h46`，delete row `y405 h69`；当前 5176 section `y323 h154`，主要文案与 class 对齐。
- 本轮 Settings 验证：
  - `npm run typecheck`、`npm run build` 通过。
  - CDP 5176 smoke：`/settings`、`/settings/general`、`/settings/capabilities`、`/settings/connectors`、`/settings/claude-code`、`/settings/desktop`、`/settings/desktop/extensions`、`/settings/desktop/developer`、`/admin-settings/organization`、`/settings/connectors/foo`、`/settings/desktop/extensions/advanced`、`/settings/desktop/extensions/manage-directory`、`/settings/desktop/extensions/foo` body 文案与主要 shell rect 对齐 5175；layout follow-up 后 overview/developer/admin 关键 rect 已收敛。

## Customize 细节证据

- Layout：`c63a78ed4-M1yh4U9h/deobfuscated.js:905-907`
  - root `flex h-full w-full flex-col`；内容区 `flex flex-1 min-h-0`；route 容器 `flex-1 overflow-y-auto bg-bg-100`；本路由是 standalone，不包 DFrame。
- Standalone side nav：`index-BELzQL5P/deobfuscated.js:315780-316033`
  - unframed nav class：`flex flex-col h-full shrink-0 overflow-hidden border-r border-border-300 bg-bg-100 w-[256px]`。
  - 顶部 back/title：`px-4 py-3` + `自定义`。
  - 当前 5175 flag 态只显示 `连接器` 与 `Personal plugins`；Skills nav 由 `s` 条件控制，当前不显示。
- Sidebar primitive：`c63a78ed4-M1yh4U9h/deobfuscated.js:84-93`
  - width `w-[280px] min-w-[280px] xl:w-[360px] xl:min-w-[360px]`；root `border-r border-border-300 flex flex-col h-full overflow-hidden`；header `px-6 py-3 min-h-14`。
- Index cards：`c63a78ed4-M1yh4U9h/deobfuscated.js:959-981`
  - title/description/cards 文案来自原 JS；card class `flex w-full items-center gap-4 rounded-3xl border border-border-300 bg-bg-000 p-5 shadow-sm ...`。
  - `Create new skills` 卡由 `fs()` flag 控制；当前 5175 只显示 `Connect your apps` 与 `Browse plugins`。
- Connectors：`c63a78ed4-M1yh4U9h/deobfuscated.js:829-857`
  - 无 connector 数据时不渲染 sidebar，直接显示 empty state：`Unlock more with Claude when you connect your team's tools.`。有数据时才进入 `Rt` sidebar + detail pane。
  - 空态按钮由 `u=(manageFromPersonal||manageFromOrg)&&i` 控制；当前 5175 无按钮。
- Skills：`c63a78ed4-M1yh4U9h/deobfuscated.js:2450-2460`、`:2815-2868`
  - 无 skill 和 built-in skill 时不渲染 sidebar，直接显示 empty state：`Add skills to extend Claude's capabilities.`；有数据时才渲染 `Rl` sidebar + detail pane。
  - 当前 5175 的 Skills flag 关闭，直接访问 `/customize/skills` 会回到 `/customize` 首页。
- Plugins：`c63a78ed4-M1yh4U9h/deobfuscated.js:865-875`、`:905`、`:2210-2255`、`:2884-3282`
  - `Xt` 在 `path.startsWith("/customize/plugins")` 时先渲染 `Zt` danger alert：`Skills must be enabled in order to use plugins.`；5175 中文态显示“使用插件前必须在设置中启用 Skills。”
  - `/customize/plugins` 不在 route map 中，5175 实测为 layout 内 `Not Found`。
  - `/plugins/new` 本身返回 null；无 `marketplace` 参数或能力关闭时 redirect `/customize`，有参数时只打开全局 plugins 面板。
  - `plugins/$pluginId` 详情与 `agents/connectors/hooks/skills` 子路由依赖 `Ss(pluginId)` 数据；无数据时按原 JS redirect `/customize`，不要伪造 detail 页面。

## Epitaxy Frame / Session 细节证据

- Route/export：`cf52a4cc1-Cp3wVf85/deobfuscated.js:49-94`
  - `EpitaxyRoute` 来自 `c11959232` export `E`；group route 用 `EpitaxyGroupLayoutRoute` 包 DFrame + side pane。
  - `ids = epitaxy`；`fds = $sessionId` 本身 inline 为 `()=>null`，实际 session UI 由 `EpitaxyFramePage` 从 pathname/session id 驱动。
- Frame/tile shell：`c11959232-h_zsw3wI/deobfuscated.js:31334-31855`
  - tile viewport style：`width: 100%; height: 100%; display: flex; overflow: clip`。
  - tile container inline style：`border: 1px solid var(--tile-container-border)`、`padding: 8px 0px 8px 8px`、`transform-style: preserve-3d`。
  - tile content wrapper：`tiles-shell`；inner content：`h-full w-full min-w-0 relative isolate rounded-r6`。
  - sr-only tile instruction：`Arrow keys move the tile...`。
- `/epitaxy` 当前 5175 live 状态
  - ErrorBoundary fallback source：`c11959232:32934-32943` fallback message；fallback component `c009a87a0-BppDfQ-y/deobfuscated.js:50-60`。
  - 当前 body：`Something went wrong loading this session.` + `Back to landing page`。
  - 关键 rect：error text `x562 y372 w372 h28`，button `x649 y424 w197 h36`，tile shell `x297 y9 w902 h795`。
- `/epitaxy/:sessionId` 当前 5175 live 状态
  - Chat panel source：`c11959232:30398-30415`，loading 时渲染 `role="status" className="h-full flex items-center justify-center text-t5"`，底部 composer/footer 为 `epitaxy-chat-column epitaxy-chat-size relative shrink-0 flex flex-col gap-g5 [contain:layout]`。
  - 当前 body：`/`、`Loading conversation`、`接受编辑`、`Sonnet 4.5`。
  - 关键 rect：tile shell `x297 y9 w902 h795`，loading region `x297 y41 w902 h685`，footer `x297 y726 w902 h78`，permission group `x342 y780 w82 h20`。
- Apps/dev/pull-requests NotFound
  - `c705e2e19-CdkFb_TH/deobfuscated.js:4057-4063`：apps/dev route 返回 `bI` NotFound。
  - 5175 live `/epitaxy/apps`、`/epitaxy/dev/foo`、`/epitaxy/pull-requests` 均为 NotFound；5176 已避免这些路径误匹配 `:sessionId`。
  - 5175 live `/epitaxy/tasks/foo`、`/epitaxy/pull-requests/foo` 为 router fallback `<p>Not Found</p>`；5176 已补同态 fallback。
- 本轮验证：
  - `npm run typecheck`、`npm run build` 通过。
  - CDP probe 5176 `/epitaxy`：error text/button rect 对齐 5175。
  - CDP probe 5176 `/epitaxy/test-session`：tile shell/loading/footer 关键 rect 对齐 5175，body 文案一致。
  - CDP probe 5176 `/epitaxy/pull-requests`、`/epitaxy/apps`、`/epitaxy/dev/foo`：均为原 NotFound。
  - CDP probe 5176 `/epitaxy/tasks/foo`、`/epitaxy/pull-requests/foo`：均为原 plain `Not Found`。

## Epitaxy Tasks / Dispatch 细节证据

- Tasks gate：`c5da08b62-CJhbL6NF/deobfuscated.js:2822-2846`、`:2875-2923`
  - `Jt.tasks.pathSuffix = "/tasks"`，`gateName = "epitaxy_tasks_enabled"`。
  - gate true 时才进入 `Ht` + `Epitaxy` landing body；gate false 时返回从 `index` 导入的 `bI as _Component15`。
  - `index-BELzQL5P/deobfuscated.js:2260-2278` 中 `rw` 即 NotFound，文案为 `Page not found`、`Claude can help with many things, but finding this page isn’t one of them.`、按钮 `Go back home`，href `/new`。
- Tasks live DOM：5175 `/epitaxy/tasks`
  - body 只显示 DFrame shell + NotFound，不显示任务列表。
  - NotFound content wrapper：`grid place-content-center min-h-min text-center gap-2 pt-24 pb-32 px-4 mx-auto h-screen w-fit`。
  - 关键 rect：logo 占位 `x470 y288 w548 h26`，`h2 x470 y362 w548 h40`，`h3 x470 y410 w548 h22`，button container `x470 y457 w548 h36`。
- Dispatch gate/wrapper：`c705e2e19-CdkFb_TH/deobfuscated.js:3086-3091`、`:4009-4025`、`:4054-4055`
  - `Bi` route 返回 `<Li><_Component81 /></Li>`。
  - `Li` 固定 wrapper：`epitaxy-root relative isolate select-none h-full flex flex-col`，顶部 draggable：`draggable absolute inset-x-0 top-0 h-[32px] -z-[1]`，内容槽：`flex-1 min-h-0`。
  - `_Component81` 仅 `Nt()` true 时渲染 `h-full overflow-auto` + dispatch onboarding；当前本机 5175 中 `Nt()` 为 false，返回 null。
- 本轮验证：
  - `npm run typecheck`、`npm run build` 通过。
  - CDP probe 5176 `/epitaxy/tasks`：body 与 5175 一致为 NotFound；上述 logo/h2/h3/button rect 已对齐。
  - CDP probe 5176 `/epitaxy/dispatch`：body 与 5175 一致，只剩 DFrame shell/sidebar 文案，无 dispatch 主体或非原始源码浮层。

## Epitaxy Scheduled 细节证据

- Route wrapper：`cf52a4cc1-Cp3wVf85/deobfuscated.js:5,90,94`
  - `c705e2e19` export 映射：`Pi` = `EpitaxyScheduledRoute`、`Fi` = `EpitaxyScheduledNewRoute`、`Oi` = `EpitaxyScheduledDetailRoute`。
  - group layout 原本在 DFrame 内 render `<Outlet />`；scheduled route 自身再包 `Li`。
- Scheduled shell/list：`c705e2e19-CdkFb_TH/deobfuscated.js:3369-3700`
  - title/subtitle/empty 文案：`Scheduled tasks`、`Run tasks on a schedule...`、`No scheduled tasks yet.`。
  - list wrapper class：`h-full overflow-y-auto`；inner：`max-w-[720px] mx-auto flex flex-col gap-g8 px-p8 py-[48px]`。
  - header：`flex items-start justify-between gap-g6`；title `text-heading text-t9`；subtitle `text-body text-t6`。
  - local card：`flex items-center gap-g6 px-p7 py-p6 rounded-r6 bg-t1 hover:bg-t2 text-left outline-none hide-focus-ring ring-focus`。
- Route branching：`c705e2e19-CdkFb_TH/deobfuscated.js:3959-4052`
  - `const zi = "new"`、`const Ti = "new-local"`；本机 5175 点击 list 的 `新任务` 后进入 `/epitaxy/scheduled/new-local`。
  - 不存在的 detail（如 `/epitaxy/scheduled/foo`）原 JS `Ai` 在任务加载后 `onBack()`，5175 实测 URL 回 `/epitaxy/scheduled`。
  - 直接访问 `/epitaxy/scheduled/new` 在当前本机 flag 下同样回 `/epitaxy/scheduled`。
- Local create form：`public/assets/v1/c0243d234-BHUzHV1X.js`
  - root：`h-full min-w-0 flex flex-col pt-[8px] pl-[8px]`；header primitive 来自 `cd2687f9f-HKUZS3I.js`。
  - form wrapper：`max-w-[720px] mx-auto flex flex-col gap-[32px] px-p8 pt-[48px] pb-[32px]` + `flex flex-col gap-[28px]`。
  - visible 5175 文案：`Routines / New local routine`、`Local routines only run while your computer is awake.`、`名称 *`、`Description *`、`Instructions`、`询问权限`、`Default`、`选择文件夹`、`Worktree`、`Schedule`、`Manual/Hourly/Daily/Weekdays/Weekly`、`Cancel/Create`。
- Local detail：`public/assets/v1/cfc18e0f4-BP16E1oT.js`
  - root/header 同 create；body：`epitaxy-chat-column epitaxy-chat-size flex flex-col gap-g8 pt-[48px] pb-[32px]`。
  - grid：`grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-g8`；section primitive `flex flex-col gap-g5`。
  - sections：`Description`、`Status`、`Folder`、`Repeats`、`Always allowed`、`Instructions`、`History`。
- 本轮验证：
  - `npm run typecheck`、`npm run build` 通过。
  - CDP probe 5175 `/epitaxy/scheduled`：list/empty class 与文案采集；5176 当前 list 对齐，默认 fake task 列表为空。
  - CDP probe 5175 `/epitaxy/scheduled/new-local`：create form class 与文案采集；5176 当前 form 对齐主要 wrapper/header/form classes。
  - CDP probe 5176 create smoke：填入名称/描述/指令、选择 fake workspace folder 后 `Create` 进入 `/epitaxy/scheduled/daily-code-review` detail，并显示 detail sections。

## Code route 细节证据

- Disabled route：`c9500abe8-DTVxpCXN/deobfuscated.js:8703-8723`
  - `Gd` = `CodeDisabledRoute`，view event 为 `claude_code_web.disabled.viewed`。
  - install command 固定为 `npm install -g @anthropic/claude-cli`。
  - `onIDEAction` 打开 VS Code Marketplace；Web action disabled；Web CTA 为 `Disabled by org admin`。
- Shared cards/layout：`c9500abe8-DTVxpCXN/deobfuscated.js:8613-8700`
  - badge variant class：`original -> bg-accent-900 text-accent-100`；`new -> bg-success-900 text-success-100`；`preview/disabled -> bg-bg-300 text-text-400`。
  - card class：`flex flex-col overflow-hidden rounded-xl border-[0.5px] border-border-300 bg-bg-000 shadow-sm`。
  - layout root：`flex min-h-screen w-full items-center justify-center bg-bg-100 px-4 py-12`；inner `w-full max-w-5xl`；header `mb-12 text-center`；grid `mb-8 grid gap-6 md:grid-cols-3`。
  - copy command wrapper：`flex items-center gap-2 rounded-lg border-[0.5px] border-border-300 bg-bg-100 pl-2.5 pr-1 py-1`；icon button size class `h-8 w-8 rounded-md _fill_10ocf_9 _primary_10ocf_44`。
  - images：`/images/code/CLI.png`、`/images/code/IDE.png`、`/images/code/Web.png`。
- Route group：`c9500abe8-DTVxpCXN/deobfuscated.js:9208-9274`
  - `CodeIndexRoute` / `CodeTasksRoute` 等正常态会进入 Code app；但当前本机 org disabled。
  - 5175 实测 `/code`、`/code/tasks`、`/code/enroll`、`/code/family` 最终 href 均为 `/code/disabled`，且 disabled 页是 standalone，不包 DFrame。
- 本轮验证：
  - `npm run typecheck`、`npm run build` 通过。
  - CDP probe 5175 `/code/disabled` 与 5176 `/code`：最终 href 均 `/code/disabled`，body 文案一致。
  - CDP metrics 对齐：card rect `325x433`、image rect `323x197`、copy button `32x32`、VS Code button `147x36`。

## Sidebar footer menu / 自定义侧边栏证据

- Footer user menu source：`cbc59a8af-CuvmBWRn/deobfuscated.js:1734`
  - 原触发器为 `Ce align="start" className="w-[17rem]"`，位于 sidebar footer，向上弹出。
  - 用户菜单内容由 `index-BELzQL5P/deobfuscated.js:334882-335420` 的 `Gns` 渲染：header、`设置`、`Organization settings`、`Analytics`、`语言` submenu、separator、`了解更多` submenu。
- Menu primitive source：`index-BELzQL5P/deobfuscated.js:17243-17408`
  - surface class：`cds-reset flex flex-col min-w-[128px] max-w-[320px] max-h-[var(--available-height)] ... text-body text-primary outline-none`。
  - item class：`cds-reset flex w-full items-center gap-xs px-md py-[calc((var(--cds-h-control)-var(--cds-leading-body))/2)] rounded text-body ...`。
  - header class：`px-md py-1 text-footnote font-medium text-muted`。
- 5175 live footer menu metrics：`/tmp/user-menu-5175.json`
  - menu surface：`x16 y610 w272 h159`，font `13px/18px`，radius `10px`。
  - menu item：`x20 w264 h24`，font `13px/18px`，text-align `start`，padding `3px 8px`，radius `6px`。
- 5176 修正点：之前 `.claude-rebuild-user-menu-item` 的 left-align/radius 规则被错误限制在 `.epitaxy-root`，DFrame footer 菜单退回 button 默认居中；已改成全局规则。
  - 5176 live：`/tmp/user-menu-5176-final.json`，menu item font `13px/18px`，text-align `left`，radius `6px`，与 5175 对齐。
  - 进一步补齐 separator 变量：5175 `--cds-border = hsl(from #0b0b0b h s l / 10%)`，5176 已在 `.claude-rebuild-user-menu-surface` 设置为 `rgb(11 11 11 / 10%)`；`/tmp/menu-vars-5176-borderfix.json` 显示 separator background 为 `rgba(11, 11, 11, 0.1)`。
  - hover/子菜单状态修正：`/tmp/probe-user-menu-hoverclear.mjs` 先打开菜单、hover `语言`、再移出菜单；5176 结果显示 `设置`、`语言`、`了解更多` background 均为 `rgba(0, 0, 0, 0)`，`data-popup-open` 清空，避免鼠标不在 row 上时残留灰底。
  - 二级菜单结构修正：source `Hns` 和 `Gns` 使用 `uO.Submenu` + `uO.SubmenuTrigger` + portaled `uO.Popup`，`uO.Popup` 默认 `sideOffset=6` 且 `max-h-[var(--available-height)]`；5176 已改成 body portal fixed submenu，不再作为主菜单内部普通行内容渲染。
  - 语言切换 source：`index-BELzQL5P/deobfuscated.js:334807-334856` 中 `Hns` 取 `o=e.locale`，点击语言项时 `l(e.locale)`；`l` 会先调用 `mutateAsync({ locale })`，再 `setLocaleOverride(e)`，最后 `refetch()`。语言项是 `checked: e.locale === o` + `checkedRole: "radio"` + `lang: e.locale`，所以选中态由当前 locale 驱动，不是普通跳转。
  - 语言资源包 source：`index-BELzQL5P/deobfuscated.js:209033-209166` 支持 `en-US/de-DE/fr-FR/ko-KR/ja-JP/es-419/es-ES/it-IT/hi-IN/pt-BR/id-ID/zh-CN`；`index-BELzQL5P/deobfuscated.js:301161-301236` 会 fetch `/i18n/{locale}.json`、`/i18n/statsig/{locale}.json`、非英文 `/i18n/{locale}.overrides.json` 并 merge。5176 footer menu 已改为从 `public/i18n` 资源包读取这些 id，不再只写 zh/en 两套。
  - 5176 语言切换修正：`FooterSubmenuItem` 的 trigger click 改为只打开/保持二级菜单，避免 hover 已打开时点击 `语言` 反向关闭导致无法点 radio；语言项点击后更新 locale、`localStorage`、`document.documentElement.lang` 与 radio checked。
  - 5176 submenu probe：`/tmp/submenu-lang-5176-portal2.json` 语言二级菜单 rect `x290 y513 w208 h296`；`/tmp/submenu-learn-5176-portal2.json` 了解更多二级菜单 rect `x290 y615 w208 h194`，均保留主触发 row `data-popup-open=true` 灰底且不越出视口。
  - 5176 language switch probe：`/tmp/probe-language-switch-current.json` 显示切 English 后 `htmlLang="en-US"`、`storedLocale="en-US"`、English `aria-checked="true"`；切回中文后 `htmlLang="zh-CN"`、中文 `aria-checked="true"`。`/tmp/probe-language-pack-de-current.json` 与 `/tmp/probe-language-pack-ja-current.json` 进一步确认德语/日语从资源包加载：`Einstellungen/Sprache/Mehr erfahren`、`設定/言語/詳細を見る`。
- Footer appearance menu source：`cbc59a8af-CuvmBWRn/deobfuscated.js:1734-1790`
  - footer 右侧 code mode 下渲染 `Cn`，按钮为 `icon="Toggles"`、`variant="ghost"`、`size="sm"`、`side="top"`、`align="end"`。
  - 菜单第一组 label `Theme`，选项来自 `Mn = [["darker","darker"],["dark","dark"],["light","light"],["auto","matchSystem"]]`；`darker` 会设置 mode dark 且 `setDarkerCode(true)`。
  - 第二组 label `Font`，radio：`Anthropic Sans` checked when `systemFont=false`，`Match system` checked when `systemFont=true`。
  - 5176 验证：`/tmp/probe-appearance-menu-current.json` 初始菜单含 `主题 / 深色 / Mid / 浅色 / Match system / 字体 / Anthropic Sans / Match system`，`Match system` theme 与 `Anthropic Sans` checked；点击 `深色` 后 `themeStorage=darker`、root `data-mode=dark`、`data-darker-code=true`、`深色` checked。
- 自定义侧边栏 source：`index-BELzQL5P/deobfuscated.js:336549-336925`
  - More 菜单底部 `自定义侧边栏` 不是路由跳转，而是 `onCustomize -> z(true)` 打开 modal。
  - modal 标题 `自定义侧边栏`，副标题 `选择哪些项目显示在侧边栏中。`，列表用 checkbox/toggle，footer button `完成`。
  - 遮罩/弹层 pattern 对照 `index-BELzQL5P/deobfuscated.js:120344`：`fixed inset-0 z-modal bg-always-black/50 backdrop-brightness-75 draggable-none`。
- 5176 live 自定义侧边栏验证：`/tmp/customize-sidebar-5176-after.json`
  - URL 保持 `http://127.0.0.1:5176/task/new`，未跳转。
  - mask rect：`x0 y0 w1200 h813`，class 含 `fixed inset-0 z-modal bg-always-black/50 backdrop-brightness-75`。
  - dialog rect：`x390 y287 w420 h239`，`role="dialog"`，body 包含标题/副标题/`完成`。
