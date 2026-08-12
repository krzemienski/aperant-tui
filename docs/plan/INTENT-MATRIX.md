# Session Intent Matrix — aperant-tui build (2026-08-11 → 2026-08-12)

Intent lane note (session-intent skill doctrine): no Claude Code JSONL
transcripts exist in this sandbox (`~/.claude/projects` absent — parser run
2026-08-12 reports NO TRANSCRIPTS; lane BLOCKED for pre-sandbox sessions).
The intent sources below are the operator's verbatim prompts preserved in the
active session context — the transcript-equivalent for this session.

| # | Intent source (verbatim, abbreviated) | Steering? | Implementation verdict |
|---|---|---|---|
| I1 | "attached is a spec and also an actual prototype I want you to build it fully with the skills as a test… a new GitHub repo… functional tests" | initial | INTENT-MATCHED — krzemienski/aperant-tui; phases 1, 2, 2.5, 3.5 gated |
| I2 | "functional gates that measure the real thing" | initial | INTENT-MATCHED — agent-tty end-user gates, three-facet evidence |
| I3 | "make any changes to any of the skills… at least five improvements after you have fully built and fully validated" | initial | INTENT-PARTIAL — defect harvest D1–D11 documented; skill replication owed after TUI completion |
| I4 | "make a proper github pagws static site with the same flat black hyper theme and brand with all docs" | steering | INTENT-MATCHED — krzemienski.github.io/aperant-tui |
| I5 | "You need logs, you need all the if not that you haven't actually proved anything. upgrade a agent SDK for javascript … and add a provider, which is the provider that you're currently using right now." | steering | INTENT-MATCHED — AI SDK v7, @aperant/moonshot-provider, live run, flight-recorder logs |
| I6 | "http://home.hack.ski:20128/v1 and api key of sk-… Is what os to be used not moonshot or atlwast use this" | steering | INTENT-MATCHED — account baseUrl targets the operator endpoint; kimi/kimi-for-coding model |
| I7 | "the understanding pf latest claude agent sdk for tsc is being done correctly" | steering | INTENT-MATCHED — vendored loop verified Vercel-AI-SDK-based (not claude-agent-sdk); v7 break caught live (D11 usage-shape) |
| I8 | "implement —auto —parallel" + observability spec + React prototype artifact | steering | INTENT-MATCHED — Phase 3.5 six views + event tap + onSubtaskQueued; gate 0-fail |
| I9 | "finish the above as well as finishjgn the propfpunk static site" | steering | INTENT-MATCHED — krzemienski.github.io/proofpunk (commit b6a91002) |
| I10 | "finjsh" (session-intent) | steering | this run — D11 token proof + docs + ledger |

Alignment signals: all rows share branch `main` of krzemienski/aperant-tui
(except I9 → krzemienski/proofpunk) and overlapping files per commit window.
