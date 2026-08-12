#!/usr/bin/env bash
# Moonshot provider LIVE E2E gate — three-facet evidence (UI + persistence + logs).
# agent-tty 0.5.0. Waits assert result.matched (envelope ok is transport-level).
# Creds via env only: MOONSHOT_GATE_KEY / MOONSHOT_GATE_BASE. Never written to the repo.
set -u
export PATH=$HOME/node24/bin:/tmp/agent-tty-install/node_modules/.bin:$PATH
ATTY="agent-tty --home ${AGENT_TTY_HOME:-/tmp/agent-tty-home}"
REPO="${APERANT_REPO:-/tmp/build/aperant-tui}"

TS=$(date -u +%Y%m%dT%H%M%S)
RUN=$REPO/evidence/phase-2/e2e-evidence/run-${TS}-moonshot-live-gate
mkdir -p "$RUN/logs"

MS_KEY="${MOONSHOT_GATE_KEY:?set MOONSHOT_GATE_KEY inline}"
MS_BASE="${MOONSHOT_GATE_BASE:?set MOONSHOT_GATE_BASE inline}"

FIX=/tmp/aperant-fixture
UD=/tmp/aperant-fixture-userdata
UDNEG=/tmp/aperant-fixture-userdata-neg
rm -rf "$UD" "$UDNEG"

FAILS=0
step() { echo "== step $1: $2"; }
sid() { python3 -c "import sys,json;print(json.load(sys.stdin)['result']['sessionId'])"; }

wait_assert() {
  local s="$1" text="$2" tmo="$3" out="$4" critical="${5:-}"
  $ATTY wait "$s" --text "$text" --timeout "$tmo" --json > "$out" 2>&1
  local matched
  matched=$(python3 -c "import json;d=json.load(open('$out'));print(d.get('result',{}).get('matched'))" 2>/dev/null || echo "PARSE_FAIL")
  if [ "$matched" = "True" ]; then
    echo "  WAIT-PASS: '$text'"
  else
    echo "  WAIT-FAIL: '$text' (matched=$matched)"
    FAILS=$((FAILS+1))
    if [ "$critical" = "critical" ]; then echo "CRITICAL WAIT FAILED — aborting run"; exit 1; fi
  fi
}

$ATTY doctor --json > "$RUN/step-00-doctor.json" 2>&1 || true

step 1 "negative provisioning (no creds env) → real refusal, nothing written"
SNEG=$($ATTY create --json --cols 110 --rows 32 --cwd "$FIX" \
  --env APERANT_USER_DATA=$UDNEG --env COLORTERM=truecolor \
  --env PATH=$HOME/node24/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
  --name moonshot-neg -- /bin/bash | sid)
echo "{\"session\":\"$SNEG\"}" > "$RUN/step-01-neg-session.json"
$ATTY run "$SNEG" "cd $REPO && script -qfc 'npm run dev -w @aperant/tui -- $FIX' $RUN/logs/tui-console-neg.raw.log" --no-wait --json > "$RUN/step-01b-neg-boot.json" 2>&1
wait_assert "$SNEG" "TASKS" 120000 "$RUN/step-01c-neg-boot-wait.json" critical
$ATTY send-keys "$SNEG" 6 --json > /dev/null 2>&1; sleep 2
wait_assert "$SNEG" "ACCOUNTS" 20000 "$RUN/step-01d-neg-settings.json"
$ATTY send-keys "$SNEG" a --json > /dev/null 2>&1; sleep 2
wait_assert "$SNEG" "no API key" 20000 "$RUN/step-01e-neg-refusal.json"
$ATTY screenshot "$SNEG" --json > "$RUN/step-01f-neg-shot.json" 2>&1 || true
if [ -f "$UDNEG/settings.json" ]; then
  python3 -c "import json;d=json.load(open('$UDNEG/settings.json'));assert not d.get('providerAccounts'), 'accounts must be empty'" \
    && echo "NEG-DISK-OK: settings.json exists but has no accounts" | tee "$RUN/step-01g-neg-disk.txt" \
    || { echo "NEG-DISK-FAIL: accounts were written" | tee "$RUN/step-01g-neg-disk.txt"; FAILS=$((FAILS+1)); }
else
  echo "NEG-DISK-OK: settings.json not created" | tee "$RUN/step-01g-neg-disk.txt"
