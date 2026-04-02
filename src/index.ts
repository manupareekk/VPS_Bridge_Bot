import { randomUUID } from "node:crypto";
import { Bot } from "grammy";
import { config } from "./config.js";
import { splitForTelegram } from "./chunks.js";
import { JobRunner } from "./job-runner.js";

const runner = new JobRunner(
  config.agentWorkdir,
  config.cursorBin,
  config.cursorArgsBeforePrompt,
);

const bot = new Bot(config.telegramBotToken);

let lineBuffer = "";
let sendChain: Promise<void> = Promise.resolve();

function queueSend(chatId: number, text: string): void {
  if (text.trim().length === 0) return;
  sendChain = sendChain
    .then(async () => {
      const parts = splitForTelegram(text, config.maxTelegramChunk);
      for (let i = 0; i < parts.length; i++) {
        const body =
          parts.length > 1
            ? `[${String(i + 1)}/${String(parts.length)}]\n${parts[i]}`
            : parts[i];
        await bot.api.sendMessage(chatId, body);
      }
    })
    .catch((err: unknown) => {
      console.error("sendMessage failed:", err);
    });
}

runner.on("jobStart", (job) => {
  lineBuffer = "";
  queueSend(job.chatId, `Starting job ${job.id}…`);
});

runner.on("chunk", ({ job, data }) => {
  lineBuffer += data.toString("utf8");
  let nl: number;
  while ((nl = lineBuffer.indexOf("\n")) !== -1) {
    const line = lineBuffer.slice(0, nl + 1);
    lineBuffer = lineBuffer.slice(nl + 1);
    queueSend(job.chatId, line);
  }
});

runner.on("jobEnd", ({ job, code, signal }) => {
  if (lineBuffer.length > 0) {
    queueSend(job.chatId, lineBuffer);
    lineBuffer = "";
  }
  const sig = signal ? ` signal=${signal}` : "";
  queueSend(
    job.chatId,
    `Finished job ${job.id}. exit=${code === null ? "null" : String(code)}${sig}`,
  );
});

bot.use(async (ctx, next) => {
  const id = ctx.chat?.id;
  if (id == null || !config.allowedChatIds.includes(id)) {
    if (ctx.message?.text) {
      await ctx.reply("Unauthorized.");
    }
    return;
  }
  await next();
});

bot.command("start", async (ctx) => {
  await ctx.reply(
    "Send a message to run it as a Cursor CLI prompt. Commands: /status /cancel /help",
  );
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    [
      "Plain text → enqueue/run Cursor agent with your prompt as the last CLI argument.",
      `Working directory: ${config.agentWorkdir}`,
      `Binary: ${config.cursorBin} ${JSON.stringify(config.cursorArgsBeforePrompt)} <prompt>`,
      "/status — queue + current job",
      "/cancel — SIGTERM current process tree",
    ].join("\n"),
  );
});

bot.command("status", async (ctx) => {
  const s = runner.getStatus();
  await ctx.reply(
    [
      `busy=${String(s.busy)}`,
      `queue=${String(s.queueLength)}`,
      `current=${s.currentId ?? "none"}`,
    ].join("\n"),
  );
});

bot.command("cancel", async (ctx) => {
  const ok = runner.cancelCurrent();
  await ctx.reply(ok ? "Sent SIGTERM to current job." : "No running job.");
});

bot.on("message:text", async (ctx) => {
  const text = ctx.message.text;
  if (text.startsWith("/")) return;
  const job = {
    id: randomUUID().slice(0, 8),
    chatId: ctx.chat.id,
    prompt: text,
  };
  const { position } = runner.enqueue(job);
  if (position > 0) {
    await ctx.reply(`Queued. Position in queue: ${String(position)}`);
  } else {
    await ctx.reply(`Accepted. Job id: ${job.id}`);
  }
});

bot.catch((err) => console.error("grammy error:", err));

await bot.start({
  onStart: (info) => console.log(`Bot @${info.username} polling…`),
});
