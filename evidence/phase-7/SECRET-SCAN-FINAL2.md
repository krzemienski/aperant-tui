# Secret Scan — final2

Scope: every file created since the last scan, across seven evidence
directories under `evidence/phase-7/`:
`p26-verify/`, `p26-progress/`, `p3511-live/`, `p3511-scope/`,
`subagent-proof/`, `subagent-proof-v2/`, `final-gates/`.

**Total files scanned: 122** (102 text-ish files — `.md`/`.json`/`.log`/
`.txt` — read and pattern-matched; 20 `.png` binaries excluded from
content regex matching but checked by filename and via their paired
`.txt` sidecars, which capture the exact terminal text at shutter time).

Per-directory file counts: `p26-verify` 20, `p26-progress` 14,
`p3511-live` 17, `p3511-scope` 1, `subagent-proof` 25, `subagent-proof-v2`
38, `final-gates` 7.

**Verdict: CLEAN. Zero real secrets found.** 46 raw pattern hits, all
independently verified benign; 25 occurrences of a non-secret local
account identifier, also benign.

## Method

Ten regex patterns run against every text-ish file's full content
(`sk-ant-…`, generic `sk-…`, `Bearer …`, AWS access-key IDs, generic
`key/secret/token/password/auth:` key-value pairs, PEM private-key
headers, 40+ char hex strings, JWTs, `kimi_chat_id`, and literal
`ANTHROPIC_AUTH_TOKEN=`/`OPENAI_API_KEY=`/`MOONSHOT_API_KEY=` assignments)
— a broader pattern set than the single-pattern check used live during
each drive, run now as an independent post-hoc audit. Also full-text
searched for the literal current `ANTHROPIC_AUTH_TOKEN` env value.
Separately grepped for URLs/hostnames/router endpoints, raw
`apiKey`/`Authorization`/`x-api-key` occurrences, and the local account
identifier observed live during both subagent drives.

## Raw hits by category

| Pattern | Hits | Real secret? |
|---|---|---|
| `anthropic_sk` (`sk-ant-…`) | 0 | — |
| `generic_sk` (`sk-…`, 20+ chars) | 0 | — |
| `bearer` | 0 | — |
| `aws_akid` | 0 | — |
| `generic_apikey_kv` | 0 | — |
| `private_key_block` | 0 | — |
| `jwt` | 0 | — |
| `kimi_chat_id` | 0 | — |
| `generic_env_secret_assign` | 0 | — |
| full `ANTHROPIC_AUTH_TOKEN` value | 0 | — |
| **`long_hex_40plus`** (40+ hex chars) | **46** | **No — see below** |

## `long_hex_40plus` — all 46 hits classified

Every hit is one of two benign, expected content classes: SHA-256 file
digests published in integrity manifests (64 hex chars) or `git`
commit/HEAD hashes (40 hex chars). None are cryptographic secrets,
API keys, or credentials.

**Sample verification** (re-computed independently, not trusted from the
document's own claim):

| File | Claimed SHA-256 | Independently recomputed | Match |
|---|---|---|---|
| `subagent-proof-v2/work-product/spec.md` | `0136552f…7282a` | `0136552f…7282a` | ✓ |
| `subagent-proof-v2/captures/step-01-graph-two-completed-children.png` | `dcd4b784…3d96` | `dcd4b784…3d96` | ✓ |
| `subagent-proof/work-product/task_logs.json` | `b4c4e49f…3935` | `b4c4e49f…3935` | ✓ |

**Distribution by file:**

| File | Hits | Content |
|---|---|---|
| `p26-verify/P2.6-LIVE-VERIFY.md` | 2 | screenshot SHA-256 in evidence table |
| `p26-progress/P2.6-NUMERIC.md` | 5 | screenshot SHA-256 in capture table |
| `p3511-live/P3.5.11-LIVE.md` | 6 | bundle + screenshot SHA-256 |
| `subagent-proof/SUBAGENT-PROOF.md` | 15 | work-product + gate + bundle SHA-256 |
| `subagent-proof-v2/SUBAGENT-PROOF-V2.md` | 16 | work-product + capture + gate + bundle SHA-256 |
| `final-gates/git-head-before.txt` | 1 | `git rev-parse HEAD` (`20a7e9b9…af54`) |
| `final-gates/git-head-after.txt` | 1 | `git rev-parse HEAD` (`20a7e9b9…af54`) |

All context-verified: every 64-char hit sits immediately adjacent to the
literal string `sha256`/`SHA-256` and a file name/size; every 40-char hit
is the full content of a `git-head-*.txt` file this session wrote
deliberately. None decode to, resemble, or are used as bearer credentials
anywhere in these documents.

## Non-regex checks (targeted, per operator instruction)

**Router URL / hostname.** Zero occurrences of `http://`, `https://`, the
literal router address, or port `20128` anywhere across the seven
directories' text files — the router config was passed via `tuistory
launch --env` at process-spawn time and never echoed into any captured
artifact.

**`apiKey`/`Authorization`/`x-api-key` string.** One match family, all in
`p3511-live/gate-typecheck-desktop.log` — pre-existing TypeScript compiler
error text quoting parameter *type signatures* (`apiKey: string` as part
of an `IPCResult<...>` type mismatch message), not a key value. Benign.

**Local account identifier `anthropic-mu4v0hti`.** 25 occurrences across
25 files, all of the form `[AgentManager] Resolved auth from provider
queue: account=anthropic-mu4v0hti provider=anthropic model=glm/glm-5` —
this is the vendored `AgentManager`'s own diagnostic log line
(`agent-manager.ts:207`), and `accountId` is a locally-minted, opaque
database key for the operator's own account-management UI (per
`resolver.ts:422`, `types.ts:122`; cf. F-18's `mintAccountId()` helper) —
never the API key itself, which is fetched separately and never logged by
this code path. Functionally equivalent to a username, not a secret;
knowing it grants no access to anything.

## Work-product files — the flagged highest-risk surface

Both `subagent-proof/work-product/` (7 files) and
`subagent-proof-v2/work-product/` (10 files) were copied verbatim out of
a real project (`proofpunk-agent`) and scanned with the same full pattern
set plus the targeted URL/apiKey/account-id checks above. Zero secret
hits in either directory. The only sensitive-*looking* content is
absolute local filesystem paths (`/Users/nick/proofpunk-agent/...`) and
the account identifier discussed above — both informational, neither a
credential. `task_logs.json` in both directories (114KB and 125KB
respectively) was read in full, not sampled, given its size and role as
the primary disk-backed evidence source for the execution-reading PASS
verdict.

## Conclusion

122 files scanned across all seven directories. Zero real secrets. All
flagged patterns are integrity-manifest SHA-256 digests, git commit
hashes, or a non-secret local account identifier — every one
independently verified against its producing context, not accepted on
the document's own claim.
