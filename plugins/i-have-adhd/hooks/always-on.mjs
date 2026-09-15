// SessionStart hook: injects the full i-have-adhd ruleset at the start of
// every session.
// Never blocks session start: any failure exits 0.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

try {
  // Resolve SKILL.md relative to this script's own location, not a trusted env var.
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const skillPath = path.join(scriptDir, "..", "skills", "i-have-adhd", "SKILL.md");
  if (!fs.existsSync(skillPath)) process.exit(0);

  // Strip a leading YAML frontmatter block (--- ... --- at the very top of file).
  const body = fs
    .readFileSync(skillPath, "utf8")
    .replace(
      /^---[^\S\r\n]*\r?\n[\s\S]*?\r?\n---[^\S\r\n]*(?:\r?\n|$)/,
      "",
    )
    .replace(/(?:\r?\n)+$/, "");

  process.stdout.write(
    "ADHD MODE ACTIVE. The ruleset below applies to every response. " +
      '"stop adhd mode" turns it off for this session.\n\n' +
      `${body}\n`,
  );
} catch {
  // Never block session start.
  process.exit(0);
}
