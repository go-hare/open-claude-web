import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5176,
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
    ],
  },
});
