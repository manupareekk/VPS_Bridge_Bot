# cursor-vps-telegram-bridge

Run [Cursor CLI](https://cursor.com/cli) on your VPS from **Telegram**: send a message as the agent prompt, get stdout/stderr streamed back in chat (line-by-line, split under Telegram’s size limit).

## Prerequisites

- Node.js 20+
- Cursor CLI installed on the VPS and authenticated the same way you already use in the terminal (`CURSOR_API_KEY` or login—see Cursor docs).
- A Telegram bot token ([@BotFather](https://t.me/BotFather)).

## Quick start

```bash
cp .env.example .env
# edit .env

npm install
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
| `CURSOR_ARGS_JSON` | no | JSON array of CLI args **before** the prompt; default `["agent","-p"]` |
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

```ini
[Unit]
Description=Cursor Telegram bridge
After=network-online.target

[Service]
Type=simple
User=YOUR_USER
WorkingDirectory=/opt/cursor-vps-telegram-bridge
EnvironmentFile=/opt/cursor-vps-telegram-bridge/.env
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Then: `sudo systemctl enable --now cursor-telegram-bridge` (rename unit file to match).

## Security

- Anyone with your bot token can call the Telegram API as the bot; keep `.env` private.
- `ALLOWED_CHAT_IDS` is mandatory so random users cannot enqueue work.
- The agent can modify files under `AGENT_WORKDIR`; use a dedicated clone/branch if needed.

## License

MIT
