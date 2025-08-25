import express from "express";
import TelegramBot from "node-telegram-bot-api";
import { Connection, PublicKey } from "@solana/web3.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (_req, res) => res.send("JEETS Whale Bot is alive on Render!"));

// ===== Environment Variables =====
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const JEETS_MINT_ADDRESS = process.env.JEETS_MINT_ADDRESS;

console.log('TELEGRAM_TOKEN:', TELEGRAM_TOKEN);
console.log('CHAT_ID:', CHAT_ID);
console.log('JEETS_MINT_ADDRESS:', JEETS_MINT_ADDRESS);

if (!TELEGRAM_TOKEN || !CHAT_ID || !JEETS_MINT_ADDRESS) {
  console.log("❌ Missing environment variables!");
  process.exit(1);
}

// ===== Telegram Bot =====
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
function sendWhaleSignal(msg) {
  bot.sendMessage(CHAT_ID, msg);
}

bot.on("message", (msg) => {
  if (msg.text === "/start") {
    bot.sendMessage(msg.chat.id, "Привет! Я JEETS Whale Tracker! Следую за транзакциями JEETS...");
  }
});

// ===== Solana Connection =====
const connection = new Connection("https://api.mainnet-beta.solana.com");
const mintAddress = new PublicKey(JEETS_MINT_ADDRESS);

// ===== Отслеживание транзакций =====
let lastSignature = null;

async function checkJeetsTransactions() {
  try {
    const signatures = await connection.getSignaturesForAddress(mintAddress, { limit: 5 });
    if (signatures.length === 0) return;

    // Берем последнюю транзакцию
    const latestTx = signatures[0];

    if (latestTx.signature !== lastSignature) {
      lastSignature = latestTx.signature;
      sendWhaleSignal(`🐋 Новая транзакция JEETS! Signature: ${latestTx.signature}`);
      console.log(`🐋 Новая транзакция: ${latestTx.signature}`);
    }
  } catch (error) {
    console.log("Error checking JEETS transactions:", error.message);
  }
}

// Проверяем каждые 5 минут
setInterval(checkJeetsTransactions, 300000);

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
