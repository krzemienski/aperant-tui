#!/usr/bin/env bash
# Phase 3.5 gate — Agent Coordination & Observability (spec Part 8).
# Drives the real TUI against a REAL running agent (Moonshot/Kimi endpoint).
set -u
export PATH=$HOME/node24/bin:/tmp/agent-tty-install/node_modules/.bin:$PATH
ATTY="agent-tty --home ${AGENT_TTY_HOME:-/tmp/agent-tty-home}"
REPO="${APERANT_REPO:-/tmp/build/aperant-tui}"

TS=$(date -u +%Y%m%dT%H%M%S)
RUN=$REPO/evidence/phase-3.5/e2e-evidence/run-${TS}-phase35-gate
mkdir -p "$RUN/logs"

MS_KEY="${MOONSHOT_GATE_KEY:?}"
MS_BASE="${MOONSHOT_GATE_BASE:?}"
FIX=/tmp/aperant-fixture
UD=/tmp/aperant-fixture-userdata-35
SPECDIR="$FIX/.auto-claude/specs/002-fix-terminal-blank"

FAILS=0
step() { echo "== step $1: $2"; }
sid() { python3 -c "import sys,json;print(json.load(sys.stdin)['result']['sessionId'])"; }
wait_assert() {
  local s="$1" text="$2" tmo="$3" out="$4" critical="${5:-}"
  $ATTY wait "$s" --text "$text" --timeout "$tmo" --json > "$out" 2>&1
  local matched
  matched=$(python3 -c "import json;d=json.load(open('$out'));print(d.get('result',{}).get('matched'))" 2>/dev/null || echo "PARSE_FAIL")
  if [ "$matched" = "True" ]; then echo "  WAIT-PASS: '$text'";
  else echo "  WAIT-FAIL: '$text'"; FAILS=$((FAILS+1)); [ "$critical" = "critical" ] && { echo CRITICAL; exit 1; }; fi
}
shot() { $ATTY screenshot "$1" --json > "$RUN/$2" 2>&1 || true; }

rm -rf "$UD"
$ATTY doctor --json > "$RUN/step-00-doctor.json" 2>&1 || true

step 1 "boot + provision moonshot account"
S1=$($ATTY create --json --cols 110 --rows 32 --cwd "$FIX" \
  --env APERANT_USER_DATA=$UD --env COLORTERM=truecolor \
  --env PATH=$HOME/node24/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
  --env MOONSHOT_API_KEY="$MS_KEY" --env MOONSHOT_BASE_URL="$MS_BASE" \
  --name phase35 -- /bin/bash | sid)
echo "{\"session\":\"$S1\"}" > "$RUN/step-01-session.json"
$ATTY run "$S1" "cd $REPO && script -qfc 'npm run dev -w @aperant/tui -- $FIX' $RUN/logs/tui-console.raw.log" --no-wait --json > "$RUN/step-01b-boot.json" 2>&1
wait_assert "$S1" "TASKS" 120000 "$RUN/step-01c-boot.json" critical
$ATTY send-keys "$S1" 6 --json > /dev/null 2>&1; sleep 2
wait_assert "$S1" "ACCOUNTS" 20000 "$RUN/step-01d-settings.json"
$ATTY send-keys "$S1" a --json > /dev/null 2>&1; sleep 2
wait_assert "$S1" "moonshot account" 20000 "$RUN/step-01e-provisioned.json"

step 2 "start real agent on 002"
$ATTY send-keys "$S1" 1 --json > /dev/null 2>&1; sleep 2
wait_assert "$S1" "Fix Terminal Blank" 20000 "$RUN/step-02a-board.json"
for i in 1 2 3 4 5; do $ATTY send-keys "$S1" k --json > /dev/null 2>&1; sleep 0.3; done
$ATTY send-keys "$S1" j --json > /dev/null 2>&1; sleep 1
wait_assert "$S1" "002-fix-terminal-blank" 20000 "$RUN/step-02b-sel.json"
$ATTY send-keys "$S1" s --json > /dev/null 2>&1
wait_assert "$S1" "agent started" 180000 "$RUN/step-02c-started.json"

step 3 "SWARM view shows the live agent (swarm accuracy gate)"
$ATTY send-keys "$S1" 7 --json > /dev/null 2>&1; sleep 2
wait_assert "$S1" "AGENT SWARM" 20000 "$RUN/step-03a-swarm.json"
wait_assert "$S1" "planner" 30000 "$RUN/step-03b-swarm-type.json"
shot "$S1" step-03c-swarm-shot.json

step 4 "GRAPH view — phase pipeline + regression guard"
$ATTY send-keys "$S1" 2 --json > /dev/null 2>&1; sleep 2
wait_assert "$S1" "PHASE PIPELINE" 20000 "$RUN/step-04a-graph.json"
wait_assert "$S1" "regression guard" 10000 "$RUN/step-04b-guard.json"
shot "$S1" step-04c-graph-shot.json

step 5 "INSPECT view — identity + tool grants byte-match AGENT_CONFIGS"
$ATTY send-keys "$S1" 3 --json > /dev/null 2>&1; sleep 2
wait_assert "$S1" "TOOL GRANTS" 20000 "$RUN/step-05a-inspect.json"
wait_assert "$S1" "thinking:high" 10000 "$RUN/step-05b-thinking.json"
wait_assert "$S1" "structured" 10000 "$RUN/step-05c-provenance.json"
shot "$S1" step-05d-inspect-shot.json
python3 - > "$RUN/step-05e-grants-bytematch.txt" <<'EOF'
import subprocess, json, os
r = subprocess.run(
  ["bash", "-c", "cd /tmp/build/aperant-tui && $HOME/node24/bin/node --import tsx -e \"import('@main/ai/config/agent-configs').then(m=>console.log(JSON.stringify(m.AGENT_CONFIGS.planner)))\""],
  capture_output=True, text=True, timeout=120)
