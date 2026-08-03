#!/usr/bin/env bash
# SessionStart: inject additionalContext (Claude/Codex) AND materialize host rules
# so Grok still gets always-on style even if it ignores SessionStart stdout.

set -euo pipefail

# shellcheck source=lib.sh
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"

# Always sync host rules first (works even when stdout is discarded).
bt_materialize_host_rules

if bt_disabled; then
  exit 0
fi

bt_emit_additional_context "SessionStart"
exit 0
