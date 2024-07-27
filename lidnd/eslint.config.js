// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strict,

  {
    ignores: ["**/*.d.ts", ".next/**"],
    plugins: { react },
  }
);
