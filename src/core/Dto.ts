export type Position = {
  timestamp: number;
  direction: string;
  qty: number;
  price: number;
  stopLPrice?: string;
  takePPrice?: string;
};
export interface IStrategy {
  name: string;
  calculateSignal(candles: Candles): string;
  calculateDistanceTpSl(candles: object[]): {
    stopLossDistance: number;
    takeProfitDistance: number;
  };
}

export interface Ibacktester {
  configure(): unknown;
  interval(
    f: (candles: Candles) => Promise<{ signal: string; args: {} }>
  ): unknown;
  analyzeResults(results: { profit: number }[]): unknown;
}

export interface IClient {
  name: string;
  getCandlestickData(): Promise<Candles>;
  placeOrder(arg: { side: string; qty: number }): Promise<{
    [key: string]: string | number;
  }>;
  setLeverage(leverage: number): Promise<null>;
  getAccountBalance(asset: string): Promise<{ availableBalance: number }>;
  placeConditionalOrder(arg: { [key: string]: string | number }): unknown;
  getAssetPrecision(): Promise<AssetInfo>;
}

export type AssetInfo = {
  asset: string;
  pricePrecision: number;
  quantityPrecision: number;
  lotSizeFilterMinQty: number;
  minNotionalFilterNotional: number;
};
export type Candle = {
  close: number;
  high: number;
  low: number;
  volume: number;
  timeStamp: Date;
};

export type Candles = Candle[];
