# Claudex Web

**Claudex Web** 是 Claudex 桌面端的**主界面**（React / TypeScript SPA）：登录、侧栏、Cowork、Code 会话、设置等都在这里。

真正跑 CLI、开窗口、管配置的是姊妹仓库 **[open-claude-desktop](https://github.com/go-hare/open-claude-desktop)**。本仓库单独 `npm run dev` 可以看 UI，完整能力需要桌面壳一起开。

> 非 Anthropic 官方产品。Claude / Claude Desktop / Claude Code 商标与权利归 Anthropic；本仓库仅供学习研究与自托管使用。

| 项目 | 说明 |
|------|------|
| 定位 | 桌面 App 的产品前端（不是独立 SaaS 站） |
| 配套桌面 | [open-claude-desktop](https://github.com/go-hare/open-claude-desktop) |
| 仓库 | https://github.com/go-hare/open-claude-web |
| 开发地址 | `http://127.0.0.1:5176` |
| 版本 | 见 `package.json` |

| 仓库 | 干什么 |
|------|--------|
| **本仓库** open-claude-web | 界面、路由、会话展示、设置页、桌面 bridge 调用 |
| **open-claude-desktop** | Electron、CLI、MCP、打包成 `.app` / `.exe` |

---

## 能干什么

| 模块 | 说明 |
|------|------|
| 登录 / 模式选择 | 1p 登录态、第三方网关、沿用本机 `~/.claude` 等入口 |
| Cowork 主页 | 冷启动默认进协作主页（新建任务） |
| Code 会话 | 模型 / Effort / 权限模式、流式输出、工具调用展示 |
| 设置 | 偏好与账号相关信息（以桌面返回为准） |
| Artifacts / 工作区 | 有能力时列出与打开产物 |
| 桌面 bridge | 通过 `window` / preload 调主进程，不自己造后端 |

一句话：**侧栏和会话区像桌面 Claude；推理与配置由桌面壳说了算。**

---

## 快速开始

```bash
cd open-claude-web
npm install
npm run dev
```

浏览器打开：

```text
http://127.0.0.1:5176/
```

> 仅浏览器时：很多按钮会「看起来有、实际半残」——正常。会话、CLI、配置都依赖桌面。

### 推荐：和桌面一起调

```bash
# 终端 1
cd open-claude-web && npm run dev

# 终端 2
cd ../open-claude-desktop && npm run dev
```

目录建议并列：

```text
somewhere/
  open-claude-desktop/
  open-claude-web/
```

---

## 常用命令

| 命令 | 作用 |
|------|------|
| `npm run dev` | 开发服务器，`127.0.0.1:5176` |
| `npm run build` | 类型检查 + 构建到 `dist/` |
| `npm run typecheck` | 只做类型检查 |
| `npm run preview` | 预览构建结果，`4176` 端口 |

桌面打包时会把本仓库构建结果拷进桌面的 `resources/product-web`，用 `app://` 加载，不必你手动拷。

只改了界面、想进打包 App 里看：

```bash
cd ../open-claude-desktop
npm run build:product-web
npm run package
npm run package:open
```

---

## 界面大概分哪几块

```text
src/
  app/                 路由与 App 壳
  shell/               侧栏、顶栏、框架
  adapters/desktopBridge/  调桌面能力的接口
  features/
    public/            登录页
    cowork/            Cowork 会话与相关 UI
    epitaxy/ · webcode/  Code 会话与 composer
    settings/          设置
    workspace/         Artifacts、最近项等
  stores/ · i18n/ · styles/
```

冷启动（已进入主壳时）一般是 **`/` → `/task/new`（Cowork 新建）**，不是默认一进来就 Code。

---

## 和桌面怎么配合

```text
你点发送 / 改模型 / 改 Effort
        │
        ▼
  open-claude-web（本仓库）
        │  desktopBridge
        ▼
  open-claude-desktop（preload → 主进程）
        │
        ▼
  本机 Claude Code CLI / 会话存储 / 配置库
```

- **Effort 档位**：以 CLI 对该模型返回的档位为准（例如部分模型只有 low / medium / high），选中后会传给 CLI（`--effort` 或会话内更新）。  
- **第三方配置、健康状态、账号态**：桌面算好再给前端，前端不自己编一套。

---

## 边界（务必看）

- 本仓库是 **UI**，不是完整产品；发版请以 **Desktop 打包** 为准  
- 不伪造官方登录成功、订阅、加余额  
- 限流条等区域只保留真实可用的操作（关闭、在允许时重置、打开配置等）  
- 没有桌面 bridge 时，不要拿浏览器单独打开的结果当「功能完成」  
- 适合：改界面、对照交互、二次开发前端  
- 不适合：当独立在线 Chat 产品部署

工程向硬规则见 [`CLAUDE.md`](CLAUDE.md)。官方 DOM / class 对照笔记（偏开发）在 [`docs/official-alignment-map.md`](docs/official-alignment-map.md)。

---

## 相关链接

| 链接 | 说明 |
|------|------|
| [`CLAUDE.md`](CLAUDE.md) | residual 硬规则、host-loop、登录/账号 residual |
| [`docs/official-alignment-map.md`](docs/official-alignment-map.md) | 官方 ↔ 产品 DOM/class 对照 |
| [`../open-claude-desktop/README.md`](../open-claude-desktop/README.md) | 桌面壳、打包、部署模式 |
| [`../open-claude-desktop/docs/package-and-test.md`](../open-claude-desktop/docs/package-and-test.md) | dual-root 与 smoke 规范 |
| https://github.com/go-hare/open-claude-web | 本仓库（界面） |
| https://github.com/go-hare/open-claude-desktop | 桌面壳与打包 |
| https://github.com/go-hare/claude-code-1 | 配套 Claude Code 方向 |
| https://github.com/go-hare/agent-extension | 浏览器扩展 |
| [linux.do](https://linux.do/) | linux.do 社区 |

欢迎 star / issue / PR。报 bug 请说明：只开了 web 还是连了 desktop、路由截图、控制台报错。
