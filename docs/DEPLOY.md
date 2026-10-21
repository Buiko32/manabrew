# Deployment Guide

These are operator notes for deploying the manabrew web client and parity
dashboard. They are not required for local development.

## Internal Web Deployment (Twingate + SSO)

For the browser/WASM client, the critical requirement is not public internet exposure, it is preserving cross-origin isolation through every proxy layer. The web game worker uses `SharedArrayBuffer`, so the final browser response must include:

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

If your Twingate or SSO layer strips or overrides those headers, browser gameplay will fail even if the app shell loads.

### Internal alpha checklist

- Build and publish with `yarn build:web`
- Serve `dist/` as a static site
- Ensure the final HTML, JS worker, and WASM responses preserve `COOP` and `COEP`
- Verify the app is loaded from a single origin
- Confirm `/wasm/cards-bundle.json` and `/wasm/preset-decks.json` are reachable through the same internal path

### Verify in browser

Open DevTools on the deployed site and check:

```js
window.crossOriginIsolated;
typeof SharedArrayBuffer !== "undefined";
```

Expected result:

- `window.crossOriginIsolated === true`
- `SharedArrayBuffer` is available

The app now also emits a toast and console error when this is misconfigured.

### Verify at the edge

Check the final response headers after Twingate/SSO, not just the origin server:

```bash
curl -I https://<internal-host>/
curl -I https://<internal-host>/assets/game-engine.worker-<hash>.js
curl -I https://<internal-host>/assets/wasm_bg-<hash>.wasm
```

You should see:

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

### Nginx example

```nginx
location / {
  add_header Cross-Origin-Opener-Policy same-origin always;
  add_header Cross-Origin-Embedder-Policy require-corp always;
  try_files $uri /index.html;
}
```

### Caddy example

```caddy
header {
  Cross-Origin-Opener-Policy same-origin
  Cross-Origin-Embedder-Policy require-corp
}
```

### Current internal-scope caveats

- The browser card bundle currently covers preset-deck cards, not the full Forge card pool
- The generated bundle still reports two missing preset scripts: `Thrum of the Vestige` and `Leonardo, Big Brother`
- The web path is not offline-capable today
- Scryfall metadata/images are fetched by the browser directly from Scryfall or the asset bucket. Never put a proxy in front of image data; see `src/AGENTS.md`.

## Prerequisites

- Docker + Docker Compose (with BuildKit support)
- Git
- SSH access to the server from GitHub Actions (see Auto-Deploy section)

## Self-hosted web image from this fork

The `Self-hosted web image` workflow checks out the selected fork revision,
builds `Dockerfile.web` and its Forge WebImage engine, smoke-tests the
candidate, then promotes the tested candidate to
`ghcr.io/buiko32/manabrew-web:selfhosted`. It runs on pushes to `main` and can
be started manually from Actions. It publishes an image but does not update a
Compose deployment; pull and recreate the web service separately. Pull
requests do not publish or promote an image.

The workflow leaves `VITE_SCRYFALL_ASSET_BASE` empty and sets
`VITE_SCRYFALL_SYMBOL_BASE=/scryfall-symbols/`. Its smoke test checks the
isolation header, compiled symbol path, absence of an R2 asset path, and the
same-origin white mana SVG endpoint. Candidates are tagged with the source
commit and `IMAGE_CONFIG_VERSION`; change that workflow value when the image
configuration changes. If building locally, prepare the Forge WebImage files
before Docker so the image cannot silently omit its browser engine:

```sh
git submodule update --init --recursive
export WEBIMAGE_GRAALVM_HOME=/path/to/oracle-graalvm-25.1-or-newer
export PATH="$WEBIMAGE_GRAALVM_HOME/bin:$PATH"
wasm-as --version
corepack enable
yarn install --frozen-lockfile
yarn build:forge-wasm
test -s packages/forge-wasm/forgeharness.js
test -s packages/forge-wasm/forgeharness.js.wasm
docker build -f Dockerfile.web \
  --build-arg REQUIRE_FORGE_WASM=1 \
  --build-arg VITE_SCRYFALL_SYMBOL_BASE=/scryfall-symbols/ \
  --build-arg VITE_SCRYFALL_ASSET_BASE= \
  -t manabrew-web:local .
```

