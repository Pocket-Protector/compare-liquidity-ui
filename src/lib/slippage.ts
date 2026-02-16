import { NOTIONAL_TIERS } from "./constants";
import type {
  BookLevel,
  BookSide,
  ExchangeKey,
  LiquidityAnalysis,
  NormalizedBook,
  SlippageResult,
  TickerKey,
} from "./types";

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function computeSlippage(
  levels: BookLevel[],
  targetNotional: number,
  midPrice: number,
  side: BookSide,
): SlippageResult {
  let remainingNotional = targetNotional;
  let totalQty = 0;
  let totalCost = 0;

  for (const level of levels) {
    if (remainingNotional <= 0) break;

    const levelNotional = level.px * level.sz;
    const fillNotional = Math.min(remainingNotional, levelNotional);
    const fillQty = fillNotional / level.px;

    totalCost += fillNotional;
    totalQty += fillQty;
    remainingNotional -= fillNotional;
  }

  const filled = remainingNotional <= 0;
  const filledNotional = totalCost;
  const vwap = totalQty > 0 ? totalCost / totalQty : 0;

  let slippageBps = 0;
  if (vwap > 0) {
    if (side === "ask") {
      slippageBps = ((vwap - midPrice) / midPrice) * 10_000;
    } else {
      slippageBps = ((midPrice - vwap) / midPrice) * 10_000;
    }
  }

  return {
    notional: targetNotional,
    vwap: round(vwap, 6),
    slippageBps: round(slippageBps, 2),
    filled,
    filledNotional: round(filledNotional, 2),
  };
}

export function analyzeBook({
  ticker,
  exchange,
  book,
  collectedAt = new Date(),
  meta,
}: {
  ticker: TickerKey;
  exchange: ExchangeKey;
  book: NormalizedBook;
  collectedAt?: Date;
  meta?: LiquidityAnalysis["meta"];
}): LiquidityAnalysis {
  if (book.bids.length === 0 || book.asks.length === 0) {
    throw new Error(`Empty order book for ${exchange}`);
  }

  const bestBid = book.bids[0].px;
  const bestAsk = book.asks[0].px;
  const midPrice = (bestBid + bestAsk) / 2;
  const spread = bestAsk - bestBid;
  const spreadBps = (spread / midPrice) * 10_000;

  return {
    ticker,
    exchange,
    timestamp: book.timestamp,
    collectedAt: collectedAt.toISOString(),
    bestBid,
    bestAsk,
    midPrice: round(midPrice, 6),
    spread: round(spread, 6),
    spreadBps: round(spreadBps, 2),
    bids: NOTIONAL_TIERS.map((tier) =>
      computeSlippage(book.bids, tier, midPrice, "bid"),
    ),
    asks: NOTIONAL_TIERS.map((tier) =>
      computeSlippage(book.asks, tier, midPrice, "ask"),
    ),
    meta,
  };
}
