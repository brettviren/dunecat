<p align="center">
  <img src="frontend/public/logo/dunecat-logo.png" alt="dunecat" width="420">
</p>

A local web app for browsing the DUNE metacat file catalog: pick a detector,
narrow datasets by tier / file type, look up runs, and run raw MQL queries —
all from a browser, against the production metacat server.

A Python CLI ships alongside for scripting the same operations from the
terminal; see [`dunecat/README.md`](dunecat/README.md) for that.

## Requirements

- Python 3.12+ and [`uv`](https://docs.astral.sh/uv/)
- Node.js 20+ and `npm`
- A DUNE metacat account

## Install

```bash
git clone git@github.com:czczc/dunecat.git
cd dunecat
uv sync                 # backend deps + the dunecat CLI
cd frontend && npm install && cd ..   # frontend deps (first time only)
```

## Configure

```bash
cp .env.example .env
```

`.env` defaults to the production DUNE instance. Fill in your DUNE username
and preferred auth method:

```
METACAT_SERVER_URL=https://metacat.fnal.gov:9443/dune_meta_prod/app
METACAT_AUTH_SERVER_URL=https://metacat.fnal.gov:8143/auth/dune
METACAT_USER=<your-username>
RUCIO_ACCOUNT=<your FNAL Rucio account, usually your username>
BEARER_TOKEN_FILE=/tmp/bt_u<your-uid>      # default htgettoken path
```

## Authenticate

One command logs you into both metacat and Rucio:

```bash
uv run dunecat login
```

This runs `htgettoken --issuer=dune` (the OIDC device-code flow, browser
opens the first time per ~10 days) followed by `metacat auth login -m
token`, which exchanges the OIDC bearer for a metacat session. The web
server then keeps both credentials fresh automatically — it re-mints the
bearer and the metacat session in the background when they get within a
few minutes of expiry. You only need to re-run `dunecat login` when the
10-day vault refresh token rolls (or after a reboot that wipes `/tmp`).

### Other login variants

```bash
uv run dunecat login rucio                       # htgettoken only
uv run dunecat login metacat                     # metacat only (uses existing bearer)
uv run dunecat login metacat --method password   # legacy fallback
```

The password fallback exists for the rare case the OIDC pipeline misbehaves
(e.g. your IAM account isn't provisioned in metacat yet). Add
`METACAT_AUTH_METHOD=password` to `.env` if you want password to be the
default for the metacat leg.

When `/api/*` returns 401, the message in the UI tells you which command
to run. Common cases:

- `Vault token expired. Run: uv run dunecat login` — your 10-day vault
  refresh rolled over; one browser login renews it.
- `Metacat refused OIDC bearer: …` — server-side OIDC config drift; fall
  back to `--method password` while the operators sort it out.

The Rucio config at `~/.dunecat/rucio/etc/rucio.cfg` is generated from
`.env` on first use; a symlink at `<venv>/etc/rucio.cfg` lets the bare
`rucio` CLI find it without `RUCIO_HOME` exported.

## Run the web app

Two terminals — `uvicorn` is **not** run with `--reload` (the macOS file-watcher
is CPU-heavy); restart manually after backend code changes.

```bash
# Terminal 1 — backend (FastAPI on :8000)
uv run uvicorn dunecat.web:app --port 8000

# Terminal 2 — frontend (Vite dev server on :5173)
cd frontend
npm run dev
```

Open <http://127.0.0.1:5173>. Use `127.0.0.1`, not `localhost` — macOS prefers
IPv6 for `localhost` while uvicorn binds IPv4 only.

The frontend proxies `/api/*` to the backend; switching detectors, dataset
metadata, file lineage, run lookups, and saved MQL queries all live in the UI.

## CLI

```bash
uv run dunecat dataset list 'hd-protodune-det-reco:*cosmic*'
```

Full command reference: [`dunecat/README.md`](dunecat/README.md).

## Development

```bash
uv run pytest           # backend unit tests, no network
```

Unit tests mock `MetaCatClient` at the boundary. There are no integration tests
in CI; live verification is running the app against the production server.

## Configuration files

- `dunecat/web/detectors.yaml` — detector → namespace map. Add a detector by
  appending an entry; restart uvicorn for changes to take effect.
- `~/.dunecat/dunecat.db` — local SQLite cache (per-namespace dataset list and
  saved queries, condb run conditions, Rucio replicas with 1 h TTL). Safe to
  delete; the app will rebuild on next use.
- `~/.dunecat/rucio/etc/rucio.cfg` — auto-generated from your `.env` values
  the first time the server makes a Rucio call. Delete to regenerate from
  current `.env`.
