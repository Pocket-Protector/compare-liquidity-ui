"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EXCHANGES, EXCHANGE_LABELS, TRACKED_TICKERS } from "@/lib/constants";
import type { TickerKey } from "@/lib/types";

interface TickerSelectorProps {
  value: TickerKey;
  onChange: (ticker: TickerKey) => void;
  label?: string;
  allowedTickers?: readonly TickerKey[];
}

export function TickerSelector({
  value,
  onChange,
  label = "Ticker",
  allowedTickers,
}: TickerSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  const baseTickers = useMemo(() => {
    if (!allowedTickers || allowedTickers.length === 0) {
      return TRACKED_TICKERS;
    }

    const allowedSet = new Set(
      allowedTickers.map((ticker) => ticker.toUpperCase()),
    );
    return TRACKED_TICKERS.filter((row) =>
      allowedSet.has(row.ticker.toUpperCase()),
    );
  }, [allowedTickers]);

  const filteredTickers = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return baseTickers;
    return baseTickers.filter((row) =>
      row.ticker.toLowerCase().includes(trimmed),
    );
  }, [baseTickers, query]);

  const onSelect = (ticker: TickerKey) => {
    onChange(ticker);
    setIsOpen(false);
    setQuery("");
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-sm">
      <p className="label mb-2">{label}</p>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="card-surface flex w-full items-center justify-between px-4 py-3 text-left transition hover:border-[color:var(--border-strong)]"
      >
        <span className="data-mono text-lg font-medium text-[var(--text-primary)]">
          {value}
        </span>
        <span className="text-xs text-[var(--text-secondary)]">
          {isOpen ? "Close" : "Select"}
        </span>
      </button>

      {isOpen ? (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-secondary)] shadow-[0_18px_35px_rgba(2,8,20,0.66)]">
          <div className="border-b border-[color:var(--border)] p-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search ticker"
              className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition focus:border-[color:var(--accent)]"
            />
          </div>

          <ul className="max-h-56 overflow-y-auto p-2">
            {filteredTickers.length === 0 ? (
              <li className="rounded-md px-3 py-2 text-sm text-[var(--text-muted)]">
                No tickers found.
              </li>
            ) : (
              filteredTickers.map((row) => {
                const ticker = row.ticker;
                const mappedSymbols = EXCHANGES.map(
                  (exchange) =>
                    `${EXCHANGE_LABELS[exchange]}: ${row.symbols[exchange]}`,
                ).join(" | ");

                return (
                  <li key={ticker}>
                    <button
                      type="button"
                      onClick={() => onSelect(ticker)}
                      className={`w-full rounded-md px-3 py-2 text-left transition hover:bg-[color:rgba(79,140,255,0.18)] ${
                        ticker === value
                          ? "bg-[color:rgba(79,140,255,0.2)]"
                          : ""
                      }`}
                    >
                      <p className="data-mono text-sm font-medium text-[var(--text-primary)]">
                        {ticker}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {mappedSymbols}
                      </p>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
