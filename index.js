import express from "express";
import TelegramBot from "node-telegram-bot-api";
import axios from "axios";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (_req, res) => res.send("JEETS Whale Bot is alive on Render!"));

// Environment переменные
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const WHALE_ADDRESS = process.env.WHALE_ADDRESS; // адрес кита
const JEETS_TOKEN_ADDRESS = process.env.JEETS_TOKEN_ADDRESS; // адрес токена Jeets
const SOLANA_API_KEY = process.env.SOLANA_API_KEY; // твой API ключ Solana

// Проверка переменных
console.log("TELEGRAM_TOKEN:", TELEGRAM_TOKEN);
console.log("CHAT_ID:", CHAT_ID);
console.log("WHALE_ADDRESS:", WHALE_ADDRESS);
console.log("JEETS_TOKEN_ADDRESS:", JEETS_TOKEN_ADDRESS);
console.log("SOLANA_API_KEY:", SOLANA_API_KEY);

if (!TELEGRAM_TOKEN || !CHAT_ID || !WHALE_ADDRESS || !JEETS_TOKEN_ADDRESS || !SOLANA_API_KEY) {
  console.log("❌ Missing environment variables!");
  process.exit(1);
}

// Telegram бот
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

function sendWhaleSignal(msg) {
  bot.sendMessage(CHAT_ID, msg);
}

// Функция проверки транзакций кита по токену Jeets
async function checkWhaleActivity() {
  try {
    const response = await axios.get(
      `https://public-api.solscan.io/account/tokens?account=${WHALE_ADDRESS}`
    );

    const tokens = response.data;
    const jeetsToken = tokens.find(token => token.tokenAddress === JEETS_TOKEN_ADDRESS);

    if (jeetsToken && parseFloat(jeetsToken.tokenAmount.uiAmount) > 0) {
      sendWhaleSignal(`🐋 Кит ${WHALE_ADDRESS} держит Jeets: ${jeetsToken.tokenAmount.uiAmount}`);
    } else {
      console.log("Нет движения по Jeets для кита сейчас.");
    }

  } catch (error) {
    console.log("Error checking whale activity:", error.message);
  }
}

// Проверка каждые 5 минут
setInterval(checkWhaleActivity, 300000);

// Обработка команд в Telegram
bot.on("message", (msg) => {
  if (msg.text === "/start") {
    bot.sendMessage(msg.chat.id, "Привет! Я JEETS Whale Tracker! Следую за китами...");
  }
});

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
