import { Candles, IStrategy, Position } from "../core/Dto";
import indicators from "../core/indicators";
import { Strategy } from "../core/provider";

export default class ScalpingBBRsiStrategy implements IStrategy {
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
    this.name = "ScalpingBBRsiStrategy";
    this.currentTrade = undefined;
  }

  calculateDistanceTpSl(candles: Candles): {
    stopLossDistance: number;
    takeProfitDistance: number;
  } {
    const atr = indicators.calculateATR(candles, 5); // ATR más rápido para scalping
    const stopLossDistance = atr * this.config.stopLossRatio;
    const takeProfitDistance = atr * this.config.takeProfitRatio;
    return { stopLossDistance, takeProfitDistance };
  }

  calculateSignal(candles: Candles): "BUY" | "SELL" | "HOLD" {
    const lastCandle = candles[candles.length - 1];
    const rsi = indicators.calculateRSI(candles, 5); // RSI rápido
    const bands = indicators.calculateBollingerBands(candles, 7); // BB rápido
    // const emaShort = indicators.calculateEMA(candles, 3); // EMA rápida
    // const emaLong = indicators.calculateEMA(candles, 8); // EMA lenta
    const averageVolume = indicators.calculateAverageVolume(candles, 20);

    // Condiciones de compra
    if (
      lastCandle.close < bands.lowerBand &&
      rsi < 30 &&
      lastCandle.volume > averageVolume
      // &&      emaShort > emaLong // Confirmación de momentum
    ) {
      return "BUY";
    }

    // Condiciones de venta
    if (
      lastCandle.close > bands.upperBand &&
      rsi > 70 &&
      lastCandle.volume > averageVolume
      //  &&      emaShort < emaLong // Confirmación de momentum
    ) {
      return "SELL";
    }

    return "HOLD";
  }
}
