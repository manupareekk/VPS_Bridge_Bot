# VPS Bridge Bot

**Repo:** [github.com/manupareekk/VPS_Bridge_Bot](https://github.com/manupareekk/VPS_Bridge_Bot)

Run [Cursor CLI](https://cursor.com/cli) on your VPS from **Telegram**: send a message as the agent prompt, get stdout/stderr streamed back in chat (line-by-line, split under Telegram's size limit).

## Prerequisites

- Node.js 20+
- Cursor CLI installed on the VPS and authenticated the same way you already use in the terminal (`CURSOR_API_KEY` or login—see Cursor docs).
- A Telegram bot token ([@BotFather](https://t.me/BotFather)).

## Deploy on your VPS

```bash
git clone https://github.com/manupareekk/VPS_Bridge_Bot.git
cd VPS_Bridge_Bot
```

Install dependencies and build (prefer **`npm ci`** on the server for a clean lockfile match; **`npm install`** is fine for local hacking):

```bash
npm ci
npm run build
```

Copy and edit env (see [Environment](#environment) and [`.env.example`](./.env.example)):

```bash
cp .env.example .env
nano .env   # set TELEGRAM_BOT_TOKEN, ALLOWED_CHAT_IDS, AGENT_WORKDIR, CURSOR_*
```

**Before relying on the bot**, SSH into the VPS and run your usual Cursor CLI command once in `AGENT_WORKDIR` so you know auth and flags work.

Run the bridge (keep it running with tmux/screen, or use [systemd](#systemd-example) below):

```bash
npm start
```

**Network:** long polling needs **outbound HTTPS** from the VPS to `api.telegram.org` (port 443). No inbound port is required for Telegram.

## Quick start (already cloned)

```bash
cp .env.example .env
# edit .env

npm install   # or: npm ci
npm run build
npm start
```

For development:

```bash
npm run dev
```

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | yes | Bot token from BotFather |
| `ALLOWED_CHAT_IDS` | yes | Comma-separated Telegram user IDs allowed to control the bot |
| `AGENT_WORKDIR` | yes | Working directory passed to `spawn` (`cwd`) |
| `CURSOR_BIN` | no | Default `cursor` |
| `CURSOR_ARGS_JSON` | no | JSON array of CLI args **before** the prompt; default `["agent"]` |
| `MAX_TELEGRAM_CHUNK` | no | Default `3800` (Telegram max 4096) |

Your message text becomes the **last** argument:

`cursor` + `CURSOR_ARGS_JSON...` + `your message`

Match this to whatever you already run in the terminal (add flags like `--force` only if you understand the risk).

## Telegram commands

- `/start`, `/help` — short usage
- `/status` — busy, queue length, current job id
- `/cancel` — `SIGTERM` on the current process tree (`tree-kill`)

Plain text (not starting with `/`) starts a job. If one is already running, new messages are **queued** (FIFO).

## Getting your chat ID

DM [@userinfobot](https://t.me/userinfobot) — use the `Id` value in `ALLOWED_CHAT_IDS`.

## systemd (example)

Adjust paths to match where you cloned the repo (example: `/opt/VPS_Bridge_Bot`).

```ini
[Unit]
Description=VPS Bridge Bot (Cursor CLI)
After=network-online.target

[Service]
Type=simple
User=YOUR_USER
WorkingDirectory=/opt/VPS_Bridge_Bot
EnvironmentFile=/opt/VPS_Bridge_Bot/.env
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Install the unit (e.g. `/etc/systemd/system/vps-bridge-bot.service`), then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now vps-bridge-bot
journalctl -u vps-bridge-bot -f
```

## Git remote

Canonical remote:

`https://github.com/manupareekk/VPS_Bridge_Bot.git`

```bash
git remote add origin https://github.com/manupareekk/VPS_Bridge_Bot.git
# or: git remote set-url origin https://github.com/manupareekk/VPS_Bridge_Bot.git
git push -u origin main
```

Set the GitHub description (one-time):

```bash
gh repo edit manupareekk/VPS_Bridge_Bot --description "Telegram bot: send prompts to Cursor CLI on your VPS; stream agent stdout/stderr back to chat."
```

Never commit `.env` (it is listed in `.gitignore`).

## Troubleshooting

| Symptom | What to check |
|--------|----------------|
| Bot replies **Unauthorized** | Your Telegram account id must be in `ALLOWED_CHAT_IDS` (use [@userinfobot](https://t.me/userinfobot)). No typos or spaces in the comma list. |
| **No output** or instant failure | On the VPS, run the same `cursor …` invocation manually in `AGENT_WORKDIR`. Fix `CURSOR_BIN`, `CURSOR_ARGS_JSON`, and Cursor auth (`CURSOR_API_KEY` / login) until that works. |
| Bot **never responds** / hangs | Is `npm start` running? Wrong or revoked `TELEGRAM_BOT_TOKEN`? |
| **Network / polling** issues | Ensure outbound TCP 443 to the internet (and not blocked by a strict firewall). The process must reach `api.telegram.org`. |
| **Huge or empty** Telegram messages | Very long lines are split; empty lines are skipped. Check raw logs on the VPS if needed. |

## Security

- Anyone with your bot token can call the Telegram API as the bot; keep `.env` private.
- `ALLOWED_CHAT_IDS` is mandatory so random users cannot enqueue work.
- The agent can modify files under `AGENT_WORKDIR`; use a dedicated clone/branch if needed.

## License

MIT
