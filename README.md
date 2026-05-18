<p align="center">
  <img src="frontend/public/logo/dunecat-logo.png" alt="dunecat" width="420">
</p>

A local web app for browsing the DUNE metacat file catalog: pick a detector,
narrow datasets by tier / file type, look up runs, and run raw MQL queries —
all from a browser, against the production metacat server.

## Quick start

Requirements: Python 3.12+ with [`uv`](https://docs.astral.sh/uv/), Node.js 20+,
and a DUNE metacat / FNAL services account.

```bash
git clone git@github.com:czczc/dunecat.git
cd dunecat
uv sync
cd frontend && npm install && cd ..
cp .env.example .env       # then fill in METACAT_USER + RUCIO_ACCOUNT
uv run dunecat login       # browser opens for OIDC; once per ~10 days
```

Then in two terminals:

```bash
uv run uvicorn dunecat.web:app --port 8000     # backend
cd frontend && npm run dev                     # frontend (Vite on :5173)
```

Open <http://127.0.0.1:5173>. Use `127.0.0.1`, not `localhost` — macOS prefers
IPv6 while uvicorn binds IPv4 only. uvicorn is **not** run with `--reload` on
macOS (heavy file-watcher); restart it manually after backend changes.

## Details

- [`docs/auth.md`](docs/auth.md) — login variants, automatic token renewal,
  troubleshooting 401s. Read this if you hit any auth-related error in the
  UI.
- [`dunecat/README.md`](dunecat/README.md) — Python CLI that scripts the
  same operations from the terminal.

## Configuration files

- `dunecat/web/detectors.yaml` — detector → namespace map. Add an entry to
  surface a new detector; `chip: false` puts it behind the "More detectors…"
  dropdown instead of a top-level chip. Restart uvicorn for changes to take
  effect.
- `~/.dunecat/dunecat.db` — local SQLite cache (per-namespace dataset list,
  saved queries, condb run conditions, Rucio replicas with 1 h TTL). Safe
  to delete; rebuilt on next use.
- `~/.dunecat/rucio/etc/rucio.cfg` — see [`docs/auth.md`](docs/auth.md#rucio-config).

## Development

```bash
uv run pytest           # backend unit tests, no network
```

Unit tests mock `MetaCatClient` at the boundary. There are no integration
tests in CI; live verification is running the app against the production
server.
