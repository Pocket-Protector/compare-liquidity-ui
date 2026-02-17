import type { ExchangeKey, ExchangeRecord, TickerKey } from "./types";
import {
  buildTickerMap,
  listPairMappings,
  listTrackedTickers,
} from "./pair-mapping";

export const NOTIONAL_TIERS = [1_000, 10_000, 100_000, 1_000_000] as const;
export const POLL_INTERVAL_MS = 1_500;

export const EXCHANGES: ExchangeKey[] = [
  "hyperliquid",
  "dydx",
  "lighter",
  "asterdex",
  "binance",
  "bybit",
];
export const TICKERS: TickerKey[] = listTrackedTickers();

export const EXCHANGE_LABELS: ExchangeRecord<string> = {
  hyperliquid: "Hyperliquid",
  dydx: "dYdX",
  lighter: "Lighter",
  asterdex: "AsterDEX",
  binance: "Binance",
  bybit: "Bybit",
};

export const EXCHANGE_COLORS: ExchangeRecord<string> = {
  hyperliquid: "#96FCE4",
  dydx: "#7774FF",
  lighter: "#F3F3F3",
  asterdex: "#C99F6F",
  binance: "#FCD535",
  bybit: "#FF9C2E",
};

export const TICKER_MAP: Record<
  TickerKey,
  ExchangeRecord<string>
> = buildTickerMap(TICKERS);
export const TRACKED_TICKERS = listPairMappings(TICKERS);
export const TICKER_PAIR_ROWS = TRACKED_TICKERS;

export function isExchangeKey(value: string): value is ExchangeKey {
  return EXCHANGES.includes(value as ExchangeKey);
}

export function isTickerKey(value: string): value is TickerKey {
  return TICKERS.includes(value as TickerKey);
}
