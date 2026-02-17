import type { BookLevel, NormalizedBook } from "../types";

interface BybitBookResponse {
  retCode?: number;
  retMsg?: string;
  result?: {
    ts?: number;
    b?: [string, string][];
    a?: [string, string][];
  };
}

function parseLevels(levels: [string, string][] | undefined): BookLevel[] {
  if (!levels) return [];

  return levels
    .map(([price, qty]) => ({
      px: Number.parseFloat(price),
      sz: Number.parseFloat(qty),
    }))
    .filter(
      (level) =>
        Number.isFinite(level.px) &&
        Number.isFinite(level.sz) &&
        level.px > 0 &&
        level.sz > 0,
    );
}

export function parseBybitBook(raw: unknown): NormalizedBook {
  const data = raw as BybitBookResponse;

  if (!data || typeof data.retCode !== "number" || !data.result) {
    throw new Error("Invalid Bybit order book response");
  }

  if (data.retCode !== 0) {
    throw new Error(`Bybit error: ${data.retMsg ?? "unknown error"}`);
  }

  if (!Array.isArray(data.result.b) || !Array.isArray(data.result.a)) {
    throw new Error("Invalid Bybit order book levels");
  }

  const bids = parseLevels(data.result.b).sort((a, b) => b.px - a.px);
  const asks = parseLevels(data.result.a).sort((a, b) => a.px - b.px);

  if (bids.length === 0 || asks.length === 0) {
    throw new Error("Bybit order book is empty");
  }

  return {
    bids,
    asks,
    timestamp: typeof data.result.ts === "number" ? data.result.ts : Date.now(),
  };
}
