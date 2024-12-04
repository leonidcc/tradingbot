import BinanceFClient from "../client/BinanceF";
import BBRsiStrategy from "../strategy/bbrsi";
import ScalpingBBRsiStrategy from "../strategy/ScalpingBBRsiStrategy";
import { IClient, IStrategy } from "./Dto";

export type ProviderType = {
  key: string;
  configuration: Strategy | Client;
};

export type Strategy = {
  takeProfitRatio: number;
  stopLossRatio: number;
};
export type Client = {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
  asset: string;
  counterAsset: string;
};

export function clientProvider({ key, configuration }: ProviderType): IClient {
  switch (key) {
    default:
      return new BinanceFClient(configuration as Client);
  }
}

export function strategyProvider({
  key,
  configuration,
}: ProviderType): IStrategy {
  switch (key) {
    case "ScalpingBBRsiStrategy":
      return new ScalpingBBRsiStrategy(configuration as Strategy);
    default:
      return new BBRsiStrategy(configuration as Strategy);
  }
}
