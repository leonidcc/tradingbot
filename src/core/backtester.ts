import { promises as fs } from "fs";
import { Candles, IStrategy, Ibacktester } from "./Dto";

export type BacktesterConfig = {
  initialBalance: number;
  candlesfileName: string;
  lookbackPeriod: number;
};

type BTarg = {
  configuration: BacktesterConfig;
  strategy: IStrategy;
};

export default class Backtester implements Ibacktester {
  strategy;
  config;
  data: Candles;
  constructor({ configuration, strategy }: BTarg) {
    this.strategy = strategy;
    this.config = configuration;
    this.data = [];
  }
  async configure() {
    const data = JSON.parse(
      await fs.readFile(`./database/${this.config.candlesfileName}`, "utf-8")
    );
    this.data = data.map((candle: string[]) => ({
      timeStamp: parseFloat(candle[0]),
      t: new Date(parseFloat(candle[0])),
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      volume: parseFloat(candle[5]),
    }));
    console.log(
      `[INFO] Iniciando backtesting para la estrategia: ${this.strategy.name} `
    );
    console.log(`[INFO] START: ${new Date(this.data[0].timeStamp)}}`);
    console.log(
      `[INFO] END:   ${new Date(this.data[this.data.length - 1].timeStamp)}`
    );
    console.log(`[INFO] Initial Balance: ${this.config.initialBalance}`);
  }

  async interval(
    f: (candles: Candles) => Promise<{ signal: string; args: {} }>
  ) {
    let steps = 0;
    let counter: { [key: string]: number } = {};
    for (let i = this.config.lookbackPeriod; i < this.data.length; i++) {
      const candles = this.data.slice(i - this.config.lookbackPeriod, i);
      let res = await f(candles);
      steps += 1;
      if (!counter[res.signal]) counter[res.signal] = 0;
      counter[res.signal] += 1;
    }
    console.log(`[INFO] steps ${steps}`);
    console.log(`[INFO] operations ${JSON.stringify(counter)}`);
  }

  analyzeResults(results: { profit: number }[]) {
    const totalProfit = results.reduce((sum, res) => sum + res.profit, 0);
    console.log(`[INFO] Ganancia total: ${totalProfit}`);
  }
}
