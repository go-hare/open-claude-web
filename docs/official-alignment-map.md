# Official alignment map

本文件只记录已经从官方打包 JS 中核对过的组件 / DOM / class 对应关系。新增或修改 UI 前先补这里和 `scripts/verify-official-alignment.mjs`，避免凭感觉改。

## Cowork right activity panel

- 官方来源：`open-claude-desktop/resources/ion-dist/assets/v1/index-BELzQL5P.js`
- 官方组件：`xQt`（Session activity panel）、`lQt`（activity section）、`pQt/mQt/hQt`（empty states）、`KZt`（scheduled runs）
- 本地对应：
  - `src/features/epitaxy/cowork/CoworkActivityPanelShell.tsx`
  - `src/features/epitaxy/cowork/CoworkActivitySection.tsx`
  - `src/features/epitaxy/cowork/CoworkProgressSection.tsx`
  - `src/features/epitaxy/cowork/CoworkActivityContent.tsx`
  - `src/features/epitaxy/cowork/CoworkScheduledRunsSection.tsx`

| 区域 | 官方 DOM / class / 文案 | 本地对应 |
| --- | --- | --- |
| panel width | `const iQt="20rem"` | `coworkActivityPanelWidth = "20rem"` |
| aside | `h-full flex-shrink-0` + 非 overlay `relative z-20` + `overflow-hidden` | `CoworkActivityPanelShell` aside |
| aria | `aria-label="Session activity panel"` | `CoworkActivityPanelShell` aside |
| width transition | `width 200ms cubic-bezier(0, 0, 0.2, 1)` + `willChange:"width"` | `CoworkActivityPanelShell` style |
| inner panel | `h-full pl-2 pr-2 flex flex-col` + desktop `pt-0` | inner wrapper |
| scroll bleed | `-ml-8 -mr-2 pl-8 pr-2 overflow-y-auto flex-1 pointer-events-none` | scroll wrapper |
| section stack | `flex flex-col gap-3 pt-2 pb-4 pointer-events-auto` | child stack |
| section card | `rounded-lg bg-bg-100 border-0.5 border-border-300 shadow-sm` + `overflow-hidden` + `shrink-0` | `CoworkActivitySection` / `CoworkScheduledRunsSection` |
| collapsible header | `can-focus w-full flex items-center justify-between p-3 text-left select-none draggable-none cursor-pointer` | activity section header |
| title | `font-medium text-sm text-text-100` | activity section title |
| chevron | `inline-flex h-5 w-5 items-center justify-center text-text-500 transition-transform duration-200 ease-[cubic-bezier(0,0,0.2,1)]` + expanded `rotate-90` | header chevron |
| collapse grid | `grid transition-[grid-template-rows] duration-200` + `overflow-hidden` + `px-3 pb-3` | section content |
| Progress title | `Progress` | local Chinese UI title `进度` only text-localized; DOM/class follows official |
| Progress content | `contentClassName:"!pb-2"` + empty max height `12rem` + populated max height `24rem` | `CoworkProgressSection` |
| Progress empty | `flex flex-col items-start gap-3`, illustration `session-progress.svg`, text `See task progress for longer tasks.` | `CoworkEmptyProgressState` |
| Working folder empty | illustration `session-artifacts.svg`, text `View and open files created during this task.` | `CoworkEmptyArtifactsState` |
| Context empty | `flex flex-col gap-3`, illustration `session-context.svg`, text `Track tools and referenced files used in this task.` | `CoworkEmptyContextState` |
| Suggested connectors | official `ContextEmptyStateWithConnectors` + storage keys `suggested_connectors_dismissed_v1` / `suggested_connectors_clicked_v1` | `CoworkContextEmptyStateWithConnectors` |
| Runs wrapper | `rounded-lg bg-bg-100 border-0.5 border-border-300 shadow-sm overflow-hidden shrink-0` | `CoworkScheduledRunsSection` |
| Runs list | `px-3 pb-3 overflow-y-auto`, `maxHeight:"16rem"`, `flex flex-col gap-px` | runs content/list |
| Runs row | `flex items-center justify-between py-2 px-2 -mx-2 rounded-lg transition-colors text-sm` | `CoworkScheduledRunRow` |
| Runs current/normal | current `bg-bg-200 text-text-100`; normal `text-text-300 hover:bg-bg-200` | run row state classes |
| Runs unread dot | `aria-label="Unread completed run"` + `size-2 rounded-full bg-accent-100 flex-shrink-0` | unread marker |

