# Vendored upstream: apps/desktop

`apps/desktop/` is a **byte-for-byte unmodified** snapshot of
[AndyMik90/Aperant](https://github.com/AndyMik90/Aperant), branch `develop`.

- Upstream HEAD at vendor time: `20250db069a849ab001ac6ab9e3e9779886ab9e2`
  (`2026-06-14 docs: communicate Aperant 3.0 rebuild and pause contributions`)
- TypeScript migration commit referenced by the spec: `75869f7e`
  (`2026-03-11 feat: migrate from Python Claude Agent SDK to Vercel AI SDK v6 (TypeScript) (#1891)`)
- Checksums: `apps/DESKTOP-SHA256SUMS.txt` (1288 files)

## The rule

The TUI **imports** `apps/desktop/src/main/**` and `apps/desktop/src/shared/**`.
It never modifies them. If a change seems needed in vendored code, the TUI
wraps or adapts in its own tree instead.

## Verify unmodified

```bash
cd apps/desktop
sha256sum -c ../DESKTOP-SHA256SUMS.txt   # all files: OK
```

## Re-sync from upstream

```bash
curl -sL https://codeload.github.com/AndyMik90/Aperant/tar.gz/refs/heads/develop | tar xz
rsync -a --delete Aperant-develop/apps/desktop/ apps/desktop/
cd apps/desktop && find . -type f | sort | xargs sha256sum > ../DESKTOP-SHA256SUMS.txt
```
