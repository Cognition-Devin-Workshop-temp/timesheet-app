import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: ["coverage/", "node_modules/", "eslint.config.mjs"],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_|^next$|^req$|^res$|^err$",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
];