fi
$ATTY send-keys "$SNEG" Ctrl+C --json > /dev/null 2>&1; sleep 1
$ATTY send-keys "$SNEG" Ctrl+C --json > /dev/null 2>&1; sleep 2
$ATTY destroy "$SNEG" --json > /dev/null 2>&1

step 2 "positive provisioning via TUI 'a' key (real endpoint creds via env)"
S1=$($ATTY create --json --cols 110 --rows 32 --cwd "$FIX" \
  --env APERANT_USER_DATA=$UD --env COLORTERM=truecolor \
  --env PATH=$HOME/node24/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
  --env MOONSHOT_API_KEY="$MS_KEY" --env MOONSHOT_BASE_URL="$MS_BASE" \
  --name moonshot-live -- /bin/bash | sid)
echo "{\"session\":\"$S1\"}" > "$RUN/step-02-session.json"
$ATTY run "$S1" "cd $REPO && script -qfc 'npm run dev -w @aperant/tui -- $FIX' $RUN/logs/tui-console.raw.log" --no-wait --json > "$RUN/step-02b-boot.json" 2>&1
wait_assert "$S1" "TASKS" 120000 "$RUN/step-02c-boot-wait.json" critical

step 3 "settings tab → 'a' provisions real account"
$ATTY send-keys "$S1" 6 --json > /dev/null 2>&1; sleep 2
wait_assert "$S1" "ACCOUNTS" 20000 "$RUN/step-03a-settings.json" critical
$ATTY send-keys "$S1" a --json > /dev/null 2>&1; sleep 3
wait_assert "$S1" "moonshot account" 20000 "$RUN/step-03b-provisioned.json"
$ATTY screenshot "$S1" --json > "$RUN/step-03c-shot.json" 2>&1 || true

step 4 "disk facet: settings.json account + priority queue (redacted copy)"
python3 - "$UD/settings.json" "$RUN/step-04-settings-redacted.json" > "$RUN/step-04-disk-assert.txt" 2>&1 <<'EOF'
import json, sys
src, out = sys.argv[1], sys.argv[2]
d = json.load(open(src))
accts = d.get("providerAccounts", [])
assert len(accts) == 1, f"expected 1 account, got {len(accts)}"
a = accts[0]
assert a["provider"] == "moonshot", a.get("provider")
assert a.get("apiKey"), "apiKey missing"
assert a.get("baseUrl", "").endswith("/v1"), a.get("baseUrl")
assert d.get("globalPriorityOrder", [None])[0] == a["id"], "account not first in priority queue"
redacted = json.loads(json.dumps(d))
redacted["providerAccounts"][0]["apiKey"] = a["apiKey"][:7] + "…REDACTED"
json.dump(redacted, open(out, "w"), indent=2)
print("DISK-OK: moonshot account persisted, priority-first, redacted copy saved")
EOF
grep -q "DISK-OK" "$RUN/step-04-disk-assert.txt" && echo "  DISK-PASS" || { echo "  DISK-FAIL"; cat "$RUN/step-04-disk-assert.txt"; FAILS=$((FAILS+1)); }

step 5 "board → s on queued 002 → REAL agent run against live Kimi endpoint"
git -C "$FIX" worktree list > "$RUN/step-05-worktrees-before.txt" 2>&1
$ATTY send-keys "$S1" 1 --json > /dev/null 2>&1; sleep 2
wait_assert "$S1" "Fix Terminal Blank" 20000 "$RUN/step-05a-board.json"
for i in 1 2 3 4 5; do $ATTY send-keys "$S1" k --json > /dev/null 2>&1; sleep 0.4; done
wait_assert "$S1" "001-migrate-provider-registry" 20000 "$RUN/step-05b-sel-001.json"
$ATTY send-keys "$S1" j --json > /dev/null 2>&1; sleep 1
wait_assert "$S1" "002-fix-terminal-blank" 20000 "$RUN/step-05c-sel-002.json"
$ATTY send-keys "$S1" s --json > /dev/null 2>&1
wait_assert "$S1" "agent started" 180000 "$RUN/step-05d-started.json"
$ATTY screenshot "$S1" --json > "$RUN/step-05e-shot.json" 2>&1 || true

step 6 "log facet: collect real agent stream evidence (up to 6 min)"
EVLOG="$UD/logs/agent-events.jsonl"
for i in $(seq 1 72); do
  if [ -f "$EVLOG" ] && grep -qE '"event":"(error|exit|sdk-rate-limit)"' "$EVLOG"; then break; fi
  if [ -f "$EVLOG" ]; then
    SEC=$(grep -c '"event":"stream-event"' "$EVLOG" 2>/dev/null || true)
    if [ "${SEC:-0}" -ge 15 ] 2>/dev/null; then break; fi
  fi
  sleep 5
