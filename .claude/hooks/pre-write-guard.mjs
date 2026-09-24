#!/usr/bin/env node
// PreToolUse guard for Write/Edit: refuse any write outside the repo root
// or its designated scratch area. Cheap, deterministic, no network.
import { resolve } from "node:path";

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

  const inRepo = abs === repoRoot || abs.startsWith(repoRoot + "/");
  const inScratch =
    /^\/(private\/)?tmp\/claude-/.test(abs) || abs.includes("/scratchpad/") || abs.endsWith("/scratchpad");

  if (!inRepo && !inScratch) {
    console.error(
      `Refused: write to "${abs}" is outside the repo root (${repoRoot}) and its scratch area.`,
    );
    process.exit(2);
  }
  process.exit(0);
});