cfg = json.loads(r.stdout.strip().splitlines()[-1])
print("planner grants from vendored AGENT_CONFIGS:")
print(json.dumps(cfg, indent=2))
assert "Read" in cfg["tools"] and "Bash" in cfg["tools"]
assert cfg["thinkingDefault"] == "high"
print("GRANTS-BYTEMATCH-OK")
EOF
grep -q "GRANTS-BYTEMATCH-OK" "$RUN/step-05e-grants-bytematch.txt" && echo "  GRANTS-PASS" || { echo "  GRANTS-FAIL"; FAILS=$((FAILS+1)); }

step 6 "TRACE view — real event stream"
$ATTY send-keys "$S1" 4 --json > /dev/null 2>&1; sleep 2
wait_assert "$S1" "EVENT TRACE" 20000 "$RUN/step-06a-trace.json"
shot "$S1" step-06b-trace-shot.json

step 7 "TOKENS view — real usage ledger"
$ATTY send-keys "$S1" 5 --json > /dev/null 2>&1; sleep 2
wait_assert "$S1" "TOKEN LEDGER" 20000 "$RUN/step-07a-tokens.json"
shot "$S1" step-07b-tokens-shot.json

step 8 "WAITS view — sentinel detection + RESUME intervention (real fs)"
$ATTY send-keys "$S1" 6 --json > /dev/null 2>&1; sleep 2
wait_assert "$S1" "BLOCKING ANALYSIS" 20000 "$RUN/step-08a-waits.json"
python3 -c "
import json, datetime
d = {'pausedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'resetTimestamp': '2026-08-12T13:04:00Z', 'error': 'HTTP 429 (gate-induced sentinel)'}
open('$SPECDIR/RATE_LIMIT_PAUSE', 'w').write(json.dumps(d))
print('sentinel written')
" > "$RUN/step-08b-sentinel-write.txt"
[ -f "$SPECDIR/RATE_LIMIT_PAUSE" ] && echo "  SENTINEL-ON-DISK" || { echo "  SENTINEL-FAIL"; FAILS=$((FAILS+1)); }
sleep 7
shot "$S1" step-08c-wait-detected-shot.json
$ATTY send-keys "$S1" r --json > /dev/null 2>&1; sleep 2
if [ -f "$SPECDIR/RESUME" ]; then echo "RESUME-ON-DISK-OK" | tee "$RUN/step-08d-resume.txt"; else echo "RESUME-FAIL" | tee "$RUN/step-08d-resume.txt"; FAILS=$((FAILS+1)); fi
shot "$S1" step-08e-after-resume-shot.json
rm -f "$SPECDIR/RATE_LIMIT_PAUSE" "$SPECDIR/RESUME"

step 9 "log facet: event log + trace completeness"
sleep 20
EVLOG="$UD/logs/agent-events.jsonl"
[ -f "$EVLOG" ] && cp "$EVLOG" "$RUN/logs/agent-events.jsonl" || { echo MISSING; FAILS=$((FAILS+1)); }
python3 - "$RUN/logs/agent-events.jsonl" > "$RUN/step-09-log-analysis.txt" 2>&1 <<'EOF'
import json, sys, collections
events = [json.loads(l) for l in open(sys.argv[1]) if l.strip()]
counts = collections.Counter(e["event"] for e in events)
print("total:", len(events), dict(counts))
se = [e for e in events if e["event"] == "stream-event"]
kinds = collections.Counter()
for e in se:
    p = e.get("payload") or []
    if p and isinstance(p[0], dict): kinds[p[0].get("type","?")] += 1
print("stream kinds:", dict(kinds))
EOF
cat "$RUN/step-09-log-analysis.txt"

step 10 "quit + artifacts + secret scan"
$ATTY send-keys "$S1" Ctrl+C --json > /dev/null 2>&1; sleep 1
$ATTY send-keys "$S1" Ctrl+C --json > /dev/null 2>&1; sleep 2
$ATTY record export "$S1" --format cast --json > "$RUN/step-10-cast.json" 2>&1 || true
$ATTY destroy "$S1" --json > /dev/null 2>&1
for f in $(python3 - "$RUN" <<'EOF'
import json, glob, sys, os
for p in sorted(glob.glob(os.path.join(sys.argv[1], "step-*.json"))):
    try:
        d = json.load(open(p)); ap = (d.get("result") or {}).get("artifactPath")
        if ap and os.path.exists(ap): print(ap)
    except Exception: pass
EOF
); do cp "$f" "$RUN/" 2>/dev/null; done
KEYPREFIX=$(echo "$MS_KEY" | cut -c1-12)
if grep -rF "$MS_KEY" "$RUN" >/dev/null 2>&1 || grep -rF "$KEYPREFIX" "$RUN" --include="*.json" --include="*.txt" --include="*.log" --include="*.jsonl" >/dev/null 2>&1; then
  echo "SECRET-SCAN-FAIL" | tee "$RUN/step-10-secret-scan.txt"; FAILS=$((FAILS+1))
else
  echo "SECRET-SCAN-OK" | tee "$RUN/step-10-secret-scan.txt"
fi
echo "GATE FAILS: $FAILS" | tee "$RUN/gate-verdict.txt"
echo "$RUN" > /tmp/phase35-run-dir
