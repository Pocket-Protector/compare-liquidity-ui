import { describe, it, expect } from "vitest";
import { computeSlippage, analyzeBook } from "../slippage";
import type { BookLevel, NormalizedBook } from "../types";

describe("computeSlippage", () => {
  it("computes correct VWAP for a single level", () => {
    const levels: BookLevel[] = [{ px: 100, sz: 10 }];
    // 500 notional at px=100 → buy 5 units at 100 → VWAP = 100
    const result = computeSlippage(levels, 500, 100, "ask");
    expect(result.vwap).toBe(100);
    expect(result.filled).toBe(true);
    expect(result.filledNotional).toBe(500);
  });

  it("computes correct VWAP across multiple levels", () => {
    const asks: BookLevel[] = [
      { px: 100, sz: 1 }, // 100 notional available
      { px: 101, sz: 2 }, // 202 notional available
    ];
    // 300 notional: buy 1@100 ($100) + ~1.98@101 ($200) = VWAP ≈ 100.667
    const result = computeSlippage(asks, 300, 100, "ask");
    expect(result.vwap).toBeCloseTo(100.6667, 2);
    expect(result.filled).toBe(true);
    expect(result.filledNotional).toBe(300);
  });

  it("reports partial fill when book is too thin", () => {
    const levels: BookLevel[] = [{ px: 50, sz: 2 }];
    // Only 100 notional available, requesting 500
    const result = computeSlippage(levels, 500, 50, "ask");
    expect(result.filled).toBe(false);
    expect(result.filledNotional).toBe(100);
    expect(result.vwap).toBe(50);
  });

  it("computes positive slippage for ask side when VWAP > mid", () => {
    const asks: BookLevel[] = [
      { px: 101, sz: 10 }, // VWAP = 101
    ];
    const midPrice = 100;
    const result = computeSlippage(asks, 500, midPrice, "ask");
    // slippageBps = ((101 - 100) / 100) * 10000 = 100 bps
    expect(result.slippageBps).toBe(100);
  });

  it("computes positive slippage for bid side when VWAP < mid", () => {
    const bids: BookLevel[] = [
      { px: 99, sz: 10 }, // VWAP = 99
    ];
    const midPrice = 100;
    const result = computeSlippage(bids, 500, midPrice, "bid");
    // slippageBps = ((100 - 99) / 100) * 10000 = 100 bps
    expect(result.slippageBps).toBe(100);
  });

  it("returns zero slippage when VWAP equals mid", () => {
    const levels: BookLevel[] = [{ px: 100, sz: 10 }];
    const result = computeSlippage(levels, 500, 100, "ask");
    expect(result.slippageBps).toBe(0);
  });

  it("handles empty levels gracefully", () => {
    const result = computeSlippage([], 1000, 100, "ask");
    expect(result.filled).toBe(false);
    expect(result.vwap).toBe(0);
    expect(result.slippageBps).toBe(0);
    expect(result.filledNotional).toBe(0);
  });

  it("fills exactly one level when notional matches", () => {
    const levels: BookLevel[] = [
      { px: 100, sz: 5 }, // 500 notional
      { px: 105, sz: 5 }, // 525 notional
    ];
    const result = computeSlippage(levels, 500, 100, "ask");
    expect(result.vwap).toBe(100);
    expect(result.filled).toBe(true);
    expect(result.filledNotional).toBe(500);
  });
});

describe("analyzeBook", () => {
  const makeBook = (bids: BookLevel[], asks: BookLevel[]): NormalizedBook => ({
    bids,
    asks,
    timestamp: 1700000000000,
  });

  it("computes spread correctly", () => {
    const book = makeBook([{ px: 99.5, sz: 10 }], [{ px: 100.5, sz: 10 }]);
    const result = analyzeBook({
      ticker: "BTC",
      exchange: "binance",
      book,
    });
    expect(result.bestBid).toBe(99.5);
    expect(result.bestAsk).toBe(100.5);
    expect(result.midPrice).toBe(100);
    expect(result.spread).toBe(1);
    // spreadBps = (1 / 100) * 10000 = 100 bps
    expect(result.spreadBps).toBe(100);
  });

  it("throws on empty bids", () => {
    const book = makeBook([], [{ px: 100, sz: 1 }]);
    expect(() =>
      analyzeBook({ ticker: "ETH", exchange: "dydx", book }),
    ).toThrow("Empty order book for dydx");
  });

  it("throws on empty asks", () => {
    const book = makeBook([{ px: 100, sz: 1 }], []);
    expect(() =>
      analyzeBook({ ticker: "ETH", exchange: "dydx", book }),
    ).toThrow("Empty order book for dydx");
  });

  it("computes slippage tiers for both sides", () => {
    const book = makeBook(
      [
        { px: 99, sz: 100 },
        { px: 98, sz: 1000 },
      ],
      [
        { px: 101, sz: 100 },
        { px: 102, sz: 1000 },
      ],
    );
    const result = analyzeBook({
      ticker: "BTC",
      exchange: "hyperliquid",
      book,
    });
    // Should have 4 tiers (NOTIONAL_TIERS = [1000, 10000, 100000, 1000000])
    expect(result.bids).toHaveLength(4);
    expect(result.asks).toHaveLength(4);
    // First tier (1000 notional) should be fully filled on both sides
    expect(result.bids[0].filled).toBe(true);
    expect(result.asks[0].filled).toBe(true);
  });

  it("preserves metadata", () => {
    const book = makeBook([{ px: 99, sz: 100 }], [{ px: 101, sz: 100 }]);
    const meta = { isAggregatedEstimate: true };
    const result = analyzeBook({
      ticker: "SOL",
      exchange: "lighter",
      book,
      meta,
    });
    expect(result.meta).toEqual({ isAggregatedEstimate: true });
  });
});
