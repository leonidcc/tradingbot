import { Candle, Candles } from "./Dto";

class Indicators {
  /**
   * Calcula el RSI de un arreglo de velas (candles).
   * @param {Array} candles - Arreglo de velas con propiedades: open, close, high, low, timeStamp.
   * @param {number} period - Periodo para el cálculo del RSI (comúnmente 14).
   * @returns {Array} - Arreglo con los valores de RSI correspondientes a cada vela (a partir del índice [period]).
   */
  calculateRSI(candles: Candles, period = 14) {
    if (candles.length < period) {
      throw new Error("El número de velas debe ser mayor o igual al periodo.");
    }
    const rsiValues = [];
    let gains = 0;
    let losses = 0;
    // Paso 1: Calcular ganancias y pérdidas iniciales para el periodo
    for (let i = 1; i <= period; i++) {
      const change = candles[i].close - candles[i - 1].close;
      if (change > 0) {
        gains += change;
      } else {
        losses -= change; // Convertir pérdida a positiva
      }
    }
    // Promedio inicial
    let avgGain = gains / period;
    let avgLoss = losses / period;
    // Paso 2: Calcular RSI para cada vela posterior al periodo
    for (let i = period; i < candles.length; i++) {
      const change = candles[i].close - candles[i - 1].close;
      const gain = Math.max(change, 0);
      const loss = Math.max(-change, 0);
      // Promedios móviles exponenciales
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      // RS y RSI
      const rs = avgGain / avgLoss || 0; // Evitar división por 0
      const rsi = 100 - 100 / (1 + rs);
      rsiValues.push({ timeStamp: candles[i].timeStamp, rsi });
    }
    return Math.round(rsiValues[rsiValues.length - 1].rsi * 100) / 100;
  }
  /**
   * Calcula las Bandas de Bollinger de un arreglo de velas.
   * @param {Array} candles - Arreglo de velas con propiedades: close, timeStamp.
   * @param {number} period - Periodo para la media móvil y desviación estándar (típicamente 20).
   * @param {number} k - Factor de desviación estándar para las bandas (típicamente 2).
   * @returns {Array} - Arreglo con los valores de SMA, banda superior e inferior por cada vela.
   */
  calculateBollingerBands(candles: Candles, period = 20, k = 2) {
    if (candles.length < period) {
      throw new Error("El número de velas debe ser mayor o igual al periodo.");
    }
    const bands = [];
    for (let i = period - 1; i < candles.length; i++) {
      // Obtener los cierres del periodo actual
      const window = candles.slice(i - period + 1, i + 1).map((candle) => {
        if (typeof candle.close !== "number") {
          throw new Error("Cada vela debe tener un valor numérico en 'close'.");
        }
        return candle.close;
      });
      // Calcular la SMA
      const sma = window.reduce((sum, close) => sum + close, 0) / period;
      // Calcular la desviación estándar
      const variance =
        window.reduce((sum, close) => sum + Math.pow(close - sma, 2), 0) /
        period;
      const stdDev = Math.sqrt(variance);
      // Calcular bandas
      const upperBand = sma + k * stdDev;
      const lowerBand = sma - k * stdDev;
      bands.push({
        timeStamp: candles[i].timeStamp,
        sma,
        upperBand,
        lowerBand,
      });
    }
    return bands[bands.length - 1];
  }
  calculateAverageVolume(candles: Candles, period: number) {
    if (candles.length < period) {
      throw new Error(
        `Not enough data to calculate average volume for ${period} periods.`
      );
    }
    const volumes = candles
      .slice(-period)
      .map((candle: Candle) => candle.volume);
    const totalVolume = volumes.reduce((acc, vol) => acc + vol, 0);
    return totalVolume / period;
  }
  calculateATR(candles: Candles, period: number) {
    if (candles.length <= period) {
      throw new Error(
        `Not enough data to calculate ATR for ${period} periods.`
      );
    }
    // Cálculo del True Range (TR)
    const trueRanges = candles.slice(1).map((candle: Candle, index) => {
      const high = candle.high;
      const low = candle.low;
      const prevClose = candles[index].close;
      const tr1 = high - low; // Rango alto-bajo
      const tr2 = Math.abs(high - prevClose); // Rango alto-cierre previo
      const tr3 = Math.abs(low - prevClose); // Rango bajo-cierre previo
      return Math.max(tr1, tr2, tr3); // Verdadero rango (TR)
    });
    // Cálculo del ATR usando el promedio de los TR
    const atr =
      trueRanges.slice(-period).reduce((acc, tr) => acc + tr, 0) / period;
    return atr;
  }
  /**
   * Calcula la EMA (Media Móvil Exponencial) de un arreglo de velas.
   * @param {Array} candles - Arreglo de velas con propiedades: close, timeStamp.
   * @param {number} period - Periodo para el cálculo de la EMA.
   * @returns {Array} - Arreglo con los valores de EMA correspondientes a cada vela (a partir del índice [period]).
   */
  calculateEMA(candles: Candles, period: number) {
    if (candles.length < period) {
      throw new Error("El número de velas debe ser mayor o igual al periodo.");
    }

    const emaValues = [];
    const smoothing = 2 / (period + 1);

    // Calcular la SMA inicial como base para la EMA
    const initialSMA =
      candles.slice(0, period).reduce((sum, candle) => sum + candle.close, 0) /
      period;

    emaValues[period - 1] = {
      timeStamp: candles[period - 1].timeStamp,
      ema: initialSMA,
    };

    // Calcular la EMA para las velas restantes
    for (let i = period; i < candles.length; i++) {
      const previousEMA = emaValues[i - 1].ema as number;
      const currentClose = candles[i].close;
      const ema = (currentClose - previousEMA) * smoothing + previousEMA;

      emaValues.push({ timeStamp: candles[i].timeStamp, ema });
    }

    return emaValues[emaValues.length - 1]; // Retorna el último valor de EMA
  }
}

export default new Indicators();
