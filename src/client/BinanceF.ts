import crypto from "crypto";
import { AssetInfo, IClient } from "../core/Dto";

export default class BinanceFClient implements IClient {
  name: string;
  config: { [key: string]: string };
  constructor(config: { [key: string]: string }) {
    this.name = "BinanceFClient";
    this.config = config;
  }
  /**
   * Coloca una orden en Binance Futures.
   * @param {Object} order - Detalles de la orden.
   * @param {string} order.side - "BUY" o "SELL".
   * @param {number} order.qty - Cantidad de activos a operar.
   * @param {number} order.leverage - Nivel de apalancamiento.
   */
  /**
   * Configura el apalancamiento para el símbolo antes de realizar una orden.
   * @param {string} symbol - Símbolo del mercado (ejemplo: BTCUSDT).
   * @param {number} leverage - Nivel de apalancamiento.
   */
  async setLeverage(leverage: number) {
    const symbol = this.config.asset + "USDT";
    const endpoint = "/fapi/v1/leverage";
    const timestamp = Date.now();

    const payload = `symbol=${symbol}&leverage=${leverage}&timestamp=${timestamp}`;
    const signature = this.generateSignature(payload);

    try {
      const response = await fetch(
        `${this.config.baseUrl}${endpoint}?${payload}&signature=${signature}`,
        {
          method: "POST",
          headers: {
            "X-MBX-APIKEY": this.config.apiKey,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Error al configurar apalancamiento: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log(
        `[INFO] Apalancamiento configurado: ${data.leverage}x para ${symbol}`
      );
      return data;
    } catch (error) {
      console.error("Error al configurar apalancamiento:", error);
      throw error;
    }
  }
  /**
   * Coloca una orden en Binance Futures.
   * @param {Object} order - Detalles de la orden.
   * @param {string} order.side - "BUY" o "SELL".
   * @param {number} order.qty - Cantidad de activos a operar.
   * @param {string} [order.timeInForce="GTC"] - Tiempo de validez de la orden. Puede ser GTC, IOC, o FOK.
   * @param {number} [order.price] - Precio de la orden (solo para órdenes LIMIT).
   * @param {string} [order.reduceOnly="false"] - ReduceOnly especifica si la orden solo debe reducir la posición existente (opcional).
   * @param {string} [order.positionSide="BOTH"] - Usado en el modo Hedge para definir LONG o SHORT.
   */
  async placeOrder(arg: { side: string; qty: number }) {
    try {
      const symbol = `${this.config.asset}USDT`;
      const timestamp = Date.now();

      // Payload para orden de mercado
      let payload = `symbol=${symbol}&side=${
        arg.side
      }&type=${"MARKET"}&quantity=${arg.qty}&timestamp=${timestamp}`;

      const signature = this.generateSignature(payload);

      const response = await fetch(
        `${this.config.baseUrl}/fapi/v1/order?${payload}&signature=${signature}`,
        {
          method: "POST",
          headers: {
            "X-MBX-APIKEY": this.config.apiKey,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || response.statusText);
      }

      const orderResult = await response.json();
      return orderResult;
    } catch (error) {
      throw error;
    }
  }

  async placeConditionalOrder({
    side,
    qty,
    type,
    stopPrice,
  }: {
    [key: string]: string;
  }) {
    try {
      const symbol = `${this.config.asset}USDT`;
      const timestamp = Date.now();

      // &reduceOnly=${true}
      let payload = `symbol=${symbol}&side=${side}&type=${type}&closePosition=${true}&quantity=${qty}&stopPrice=${stopPrice}&timestamp=${timestamp}&timeInForce=${"GTE_GTC"}`;

      const signature = this.generateSignature(payload);

      const response = await fetch(
        `${this.config.baseUrl}/fapi/v1/order?${payload}&signature=${signature}`,
        {
          method: "POST",
          headers: {
            "X-MBX-APIKEY": this.config.apiKey,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || response.statusText);
      }

      return await response.json();
    } catch (error) {
      console.log("Conditional order", error);
      throw error;
    }
  }

  /**
   * Obtiene los datos de velas para un símbolo y marco de tiempo específico.
   * @returns {Array} Arreglo de velas con precios de apertura, cierre, alto y bajo.
   */
  async getCandlestickData() {
    const symbol = this.config.asset + "USDT";
    const interval = "1m"; // Intervalo de tiempo de las velas
    const endpoint = `${this.config.baseUrl}/fapi/v1/klines?symbol=${symbol}&interval=${interval}`;

    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(
          `Error al obtener velas: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      return data.map((candle: string[]) => ({
        timeStamp: parseFloat(candle[0]),
        t: new Date(parseFloat(candle[0])),
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[5]),
      }));
    } catch (error) {
      console.error("Error al obtener datos de velas:", error);
      throw error;
    }
  }
  /**
   * Genera la firma requerida para autenticar las solicitudes a Binance.
   * @param {string} payload - Cadena de datos que se firmará.
   * @returns {string} Firma HMAC-SHA256 generada.
   */
  generateSignature(payload: string) {
    return crypto
      .createHmac("sha256", this.config.apiSecret)
      .update(payload)
      .digest("hex");
  }

  /**
   * Obtiene el balance de un activo específico.
   * @param {string} asset - Activo para el cual se obtiene el balance (ejemplo: USDT).
   * @returns {Object} Balance del activo.
   */
  async getAccountBalance(assetBase: string) {
    const endpoint = "/fapi/v2/account";
    const timestamp = Date.now();
    const signature = this.generateSignature(`timestamp=${timestamp}`);
    try {
      const response = await fetch(
        `${this.config.baseUrl}${endpoint}?timestamp=${timestamp}&signature=${signature}`,
        {
          method: "GET",
          headers: {
            "X-MBX-APIKEY": this.config.apiKey,
          },
        }
      );
      if (!response.ok) {
        throw new Error(
          `Error al obtener balance: ${response.status} ${response.statusText}`
        );
      }
      const data = await response.json();

      // console.log("Balance de cuenta:", data.assets);
      let usdtBalance = data.assets.find(
        (e: { asset: string }) => e.asset == assetBase
      );
      // console.log(usdtBalance);
      return usdtBalance;
    } catch (error) {
      console.error("Error al obtener balance:", error);
    }
  }

  async getAssetPrecision(): Promise<AssetInfo> {
    const symbol = this.config.asset + "USDT";

    try {
      const response = await fetch(
        `${this.config.baseUrl}/fapi/v1/exchangeInfo`
      );
      if (!response.ok) {
        throw new Error(
          `Error al obtener la información de precisión: ${response.statusText}`
        );
      }

      const data = await response.json();
      const assetInfo = data.symbols.find(
        (item: { symbol: string }) => item.symbol === symbol
      );

      if (!assetInfo) {
        throw new Error(`Símbolo no encontrado: ${symbol}`);
      }
      const lotSizeFilter = assetInfo.filters.find(
        (f: { filterType: string }) => f.filterType === "LOT_SIZE"
      );
      const minNotionalFilter = assetInfo.filters.find(
        (f: { filterType: string }) => f.filterType === "MIN_NOTIONAL"
      );

      return {
        asset: this.config.asset,
        pricePrecision: parseFloat(assetInfo.pricePrecision),
        quantityPrecision: parseFloat(assetInfo.quantityPrecision),
        lotSizeFilterMinQty: parseFloat(lotSizeFilter.minQty),
        minNotionalFilterNotional: parseFloat(minNotionalFilter.notional),
      };
    } catch (error) {
      console.error("Error obteniendo la precisión del activo:", error);
      throw error;
    }
  }
}
