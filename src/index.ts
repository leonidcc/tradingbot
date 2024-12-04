import config from "./config";
import Bot from "./core/bot";

const isLive = process.argv.includes("--live");

const bot = new Bot(config);

if (isLive) {
  console.log("Iniciando en modo LIVE trading...");
  bot.startLiveTrading();
} else {
  console.log("Iniciando en modo de BACKTESTING...");
  bot.startBacktesting();
}
