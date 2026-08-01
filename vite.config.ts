import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Frontend-safe AI types only (plain interfaces, no runtime/provider code) — see
      // docs/AI_ARCHITECTURE.md §1. Never alias packages/ai/{providers,agents,tools,pipelines}.
      "@ai": path.resolve(__dirname, "./packages/ai/schemas"),
    },
  },
}));
