import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/**
 * Mirrors the consumer app's config. See the notes there for why
 * `core-web-vitals` is spread without also spreading the base config, and why
 * nothing here is type-aware.
 *
 * `tsconfig.verify.json` is excluded from `tsconfig.json`'s own reach but would
 * still be picked up as a lintable file, and it is generated, not authored.
 */
const config = [
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts"],
  },

  ...nextCoreWebVitals,
  ...nextTypescript,

  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      "@typescript-eslint/no-explicit-any": "error",

      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },

  {
    // `hash-password.ts` exists to print things to a terminal.
    files: ["scripts/**/*.ts"],
    rules: { "no-console": "off" },
  },
];

export default config;
