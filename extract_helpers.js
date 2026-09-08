const fs = require('fs');

const path = 'src/lib/dashboard/expert-actions.ts';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

// Find start and end of helpers
let helpersStart = -1;
let helpersEnd = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('type ServerClient = Awaited<ReturnType<typeof createClient>>;')) {
    helpersStart = i;
  }
  if (lines[i].includes('export async function setWeeklyAvailability(')) {
    helpersEnd = i - 1; // Stop right before the first action
    break;
  }
}

if (helpersStart === -1 || helpersEnd === -1) {
  console.error('Could not find helper bounds');
  process.exit(1);
}

const helpersLines = lines.slice(helpersStart, helpersEnd);
// Make all helper functions exported so they can be imported
const exportableHelpers = helpersLines.map(line => {
  return line
    .replace(/^const FAILED =/, 'export const FAILED =')
    .replace(/^const OK =/, 'export const OK =')
    .replace(/^function explain\(/, 'export function explain(')
    .replace(/^async function currentUser\(/, 'export async function currentUser(')
    .replace(/^async function assertOwnership\(/, 'export async function assertOwnership(')
    .replace(/^function rupeesToPaise\(/, 'export function rupeesToPaise(')
    .replace(/^function checked\(/, 'export function checked(')
    .replace(/^function bounded\(/, 'export function bounded(')
    .replace(/^function readId\(/, 'export function readId(')
    .replace(/^function optionalText\(/, 'export function optionalText(')
    .replace(/^function zoneOffsetMs\(/, 'export function zoneOffsetMs(')
    .replace(/^function parseInstant\(/, 'export function parseInstant(')
    .replace(/^async function shopTimezone\(/, 'export async function shopTimezone(')
    .replace(/^function minutesOfDay\(/, 'export function minutesOfDay(')
    .replace(/^function timeLiteral\(/, 'export function timeLiteral(')
    .replace(/^async function syncPublicHours\(/, 'export async function syncPublicHours(');
});

const utilsContent = `import "server-only";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logReadFailure } from "@/lib/dashboard/errors";
import type { BookingActionState } from "@/lib/bookings/state";
import { WEEKDAYS, type Weekday } from "@/lib/types/database";
import type { FixerProfileUpdate, OpenDay } from "@/lib/types/marketplace";

` + exportableHelpers.join('\n');

fs.writeFileSync('src/lib/dashboard/expert-utils.ts', utilsContent);

// Remove helpers from expert-actions.ts and add imports
const newActionsContent = [
  ...lines.slice(0, helpersStart),
  `import {
  type ServerClient,
  FAILED,
  OK,
  explain,
  currentUser,
  assertOwnership,
  rupeesToPaise,
  checked,
  bounded,
  readId,
  optionalText,
  zoneOffsetMs,
  parseInstant,
  shopTimezone,
  minutesOfDay,
  timeLiteral,
  syncPublicHours
} from "@/lib/dashboard/expert-utils";\n`,
  ...lines.slice(helpersEnd)
].join('\n');

fs.writeFileSync('src/lib/dashboard/expert-actions.ts', newActionsContent);

console.log('Helpers extracted to expert-utils.ts successfully.');
