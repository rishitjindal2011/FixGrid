import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/**
 * Mirrors seo-admin's config, which in turn mirrors the consumer app's. Nothing
 * here is type-aware: this app has to lint in the same second-scale budget as
 * the other two, and the rules that catch real bugs in it are syntactic.
 *
 * `no-console` allows `warn`/`error` deliberately — every query in
 * `src/lib/queries/` swallows its error and reports it with `console.error`, so
 * banning it outright would make the degradation silent.
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
];

export default config;
