import eslint from "@eslint/js";
import typescript from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactCompiler from "eslint-plugin-react-compiler";

const compat = new FlatCompat({
  baseDirectory: __dirname
});

const __dirname = dirname(__filename);
const __filename = fileURLToPath(import.meta.url);
import { FlatCompat } from "@eslint/eslintrc";
import { fileURLToPath } from "url";
import { dirname } from "path";

export default [...compat.extends("next/core-web-vitals", "next/typescript"), {
  ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts"]
}, eslint.configs.recommended, {
  files: ["**/*.{ts,tsx}"],
  languageOptions: {
    parser: typescriptParser,
  },
  plugins: {
    "@typescript-eslint": typescript,
    react,
    "react-hooks": reactHooks,
    "react-compiler": reactCompiler,
  },
  rules: {
    "react-hooks/rules-of-hooks": "error", // Checks rules of Hooks
    "react-hooks/exhaustive-deps": "warn", // Checks effect dependencies
    "react-compiler/react-compiler": "error",
    "no-undef": "off",
    "no-unused-vars": "off",
  },
  ignores: ["**/*.d.ts", ".next/**"],
}];
