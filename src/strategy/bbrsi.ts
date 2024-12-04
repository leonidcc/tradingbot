import { Candles, IStrategy, Position } from "../core/Dto"; // Asegúrate de que Position esté definido en Dto
import indicators from "../core/indicators";
import { Strategy } from "../core/provider";

export default class BBRsiStrategy implements IStrategy {
  name: string;
  config: Strategy;
  currentTrade: Position | undefined;

  constructor(config: Strategy) {
    if (!config.stopLossRatio || !config.takeProfitRatio) {
      throw new Error(
        "Strategy configuration must include stopLossRatio and takeProfitRatio."
      );
    }
    this.config = config;
    this.name = "BBRsiStrategy";
    this.currentTrade = undefined;
  }

  calculateDistanceTpSl(candles: Candles): {
    stopLossDistance: number;
    takeProfitDistance: number;
  } {
    const atr = indicators.calculateATR(candles, 14);
    const stopLossDistance = atr * this.config.stopLossRatio;
    const takeProfitDistance = atr * this.config.takeProfitRatio;
    return { stopLossDistance, takeProfitDistance };
  }

  calculateSignal(candles: Candles): "BUY" | "SELL" | "HOLD" {
    const lastCandle = candles[candles.length - 1];
    const rsi = indicators.calculateRSI(candles, 10);
    const bands = indicators.calculateBollingerBands(candles, 10);
    const averageVolume = indicators.calculateAverageVolume(candles, 20);

    if (
      lastCandle.close < bands.lowerBand &&
      rsi < 25 &&
      lastCandle.volume > averageVolume
    ) {
      return "BUY";
    } else if (
      lastCandle.close > bands.upperBand &&
      rsi > 75 &&
      lastCandle.volume > averageVolume
    ) {
      return "SELL";
    }
    return "HOLD";
  }
}