The Forge build needs Node.js 24 with Corepack, Java 18+, Maven, Rust/Cargo,
Oracle GraalVM 25.1+ with Web Image, and Binaryen (`wasm-as`) on `PATH`.
Configure the web container's runtime relay values for the host that serves
the site: `RELAY_HOST`, `RELAY_PORT=443`, and `RELAY_PASSWORD` matching the
relay's server key. Set `HOSTED_AI_ENABLED=true` only when a hosted engine node
is available; start the node with the `hosted-ai` Compose profile and configure
`SELF_HOSTED_NODE_FORMAT=any` and `SELF_HOSTED_NODE_HOST_PLAYS=false` for
hosted AI rooms. Keep these environment values in the host's secret store or
an untracked `.env` file, never in this guide or a committed Compose override.

The published image is `ghcr.io/buiko32/manabrew-web:selfhosted`. Make its
GitHub Container Registry package public for unauthenticated pulls, or
configure the deployment host with `read:packages` access. In the existing
Compose override, change only the web service's image reference, then pull and
recreate that service without restarting the relay. For this repository's
`compose.production.yml`, save a one-service override as
`compose.selfhosted-local.yml` with:

```yaml
services:
  manabrew:
    image: ghcr.io/buiko32/manabrew-web:selfhosted
```

Pull and recreate only the web service with both files:

```sh
docker compose -f compose.production.yml -f compose.selfhosted-local.yml pull manabrew
docker compose -f compose.production.yml -f compose.selfhosted-local.yml up -d --no-deps manabrew
```

Keep the base Compose file unchanged for rollback; pull and recreate from it
alone to restore the upstream image:

```sh
docker compose -f compose.production.yml pull manabrew
docker compose -f compose.production.yml up -d --no-deps manabrew
```

The web image currently targets `linux/amd64`. Check the server architecture
before switching; ARM requires a native ARM runner and a separate build setup.

## Initial Server Setup

### 1. Clone the repo

```bash
cd ~
git clone git@github.com:<org>/<repo>.git manabrew
cd manabrew
```

### 2. Create a `.env` file

```bash
cp manabrew-rs/crates/manabrew-server/.env.example .env  # or create manually
```

Add your keys:

```env
ANALYZE=1
ANTHROPIC_API_KEY=sk-ant-...
# Or use local LLM:
# OPENAI_API_BASE=http://localhost:8190/v1
# OPENAI_MODEL=qwen3-14b
# OPENAI_API_KEY=not-needed
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
GITHUB_TOKEN=ghp_...          # PAT with `repo` scope — used by the GitHub REST API to create parity issues
GITHUB_REPO=<org>/<repo>
```

### 3. Create preset decks directory

```bash
mkdir -p public/preset_decks/
```

### 4. First build & run

```bash
export DOCKER_BUILDKIT=1
docker compose -f manabrew-rs/crates/manabrew-server/compose.yml build parity-dashboard
docker compose -f manabrew-rs/crates/manabrew-server/compose.yml up -d parity-dashboard
```

Dashboard will be at `http://<server-ip>:8080`.

## Auto-Deploy with GitHub Actions

Every release tag (pushed by the **Release** workflow's `cargo xtask release`
on merges to `main`) triggers **Publish**
(`.github/workflows/publish.yml`): it builds the Tauri installers
(`.dmg` / `.exe` / `.msi`), attaches them plus the updater manifests
(`tauri.json`, `manifest.json`) to the GitHub Release, and its deploy jobs
run `cargo xtask deploy` FROM THE RUNNER at the tag checkout: rsync the
tracked config to the box, pull this release's ghcr images, reconcile with
docker compose (health-checked, redeploying the previous tag on failure),
and post a success/failure embed to the community Discord channel. The box
holds no deploy scripts and its git checkout is never consulted, so config
and images always come from the same commit. The full deploy runs last so
the live site never references release assets that don't exist yet. Plain
`main` commits do not deploy.

### 1. Generate an SSH keypair for the deploy

On any local machine:

```bash
ssh-keygen -t ed25519 -C "manabrew-deploy" -f ~/.ssh/manabrew_deploy -N ""
```

On the **server**, append the **public** half to the deploy user's
`authorized_keys`:

```bash
# (run on the server as the user who owns ~/manabrew)
mkdir -p ~/.ssh && chmod 700 ~/.ssh
cat >> ~/.ssh/authorized_keys < ~/.ssh/manabrew_deploy.pub   # paste here, then Ctrl-D
chmod 600 ~/.ssh/authorized_keys
```

### 2. Box prerequisites

The box needs docker + compose, the data dirs under `<DEPLOY_PATH>` (ops/
hub-data, ops/observability/data), and the `.env` with the compose secrets.
It does NOT need a usable git checkout: `xtask deploy` rsyncs the tracked
config files (compose.production.yml, ops/, scripts/ingest-events.py) at the
release tag before every rollout, and never runs git on the box.

