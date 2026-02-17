import type {
  ExchangeFees,
  ExchangeKey,
  ExchangeRecord,
  FeeConfig,
  TickerKey,
} from "./types";

export const DEFAULT_FEES: ExchangeRecord<ExchangeFees> = {
  binance: { maker: 0.02, taker: 0.05 },
  bybit: { maker: 0.02, taker: 0.055 },
  hyperliquid: { maker: 0.015, taker: 0.045 },
  lighter: { maker: 0, taker: 0 },
  dydx: { maker: 0.01, taker: 0.05 },
  asterdex: { maker: 0.005, taker: 0.04 },
};

export const DYDX_ZERO_FEE_TICKERS: TickerKey[] = ["BTC", "BONK"];

export const FEE_PAGE_URLS: ExchangeRecord<string> = {
  binance: "https://www.binance.com/en/fee/futureFee",
  bybit: "https://www.bybit.com/en/help-center/article/Trading-Fee-Structure",
  hyperliquid: "https://hyperliquid.gitbook.io/hyperliquid-docs/trading/fees",
  lighter: "https://docs.lighter.xyz/trading/trading-fees",
  dydx: "https://dydx.trade/portfolio/fees",
  asterdex:
    "https://docs.asterdex.com/product/aster-perpetuals/fees-and-specs/fees",
};

/**
 * Returns the active fee for a given exchange in basis points.
 * Returns 0 when fees are disabled.
 */
export function getFeeBps(feeConfig: FeeConfig, exchange: ExchangeKey): number {
  if (!feeConfig.enabled) return 0;
  return feeConfig.fees[exchange][feeConfig.activeRole] * 100;
}

export function getEffectiveFees(
  overrides: ExchangeRecord<ExchangeFees>,
  ticker: TickerKey,
): ExchangeRecord<ExchangeFees> {
  const result = { ...overrides };
  if (DYDX_ZERO_FEE_TICKERS.includes(ticker)) {
    result.dydx = { maker: 0, taker: 0 };
  }
  return result;
}
