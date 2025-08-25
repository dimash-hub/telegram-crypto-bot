import express from "express";
import TelegramBot from "node-telegram-bot-api";
import axios from "axios";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (_req, res) => res.send("JEETS Whale Bot is alive on Render!"));

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const WHALE_ADDRESS = process.env.WHALE_ADDRESS;
const JEETS_MINT_ADDRESS = process.env.JEETS_MINT_ADDRESS;

if (!TELEGRAM_TOKEN || !CHAT_ID || !WHALE_ADDRESS || !JEETS_MINT_ADDRESS) {
  console.log("Missing environment variables!");
  process.exit(1);
}

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

function sendWhaleSignal(msg) {
  bot.sendMessage(CHAT_ID, msg);
}

// Храним последние обработанные транзакции
let processedTxs = new Set();

async function checkWhaleActivity() {
  try {
    // Получаем последние токен-транзакции адреса
    const response = await axios.get(
      `https://public-api.solscan.io/account/tokens?account=${WHALE_ADDRESS}`
    );

    const tokens = response.data.data;
    const jeetsToken = tokens.find(t => t.mint === JEETS_MINT_ADDRESS);

    if (!jeetsToken) return; // если нет JEETS, ничего не делаем

    // Проверяем изменения количества
    const balance = jeetsToken.tokenAmount.uiAmount;
    const txs = jeetsToken.transactions || [];

    for (let tx of txs) {
      if (!processedTxs.has(tx.signature)) {
        processedTxs.add(tx.signature);
        sendWhaleSignal(
          `🐋 Кит ${WHALE_ADDRESS} совершил транзакцию с JEETS!\nHash: ${tx.signature}\nИзменение: ${tx.tokenAmountChange} токенов\nБаланс: ${balance}`
        );
      }
    }

  } catch (error) {
    console.log("Error checking whale activity:", error.message);
  }
}

setInterval(checkWhaleActivity, 60000); // Проверка каждую минуту

bot.on("message", (msg) => {
  if (msg.text === "/start") {
    bot.sendMessage(msg.chat.id, "Привет! Я JEETS Whale Tracker на Solana! Следую за китами...");
  }
});

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
