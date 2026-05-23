#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="${1:-}"

if [[ -z "$VERSION" ]]; then
  echo "Usage: $0 <semver>" >&2
  exit 1
fi

update_json_version() {
  local file="$1"
  python3 - "$file" "$VERSION" <<'PY'
import json
import sys

path, version = sys.argv[1], sys.argv[2]
with open(path, encoding="utf-8") as fh:
    data = json.load(fh)

if path.endswith("marketplace.json"):
    if "metadata" in data and isinstance(data["metadata"], dict):
        data["metadata"]["version"] = version
    for plugin in data.get("plugins", []):
        plugin["version"] = version
else:
    data["version"] = version

with open(path, "w", encoding="utf-8") as fh:
    json.dump(data, fh, indent=2, ensure_ascii=False)
    fh.write("\n")
PY
}

for file in \
  "$ROOT/.agents/plugins/marketplace.json" \
  "$ROOT/.claude-plugin/marketplace.json" \
  "$ROOT/.cursor-plugin/marketplace.json" \
  "$ROOT/plugins/stafebank-feature-delivery/.codex-plugin/plugin.json" \
  "$ROOT/plugins/stafebank-feature-delivery/.claude-plugin/plugin.json" \
  "$ROOT/plugins/stafebank-feature-delivery/.cursor-plugin/plugin.json"
do
  update_json_version "$file"
  echo "updated $file"
done

echo "Version bumped to $VERSION"
