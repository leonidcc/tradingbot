import {
  AssetInfo,
  Candle,
  Candles,
  IClient,
  IStrategy,
  Ibacktester,
  Position,
} from "./Dto";
import Backtester, { BacktesterConfig } from "./backtester";
import { ProviderType, clientProvider, strategyProvider } from "./provider";

type Config = {
  leverage: number;
  riskPercentage: number;
  asset: string;
  counterAsset: string;
  client: ProviderType;
  strategy: ProviderType;
  backtest: BacktesterConfig;
};

type PlaceOrderArgs = {
  side: string;
  price: number;
  qty: number;
  stopLDistance?: number;
  takePDistance?: number;
};

class Bot {
  private backtester: Ibacktester;
  private strategy: IStrategy;
  private client: IClient;
  private config: Config;
  private assetInfo?: AssetInfo;
  private lastTrade?: Position;
  private availableBalance: number;
  // private results: object[];
  history;

  constructor(config: Config) {
    this.config = config;
    this.client = clientProvider(config.client);
    this.strategy = strategyProvider(config.strategy);
    this.backtester = new Backtester({
      configuration: config.backtest,
      strategy: this.strategy,
    });
    // this.results = [];
    this.availableBalance = 0;
    this.history = new Map();
  }

  async configure(): Promise<void> {
    try {
      await this.client.setLeverage(this.config.leverage);
      this.assetInfo = await this.client.getAssetPrecision();
      console.log("[INFO] Configuration completed.");
    } catch (error) {
      console.error("[ERROR] Error during configuration:", error);
      throw error;
    }
  }

  async startLiveTrading(): Promise<void> {
    await this.configure();
    console.log("[INFO] Starting live trading...");
    setInterval(async () => {
      try {
        const now = Date.now();
        if (this.lastTrade && now - this.lastTrade.timestamp < 60_000) {
          console.log("I", "Cooldown period active, skipping trade.");
          return;
        }
        const candles = await this.client.getCandlestickData();
        const lastCandle = this.getLastCandle(candles);
        const signal = this.strategy.calculateSignal(candles);
        const { availableBalance } = await this.client.getAccountBalance(
          "USDT"
        );
        this.history.set(availableBalance, availableBalance);
        console.log(
          `[INFO] ${new Date().toLocaleString()} Live Signal: ${signal} \t Price ${
            lastCandle.close
          } \t available:${availableBalance} \t${JSON.stringify(
            this.history.values()
          )}`
        );
        if (signal === "HOLD") return;

        const qty = await this.getQuantityToTrade(lastCandle, availableBalance);
        const { stopLossDistance, takeProfitDistance } =
          this.strategy.calculateDistanceTpSl(candles);
        this.lastTrade = await this.placeTrade({
          side: signal,
          price: lastCandle.close,
          qty,
          stopLDistance: stopLossDistance,
          takePDistance: takeProfitDistance,
        });
        console.log(
          `[INFO] ${new Date().toLocaleString()}Opened new position: ${JSON.stringify(
            this.lastTrade
          )}`
        );
      } catch (error) {
        console.error("[ERROR] Error during live trading:", error);
      }
    }, 3000);
  }

  async startBacktesting(): Promise<void> {
    this.availableBalance = this.config.backtest.initialBalance;
    await this.configure();
    await this.backtester.configure();

    console.log("[INFO] Starting backtesting...");
    await this.backtester.interval(async (candles: Candles) => {
      const lastCandle = this.getLastCandle(candles);

      if (this.lastTrade) {
        this.handleClosePosition(lastCandle);
      } else {
        await this.handleOpenPosition(candles, lastCandle);
      }

      return { signal: "HOLD", args: {} };
    });
  }

  private handleClosePosition(lastCandle: Candle): void {
    if (!this.lastTrade) {
      console.warn("[WARN] No position to close.");
      return;
    }

    const position = this.lastTrade;
    const { stopLPrice, takePPrice, direction, qty } = position;

    if (!qty || qty <= 0) {
      console.error("[ERROR] Invalid position quantity.");
      return;
    }

    const isBuy = direction === "BUY";
    const exitPrice = lastCandle.close; // Precio de cierre actual
    const entryPrice = position.price; // Precio de entrada de la posición

    // Calcular ganancia o pérdida real
    let profitOrLoss = 0;

    if (stopLPrice && takePPrice) {
      if (
        (isBuy && exitPrice >= parseFloat(takePPrice)) ||
        (!isBuy && exitPrice <= parseFloat(takePPrice))
      ) {
        console.log("[INFO] Take profit triggered.");
      } else if (
        (isBuy && exitPrice <= parseFloat(stopLPrice)) ||
        (!isBuy && exitPrice >= parseFloat(stopLPrice))
      ) {
        console.log("[INFO] Stop loss triggered.");
      }
    }

    if (isBuy) {
      profitOrLoss = (exitPrice - entryPrice) * qty;
    } else {
      profitOrLoss = (entryPrice - exitPrice) * qty;
    }

    // Actualizar el balance disponible
    this.availableBalance += profitOrLoss;

    console.log(
      `[INFO] Position closed. Direction: ${direction}, Entry Price: ${entryPrice}, Exit Price: ${exitPrice}, Quantity: ${qty}, Profit/Loss: ${profitOrLoss.toFixed(
        2
      )}, New Balance: ${this.availableBalance.toFixed(2)}`
    );

    // Limpiar la posición actual
    this.lastTrade = undefined;
  }

