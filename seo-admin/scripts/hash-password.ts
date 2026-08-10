/**
 * Mint a bcrypt hash for a `seo_admins` row.
 *
 *   npm run admin:hash -- you@example.com owner
 *
 * There is no "create admin" screen, on purpose. Self-service account creation
 * in an internal tool is a way in; adding an admin should require database
 * access. This script prints the SQL and does not connect to anything, so it is
 * safe to run anywhere and the operator decides what to execute.
 *
 * The password is read from a hidden prompt rather than argv, because argv ends
 * up in shell history and in `ps` output on a shared machine.
 */

import { createInterface } from "node:readline";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { stdin, stdout } from "node:process";

import bcrypt from "bcryptjs";

/**
 * Cost 12. Roughly 250ms on current hardware — slow enough that an offline
 * attack on a leaked hash is expensive, fast enough that login does not feel
 * broken. Revisit upward, never downward.
 */
const BCRYPT_COST = 12;

const ROLES = ["owner", "editor", "viewer"] as const;
type Role = (typeof ROLES)[number];

function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

type Asker = (question: string, opts?: { silent?: boolean }) => Promise<string>;

/**
 * Build an asker bound to one readline interface, for an interactive terminal.
 *
 * One interface for the whole run, not one per question. `rl.close()` ends the
 * underlying stdin stream, so a fresh interface for the next question reads EOF
 * immediately and its callback never fires — the promise never settles, the
 * event loop drains, and the process exits 0 having printed nothing. A silent
 * success that produced no SQL is the worst possible failure here.
 *
 * The pristine `_writeToOutput` is captured once and restored after every
 * question. Re-wrapping it per call would compose the wrappers, and the second
 * hidden prompt would suppress its own label along with the keystrokes.
 */
function ttyAsker(rl: ReturnType<typeof createInterface>): Asker {
  const target = rl as unknown as { _writeToOutput: (text: string) => void };
  const pristine = target._writeToOutput.bind(rl);

  return function ask(question: string, { silent = false } = {}): Promise<string> {
    // `readline` has no built-in masking. Swapping `_writeToOutput` is the
    // conventional workaround: the keystroke is still delivered to the line
    // buffer, it just is not echoed.
    target._writeToOutput = silent
      ? (text: string) => {
          if (text.includes(question)) pristine(text);
        }
      : pristine;

    return new Promise((resolve, reject) => {
      let answered = false;

      // EOF before an answer means the terminal closed mid-prompt. Reject
      // loudly rather than hang.
      const onClose = () => {
        if (!answered) reject(new Error("Input ended before the prompt was answered."));
      };
      rl.once("close", onClose);

      rl.question(question, (answer) => {
        answered = true;
        rl.removeListener("close", onClose);
        target._writeToOutput = pristine;
        if (silent) stdout.write("\n");
        resolve(answer);
      });
    });
  };
}

/**
 * Asker for piped (non-TTY) input, one line per prompt:
 *
 *   printf 'hunter2hunter2\nhunter2hunter2\n' | npm run admin:hash -- you@example.com owner
 *
 * readline cannot drive sequential questions off a pipe — it drains the whole
 * buffer, hands the first line to the first question, and discards the rest —
 * so a pipe is read once up front and consumed in order. Masking is skipped
 * because there are no keystrokes to hide; the caller already controls the
 * source. Prefer the interactive path for a password you type by hand: a pipe
 * puts it in shell history.
 */
function pipedAsker(lines: string[]): Asker {
  let cursor = 0;
  return async function ask(question: string): Promise<string> {
    if (cursor >= lines.length) {
      throw new Error(
        `Ran out of piped input at "${question.trim()}". Supply one line per prompt.`,
      );
    }
    // `noUncheckedIndexedAccess` types this as `string | undefined`; the bound
    // check above already rules out undefined, so `?? ""` is the narrowing, not
    // a fallback that can fire.
    return lines[cursor++] ?? "";
  };
}

async function readStdin(): Promise<string[]> {
  const chunks: Buffer[] = [];
  for await (const chunk of stdin) chunks.push(chunk as Buffer);
  // Trailing newline would otherwise read as an extra empty answer.
  return Buffer.concat(chunks).toString("utf8").replace(/\r?\n$/, "").split(/\r?\n/);
}

