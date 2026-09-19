#!/usr/bin/env bash
# Drive the Aperant TUI in a real tmux PTY for end-user validation.
#
# Two measured traps this encodes (both cost a full debugging cycle):
#
#   1. Ink writes NOTHING when `is-in-ci` is true. Agent harnesses export
#      CI=true, so a healthy app shows a blank terminal and the driver gets
#      blamed. The vars must be `unset` INSIDE the pane — passing CI= (empty)
#      is not enough for every detector, and exporting from outside does not
#      reach the pane's shell.
#
#   2. Never pipe the launch command (`| tee`, `> file`). The app guards on
#      isTTY and exits 2. Capture with `tmux pipe-pane` AFTER launch instead.
#
# Ink also swaps incremental repaint for a full clearTerminal every frame when
# outputHeight >= stdout.rows, so a short PTY samples a wiped screen: use >= 50
# rows.
set -euo pipefail

SESSION="${1:?usage: tui-drive.sh <session> <project-path> [cols] [rows]}"
PROJECT="${2:?missing project path}"
COLS="${3:-200}"
ROWS="${4:-50}"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Model must be pinned to a router-routable id. Unset, the roadmap/agent paths
# fall back to the literal 'sonnet' (RoadmapView.tsx generate()), which this
# router resolves to a provider with no active credentials — surfacing as a
# 401 "No active credentials for provider" that looks like an auth failure but
# is really a routing default.
APERANT_MODEL="${APERANT_MODEL:-cc/claude-opus-5}"

CI_VARS="CI CONTINUOUS_INTEGRATION BUILD_NUMBER RUN_ID GITHUB_ACTIONS GITLAB_CI CIRCLECI TRAVIS APPVEYOR BUILDKITE DRONE TEAMCITY_VERSION TF_BUILD"

tmux kill-session -t "$SESSION" 2>/dev/null || true
tmux new-session -d -s "$SESSION" -x "$COLS" -y "$ROWS" -c "$REPO"
sleep 0.5

# Strip CI detection inside the pane, then exec the real launch command.
tmux send-keys -t "$SESSION" "unset $CI_VARS" Enter
sleep 0.3
tmux send-keys -t "$SESSION" "export APERANT_MODEL=$APERANT_MODEL" Enter
sleep 0.3
tmux send-keys -t "$SESSION" "cd $REPO && npm run dev -w @aperant/tui -- $PROJECT" Enter

echo "session=$SESSION project=$PROJECT geometry=${COLS}x${ROWS} model=$APERANT_MODEL"
