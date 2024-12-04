const asset = "DOGE";
const counterAsset = "USDT";

const config = {
  asset,
  counterAsset,
  leverage: 15,
  riskPercentage: 0.02,
  client: {
    key: "Binance",
    configuration: {
      apiKey: "YOUR_API_KEY",
      apiSecret: "YOUR_SECRET_KEY",
      baseUrl: "https://fapi.binance.com",
      asset,
      counterAsset,
    },
  },
  strategy: {
    key: "ScalpingBBRsiStrategy",
    configuration: {
      takeProfitRatio: 2,
      stopLossRatio: 1.5,
    },
  },
  backtest: {
    initialBalance: 100,
    candlesfileName: "dogeusdt1m.json",
    lookbackPeriod: 200,
  },
};
export default config;
