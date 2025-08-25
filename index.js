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

// Для хранения уже обработанных транзакций
let processedTxs = new Set();

// Функция отправки сигнала
function sendWhaleSignal(msg) {
  bot.sendMessage(CHAT_ID, msg);
}

// Функция получения курса Jeets в USD с CoinGecko
async function getJeetsPriceUSD() {
  try {
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price?ids=jeets&vs_currencies=usd"
    );
    return response.data.jeets.usd || 1; // если не найдено, ставим 1
  } catch (error) {
    console.log("Error fetching Jeets price:", error.message);
    return 1;
  }
}

// Проверка транзакций кита по токену Jeets
async function checkWhaleActivity() {
  try {
    const response = await axios.get(
      `https://public-api.solscan.io/account/tokens?account=${WHALE_ADDRESS}`
    );

    const tokens = response.data;
    const jeetsToken = tokens.find(token => token.tokenAddress === JEETS_TOKEN_ADDRESS);

    if (!jeetsToken) return;

    const jeetsPrice = await getJeetsPriceUSD();

    // Проходим по транзакциям кита
    const txsResponse = await axios.get(
      `https://public-api.solscan.io/account/transactions?account=${WHALE_ADDRESS}&limit=20`
    );

    const txs = txsResponse.data;

    for (const tx of txs) {
      if (processedTxs.has(tx.txHash)) continue; // уже обработали
      processedTxs.add(tx.txHash);

      const jeetsTransfer = tx.innerTransfers?.find(
        t => t.tokenAddress === JEETS_TOKEN_ADDRESS
      );

      if (!jeetsTransfer) continue;

      const amount = parseFloat(jeetsTransfer.uiAmount);
      const totalUSD = amount * jeetsPrice;

      if (totalUSD >= 50) {
        const type = jeetsTransfer.type === "deposit" ? "Купил" : "Продал";
        sendWhaleSignal(`🐋 Кит ${WHALE_ADDRESS} ${type} ${amount} JEETS (~$${totalUSD.toFixed(2)})`);
      }
    }

  } catch (error) {
    console.log("Error checking whale activity:", error.message);
  }
}

// Проверка каждые 5 минут
setInterval(checkWhaleActivity, 300000);

// Самопинг для бесплатного Render
async function selfPing() {
  try {
    await axios.get(`http://localhost:${PORT}/`);
    console.log("✅ Self-ping successful, Render won't sleep");
  } catch (error) {
    console.log("❌ Self-ping failed:", error.message);
  }
}

// Пинг каждые 10 минут
setInterval(selfPing, 600000);

// Обработка команд Telegram
bot.on("message", (msg) => {
  if (msg.text === "/start") {
    bot.sendMessage(msg.chat.id, "Привет! Я JEETS Whale Tracker! Следую за китами...");
  }
});

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
