# Authentication

dunecat talks to two DUNE services that authenticate independently:

- **Metacat** — the file catalog. Server at `metacat.fnal.gov:8143/auth/dune`.
- **Rucio** — file-replica lookups. Server at `dune-rucio.fnal.gov`.

Both accept an OIDC bearer token minted from a 10-day Fermilab vault
refresh, so a single `dunecat login` sets up both. The web server keeps
the credentials fresh in the background so you rarely have to think
about it.

## One-time setup

In `.env`:

```
METACAT_USER=<your DUNE / FNAL services username>
RUCIO_ACCOUNT=<your FNAL Rucio account, usually the same>
BEARER_TOKEN_FILE=/tmp/bt_u<your-uid>
```

`<your-uid>` is what `id -u` prints. The default `/tmp/bt_u<uid>` is what
`htgettoken` writes by convention; you only need to change it if you've
set the var elsewhere.

## Daily flow

```bash
uv run dunecat login
```

Runs two steps:

1. `htgettoken --vaulttokenttl=10d --vaultserver=htvaultprod.fnal.gov --issuer=dune`
   — OIDC device flow opens a browser the first time per ~10 days. Quiet
   afterwards.
2. `metacat auth login -m token <user>` — exchanges the OIDC bearer for a
   metacat session.

Both credentials are then on disk:

- `/tmp/bt_u<uid>` — OIDC bearer JWT. ~3 h lifetime (server-controlled).
  Carries the cilogon `iss` claim.
- `~/.token_library` — metacat session JWT. Clamped to the bearer's exp,
  so up to ~3 h.

## Server-side renewal

When the dunecat web server is running, it keeps the in-memory expiries
for both credentials cached. Before each metacat or Rucio call:

- If a credential is within ~5 min (or 10 % of its lifetime, whichever
  is smaller) of expiry, the server shells out to `htgettoken` and/or
  `metacat auth login -m token` under a mutex. Subprocess timeout is
  5 s; renewals run sub-second when the vault is alive.
- If the renewal fails the request returns 401 with the verbatim
  remediation copy (see below).

This means you can leave a dunecat tab open all day and never hit a
`Token missing or expired` error — as long as you re-ran `dunecat login`
in the last ~10 days.

## Login variants

```bash
uv run dunecat login                             # default: both legs (OIDC)
uv run dunecat login rucio                       # htgettoken only
uv run dunecat login metacat                     # metacat only (uses existing bearer)
uv run dunecat login metacat --method password   # legacy fallback
```

The password fallback exists for cases where the OIDC pipeline misbehaves
server-side. Set `METACAT_AUTH_METHOD=password` in `.env` if you want
the explicit `dunecat login metacat` to default to password.

## 401 messages you might see

When the UI surfaces an auth error, it usually tells you exactly which
command to run:

- **`Vault token expired. Run: uv run dunecat login (browser).`** — your
  10-day vault refresh token rolled. One browser device-code flow renews
  it. The server can't drive a browser from a uvicorn process, so this
  is the one case that needs your terminal.
- **`Metacat refused OIDC bearer: …`** — metacat rejected the JWT. Either
  your IAM account isn't yet provisioned in metacat, or there's a
  server-side issuer/audience mismatch. Fall back to
  `uv run dunecat login metacat --method password` while operators sort
  it out.
- **`Auth renewal failed: htgettoken timed out; retry later.`** —
  transient network blip reaching the vault server. Reload the page.

## Rucio config

`~/.dunecat/rucio/etc/rucio.cfg` is auto-generated from your `.env`
values the first time the server makes a Rucio call. A symlink at
`<venv>/etc/rucio.cfg` lets the bare `rucio` CLI find it from the same
venv without needing `RUCIO_HOME` exported. Delete the file to
regenerate from the current `.env`.

## Why two credentials, one identity?

The OIDC bearer is your *identity* — it says "I am the holder of this
DUNE IAM account, valid until time X." Rucio reads it on every request.

The metacat session is a *server-issued credential* derived from that
bearer at login time. Metacat predates OIDC and keeps the older
session-token model; `-m token` is the bridge that accepts an OIDC
bearer as proof of identity for the initial handshake. After that, the
metacat client sends the session token, not the bearer.

The metacat session inherits the bearer's expiry as a security measure
— a derived session can't outlive what authenticated its creation.
