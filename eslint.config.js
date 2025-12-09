import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import globals from "globals";

export default [
  // Base recommended rules
  js.configs.recommended,

  // TypeScript files in src/ (browser environment)
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsparser,
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      // Disable rules that TypeScript handles better
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
    },
  },

  // TypeScript files in scripts/ (Node.js environment)
  {
    files: ["scripts/**/*.ts"],
    languageOptions: {
      parser: tsparser,
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.nodeBuiltin,
        // Node.js 18+ Fetch API globals
        fetch: "readonly",
        Response: "readonly",
        Request: "readonly",
        Headers: "readonly",
        RequestInit: "readonly",
        AbortController: "readonly",
        AbortSignal: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      // Disable rules that TypeScript handles better
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      // Allow console in scripts
      "no-console": "off",
      // Allow explicit any for error handling patterns
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },

  // Configuration files (JS)
  {
    files: ["*.config.js", "*.config.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
  },

  // Ignore patterns
  {
    ignores: ["node_modules/**", "dist/**", "data/**", "public/**"],
  },
];
