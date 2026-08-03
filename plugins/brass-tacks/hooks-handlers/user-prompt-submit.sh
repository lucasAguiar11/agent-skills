#!/usr/bin/env bash
# UserPromptSubmit once per session: fallback inject for harnesses that ignore
# SessionStart stdout. Also re-sync host rules if SessionStart was skipped.

set -euo pipefail

# shellcheck source=lib.sh
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"

bt_materialize_host_rules

if bt_disabled; then
  exit 0
fi

data="$(bt_data_dir)"
session_id="${GROK_SESSION_ID:-${CLAUDE_SESSION_ID:-unknown}}"

if [[ -n "${data}" ]]; then
  mkdir -p "${data}"
  flag="${data}/injected-${session_id}"
  if [[ -f "${flag}" ]]; then
    exit 0
  fi
fi

bt_emit_additional_context "UserPromptSubmit"

if [[ -n "${data:-}" ]]; then
  : > "${data}/injected-${session_id}"
fi

exit 0
