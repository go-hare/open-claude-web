# Claudex Web

Claudex 的 **产品 SPA**：按官方 Claude Desktop `ion-dist` residual 重建的 React / TypeScript 前端。由姊妹仓库 **[open-claude-desktop](../open-claude-desktop)** 以 Electron 壳加载。

| 仓库 | 职责 |
|------|------|
| **open-claude-web**（本仓库） | UI、路由、会话渲染、设置、desktopBridge 适配 |
| **open-claude-desktop** | 主进程、IPC、协议、CLI/MCP、打包 dual-root |

官方前端 residual（本机路径，见 `CLAUDE.md`）：

```text
…/Claude-Deepseek.app/Contents/Resources/ion-dist
```

硬规则：先定位官方 JS 的组件 / DOM / class / 状态机，再改产品代码；禁止凭感觉补 CSS 或近似组件。

---

## 它如何被加载

| 场景 | 谁提供 URL | 来源 |
|------|------------|------|
| **开发** | 本仓库 Vite | `http://127.0.0.1:5176`（桌面 `CLAUDE_DESKTOP_MAIN_VIEW_URL`） |
| **打包** | 桌面 `app://localhost` | 构建进 `open-claude-desktop/resources/product-web` |

打包时桌面执行 `npm run build:product-web`：默认 `vite build` 本仓库 → 拷贝到 `product-web`。  
**不要**把本仓库构建产物覆盖进 residual `ion-dist`；`ion-dist` 只保留官方 setup 等 residual SPA。

```text
open-claude-web (dev :5176 或 dist/)
        │
        ▼
desktopBridge / window.claude.*  →  Electron preload → main IPC
        │
        ▼
会话 / CLI / MCP / preferences / artifacts …
```

---

## 快速开始

**要求：** 现代 Node（与桌面仓库一致时建议 `>=22`）。

```bash
cd open-claude-web
npm install
npm run dev
```

浏览器可直接打开（仅 UI；无完整桌面 bridge 时部分能力会降级）：

```text
http://127.0.0.1:5176/
```

**推荐联调**（与桌面壳一起）：

```bash
# 终端 1
cd open-claude-web && npm run dev

# 终端 2
cd ../open-claude-desktop && npm run dev
```

### 脚本

| 脚本 | 作用 |
|------|------|
| `npm run dev` | Vite，host `127.0.0.1`，port **5176** |
| `npm run build` | `tsc -b` + `vite build` → `dist/` |
| `npm run typecheck` | 仅类型检查 |
| `npm run preview` | 预览构建结果，port **4176** |

桌面打包默认只跑 `vite build`（可用 `CLAUDE_PRODUCT_WEB_STRICT=1` 强制完整 `npm run build`）。

---

## 源码地图

```text
src/
  main.tsx                 入口
  app/                     路由、public routes、App 壳
  shell/                   DesktopFrame / Sidebar / ModePill / icons…
  adapters/desktopBridge/  官方 bridge 面 → 类型化 adapter
  features/
    public/                登录 LoginDesktop 等
    cowork/                Cowork 主页、会话、rate-limit、transcript、MCP UI…
    epitaxy/               Epitaxy / 部分 Cowork 侧栏 residual
    webcode/ · codeWeb/    Code 会话面
    settings/              设置、账号/bootstrap 相关 API
    workspace/             Artifacts 库、Projects、Recents…
    customize/ · dispatch/ · tasks/ · scheduled/ · analytics/
  stores/ · i18n/ · styles/
docs/
  official-alignment-map.md   已核对的官方 DOM / class 对照
  source-route-audit.md
  cowork-conversation-official-source-map.md
```

### 路由口径（节选）

- 已登录冷启动 residual：`/` → **`/task/new`**（Cowork home），不是默认进 Code。
- 登录：`/login`（LoginDesktop；1p/3p/dotClaude chooser residual）。
- Cowork 会话、Code、Settings、Customize、Artifacts 库等见 `src/app/routes.tsx`。
- 路由表里的 `sourceChunk` 字段记录官方 chunk 线索，便于对照。

### Bridge

- 类型与调用集中在 `src/adapters/desktopBridge/`。
- 桌面 preload 暴露面在 `open-claude-desktop/electron/preload/bridges/webBridge.ts`。
- **禁止**在 web 侧发明 OAuth / BFF / 假订阅成功；3p 配置与 health 以桌面 resolution / bootstrap 为准。

---

## 产品诚实边界（与桌面一致）

| 主题 | 口径 |
|------|------|
| 1p logged-out | bootstrap `account: null`；不伪造 Anthropic 登录成功 |
| 3p | 桌面 configLibrary / activation；缺配置 → Setup / degraded |
| rate-limit CTA | 结构对齐官方 pVe action 槽；仅 `dismiss` / `reset` / `open-setup`，无 Subscribe/AddCredits |
| Alluvium | 受 feature `claude_ai_alluvium_main` 门控；对照官方 markdown residual |
| Artifacts | 库列表 + 打开路径走桌面 CoworkArtifacts；feature 由 `supportedFeatures` 控制 |
| host-loop | 默认本机会话；不在 web 侧强推 VM |

更细的 UI 对照表见 [`docs/official-alignment-map.md`](docs/official-alignment-map.md)。

---

## 与桌面打包的关系

桌面 `npm run package` 会：

1. 构建产品 main / preload  
2. `build:product-web`：构建本仓库 → `open-claude-desktop/resources/product-web`  
3. forge package + align dual-root（**保留** residual `ion-dist`）  
4. audit：要求 `product-web` 的 `data-build-id` **不是** `spa-dev`

本地只改 web、测打包效果：

```bash
cd ../open-claude-desktop
npm run build:product-web
npm run package
npm run package:open
```

完整打包 / smoke 说明：[`../open-claude-desktop/docs/package-and-test.md`](../open-claude-desktop/docs/package-and-test.md)。

---

## 改 UI 前的检查清单

1. 在官方 `ion-dist` JS 中定位组件名、className、DOM 层级、Portal 挂载与状态分支。  
2. 在 `docs/official-alignment-map.md`（或相关 map）补/查对照。  
3. 改产品组件结构与 class，**不要**先靠 margin/padding 补丁。  
4. `npm run typecheck`（或桌面联调）。  
5. **桌面实际启动**验证（dev 或 packaged），不得只凭浏览器 Vite 声称完成。

---

## 相关文档

| 文档 | 内容 |
|------|------|
| [`CLAUDE.md`](CLAUDE.md) | residual 硬规则、host-loop、登录/账号 residual |
| [`docs/official-alignment-map.md`](docs/official-alignment-map.md) | 官方 ↔ 产品 DOM/class 对照 |
| [`../open-claude-desktop/README.md`](../open-claude-desktop/README.md) | 桌面壳、打包、部署模式 |
| [`../open-claude-desktop/docs/package-and-test.md`](../open-claude-desktop/docs/package-and-test.md) | dual-root 与 smoke 规范 |