## Scheduled task detail / Local routine detail

- 官方来源：`open-claude-desktop/resources/ion-dist/assets/v1/cfc18e0f4-BP16E1oT.js`
- 官方导出：`EpitaxyLocalRoutineDetail`
- 本地对应：`src/features/scheduled/ScheduledTaskDetail.tsx` + `src/features/scheduled/ScheduledTaskDetailBlocks.tsx`

| 区域 | 官方 DOM / class / 文案 | 本地对应 |
| --- | --- | --- |
| detail root | `h-full min-w-0 flex flex-col pt-[8px] pl-[8px]` | `ScheduledTaskDetailView` root |
| scroll body | `flex-1 min-h-0 overflow-y-auto` | detail content wrapper |
| content column | `epitaxy-chat-column epitaxy-chat-size flex flex-col gap-g8 pt-[48px] pb-[32px]` | detail content column |
| two-column grid | `grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-g8` | left/right detail grid |
| section columns | `flex flex-col gap-g8` | `DetailLeftColumn` / `DetailRightColumn` |
| status row | `flex items-center gap-g4 flex-wrap` | status section children |
| status switch | official renders switch only when status is not `completed` and has `cronExpression`; aria text `Enable routine` / `Pause routine` | `RoutineStatusSwitch` |
| status badge | `inline-flex items-center gap-g2 px-p4 py-p1 rounded-r4 bg-t2 text-footnote text-t7` + `Active` / `Paused` / `Ran` | `StatusBadge` |
| next run | `text-footnote text-t6` + `Next run: {date}` / `Runs at: {date}` | `detailNextRunLabel` |
| folders | heading `Folder` / `Folders`, content `flex flex-col gap-g3`, icon `Folder1` | `FolderPathChip` |
| repeats | heading `Repeats`, fallback `Manual only` | `repeatLabel` |
| always allowed | heading `Always allowed`, empty text `Approvals you grant during a run appear here.` | `AlwaysAllowedSection` |
| instructions | `px-p6 py-p5 rounded-r6 bg-t1 text-body text-t8 whitespace-pre-wrap break-words max-h-[480px] overflow-y-auto` | instructions block |
| no prompt | `Task file not found or has unexpected format.` | no-prompt fallback |
| history session row | `group flex items-center gap-g4 px-p6 py-p4 rounded-r6 bg-t1 hover:bg-t2 text-left outline-none hide-focus-ring ring-focus` | `ScheduledSessionRunRow` |
| history skipped row | `flex items-center gap-g4 px-p6 py-p4 rounded-r6 bg-t1` | `ScheduledMissedRunRow` |
| skipped marker | `size-[6px] rounded-full border border-[var(--t5)]` | skipped row marker |
| skipped reasons | `Scheduled tasks only run while your computer is awake.` / `The previous run was still in progress.` / `Other scheduled tasks were already running.` | `missedRunReasonLabel` |
| actions | icon `TrashCanRound`, primary `Run now`, icon `Play`, busy label `In progress` | `DetailActions` |
| delete confirm | title `Delete routine`, body `Delete "{taskName}"? Any sessions from this task will be archived.` | `ConfirmDialog` |

当前未对齐项（不能瞎补，等桥接/官方函数依据）：官方 detail 还有 `Edit` modal 和 approved permission remove action；本地 bridge 目前只暴露 create/updateStatus，没有可安全保存编辑和移除权限的 API。
