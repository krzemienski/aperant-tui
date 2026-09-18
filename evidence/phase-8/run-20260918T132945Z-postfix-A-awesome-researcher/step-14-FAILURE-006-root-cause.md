# FAILURE (preserved): task 006 planner — "Authentication failed: unauthorized" x3

Live run via TUI (navfix session), project /Users/nick/awesome-researcher.
Linked chain that DID work:
  roadmap feature -> `c` -> spec 006 on disk -> board task 006 -> `s` ->
  worktree auto-claude/006-... created (git worktree list confirms, sha e756dec)
  resolver: account=anthropic-mu6zlcfu provider=anthropic  (OmniRoute 20219)

Then planning failed. task_logs.json: 3x "Authentication failed: unauthorized",
no implementation_plan.json written -> CODING_FAILED. Work product = EMPTY.

## Root cause — proven by direct probe, NOT inferred
Same router, same credential:
  POST /v1/messages {"model":"cc/claude-sonnet-5"}  x-api-key  -> 200 OK
  POST /v1/messages {"model":"cc/claude-sonnet-5"}  Bearer     -> 200 OK
  POST /v1/messages {"model":"claude-sonnet-4-6"}   x-api-key  -> 401
     {"error":{"message":"No active credentials for provider: antigravity.",
               "type":"authentication_error","code":"invalid_api_key"}}

=> Credential and endpoint are CORRECT. The MODEL ID is wrong: the router
   requires its family prefix (cc/...), and the resolver sent a bare vendor id.

Manager log confirms the bare id reached the wire:
  "Resolved auth from provider queue: ... model=claude-sonnet-4-6"

Source of the bare id:
  ai/auth/resolver.ts:389        resolveModelEquivalent(requestedModel, provider, ...)
  shared/constants/models.ts:407 DEFAULT_MODEL_EQUIVALENCES hardcodes 'claude-sonnet-4-6'
  ai/client/factory.ts:243-285   existing D16 patch re-applies APERANT_MODEL for ITS path,
                                 but the task-execution planner path does not get it.

Status: fix dispatched (FixRouterModelId lane). This is NOT an auth/credential
defect and must not be "fixed" by changing credentials.
