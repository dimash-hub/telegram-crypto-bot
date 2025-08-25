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
const SOLANA_API_KEY = process.env.SOLANA_API_KEY; // API ключ Solana

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

// Для хранения предыдущего баланса
let previousBalance = 0;

// Функция получения текущей цены Jeets (USD)
async function getJeetsPriceUSD() {
  try {
    const response = await axios.get(
      `https://public-api.solscan.io/token/market?tokenAddress=${JEETS_TOKEN_ADDRESS}`
    );
    return parseFloat(response.data.priceUsdt) || 0;
  } catch (error) {
    console.log("Ошибка получения цены Jeets:", error.message);
    return 0;
  }
}

// Функция проверки транзакций кита по токену Jeets
async function checkWhaleActivity() {
  try {
    const response = await axios.get(
      `https://public-api.solscan.io/account/tokens?account=${WHALE_ADDRESS}`
    );

    const tokens = response.data;
    const jeetsToken = tokens.find(token => token.tokenAddress === JEETS_TOKEN_ADDRESS);

    const currentBalance = jeetsToken ? parseFloat(jeetsToken.tokenAmount.uiAmount) : 0;
    const priceUSD = await getJeetsPriceUSD();
    const balanceUSD = currentBalance * priceUSD;

    if (previousBalance === 0) previousBalance = currentBalance; // при первом запуске

    if (currentBalance !== previousBalance) {
      const change = currentBalance - previousBalance;
      const changeUSD = change * priceUSD;

      if (Math.abs(changeUSD) >= 100) { // фильтр движения от $100
        if (change > 0) {
          sendWhaleSignal(`🐋 Кит ${WHALE_ADDRESS} купил Jeets: +${change} токенов (~$${changeUSD.toFixed(2)})\nОбщий баланс: ${currentBalance} (~$${balanceUSD.toFixed(2)})`);
        } else {
          sendWhaleSignal(`🐋 Кит ${WHALE_ADDRESS} продал Jeets: ${change} токенов (~$${changeUSD.toFixed(2)})\nОбщий баланс: ${currentBalance} (~$${balanceUSD.toFixed(2)})`);
        }
      } else {
        console.log(`Движение кита меньше $100 (${changeUSD.toFixed(2)}), сигнал не отправлен.`);
      }

      previousBalance = currentBalance;
    } else {
      console.log("Баланс не изменился, сигнал не отправлен.");
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
