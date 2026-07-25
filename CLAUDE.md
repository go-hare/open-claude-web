# hare-code 项目硬规则

## Claude Desktop 1:1 还原硬规则

本项目当前目标是 1:1 还原官方 Claude Desktop / Claude Code 桌面端体验。

### 关键路径

- 桌面壳：`open-claude-desktop`
- Web 渲染：`open-claude-web`
- 官方 App：`/Users/apple/Downloads/Claude code 汉化mac桌面版/Claude-Deepseek.app/Contents`
- 官方前端资源：`/Users/apple/Downloads/Claude code 汉化mac桌面版/Claude-Deepseek.app/Contents/Resources/ion-dist`

### 禁止事项

- 禁止凭截图、感觉或“接近效果”手写近似 UI。
- 禁止在官方 CSS / 静态资源已经存在时，通过额外补 CSS 来掩盖结构问题。
- 禁止把官方已有组件改成自造组件、近似组件或临时拼装组件。
- 禁止在未读取官方 `ion-dist` JS 的情况下修改布局、菜单、弹窗、composer、会话渲染、流式输出、权限模式、模型选择、worktree / branch 等逻辑。
- 禁止发现样式不一致后直接调 margin、padding、font-size、shadow、border-radius 等表层样式。

### 必须执行

1. 修改任何 Claude Desktop 还原相关 UI / 逻辑前，必须先从官方 `ion-dist` JS 定位对应组件、状态、className、DOM 层级、Portal / Popover / Dialog 挂载方式与事件流。
2. 如果 CSS 和静态资源来自官方但显示不一致，优先判定为以下问题：
   - DOM 结构不一致
   - className 组合不一致
   - Radix / Base UI / Portal / data 属性不一致
   - 状态机或渲染分支不一致
   - 数据加载与流式更新时序不一致
3. 发现之前写过的近似实现、猜测实现、补丁式样式或非官方结构时，先删除或回滚，再按官方 JS 转正。
4. 需要说明依据时，必须给出官方 JS 文件名、关键字符串 / 函数 / 组件名，以及我们对应文件。
5. 改完必须用桌面端实际启动验证，不得只凭构建通过声称完成。
6. 代码要组件化，避免继续把大型页面文件越写越大；能抽组件就抽组件，避免大文件堆叠。

### 判断标准

目标不是“看起来差不多”，而是：

- 组件结构对齐官方
- 功能状态对齐官方
- 弹层位置和交互对齐官方
- 流式输出与加载逻辑对齐官方
- macOS / Windows 平台分支对齐官方
- 只在官方确实没有覆盖的适配层做最小桥接

### 本机 host-loop 与 VM dual-exec

- **默认产品路径是本机（host-loop）**，不要为日常 Code / Cowork 会话强行走虚拟机。
- **Local Code 会话**（桌面 `claudeCliRunner.spawnClaude`）永远在本机 spawn 自带 CLI，与 dual-exec 无关。
- **Cowork**：`hostLoopMode: true` → 本机；`hostLoopMode: false` → dual-exec guest + 可能 `startVM`。
- **VM / dual-exec 代码必须保留**（官方 residual），禁止以“只要本机”为由删除。
- 未显式 dual-exec 时，不得把 guest/VM 问题当成默认路径阻塞。

### 桌面第三方推理与 CLI 配置

- 「配置第三方推理…」多配置主源是桌面 **`userData/configLibrary/`**（官方 wrA residual；非 `~/.claude/settings.json`）。
- 遗留 `desktop-shell-settings.json` 的 `custom3pConfigs` 仅 migrate 用；Web 不另造配置源。
- 官方 residual：主进程 `G4`/`HFi` 把 3p 注入 CLI env；产品对应 `custom3pCliEnv` → local spawn + Cowork host-loop `options.env`。
- bootstrap / Account 同步仍走 `app://localhost` 等桌面桥接。
- **1p / 3p**：无 3p activation 时 bootstrap `account: null` → `accountDetailsFromBootstrap` 的 `isLoggedOut: true`；有 `inferenceProvider` 才是 3p 合成账号。Web 不另判部署模式。
- **登录页 residual**：LoginRoute 对主窗 `resize(600,600,{center})`（非独立小窗）。有 3p provider 时 `M5t` 双卡（Gateway + Anthropic + Local configuration pill）；`/login` → `LoginDesktopPage` + App `isLoggedOut` 门闩。不发明 OAuth。
- **账号菜单 Sign out residual**（Gns）：`!!EQt()` 时显示「Sign out」`xXbJsopyfR`（中文「退出登录」）→ `NQt("clear")`。产品：`SidebarFooter` + `footerMenuMessages.signOut`。
