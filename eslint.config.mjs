import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/**
 * `eslint-config-next` v16 ships flat config arrays directly, so these are
 * spread rather than pulled through FlatCompat.
 *
 * `core-web-vitals` already re-exports the base config, so `eslint-config-next`
 * itself is deliberately not also spread here — doing both registers every
 * plugin twice and ESLint rejects a duplicate plugin definition.
 *
 * The rules added below are the ones that catch mistakes the compiler cannot
 * see. Note that nothing here is type-aware: enabling `projectService` would
 * unlock rules like `no-floating-promises`, but it also makes a full lint
 * meaningfully slower, and `tsc --noEmit` already runs alongside this.
 */
const config = [
  {
    // The admin is a separate package with its own config and its own
    // node_modules; linting it from here would resolve plugins to the wrong
    // tree and report the same files twice.
    // The sibling apps are separate npm projects with their own configs and
    // their own node_modules. Linting them from here would resolve their
    // imports against the consumer app's dependency tree and report failures
    // that do not exist in the app that actually builds them.
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "seo-admin/**",
      "admin/**",
    ],
  },

  ...nextCoreWebVitals,
  ...nextTypescript,

  {
    rules: {
      // An unused import is usually the residue of a refactor that did not
      // finish. Underscore-prefixed names stay legal because server actions
      // take a `_prevState` they genuinely do not read.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // `any` erases exactly the guarantees `strict` and
      // `noUncheckedIndexedAccess` were turned on to buy.
      "@typescript-eslint/no-explicit-any": "error",

      // `console.log` left in a server component prints on every render, into
      // production logs. Warnings and errors are deliberate and stay.
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },

  {
    // Scripts run under tsx, outside the bundler. Console output is the entire
    // point of them.
    files: ["scripts/**/*.ts"],
    rules: { "no-console": "off" },
  },
];

export default config;
