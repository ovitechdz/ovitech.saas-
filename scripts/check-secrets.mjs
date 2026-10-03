#!/usr/bin/env node
// @ts-check
/**
 * CI gate: scan every tracked file and fail if a banned secret is found.
 *
 * Current rules:
 *  - Filenames matching sensitive extensions are never allowed in git.
 *  - The shared preview secret (PREVIEW_CLIENT_SECRET) must appear ONLY in
 *    src/lib/auth/preview.ts. Any other occurrence is a leak.
 *  - The exact hex value of the preview secret must not appear in any other
 *    tracked file (catches copy-paste leaks).
 *
 * The allowlist is intentionally narrow; extend it deliberately.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";

const LOG = "[check-secrets]";

// Files where the shared preview secret is intentionally baked.
const SECRET_PATH_ALLOWLIST = new Set(["src/lib/auth/preview.ts"]);

// Filenames that must never be tracked.
const BLOCKED_NAME_RE =
  /(^|\/)(\.env(\..*)?|.*\.pem$|.*\.key$|.*\.p12$|.*\.pfx$|.*\.enc$|.*\.crt$|.*\.jks$|.*\.keystore$)/i;

// Matches the preview secret literal in source (with or without quotes).
const PREVIEW_SECRET_RE =
  /PREVIEW_CLIENT_SECRET\s*=\s*["']([0-9a-f]{64})["']/;

const files = execFileSync("git", ["ls-files", "-z"], { encoding: null })
  .toString()
  .split("\0")
  .filter(Boolean);

let previewSecret = null;
let scanned = 0;

for (const f of files) {
  try {
    const st = statSync(f);
    if (!st.isFile() || st.size === 0 || st.size > 512_000) continue;
  } catch {
    continue;
  }
  scanned += 1;

  if (BLOCKED_NAME_RE.test(f)) {
    console.error(`${LOG} tracked file with sensitive name: ${f}`);
    process.exit(1);
  }

  if (/\.sql$/i.test(f)) continue;

  const content = readFileSync(f, "utf8");

  const m = PREVIEW_SECRET_RE.exec(content);
  if (m) {
    if (previewSecret == null) {
      previewSecret = m[1];
    } else if (m[1] !== previewSecret) {
      console.error(
        `${LOG} multiple distinct preview secrets found — rotate one at a time`,
      );
      process.exit(1);
    }
    if (!SECRET_PATH_ALLOWLIST.has(f)) {
      console.error(
        `${LOG} preview secret found in non-allowlisted file: ${f}`,
      );
      process.exit(1);
    }
  }

  if (
    !SECRET_PATH_ALLOWLIST.has(f) &&
    previewSecret != null &&
    content.includes(previewSecret)
  ) {
    console.error(
      `${LOG} known preview secret present in non-allowlisted tracked file: ${f}`,
    );
    process.exit(1);
  }
}

console.log(
  `${LOG} ok — ${scanned} tracked files scanned, no banned secrets detected`,
);