### 3. Prep the Discord bot

Use the bot you've already added to the community server.

1. Grab the **bot token**: [Discord Developer Portal](https://discord.com/developers/applications) → your application → **Bot** → **Reset Token** (if you don't have it saved). Treat this like a password.
2. Enable **Developer Mode** in Discord: **User Settings → Advanced → Developer Mode**.
3. Right-click the channel that should receive deploy notifications → **Copy Channel ID**.
4. Make sure the bot's role has **Send Messages** and **Embed Links** on that channel (**Channel → Edit Channel → Permissions**).

### 4. Add the repo secrets

GitHub repo → **Settings → Secrets and variables → Actions → New repository
secret**. Add:

| Secret                      | Value                                                          |
| --------------------------- | -------------------------------------------------------------- |
| `DEPLOY_HOST`               | Server hostname or IP                                          |
| `DEPLOY_USER`               | Login user (the one who owns the deploy clone)                 |
| `DEPLOY_PATH`               | Absolute path to the repo on the server (e.g. `/opt/manabrew`) |
| `DEPLOY_SSH_KEY`            | Contents of the **private** key (`~/.ssh/manabrew_deploy`)     |
| `DISCORD_BOT_TOKEN`         | Bot token from the Developer Portal                            |
| `DISCORD_DEPLOY_CHANNEL_ID` | ID of the channel that should receive deploy embeds            |

### 5. Remove the old GitHub webhook (if any)

GitHub repo → **Settings → Webhooks**. Delete any entry pointing at the old
n8n endpoint (`/webhook/github-deploy`).

### 6. Test it

The pipeline only runs on release tags, so exercise it end to end: merge any
change to `main`, let the **Release** workflow tag it, and watch the resulting
**Publish** run's final `deploy` job.

Verify:

- The workflow's `Deploy production (xtask, from the runner)` step is green.
- The configured Discord channel receives a green "🚀 Wasm deploy successful" embed posted by your bot.
- `docker compose -f compose.production.yml ps` on the server (or the dev
  compose path, if that's what `$COMPOSE_FILE` points to) shows the expected
  containers as `Up`.

## Manual Deploy

From any machine with SSH access to the box (the runner does exactly this).
No Rust toolchain? Every release attaches the tool prebuilt
(`manabrew-xtask-linux-x86_64`, static musl) — an **evergreen** binary: it
fetches the deployed ref's config from GitHub at run time (codeload
tarball, tracked files only), so one download deploys any release and
needs **no checkout and no git** — just ssh, rsync, curl and tar on the
machine. Rollback is `deploy --tag <older>` from the same binary. If a
future release changes the deploy contract, `ops/deploy-tool-version` in
the fetched config makes the old binary refuse with a download hint.
`--ref <sha>` pins the config fetch exactly; `--config-from <dir>` uses a
local checkout instead (airgap):

```bash
# full rollout of a release tag
git checkout vX.Y.Z
cargo xtask deploy --tag vX.Y.Z --host <ssh-host> --path /opt/manabrew

# recreate one bind-mount-configured service (e.g. after a grafana
# provisioning change), no tag checkout required
cargo xtask deploy --tag vX.Y.Z --only grafana --host <ssh-host> --path /opt/manabrew

# the staging slot (what staging-deploy.yml runs)
cargo xtask deploy --staging --branch <branch> --host <ssh-host> --path /opt/manabrew-staging

# build + run THIS checkout on THIS machine (selfhost VM / laptop)
cargo xtask deploy --local
```

The command rsyncs the tracked config at the tag, pulls the tag's images
(waiting out CI if they are still building), reconciles with
`docker compose up -d --wait`, and redeploys the previously running tag if
the rollout comes up unhealthy.

`manabrew-server` (the relay) gets extra protection because restarting it
kills every live game: xtask compares the `manabrew-server` binary inside the
freshly pulled image against the one in the running container and skips the
restart when they are identical. Root `Cargo.lock`/`Cargo.toml` churn
(release bumps, Tauri/UI dependency updates) therefore never bounces the
relay.

## Useful Commands

```bash
# View logs
docker compose -f manabrew-rs/crates/manabrew-server/compose.yml logs -f parity-dashboard

# Restart without rebuild
docker compose -f manabrew-rs/crates/manabrew-server/compose.yml restart parity-dashboard

# Full rebuild (no cache)
docker compose -f manabrew-rs/crates/manabrew-server/compose.yml build --no-cache parity-dashboard

# Check parity database
docker compose -f manabrew-rs/crates/manabrew-server/compose.yml exec parity-dashboard sqlite3 /app/data/parity.db ".tables"
```

### When the relay does restart

Live games survive a relay restart as long as the game hosts stay up. On
`SIGTERM` the relay broadcasts `ServerShuttingDown` and drains for 10s; after
the restart, hosts (self-hosted nodes and web-hosting browsers) re-register
their rooms via `ResumeRoom` using the `resume_token` from `RoomCreated`, and
guests rejoin their seats and resync. The token guards rooms the relay still
holds; a room the restarted relay has forgotten is resurrected on first claim.

## Investigating relay disconnects

`manabrew-server` exposes a healthcheck on port 9444 (`/health`), and every
disconnect emits a single tagged log line of the form
`[disconnect] user='…' id=… reason=<…> connected_for_s=… room=…`. The reason
attributes the drop to one of: `idle_timeout`, `read_error`, `stream_closed`,
`client_close`, `writer_stopped`, `writer_failed`. Combined with the browser
`[relay-disconnect]` console log on the client side, this is what we use to
attribute "relay disconnected" reports to a specific cause.

### Quick status

```bash
# Container health (look for "healthy"; "unhealthy" means /health failed
# 3× in a row → Docker will restart it under restart: unless-stopped).
docker compose -f compose.production.yml ps

# Live resource usage. Sustained RSS near the 1g mem_limit, or CPU pinned
# at 150%, indicates we're hitting the limits we set.
docker stats --no-stream
```

### OOM kills

```bash
# Anything from oom_reaper or the kernel? Hetzner VMs surface OOM in dmesg
# even when Docker's "OOMKilled: true" is missed.
journalctl -u docker -k --since "1h ago" | grep -iE 'oom|killed process'
```

### Disconnect reason tally

```bash
# Histogram of disconnect reasons over the last hour. If `idle_timeout`
# dominates we're losing connections in the network path (Hetzner NAT,
# Caddy, kernel). If `client_close` dominates it's clean exits — not a
# reliability problem.
docker compose -f compose.production.yml logs --since 1h manabrew-server \
  | grep '\[disconnect\]' \
  | sed -n 's/.*reason=\([a-z_]*\).*/\1/p' \
  | sort | uniq -c | sort -rn
```

### Health probe from outside

```bash
# Direct probe against the container's health port (only reachable from
# inside the docker network):
docker compose -f compose.production.yml exec manabrew-server curl -fsS http://localhost:9444/health
```

## iOS distribution (SideStore)

The iOS app ships as an **unsigned IPA** sideloaded via [SideStore](https://sidestore.io), which re-signs on-device with the user's own Apple ID (no paid Apple Developer account required; free accounts get a 7-day refresh cycle).

**How it's published.** `publish.yml`'s `ios-ipa` job builds the IPA on `macos-latest` with `yarn tauri ios build --no-sign`, and the `deploy-sidestore` job (after the web deploy) regenerates `apps.json` (`scripts/gen-sidestore-source.mjs`) and rsyncs it plus `Manabrew-<version>.ipa` and `icon.png` to the host's `ops/sidestore/`. That dir is bind-mounted into the caddy container at `/srv/manabrew/sidestore` and served under `play.manabrew.app/sidestore/`.

Unreferenced `Manabrew-*.ipa` files older than 30 days are removed after a successful upload. Installers referenced by `apps.json` are always retained; cleanup refuses to run if any referenced installer is missing.

**Add the source in SideStore:** Sources → **+** → `https://play.manabrew.app/sidestore/apps.json` → Browse → **Manabrew** → Install.

**Build one locally** (macOS + Xcode required):

```bash
yarn build:wasm
yarn tauri ios build --no-sign
# → src-tauri/gen/apple/build/arm64/Manabrew.ipa
```

Mobile builds skip the GraalVM/Maven harness (`tauri.{ios,android}.conf.json` override `beforeBuildCommand`) and do **not** bundle the desktop-only 64 MB Forge runtime — only `cardset.rkyv` ships. On Android that archive is embedded in the binary (`card_db.rs`), because the APK `asset://` path can't be mmap'd. See `src-tauri/AGENTS.md`.

### Android APK

`publish.yml`'s `android-apk` job builds an arm64 APK (`node scripts/mobile-dev.mjs android build --apk --target aarch64`) on `ubuntu-latest` and the `release` job attaches it to the GitHub Release alongside the desktop installers. The release APK is **unsigned** — installing it requires signing with a keystore (wire an `ANDROID_KEYSTORE` secret + a signing step to ship an installable build).
