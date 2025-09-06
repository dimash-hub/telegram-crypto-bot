import express from "express";
import TelegramBot from "node-telegram-bot-api";
import axios from "axios";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// === ENV ===
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;           // токен бота
const CHAT_ID = process.env.CHAT_ID;                         // чат для сигналов
const PUBLIC_URL = process.env.PUBLIC_URL;                   // https://<твоя-ссылка>.onrender.com
const WHALE_ADDRESS = process.env.WHALE_ADDRESS;             // кошелёк кита (Solana)
const JEETS_TOKEN_ADDRESS = process.env.JEETS_TOKEN_ADDRESS; // mint JEETS
const SOLANA_RPC = process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com";

if (!TELEGRAM_TOKEN || !CHAT_ID || !PUBLIC_URL || !WHALE_ADDRESS || !JEETS_TOKEN_ADDRESS) {
  console.log("❌ Missing environment variables!");
  process.exit(1);
}

// === Telegram via WEBHOOK (чтобы не было 409) ===
const bot = new TelegramBot(TELEGRAM_TOKEN);
await bot.setWebHook(`${PUBLIC_URL}/telegram/${TELEGRAM_TOKEN}`);

app.post(`/telegram/${TELEGRAM_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

bot.on("message", (msg) => {
  if (msg.text === "/start") {
    bot.sendMessage(msg.chat.id, "Привет! Я JEETS Whale Tracker — слежу за китом по JEETS. Сигналы только при движении ≥ $50.");
  }
});

// === helpers ===
async function getJeetsBalanceUi(owner, mint) {
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "getParsedTokenAccountsByOwner",
    params: [
      owner,
      { mint },
      { encoding: "jsonParsed" }
    ],
  };
  const { data } = await axios.post(SOLANA_RPC, body, { timeout: 15000 });
  const accounts = data?.result?.value || [];
  // суммируем uiAmount по всем счетам токена
  let sum = 0;
  for (const acc of accounts) {
    const ui = acc?.account?.data?.parsed?.info?.tokenAmount?.uiAmount;
    if (typeof ui === "number") sum += ui;
  }
  return sum;
}

async function getJeetsPriceUsd(mint) {
  // Jupiter Price API по mint (без ключей)
  const url = `https://price.jup.ag/v4/price?ids=${encodeURIComponent(mint)}`;
  try {
    const { data } = await axios.get(url, { timeout: 10000 });
    const price = data?.data?.[mint]?.price;
    return typeof price === "number" ? price : 0;
  } catch {
    return 0; // fallback: если цена недоступна
  }
}

function send(msg) {
  bot.sendMessage(CHAT_ID, msg).catch(() => {});
}

// === логика трекинга ===
let lastBalance = null; // прошлый баланс токена у кита

async function checkWhale() {
  try {
    const [balance, price] = await Promise.all([
      getJeetsBalanceUi(WHALE_ADDRESS, JEETS_TOKEN_ADDRESS),
      getJeetsPriceUsd(JEETS_TOKEN_ADDRESS),
    ]);

    if (lastBalance === null) {
      lastBalance = balance; // инициализация при первом запуске
      console.log(`Init balance: ${balance}`);
      return;
    }

    const diff = balance - lastBalance;
    const diffUSD = (price || 0) * diff;

    // сигнал только при |Δ| ≥ $50 и цене > 0
    if (price > 0 && Math.abs(diffUSD) >= 50) {
      const type = diff > 0 ? "BUY 🟢" : "SELL 🔴";
      const msg =
        `🐋 ${type}\n` +
        `• Кол-во: ${Math.abs(diff).toFixed(4)} JEETS\n` +
        `• ~$${Math.abs(diffUSD).toFixed(2)} (цена: $${price.toFixed(6)})\n` +
        `• Баланс после: ${balance.toFixed(4)} JEETS`;
      send(msg);
      lastBalance = balance;
    } else {
      // без спама
      console.log(`No significant move (Δ≈$${diffUSD.toFixed(2)}). Bal=${balance.toFixed(4)}, Price=$${price}`);
      lastBalance = balance; // обновим, чтобы не копить дельту
    }
  } catch (e) {
    console.log("checkWhale error:", e?.message || e);
  }
}

// === анти-сон для бесплатного Render ===
// Пингуем внешним URL сервиса (НЕ localhost!)
async function keepAlive() {
  try {
    await axios.get(PUBLIC_URL, { timeout: 8000 });
    console.log("keepAlive ok");
  } catch (e) {
    console.log("keepAlive fail:", e?.message || e);
  }
}

// root для проверок
app.get("/", (_req, res) => res.send("JEETS Whale Tracker alive 🐋"));

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

// каждые 60с — пинг + проверка
setInterval(() => {
  keepAlive();
  checkWhale();
}, 60 * 1000);
