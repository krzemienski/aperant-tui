# Run config
- App name:               Aperant TUI
- Platform:               tui (user-declared; skill's auto-detect table has no TUI row.
                          Not web -- no DOM, agent-browser inapplicable.
                          Not iOS -- no .xcodeproj, simctl inapplicable.
                          Ink 5 + React 18 rendering to a PTY.)
- Driving tool:           tuistory (user-mandated; PTY sessions + snapshot + PNG capture)
- Mode:                   solo (8 views x ~6 interactions ~= 50; borderline, but the
                          simulator-equivalent -- the PTY session -- is an EXCLUSIVE
                          resource, so Phase 2/3 capture serializes regardless.
                          Team mode would add coordination cost for no parallel gain.)
- Threshold:              critical-high (skill's recommended default for release readiness;
                          user said "100 percent completed" which maps here or stricter.
                          Binding for the whole run.)
- Max cycles:             10
- Coverage axes:
  - Light mode:           not-supported (terminal inherits emulator theme; app has no theme switch)
  - Dark mode:            not-supported (same)
  - Mobile viewport:      n/a
  - Tablet viewport:      n/a
  - Desktop viewport:     yes (terminal geometry: 180x50 primary, 100x30 narrow)
  - State variants:       empty, populated, error, overflow, first-launch
- Backend:                none (no HTTP server; vendored agent runtime is in-process)
- Repomix output:         repomix-output.xml
- Degraded mode:          no (tuistory present and proven working)
- Started at:             2026-09-17T06:05:00Z
- Threshold relaxations:  none
