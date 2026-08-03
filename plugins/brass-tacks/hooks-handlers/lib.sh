#!/usr/bin/env bash
# Shared helpers for brass-tacks plugin hooks.
# shellcheck shell=bash

bt_plugin_root() {
  local root="${PLUGIN_ROOT:-${CLAUDE_PLUGIN_ROOT:-${GROK_PLUGIN_ROOT:-}}}"
  if [[ -z "${root}" ]]; then
    root="$(cd "$(dirname "${BASH_SOURCE[1]}")/.." && pwd)"
  fi
  printf '%s' "${root}"
}

bt_data_dir() {
  printf '%s' "${PLUGIN_DATA:-${CLAUDE_PLUGIN_DATA:-${GROK_PLUGIN_DATA:-}}}"
}

bt_context_file() {
  printf '%s/hooks-handlers/brass-tacks-context.md' "$(bt_plugin_root)"
}

bt_disabled() {
  local data
  data="$(bt_data_dir)"
  [[ -n "${data}" && -f "${data}/disabled" ]]
}

# Host-native always-on files (survive even when SessionStart stdout is ignored).
# Grok: ~/.grok/rules/*.md loads every session.
# Claude Code: ~/.claude/rules/*.md when rules are enabled.
# Codex: hooks are the primary path (no equivalent rules dir).
bt_materialize_host_rules() {
  local ctx dest
  ctx="$(bt_context_file)"
  [[ -f "${ctx}" ]] || return 0

  if bt_disabled; then
    bt_remove_host_rules
    return 0
  fi

  for dest in \
    "${HOME}/.grok/rules/brass-tacks.md" \
    "${HOME}/.claude/rules/brass-tacks.md"
  do
    mkdir -p "$(dirname "${dest}")"
    # Copy (not symlink): installed plugin path can move on update.
    if [[ ! -f "${dest}" ]] || ! cmp -s "${ctx}" "${dest}" 2>/dev/null; then
      cp "${ctx}" "${dest}"
    fi
  done
}

bt_remove_host_rules() {
  rm -f \
    "${HOME}/.grok/rules/brass-tacks.md" \
    "${HOME}/.claude/rules/brass-tacks.md" \
    2>/dev/null || true
}

bt_emit_additional_context() {
  local event_name="$1"
  local ctx
  ctx="$(bt_context_file)"
  [[ -f "${ctx}" ]] || return 0

  if command -v jq >/dev/null 2>&1; then
    jq -n --arg event "${event_name}" --rawfile body "${ctx}" '{
      hookSpecificOutput: {
        hookEventName: $event,
        additionalContext: $body
      }
    }'
  else
    python3 - "${event_name}" "${ctx}" <<'PY'
import json, sys
from pathlib import Path
event, path = sys.argv[1], sys.argv[2]
print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": event,
        "additionalContext": Path(path).read_text(),
    }
}))
PY
  fi
}
