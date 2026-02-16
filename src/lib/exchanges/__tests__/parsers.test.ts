import { describe, it, expect } from "vitest";
import { parseHyperliquidBook } from "../hyperliquid";
import { parseDydxBook } from "../dydx";
import { parseLighterBook } from "../lighter";
import { parseAsterdexBook } from "../asterdex";
import { parseBinanceBook } from "../binance";
import { parseBybitBook } from "../bybit";

describe("parseHyperliquidBook", () => {
  it("parses valid response", () => {
    const raw = {
      time: 1700000000000,
      levels: [
        [
          { px: "100.5", sz: "2.0" },
          { px: "100.0", sz: "5.0" },
        ],
        [
          { px: "101.0", sz: "3.0" },
          { px: "101.5", sz: "1.0" },
        ],
      ],
    };
    const book = parseHyperliquidBook(raw);
    expect(book.timestamp).toBe(1700000000000);
    // Bids sorted descending
    expect(book.bids[0].px).toBe(100.5);
    expect(book.bids[1].px).toBe(100);
    // Asks sorted ascending
    expect(book.asks[0].px).toBe(101);
    expect(book.asks[1].px).toBe(101.5);
  });

  it("filters out invalid levels", () => {
    const raw = {
      levels: [
        [
          { px: "100", sz: "1" },
          { px: "0", sz: "1" },
          { px: "NaN", sz: "1" },
          { px: "100", sz: "0" },
        ],
        [{ px: "101", sz: "1" }],
      ],
    };
    const book = parseHyperliquidBook(raw);
    expect(book.bids).toHaveLength(1);
    expect(book.bids[0].px).toBe(100);
  });

  it("throws on missing levels", () => {
    expect(() => parseHyperliquidBook({})).toThrow(
      "Invalid Hyperliquid order book response",
    );
  });

  it("throws on empty book after filtering", () => {
    const raw = {
      levels: [[{ px: "0", sz: "0" }], [{ px: "101", sz: "1" }]],
    };
    expect(() => parseHyperliquidBook(raw)).toThrow(
      "Hyperliquid order book is empty",
    );
  });
});

describe("parseDydxBook", () => {
  it("parses valid response", () => {
    const raw = {
      bids: [
        { price: "99.0", size: "3.0" },
        { price: "100.0", size: "2.0" },
      ],
      asks: [
        { price: "101.5", size: "1.5" },
        { price: "101.0", size: "4.0" },
      ],
    };
    const book = parseDydxBook(raw);
    // Bids sorted descending
    expect(book.bids[0].px).toBe(100);
    expect(book.bids[1].px).toBe(99);
    // Asks sorted ascending
    expect(book.asks[0].px).toBe(101);
    expect(book.asks[1].px).toBe(101.5);
  });

  it("throws on missing arrays", () => {
    expect(() => parseDydxBook({ bids: [] })).toThrow(
      "Invalid dYdX order book response",
    );
  });

  it("throws on empty book", () => {
    expect(() =>
      parseDydxBook({
        bids: [{ price: "0", size: "0" }],
        asks: [{ price: "101", size: "1" }],
      }),
    ).toThrow("dYdX order book is empty");
  });
});

describe("parseLighterBook", () => {
  it("parses and aggregates orders at same price", () => {
    const raw = {
      bids: [
        { price: "100", remaining_base_amount: "2" },
        { price: "100", remaining_base_amount: "3" },
        { price: "99", remaining_base_amount: "1" },
      ],
      asks: [{ price: "101", remaining_base_amount: "5" }],
    };
    const book = parseLighterBook(raw);
    // Two bids at px=100 should be aggregated to sz=5
    expect(book.bids[0].px).toBe(100);
    expect(book.bids[0].sz).toBe(5);
    expect(book.bids[1].px).toBe(99);
    expect(book.bids[1].sz).toBe(1);
  });

  it("throws on invalid response", () => {
    expect(() => parseLighterBook({})).toThrow(
      "Invalid Lighter order book response",
    );
  });
});

describe("parseAsterdexBook", () => {
  it("parses tuple format", () => {
    const raw = {
      T: 1700000000000,
      bids: [
        ["100.0", "5.0"],
        ["99.0", "3.0"],
      ],
      asks: [
        ["101.0", "2.0"],
        ["102.0", "1.0"],
      ],
    };
    const book = parseAsterdexBook(raw);
    expect(book.timestamp).toBe(1700000000000);
    expect(book.bids[0].px).toBe(100);
    expect(book.asks[0].px).toBe(101);
  });

  it("throws on invalid response", () => {
    expect(() => parseAsterdexBook(null)).toThrow(
      "Invalid AsterDEX order book response",
    );
  });
});

describe("parseBinanceBook", () => {
  it("parses tuple format", () => {
    const raw = {
      T: 1700000000000,
      bids: [
        ["50000.0", "0.5"],
        ["49999.0", "1.0"],
      ],
      asks: [
        ["50001.0", "0.3"],
        ["50002.0", "0.7"],
      ],
    };
    const book = parseBinanceBook(raw);
    expect(book.timestamp).toBe(1700000000000);
    expect(book.bids[0]).toEqual({ px: 50000, sz: 0.5 });
    expect(book.asks[0]).toEqual({ px: 50001, sz: 0.3 });
  });

  it("sorts bids descending and asks ascending", () => {
    const raw = {
      bids: [
        ["99", "1"],
        ["101", "1"],
        ["100", "1"],
      ],
      asks: [
        ["103", "1"],
        ["102", "1"],
        ["104", "1"],
      ],
    };
    const book = parseBinanceBook(raw);
    expect(book.bids.map((l) => l.px)).toEqual([101, 100, 99]);
    expect(book.asks.map((l) => l.px)).toEqual([102, 103, 104]);
  });

  it("throws on invalid response", () => {
    expect(() => parseBinanceBook({})).toThrow(
      "Invalid Binance order book response",
    );
  });
});

describe("parseBybitBook", () => {
  it("parses nested response format", () => {
    const raw = {
      retCode: 0,
      retMsg: "OK",
      result: {
        ts: 1700000000000,
        b: [
          ["100.0", "2.0"],
          ["99.0", "3.0"],
        ],
        a: [
          ["101.0", "1.5"],
          ["102.0", "4.0"],
        ],
      },
    };
    const book = parseBybitBook(raw);
    expect(book.timestamp).toBe(1700000000000);
    expect(book.bids[0]).toEqual({ px: 100, sz: 2 });
    expect(book.asks[0]).toEqual({ px: 101, sz: 1.5 });
  });

  it("throws on non-zero retCode", () => {
    const raw = {
      retCode: 10001,
      retMsg: "params error",
      result: { b: [], a: [] },
    };
    expect(() => parseBybitBook(raw)).toThrow("Bybit error: params error");
  });

  it("throws on missing result", () => {
    expect(() => parseBybitBook({ retCode: 0 })).toThrow(
      "Invalid Bybit order book response",
    );
  });

  it("throws on missing level arrays", () => {
    const raw = { retCode: 0, retMsg: "OK", result: { ts: 123 } };
    expect(() => parseBybitBook(raw)).toThrow(
      "Invalid Bybit order book levels",
    );
  });
});
