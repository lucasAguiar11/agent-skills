#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLUGIN="${1:-}"
VERSION="${2:-}"

if [[ -z "$PLUGIN" || -z "$VERSION" ]]; then
  echo "Usage: $0 <plugin> <semver>" >&2
  echo "Exemplo: $0 workflow-kit 1.26.0" >&2
  exit 1
fi

if [[ ! -d "$ROOT/plugins/$PLUGIN" ]]; then
  echo "Plugin desconhecido: $PLUGIN" >&2
  exit 1
fi

update_json_version() {
  local file="$1"
  python3 - "$file" "$PLUGIN" "$VERSION" <<'PY'
import json
import sys

path, plugin, version = sys.argv[1], sys.argv[2], sys.argv[3]
with open(path, encoding="utf-8") as fh:
    data = json.load(fh)

if path.endswith("marketplace.json"):
    names = [p.get("name") for p in data.get("plugins", [])]
    if plugin not in names:
        sys.exit(0)
    for entry in data.get("plugins", []):
        if entry.get("name") == plugin:
            entry["version"] = version
    # ponytail: metadata.version do marketplace acompanha o workflow-kit (plugin ancora)
    if plugin == "workflow-kit" and isinstance(data.get("metadata"), dict):
        data["metadata"]["version"] = version
else:
    data["version"] = version

with open(path, "w", encoding="utf-8") as fh:
    json.dump(data, fh, indent=2, ensure_ascii=False)
    fh.write("\n")
PY
}

# marketplaces (um por host) + todos os manifests do plugin alvo
files=()
while IFS= read -r f; do files+=("$f"); done < <(
  find "$ROOT" -name marketplace.json -not -path "*/node_modules/*"
  find "$ROOT/plugins/$PLUGIN" -name plugin.json
)

for file in "${files[@]}"; do
  update_json_version "$file"
  echo "updated $file"
done

echo "$PLUGIN bumped to $VERSION"
