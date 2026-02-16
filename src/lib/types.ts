export type ExchangeKey =
  | "hyperliquid"
  | "dydx"
  | "lighter"
  | "asterdex"
  | "binance"
  | "bybit";
export type TickerKey = string;
export type BookSide = "bid" | "ask";

export interface BookLevel {
  px: number;
  sz: number;
}

export interface NormalizedBook {
  bids: BookLevel[];
  asks: BookLevel[];
  timestamp: number;
}

export interface SlippageResult {
  notional: number;
  vwap: number;
  slippageBps: number;
  filled: boolean;
  filledNotional: number;
}

export interface LiquidityAnalysis {
  ticker: TickerKey;
  exchange: ExchangeKey;
  timestamp: number;
  collectedAt: string;
  bestBid: number;
  bestAsk: number;
  midPrice: number;
  spread: number;
  spreadBps: number;
  bids: SlippageResult[];
  asks: SlippageResult[];
  meta?: {
    isAggregatedEstimate?: boolean;
    hyperliquidNSigFigs?: number;
    /** nSigFigs used per tier index, e.g. [5, 5, 4, 3] */
    hyperliquidNSigFigsPerTier?: number[];
    lighterWsFallback?: boolean;
  };
}

export interface ExchangeStatus {
  exchange: ExchangeKey;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  analysis: LiquidityAnalysis | null;
  book: NormalizedBook | null;
}

export type ExchangeRecord<T> = Record<ExchangeKey, T>;

export type SpreadUnit = "bps" | "pct";