/** Single-quote escaping for a Postgres string literal. */
function sqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function fail(message: string): never {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

async function main(): Promise<void> {
  const [emailArg, roleArg = "editor"] = process.argv.slice(2);

  // Validate the argv-supplied role before prompting. Typing a password twice
  // only to be told the role was misspelled is a bad trade.
  if (!isRole(roleArg)) {
    fail(`Role must be one of ${ROLES.join(", ")} — got "${roleArg}".`);
  }

  // Interactive gets a masked readline prompt; a pipe gets its lines in order.
  // Deciding once, here, keeps the branch out of every call site.
  const rl = stdin.isTTY ? createInterface({ input: stdin, output: stdout, terminal: true }) : null;
  const ask: Asker = rl ? ttyAsker(rl) : pipedAsker(await readStdin());

  let email: string;
  let password: string;
  try {
    email = (emailArg ?? (await ask("Email: "))).trim().toLowerCase();
    if (!email.includes("@") || email.length < 5) {
      fail(`"${email}" does not look like an email address.`);
    }

    password = await ask("Password (not echoed): ", { silent: true });
    if (password.length < 12) {
      // Twelve characters is the floor because these accounts can publish to a
      // public site and there is no MFA in front of them.
      fail("Use at least 12 characters. Admin accounts have no second factor.");
    }

    const confirm = await ask("Confirm password: ", { silent: true });
    if (confirm !== password) fail("Those did not match. Nothing was written.");
  } finally {
    // Must close, or the open interface keeps the event loop alive and the
    // process hangs after printing.
    rl?.close();
  }

  const hash = await bcrypt.hash(password, BCRYPT_COST);

  console.log(`
  Run this against the project's database:

  insert into public.seo_admins (email, password_hash, role)
  values (${sqlLiteral(email)}, ${sqlLiteral(hash)}, ${sqlLiteral(roleArg)})
  on conflict (email) do update
    set password_hash = excluded.password_hash,
        role          = excluded.role;

  The upsert makes this the password-reset path too — re-run it for an existing
  email and the row is replaced rather than rejected.
`);

  // Convenience, not ceremony: a fresh install needs this value anyway and
  // generating it here saves looking up the incantation.
  //
  // `.env.local` is checked as well as the process environment. Next loads that
  // file, this script does not, so testing `process.env` alone would announce
  // "unset" to someone whose secret is present and fine — and following that
  // advice would replace a working secret and sign out every live session.
  if (!hasUsableJwtSecret()) {
    console.log(`  ADMIN_JWT_SECRET is missing or too short. Paste this into seo-admin/.env.local:

  ADMIN_JWT_SECRET="${randomBytes(48).toString("base64url")}"
`);
  }
}

/**
 * True when a secret long enough to satisfy `lib/auth/session.ts` is already in
 * place, in either the environment or `seo-admin/.env.local`.
 *
 * Deliberately not a full dotenv parse: this only needs to know whether a usable
 * value exists, and the value itself is never printed.
 */
function hasUsableJwtSecret(): boolean {
  const MIN_LENGTH = 32;

  if ((process.env.ADMIN_JWT_SECRET ?? "").length >= MIN_LENGTH) return true;

  try {
    // `__dirname`, not `import.meta.url`: tsx compiles this package to CJS,
    // where `import.meta` is a transform error.
    const envFile = readFileSync(join(__dirname, "..", ".env.local"), "utf8");
    const match = envFile.match(/^\s*ADMIN_JWT_SECRET\s*=\s*(.*)$/m);
    if (!match) return false;
    const value = (match[1] ?? "").trim().replace(/^["']|["']$/g, "");
    return value.length >= MIN_LENGTH;
  } catch {
    // No .env.local yet — a fresh clone. The hint is exactly right there.
    return false;
  }
}

// Not top-level `await`: this package has no `"type": "module"`, so tsx compiles
// to CJS, where top-level await is a transform error rather than a runtime one.
// Same pattern as the consumer app's scripts/seed-seo-pages.ts.
main().catch((error: unknown) => {
  console.error("\n  Failed:", error instanceof Error ? error.message : error, "\n");
  process.exit(1);
});