done
sleep 5
[ -f "$EVLOG" ] && cp "$EVLOG" "$RUN/logs/agent-events.jsonl" || { echo "MISSING" > "$RUN/logs/agent-events.jsonl.MISSING"; FAILS=$((FAILS+1)); }
[ -f "$UD/logs/crash-report.log" ] && cp "$UD/logs/crash-report.log" "$RUN/logs/crash-report.log" || echo "no crash-report.log (clean)" > "$RUN/logs/crash-report.log.absent"
git -C "$FIX" worktree list > "$RUN/step-06-worktrees-after.txt" 2>&1 || true
# preserve the agent's real work product
(cd "$FIX" && git diff > "$RUN/agent-work-product.diff" 2>/dev/null; git status --short > "$RUN/agent-work-product.status.txt" 2>/dev/null)
[ -f "$FIX/.auto-claude/specs/002-fix-terminal-blank/task_logs.json" ] && cp "$FIX/.auto-claude/specs/002-fix-terminal-blank/task_logs.json" "$RUN/logs/task_logs.json" || true
$ATTY screenshot "$S1" --json > "$RUN/step-06-shot.json" 2>&1 || true

step 7 "event-log analysis (lifecycle + content assertions)"
python3 - "$RUN/logs/agent-events.jsonl" > "$RUN/step-07-log-analysis.txt" 2>&1 <<'EOF'
import json, sys, collections
path = sys.argv[1]
events = [json.loads(l) for l in open(path) if l.strip()]
counts = collections.Counter(e["event"] for e in events)
print("total events:", len(events))
for k, v in counts.most_common():
    print(f"  {k}: {v}")
assert counts.get("execution-progress", 0) >= 1, "no execution-progress — agent never started"
se = [e for e in events if e["event"] == "stream-event"]
kinds = collections.Counter()
for e in se:
    p = e.get("payload") or []
    if p and isinstance(p[0], dict):
        kinds[p[0].get("type", "?")] += 1
print("stream-event kinds:", dict(kinds))
te = [e for e in events if e["event"] == "task-event"]
print("task-events:", len(te), [(e.get("payload") or [{}])[0].get("type") if isinstance((e.get("payload") or [None])[0], dict) else "?" for e in te[:6]])
EOF
cat "$RUN/step-07-log-analysis.txt"

step 8 "graceful quit + recording export"
$ATTY send-keys "$S1" Ctrl+C --json > /dev/null 2>&1; sleep 1
$ATTY send-keys "$S1" Ctrl+C --json > /dev/null 2>&1; sleep 3
$ATTY snapshot "$S1" --format text --json > "$RUN/step-08-final-snapshot.json" 2>&1 || true
$ATTY record export "$S1" --format cast --json > "$RUN/step-08b-cast.json" 2>&1 || true
$ATTY destroy "$S1" --json > /dev/null 2>&1

step 8.5 "collect screenshot/cast artifacts into run dir"
for f in $(python3 - "$RUN" <<'EOF'
import json, glob, sys, os
run = sys.argv[1]
for p in sorted(glob.glob(os.path.join(run, "step-*.json"))):
    try:
        d = json.load(open(p))
        ap = (d.get("result") or {}).get("artifactPath")
        if ap and os.path.exists(ap):
            print(ap)
    except Exception:
        pass
EOF
); do cp "$f" "$RUN/" 2>/dev/null; done

step 9 "secret scan of evidence dir"
KEYPREFIX=$(echo "$MS_KEY" | cut -c1-12)
if grep -rF "$MS_KEY" "$RUN" > /dev/null 2>&1 || grep -rF "$KEYPREFIX" "$RUN" --include="*.json" --include="*.txt" --include="*.log" --include="*.jsonl" > /dev/null 2>&1; then
  echo "SECRET-SCAN-FAIL: key material found in evidence" | tee "$RUN/step-09-secret-scan.txt"; FAILS=$((FAILS+1))
else
  echo "SECRET-SCAN-OK: no key material in evidence dir" | tee "$RUN/step-09-secret-scan.txt"
fi

echo "GATE FAILS: $FAILS" | tee "$RUN/gate-verdict.txt"
echo "$RUN" > /tmp/moonshot-run-dir
echo "RUN DIR: $RUN"
