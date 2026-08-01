import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    // AI import boundary: UI code may only reach AI logic through supabase.functions.invoke(...)
    // (see src/lib/ai-api.ts) plus packages/ai/schemas types (via the @ai alias). Provider,
    // agent, tool and pipeline code is Edge-Function-only — see docs/AI_ARCHITECTURE.md §1.
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "**/packages/ai/providers/**",
                "**/packages/ai/agents/**",
                "**/packages/ai/tools/**",
                "**/packages/ai/pipelines/**",
              ],
              message:
                "UI components must never import AI provider/agent/tool/pipeline code directly. " +
                "Use supabase.functions.invoke(...) via src/lib/ai-api.ts, and import types only " +
                "from packages/ai/schemas via the @ai alias. See docs/AI_ARCHITECTURE.md §1.",
            },
          ],
        },
      ],
    },
  },
);
