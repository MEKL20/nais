import eslint from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import importPlugin from "eslint-plugin-import";

const IGNORES = [
  "node_modules/",
  "dist/",
  "**/dist/**",
  "target/",
  "apps/desktop/src-tauri/target/",
  "apps/desktop/dist/",
  "*.min.js",
  "**/*.min.js",
  "scripts/**/*.mjs",
  ".git/",
];

export default [
  { ignores: IGNORES },
  eslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
      },
      globals: {
        process: "readonly",
        console: "readonly",
        HTMLElement: "readonly",
        HTMLDivElement: "readonly",
        HTMLCanvasElement: "readonly",
        HTMLTextAreaElement: "readonly",
        SpeechSynthesis: "readonly",
        SpeechSynthesisUtterance: "readonly",
        SpeechSynthesisVoice: "readonly",
        Node: "readonly",
        document: "readonly",
        window: "readonly",
        performance: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        WebSocket: "readonly",
        MessageEvent: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        fetch: "readonly",
        crypto: "readonly",
        AbortController: "readonly",
        URL: "readonly",
        Request: "readonly",
        Response: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      "import": importPlugin,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-unused-vars": "off",
      "no-console": ["error", { allow: ["warn", "error", "log"] }],
      "no-debugger": "error",
      "import/order": "error",
      "import/no-cycle": "error",
      "import/first": "error",
      "import/newline-after-import": "error",
      "import/no-useless-path-segments": "error",
      "prefer-const": "error",
      "no-var": "error",
      "object-shorthand": "error",
      "prefer-template": "error",
    },
  },
];
