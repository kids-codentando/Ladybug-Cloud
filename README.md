# 🐞 Ladybug Cloud — Multi-Tenant WhatsApp Bot Hosting

A free, self-hostable platform for running **Ladybug Mini** WhatsApp bots. Users sign up for free, paste their session ID, and get their own isolated bot process. An admin panel lets you install/update the bot code and manage every user and bot.

Built by **Ntandomods** · Deployable on **Render** in one click.

---

## ✨ Features

| Area | What you get |
| --- | --- |
| **Free accounts** | Public registration with bcrypt-hashed passwords and cookie sessions |
| **Session IDs** | Each user pastes their own `Ladybug!...` session; stored per-user and injected as `SESSION_ID` |
| **Isolation** | One `node index.js` process per bot, separate `session_<botId>` folder, separate temp dir |
| **Control** | Start / stop / restart, auto-restart with backoff (5 attempts), live status badges |
| **Logs** | 600-line ring buffer per bot, streamed to a live console in the dashboard |
| **Admin panel** | Stats, user management (plan/limit/ban/delete), all bots, one-click installer |
| **Installer** | Install Ladybug Mini from GitHub, upload a ZIP, or re-run `npm install` for the bot |
| **Free tier limit** | 1 bot per free user, 10 for pro, unlimited for admin — all configurable |

---

## 🚀 Deploy on Render

### Option A — Blueprint (recommended)

1. Push this repo to GitHub.
2. In Render: **New → Blueprint**, pick the repo. Render reads `render.yaml`.
3. Set `ADMIN_PASSWORD` (defaults to `mods`) and click **Apply**.
4. Wait for the first deploy, open the URL, log in as **Ntando / mods**.
5. Go to **Admin → Installer → Install from GitHub**. Done.

The blueprint creates a 1 GB persistent disk at `/var/data` so users, bots and sessions survive redeploys.

### Option B — Manual Web Service

- **Environment:** Node
- **Build:** `npm install`
- **Start:** `node server.js`
- **Disk:** add a disk mounted at `/var/data` (1 GB)
- **Env vars:**

```
ADMIN_USERNAME=Ntando
ADMIN_PASSWORD=mods
SESSION_SECRET=<random long string>
DATA_DIR=/var/data
BOT_DIR=/var/data/bots/ladybug
NODE_ENV=production
```

Health check path: `/healthz`

---

## 🧑‍💻 Local development

```bash
npm install
cp .env.example .env      # edit if you like
npm start
# open http://localhost:3000
```

Default admin: **Ntando / mods**.

After logging in as admin, install the bot code:

```bash
curl -b cookies.txt -X POST localhost:3000/api/admin/installer/github \
  -H 'Content-Type: application/json' -d '{}'
curl -b cookies.txt -X POST localhost:3000/api/admin/installer/deps
```

---

## 🔑 Getting a session ID

A session ID is produced by the bot itself the first time it links to WhatsApp (pairing code / QR). It looks like:

```
Ladybug!H4sIAAAAAAAA...   (base64 of gzipped creds)
```

Users paste that into **Dashboard → New Bot → Session ID**. The host never displays it again — only a masked preview.

---

## 🗂️ Project layout

```
server.js            Express app + all routes
lib/store.js         JSON datastore (atomic writes, debounced)
lib/bots.js          Process manager (spawn/stop/restart, logs, auto-restart)
lib/installer.js     GitHub/ZIP installer + npm dependency runner
public/              Vanilla JS SPA (landing, auth, dashboard, admin)
bots/ladybug/        Installed bot code (gitignored, runtime)
data/                db.json (gitignored, runtime)
render.yaml          Render blueprint
```

---

## 🔌 API overview

**Auth** `POST /api/auth/register|login|logout`, `GET /api/auth/me`
**Bots** `GET|POST /api/bots`, `PATCH|DELETE /api/bots/:id`, `POST /api/bots/:id/start|stop|restart`, `GET|DELETE /api/bots/:id/logs`
**Admin** `GET /api/admin/stats|users|bots|installer`, `PATCH|DELETE /api/admin/users/:id`, `DELETE /api/admin/bots/:id`, `POST /api/admin/installer/github|upload|deps`

---

## ⚠️ Notes

- Render's free tier spins down idle services; bots stop when the instance sleeps. Use a paid instance or an uptime pinger for 24/7 bots.
- Session IDs are secrets. They are stored in `db.json` on the persistent disk — restrict access to the disk and rotate `SESSION_SECRET` if leaked.
- Change the default admin password before exposing the service publicly.

---

Made with 🐞 by **Ntandomods**.
