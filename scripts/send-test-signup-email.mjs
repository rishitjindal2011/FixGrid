import { execSync } from "node:child_process";

const args = process.argv.slice(2).map((a) => `"${a.replace(/"/g, '\\"')}"`).join(" ");
try {
  execSync(`npx tsx scripts/send-test-signup-email.ts ${args}`, {
    stdio: "inherit",
  });
} catch (err) {
  process.exit(err.status ?? 1);
}
