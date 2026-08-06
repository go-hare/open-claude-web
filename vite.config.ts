import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const nm = (...parts: string[]) => path.resolve(rootDir, "node_modules", ...parts);

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5176,
  },
  // TipTap + @tiptap/pm pull nested prosemirror-* copies; dual model instances
  // break Fragment.from ("multiple versions of prosemirror-model were loaded").
  resolve: {
    dedupe: [
      "prosemirror-model",
      "prosemirror-state",
      "prosemirror-view",
      "prosemirror-transform",
      "prosemirror-commands",
      "prosemirror-keymap",
      "@tiptap/core",
      "@tiptap/pm",
    ],
    alias: {
      "prosemirror-model": nm("prosemirror-model"),
      "prosemirror-state": nm("prosemirror-state"),
      "prosemirror-view": nm("prosemirror-view"),
      "prosemirror-transform": nm("prosemirror-transform"),
      "prosemirror-commands": nm("prosemirror-commands"),
      "prosemirror-keymap": nm("prosemirror-keymap"),
    },
  },
  // Newly installed markdown packages must be prebundled; without this Electron
  // can hit 504 Outdated Optimize Dep and white-screen after npm install.
  optimizeDeps: {
    include: [
      "react-markdown",
      "remark-gfm",
      "remark-math",
      "rehype-katex",
      "katex",
      "prosemirror-model",
      "prosemirror-state",
      "prosemirror-view",
      "@tiptap/core",
      "@tiptap/pm/model",
      "@tiptap/pm/state",
      "@tiptap/pm/view",
      "@tiptap/react",
      "@tiptap/starter-kit",
    ],
  },
});
