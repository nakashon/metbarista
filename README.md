# MetBarista ☕

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Live](https://img.shields.io/badge/live-metbarista.com-orange)](https://metbarista.com)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

**The open community control plane for Meticulous espresso machines.**

Live at → **[metbarista.com](https://metbarista.com)**

---

## What is this?

MetBarista is a free, open-source PWA that connects directly to your [Meticulous](https://meticuloushome.com) espresso machine over your local WiFi. No cloud, no account, no subscription — your machine IP is the only thing you need.

### Features

| Feature | Description |
|---|---|
| 🎛 **Dashboard** | Live machine status, sensor tiles (temp/weight/pressure), controls (start, stop, preheat, tare, purge) |
| 📋 **Profiles** | Browse all profiles on your machine with cover images + generative pressure-curve fingerprints |
| 📈 **Shot History** | Every shot with full telemetry charts (pressure, flow, weight, temperature) |
| 📡 **Live Monitor** | Real-time shot data — state, temp, weight, pressure, timer + live chart as the shot builds |
| 🔬 **Compare** | Side-by-side shot comparison |
| ✏️ **Create** | Build new pressure/flow profiles from scratch |
| 🌐 **Community** | Firmware changelog, company updates, resources |
| 📤 **Share** | Export profiles in OEPF format |

### Philosophy

> **Machine = Identity.** Connecting your Meticulous IS your login. No OAuth, no passwords, no accounts. If you own a machine, you're part of the community.

Everything runs in your browser. MetBarista talks directly to `http://{your-machine-ip}/api/v1/` — the same API the official app uses.

---

## HTTP vs HTTPS & Live Data

MetBarista is served over both HTTP and HTTPS at `metbarista.com`.

**Live telemetry** (socket polling to your local machine IP) requires the browser to make requests to `http://192.168.x.x` — a private network address. Modern Chromium browsers protect these requests with a [Local Network Access](https://developer.chrome.com/blog/local-network-access/) permission.

### In practice

| Context | REST API (controls, profiles) | Live Telemetry (socket polling) |
|---|---|---|
| `https://metbarista.com` with Local Network Access allowed | ✅ Works | ✅ Works |
| Local Network Access denied | ❌ Blocked | ❌ Blocked |
| Cellular or guest WiFi | ❌ Unreachable | ❌ Unreachable |

### If live data stops working

The machine uses socket.io EIO4 HTTP long-polling (not WebSocket). MetBarista implements this manually via `fetch()` to avoid library quirks. The session stays alive by responding to the machine's ping packets (`"2"`) with pong (`"3"`) every 10 seconds.

When connecting, allow the browser prompt that asks whether MetBarista can find and connect to devices on your local network. If access was previously denied, open the site permissions for `metbarista.com`, enable **Local network access**, and connect again.

---

## Getting Started (contributors)

### Prerequisites

- Node.js 20+
- A Meticulous machine on your local network (or the IP doesn't matter for UI work)

### Setup

```bash
git clone https://github.com/nakashon/metbarista.git
cd metbarista
npm install
cp .env.example .env.local   # add your own keys (optional — app works without them)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

The app works fully without any env vars. They only enable optional features:

| Variable | Purpose | Required |
|---|---|---|
| `NEXT_PUBLIC_FEEDBACK_TOKEN` | GitHub Issues PAT for the feedback button | Optional |
| `NEXT_PUBLIC_CF_ANALYTICS_TOKEN` | Cloudflare Web Analytics beacon token | Optional |

See `.env.example` for setup instructions.

> **Note:** The live site at metbarista.com uses its own keys injected at build time via GitHub Actions secrets. Contributors use their own keys (or none at all).

---

## Architecture

```
Browser (PWA)
    │
    ├── metbarista.com (GitHub Pages, static export)
    │       └── Next.js 15 · Tailwind v4 · Recharts
    │
    ├── http(s)://192.168.x.x/api/v1/  ← your Meticulous, local network only
    │       ├── REST API  — machine info, profiles, shot history, actions
    │       └── Socket.io EIO4 polling — live sensor data (temp, pressure, flow, weight, time)
    │
    └── metbarista-feed-proxy.metbarista.workers.dev  ← Cloudflare Worker
            └── Proxies meticuloushome.com Atom feeds (firmware changelog etc.)
```

**No server. No database. No user data leaves your network.**

---

## Machine API

The Meticulous machine exposes a local HTTP API (same as the official app):

```
GET  /api/v1/machine                  → machine info (name, serial, firmware)
GET  /api/v1/profile/list?full=true   → all profiles with full stage data
GET  /api/v1/profile/load/{id}        → load a stored profile by UUID
DELETE /api/v1/profile/delete/{id}    → delete a stored profile
GET  /api/v1/history?max_results=20   → shot history list
GET  /api/v1/history?ids[]={id}       → single shot telemetry
POST /api/v1/action/{name}            → action: start | stop | preheat | tare | purge | home | abort
```

### Live telemetry (socket.io EIO4 polling)

```
GET  /socket.io/?EIO=4&transport=polling          → open session, returns {sid, pingInterval, pingTimeout}
POST /socket.io/?EIO=4&transport=polling&sid=...  → body "40" to join namespace
GET  /socket.io/?EIO=4&transport=polling&sid=...  → poll for events
```

Events received:
- `status` → `{name, state, extracting, loaded_profile, time, profile_time, sensors: {p, f, w, t, g}}`
- `sensors` → raw sensor dump (temperatures, motor position, etc.)

**Important:** The machine sends a ping packet `"2"` every 10 seconds. You must reply with `"3"` (pong) or the session closes. MetBarista handles this automatically in `lib/machine-socket.ts`.

---

## Contributing

We welcome contributions! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

The easiest way to contribute:
- 🐛 Found a bug? Use the **feedback button** in the app (bottom-right when connected)
- ✨ Have an idea? Open a [GitHub Issue](https://github.com/nakashon/metbarista/issues)
- 🔧 Want to code? Fork → branch → PR

---

## License

MIT — see [LICENSE](LICENSE). Free forever, for the community.

Built with ☕ by [Asaf Nakash](https://nakashon.com) ([@nakashon](https://github.com/nakashon)) and the Meticulous community.
