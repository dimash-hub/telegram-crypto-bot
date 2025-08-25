import express from "express";
import TelegramBot from "node-telegram-bot-api";
import axios from "axios";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (_req, res) => res.send("JEETS Whale Bot is alive on Render!"));

// --- Environment Variables ---
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const SOLANA_API_KEY = process.env.SOLANA_API_KEY;
const JEETS_TOKEN_ADDRESS = process.env.JEETS_TOKEN_ADDRESS;

if (!TELEGRAM_TOKEN || !CHAT_ID || !SOLANA_API_KEY || !JEETS_TOKEN_ADDRESS) {
  console.log("❌ Missing environment variables!");
  process.exit(1);
}

// --- Telegram Bot ---
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

function sendWhaleSignal(msg) {
  bot.sendMessage(CHAT_ID, msg);
}

// --- Track Jeets transactions on Solana ---
let lastSignature = null; // Для хранения последней транзакции, чтобы не слать дубли

async function checkJeetsActivity() {
  try {
    const response = await axios.get(
      `https://api.solana.com`, // Вставь здесь свой endpoint Solana API, если он другой
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SOLANA_API_KEY}`
        },
        data: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getSignaturesForAddress",
          params: [JEETS_TOKEN_ADDRESS, { limit: 1 }]
        })
      }
    );

    const signatures = response.data.result;
    if (signatures && signatures.length > 0) {
      const latestTx = signatures[0].signature;

      if (latestTx !== lastSignature) {
        lastSignature = latestTx;
        sendWhaleSignal(`🐋 Новая транзакция Jeets! Signature: ${latestTx}`);
      }
    }
  } catch (error) {
    console.log("Error checking Jeets activity:", error.message);
  }
}

// Проверка каждые 5 минут
setInterval(checkJeetsActivity, 300000);

// --- Telegram командa /start ---
bot.on("message", (msg) => {
  if (msg.text === "/start") {
    bot.sendMessage(msg.chat.id, "Привет! Я JEETS Whale Tracker на Solana! Следую за транзакциями Jeets...");
  }
});

// --- Запуск сервера ---
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
