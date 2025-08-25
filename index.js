import express from "express";
import TelegramBot from "node-telegram-bot-api";
import axios from "axios";

const app = express();
const PORT = process.env.PORT || 3000;

// Простой route для проверки
app.get("/", (_req, res) => res.send("JEETS Whale Bot is alive on Render!"));

// Переменные окружения
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const WHALE_ADDRESS = process.env.WHALE_ADDRESS;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

// Временная проверка переменных
console.log('TELEGRAM_TOKEN:', TELEGRAM_TOKEN);
console.log('CHAT_ID:', CHAT_ID);
console.log('WHALE_ADDRESS:', WHALE_ADDRESS);
console.log('ETHERSCAN_API_KEY:', ETHERSCAN_API_KEY);

if (!TELEGRAM_TOKEN || !CHAT_ID || !WHALE_ADDRESS || !ETHERSCAN_API_KEY) {
  console.error("❌ Missing environment variables!");
  process.exit(1);
}

// Создаем Telegram бота
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// Функция отправки сигнала
function sendWhaleSignal(msg) {
  bot.sendMessage(CHAT_ID, msg);
}

// Проверка активности кита каждые 5 минут
async function checkWhaleActivity() {
  try {
    const response = await axios.get(
      `https://api.etherscan.io/api?module=account&action=txlist&address=${WHALE_ADDRESS}&startblock=0&endblock=99999999&sort=desc&apikey=${ETHERSCAN_API_KEY}`
    );

    const transactions = response.data.result;
    if (transactions.length > 0) {
      const latestTx = transactions[0];
      sendWhaleSignal(`🐋 Кит ${WHALE_ADDRESS} совершил транзакцию! Hash: ${latestTx.hash}`);
    }
  } catch (error) {
    console.error("Error checking whale activity:", error.message);
  }
}

setInterval(checkWhaleActivity, 300000);

// Ответ на команду /start
bot.on("message", (msg) => {
  if (msg.text === "/start") {
    bot.sendMessage(msg.chat.id, "Привет! Я JEETS Whale Tracker! Следую за китами...");
  }
});

// Запуск сервера
app.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));
