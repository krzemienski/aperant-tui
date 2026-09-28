# Remote verification — what is actually published on GitHub

`git status` says 'up to date with origin', but that only compares against a
cached ref. This checks the REMOTE itself after a fresh fetch.

  local HEAD    = 3c289936a070f01ac71f98275236896168ead430
  origin/main   = 3c289936a070f01ac71f98275236896168ead430   MATCH
  commits pushed this run (a96ff53..origin/main) = 16
  evidence files present in the remote tree      = 136

Key artifacts as stored on the remote (git cat-file -s against origin/main):
  agent-events.jsonl      2,390,904 bytes
  console.log               208,771 bytes
  settings-redacted.json      1,125 bytes
  drive-transcript.md         3,365 bytes

settings-redacted.json read back FROM THE REMOTE:
  ANTHROPIC_BASE_URL   = https://router.hack.ski
  APERANT_MODEL        = cc/claude-opus-5
  ANTHROPIC_AUTH_TOKEN = <REDACTED-from-env-at-runtime>
  both providerAccounts apiKey = <REDACTED-from-env-at-runtime>

Credential check against the PUBLISHED tree, not the working copy:
  git grep -F "$ANTHROPIC_AUTH_TOKEN" origin/main -- evidence/  ->  0 hits

So the operator's live token is absent from what is actually on GitHub, and
the router/model discipline is visible in the published artifact.
