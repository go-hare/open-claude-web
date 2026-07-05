# Claude Deepseek React Shell

这是从 `../docs/app-architecture.md` 转正出来的干净 React/TypeScript 底座，不依赖原 `ion-dist` runtime transform。

## 当前阶段

- Phase 1：已搭好 `DesktopFrame / FrameSidebar / ModePill / SidebarNav`。
- Phase 2：已按原包路由建立 `/epitaxy`、`/epitaxy/scheduled`、`/epitaxy/dispatch`、`/epitaxy/tasks`、`/code`、`/customize`、`/settings`。
- Phase 3：已放入 `desktopBridge` typed adapter，后续可逐步替换 mock 数据为真实 WebView bridge。

## 运行

```bash
npm install --ignore-scripts
npm run dev
```

打开：

```text
http://127.0.0.1:5176/epitaxy
```

## 架构映射

| 原 chunk | 当前文件 |
| --- | --- |
| `cbc59a8af` `DesktopFrame` | `src/shell/DesktopFrame.tsx` |
| `cbc59a8af` `FrameSidebar` | `src/shell/FrameSidebar.tsx` |
| `cbc59a8af` mode pill | `src/shell/ModePill.tsx` |
| `ca0135bc5` sidebar nav | `src/shell/SidebarNav.tsx` |
| `cf52a4cc1` epitaxy routes | `src/app/routes.tsx` + `src/features/epitaxy/` |
| bridge APIs | `src/adapters/desktopBridge/` |