  private async handleOpenPosition(
    candles: Candles,
    lastCandle: Candle
  ): Promise<void> {
    const signal = this.strategy.calculateSignal(candles);
    if (signal === "HOLD") return;

    const qty = await this.getQuantityToTrade(
      lastCandle,
      this.availableBalance
    );
    const { stopLossDistance, takeProfitDistance } =
      this.strategy.calculateDistanceTpSl(candles);

    this.lastTrade = await this.placeTrade(
      {
        side: signal,
        price: lastCandle.close,
        qty,
        stopLDistance: stopLossDistance,
        takePDistance: takeProfitDistance,
      },
      true
    );

    console.log(
      `[INFO] Opened new position: ${JSON.stringify(this.lastTrade)}`
    );
  }

  private async placeTrade(
    args: PlaceOrderArgs,
    simulated = false
  ): Promise<Position> {
    try {
      const { side, price, qty, stopLDistance, takePDistance } = args;

      simulated
        ? { orderId: "SIMULATED_ORDER", ...args }
        : await this.client.placeOrder({ side, qty });

      let stopLPrice: string | undefined;
      let takePPrice: string | undefined;

      if (stopLDistance && this.assetInfo) {
        stopLPrice = this.calculateStopPrice(side, price, stopLDistance);
        if (!simulated) {
          await this.client.placeConditionalOrder({
            side: side === "BUY" ? "SELL" : "BUY",
            qty,
            type: "STOP_MARKET",
            stopPrice: stopLPrice,
          });
        }
      }

      if (takePDistance && this.assetInfo) {
        takePPrice = this.calculateTakeProfitPrice(side, price, takePDistance);
        if (!simulated) {
          await this.client.placeConditionalOrder({
            side: side === "BUY" ? "SELL" : "BUY",
            qty,
            type: "TAKE_PROFIT_MARKET",
            stopPrice: takePPrice,
          });
        }
      }

      return {
        timestamp: Date.now(),
        direction: side,
        stopLPrice,
        takePPrice,
        qty,
        price,
      };
    } catch (error) {
      console.error("[ERROR] Error placing trade:", error);
      throw error;
    }
  }

  private calculateStopPrice(
    side: string,
    price: number,
    distance: number
  ): string {
    return side === "BUY"
      ? (price - distance).toFixed(this.assetInfo!.pricePrecision)
      : (price + distance).toFixed(this.assetInfo!.pricePrecision);
  }

  private calculateTakeProfitPrice(
    side: string,
    price: number,
    distance: number
  ): string {
    return side === "BUY"
      ? (price + distance).toFixed(this.assetInfo!.pricePrecision)
      : (price - distance).toFixed(this.assetInfo!.pricePrecision);
  }

  private getLastCandle(candles: Candles): Candle {
    return candles[candles.length - 1];
  }

  private async getQuantityToTrade(
    lastCandle: Candle,
    availableBalance: number
  ): Promise<number> {
    if (!availableBalance || availableBalance <= 0)
      throw new Error("Insufficient balance.");
    if (!this.assetInfo) throw new Error("Asset info unknown.");

    const totalBalance = availableBalance * this.config.leverage;
    const tradeAmount = parseFloat(
      (totalBalance * this.config.riskPercentage).toFixed(6)
    );
    let qty = parseFloat(
      (tradeAmount / lastCandle.close).toFixed(this.assetInfo.quantityPrecision)
    );

    if (qty < this.assetInfo.lotSizeFilterMinQty) {
      qty = this.assetInfo.lotSizeFilterMinQty;
    }

    if (qty * lastCandle.close < this.assetInfo.minNotionalFilterNotional) {
      qty = parseFloat(
        (this.assetInfo.minNotionalFilterNotional / lastCandle.close).toFixed(
          this.assetInfo.quantityPrecision
        )
      );
    }

    return qty;
  }
}

export default Bot;
