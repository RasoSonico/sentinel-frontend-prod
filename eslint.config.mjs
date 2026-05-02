// eslint.config.js
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactNative from "eslint-plugin-react-native";

export default [
  // Ignore generated stuff
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.expo/**",
      "**/coverage/**",
    ],
  },

  // Base JS rules
  js.configs.recommended,

  // TypeScript rules (recommended)
  ...tseslint.configs.recommended,

  // RN/React TS files
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooks,
      "react-native": reactNative,
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      // React 17+ / RN: no need to import React for JSX
      "react/react-in-jsx-scope": "off",

      // Hooks correctness
      ...reactHooks.configs.recommended.rules,

      // Sensible RN defaults
      "react-native/no-inline-styles": "off",
    },
  },
];
