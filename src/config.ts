import "dotenv/config";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v?.trim()) throw new Error(`Missing env: ${name}`);
  return v.trim();
}

function parseChatIds(raw: string | undefined): number[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n));
}

const allowedChatIds = parseChatIds(process.env.ALLOWED_CHAT_IDS);
if (allowedChatIds.length === 0) {
  throw new Error(
    "Set ALLOWED_CHAT_IDS to comma-separated Telegram numeric chat IDs (e.g. your user id).",
  );
}

let cursorArgsBeforePrompt: string[];
try {
  cursorArgsBeforePrompt = JSON.parse(
    process.env.CURSOR_ARGS_JSON ?? '["agent","-p"]',
  ) as string[];
  if (!Array.isArray(cursorArgsBeforePrompt) || !cursorArgsBeforePrompt.every((x) => typeof x === "string")) {
    throw new Error("not string[]");
  }
} catch {
  throw new Error('CURSOR_ARGS_JSON must be a JSON array of strings, e.g. ["agent","-p","--force"]');
}

export const config = {
  telegramBotToken: requireEnv("TELEGRAM_BOT_TOKEN"),
  allowedChatIds,
  agentWorkdir: requireEnv("AGENT_WORKDIR"),
  cursorBin: process.env.CURSOR_BIN?.trim() || "cursor",
  cursorArgsBeforePrompt,
  maxTelegramChunk: Math.min(
    Math.max(500, Number(process.env.MAX_TELEGRAM_CHUNK ?? "3800")),
    4096,
  ),
};
