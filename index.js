import express from "express";
import TelegramBot from "node-telegram-bot-api";
import axios from "axios";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (_req, res) => res.send("JEETS Whale Bot is alive on Render!"));

// Environment переменные
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const WHALE_ADDRESS = process.env.WHALE_ADDRESS; 
const JEETS_TOKEN_ADDRESS = process.env.JEETS_TOKEN_ADDRESS; 

if (!TELEGRAM_TOKEN || !CHAT_ID || !WHALE_ADDRESS || !JEETS_TOKEN_ADDRESS) {
  console.log("❌ Missing environment variables!");
  process.exit(1);
}

// Telegram бот
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// Для хранения уже отправленных транзакций
const sentTransactions = new Set();
let lastBalance = 0;

// Получение цены Jeets в USD через CoinGecko
async function getJeetsPrice() {
  try {
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price?ids=jeets&vs_currencies=usd"
    );
    return response.data.jeets.usd;
  } catch (error) {
    console.log("Ошибка получения цены Jeets:", error.message);
    return 0.05; // fallback если CoinGecko не отвечает
  }
}

function sendWhaleSignal(msg) {
  bot.sendMessage(CHAT_ID, msg);
}

// Проверка баланса кита
async function checkWhaleActivity() {
  try {
    const response = await axios.get(
      `https://public-api.solscan.io/account/tokens?account=${WHALE_ADDRESS}`
    );

    const tokens = response.data;
    const jeetsToken = tokens.find(token => token.tokenAddress === JEETS_TOKEN_ADDRESS);

    if (!jeetsToken) {
      console.log("Токен Jeets не найден у кита.");
      return;
    }

    const balance = parseFloat(jeetsToken.tokenAmount.uiAmount);
    const diff = balance - lastBalance;

    const jeetsPrice = await getJeetsPrice();
    const diffUSD = diff * jeetsPrice;

    // Фильтр по ≥ $50 и уникальные транзакции
    if (Math.abs(diffUSD) >= 50 && !sentTransactions.has(balance)) {
      const type = diff > 0 ? "BUY 🟢" : "SELL 🔴";
      const msg = `🐋 Кит ${WHALE_ADDRESS} совершил ${type}:\n` +
                  `• Токенов: ${Math.abs(diff).toFixed(2)}\n` +
                  `• Стоимость в USD: $${Math.abs(diffUSD).toFixed(2)}\n` +
                  `• Баланс после: ${balance.toFixed(2)} Jeets\n` +
                  `• Цена за токен: $${jeetsPrice.toFixed(4)}`;
      sendWhaleSignal(msg);
      sentTransactions.add(balance);
    }

    lastBalance = balance;

  } catch (error) {
    console.log("Error checking whale activity:", error.message);
  }
}

// Проверка каждые 5 минут
setInterval(checkWhaleActivity, 300000);

// Ping для бесплатного Render (не засыпает)
setInterval(() => {
  axios.get(`http://localhost:${PORT}/`).catch(() => {});
}, 60000);

// Telegram команды
bot.on("message", (msg) => {
  if (msg.text === "/start") {
    bot.sendMessage(msg.chat.id, "Привет! Я JEETS Whale Tracker! Следую за китами по Jeets, сигналы ≥ $50.");
  }
});

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
