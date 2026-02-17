import type { BookLevel, NormalizedBook } from "../types";

interface HyperliquidLevel {
  px: string;
  sz: string;
}

interface HyperliquidBookResponse {
  time?: number;
  levels?: [HyperliquidLevel[], HyperliquidLevel[]];
}

function parseLevels(levels: HyperliquidLevel[] | undefined): BookLevel[] {
  if (!levels) return [];

  return levels
    .map((level) => ({
      px: Number.parseFloat(level.px),
      sz: Number.parseFloat(level.sz),
    }))
    .filter(
      (level) =>
        Number.isFinite(level.px) &&
        Number.isFinite(level.sz) &&
        level.px > 0 &&
        level.sz > 0,
    );
}

export function parseHyperliquidBook(raw: unknown): NormalizedBook {
  const data = raw as HyperliquidBookResponse;
  if (!data || !Array.isArray(data.levels) || data.levels.length < 2) {
    throw new Error("Invalid Hyperliquid order book response");
  }

  const bids = parseLevels(data.levels[0]).sort((a, b) => b.px - a.px);
  const asks = parseLevels(data.levels[1]).sort((a, b) => a.px - b.px);

  if (bids.length === 0 || asks.length === 0) {
    throw new Error("Hyperliquid order book is empty");
  }

  return {
    bids,
    asks,
    timestamp: typeof data.time === "number" ? data.time : Date.now(),
  };
}
