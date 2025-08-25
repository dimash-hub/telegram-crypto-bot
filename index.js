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
const SOLANA_API_KEY = process.env.SOLANA_API_KEY;

// Проверка переменных
if (!TELEGRAM_TOKEN || !CHAT_ID || !WHALE_ADDRESS || !JEETS_TOKEN_ADDRESS || !SOLANA_API_KEY) {
  console.log("❌ Missing environment variables!");
  process.exit(1);
}

// Telegram бот
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
function sendWhaleSignal(msg) { bot.sendMessage(CHAT_ID, msg); }

// Для хранения последнего баланса токена
let lastBalance = 0;

// Получение цены Jeets в USD (пример через CoinGecko)
async function getJeetsPriceUSD() {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=jeets&vs_currencies=usd');
    return response.data.jeets.usd || 0;
  } catch (error) {
    console.log("Error fetching Jeets price:", error.message);
    return 0;
  }
}

// Проверка транзакций кита по токену Jeets
async function checkWhaleActivity() {
  try {
    const response = await axios.get(
      `https://public-api.solscan.io/account/tokens?account=${WHALE_ADDRESS}`,
      { headers: { "token": SOLANA_API_KEY } }
    );

    const tokens = response.data;
    const jeetsToken = tokens.find(token => token.tokenAddress === JEETS_TOKEN_ADDRESS);

    if (jeetsToken) {
      const currentBalance = parseFloat(jeetsToken.tokenAmount.uiAmount);
      const change = currentBalance - lastBalance;
      const priceUSD = await getJeetsPriceUSD();
      const changeUSD = Math.abs(change * priceUSD);

      // Сигналим только если движение ≥ 100$
      if (changeUSD >= 100) {
        lastBalance = currentBalance;
        sendWhaleSignal(`🐋 Кит ${WHALE_ADDRESS} ${change > 0 ? 'купил' : 'продал'} ${Math.abs(change)} Jeets (~$${changeUSD.toFixed(2)}). Текущий баланс: ${currentBalance}`);
      } else {
        console.log(`Движение по Jeets < $100: ~$${changeUSD.toFixed(2)}, сигнал не отправлен.`);
      }
    } else {
      console.log("Кит не держит токен Jeets или неверный адрес токена.");
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
    bot.sendMessage(msg.chat.id, "Привет! Я JEETS Whale Tracker! Следую за китами по токену Jeets, сигналы только при движении ≥ $100.");
  }
});

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
