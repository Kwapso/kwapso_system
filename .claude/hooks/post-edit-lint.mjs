#!/usr/bin/env node
// PostToolUse check for Write/Edit: lint only the file just touched.
// Exits cleanly (no-op) for file types oxlint doesn't cover.
import { execFileSync } from "node:child_process";
import { resolve, relative, extname } from "node:path";

const LINTABLE = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const filePath = input?.tool_input?.file_path || input?.tool_input?.path;
  if (!filePath) process.exit(0);

  const repoRoot = resolve(process.env.CLAUDE_PROJECT_DIR || process.cwd());
  const abs = resolve(filePath);
  if (!(abs === repoRoot || abs.startsWith(repoRoot + "/"))) process.exit(0);

  if (!LINTABLE.has(extname(abs))) process.exit(0); // no fast linter for this file type

  const rel = relative(repoRoot, abs);
  try {
    execFileSync("npx", ["oxlint", "--deny-warnings", rel], {
      cwd: repoRoot,
      stdio: "pipe",
      timeout: 10_000,
    });
  } catch (e) {
    process.stderr.write((e.stdout?.toString() || "") + (e.stderr?.toString() || e.message || ""));
    process.exit(2);
  }
  process.exit(0);
});
