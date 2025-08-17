import express from "express";
import TelegramBot from "node-telegram-bot-api";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (_req, res) => res.send("JEETS Whale Bot is alive on Render!"));

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });

function sendWhaleSignal(msg) {
  if (!TELEGRAM_TOKEN || !CHAT_ID) return;
  bot.sendMessage(CHAT_ID, msg);
}

setInterval(() => {
  sendWhaleSignal("🐋 Тест: бот жив и JEETS сигнал работает!");
}, 30000);

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
