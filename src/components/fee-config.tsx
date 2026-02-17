"use client";

import { useEffect, useRef, useState } from "react";
import { EXCHANGES, EXCHANGE_COLORS, EXCHANGE_LABELS } from "@/lib/constants";
import {
  DEFAULT_FEES,
  DYDX_ZERO_FEE_TICKERS,
  FEE_PAGE_URLS,
  getEffectiveFees,
} from "@/lib/fee-defaults";
import type { ExchangeKey, FeeConfig, FeeRole, TickerKey } from "@/lib/types";

/** Convert fee percentage (e.g. 0.05) to basis points (e.g. 5) */
function feePctToBps(pct: number): number {
  return pct * 100;
}

/* ── editable fee input — displays and accepts bps, stores as % ── */
function FeeInput({
  value,
  disabled,
  highlighted,
  onChange,
}: {
  /** Fee value stored as percentage (e.g. 0.05 means 0.05%) */
  value: number;
  disabled: boolean;
  highlighted: boolean;
  /** Callback receives the new value as percentage */
  onChange: (v: number) => void;
}) {
  const bps = feePctToBps(value);
  const [local, setLocal] = useState(bps === 0 ? "0" : bps.toFixed(2));
  const [focused, setFocused] = useState(false);

  const display = focused ? local : bps === 0 ? "0" : bps.toFixed(2);

  return (
    <input
      type="text"
      inputMode="decimal"
      className={`data-mono w-[5.5rem] rounded-md border px-2 py-1 text-right text-sm outline-none transition ${
        highlighted
          ? "border-[color:var(--accent)] bg-[var(--accent-soft)]"
          : "border-[color:var(--border)] bg-transparent"
      } ${
        disabled
          ? "cursor-not-allowed text-[var(--text-muted)] opacity-50"
          : "text-[var(--text-primary)] focus:border-[color:var(--accent)]"
      }`}
      value={display}
      disabled={disabled}
      onFocus={() => {
        setLocal(bps === 0 ? "0" : bps.toFixed(2));
        setFocused(true);
      }}
      onBlur={() => {
        setFocused(false);
        const parsed = parseFloat(local);
        const clampedBps = Number.isFinite(parsed)
          ? Math.max(0, Math.min(10_000, parsed))
          : 0;
        // convert bps back to percentage for storage
        onChange(clampedBps / 100);
      }}
      onChange={(e) => setLocal(e.target.value)}
    />
  );
}

/* ── fee summary pill with flash animation on value change ── */
function FeeBadge({
  exchange,
  bps,
  color,
}: {
  exchange: ExchangeKey;
  bps: number;
  color: string;
}) {
  const [flash, setFlash] = useState(false);
  const prevBps = useRef(bps);

  useEffect(() => {
    if (prevBps.current !== bps) {
      prevBps.current = bps;
      setFlash(true);
      const id = setTimeout(() => setFlash(false), 400);
      return () => clearTimeout(id);
    }
  }, [bps]);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-all duration-300 ${
        flash
          ? "border-[color:var(--accent)] bg-[var(--accent-soft)] scale-105"
          : "border-[color:var(--border)] bg-transparent scale-100"
      }`}
    >
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="font-medium text-[var(--text-muted)]">
        {EXCHANGE_LABELS[exchange]}
      </span>
      <span className="data-mono text-[var(--text-secondary)]">
        {bps === 0 ? "0" : bps.toFixed(2)}{" "}
        <span className="text-[var(--text-muted)]">bps</span>
      </span>
    </span>
  );
}

/* ── main component ── */
interface FeeConfigProps {
  ticker: TickerKey;
  feeConfig: FeeConfig;
  onFeeConfigChange: (config: FeeConfig) => void;
}

export function FeeConfigPanel({
  ticker,
  feeConfig,
  onFeeConfigChange,
}: FeeConfigProps) {
  const [expanded, setExpanded] = useState(false);
  const { enabled, activeRole, fees } = feeConfig;
  const isDydxAutoZero = DYDX_ZERO_FEE_TICKERS.includes(ticker);

  /* ── handlers ── */
  const toggleEnabled = () =>
    onFeeConfigChange({ ...feeConfig, enabled: !enabled });

  const setRole = (role: FeeRole) =>
    onFeeConfigChange({ ...feeConfig, activeRole: role });

  const updateFee = (exchange: ExchangeKey, role: FeeRole, value: number) => {
    const newOverrides = {
      ...feeConfig.overrides,
      [exchange]: { ...feeConfig.overrides[exchange], [role]: value },
    };
    onFeeConfigChange({
      ...feeConfig,
      overrides: newOverrides,
      fees: getEffectiveFees(newOverrides, ticker),
    });
  };

  const resetDefaults = () => {
    const fresh = { ...DEFAULT_FEES };
    onFeeConfigChange({
      ...feeConfig,
      overrides: fresh,
      fees: getEffectiveFees(fresh, ticker),
    });
  };

  return (
    <div className="space-y-2">
      {/* ── collapsed bar ── */}
      <div className="flex flex-wrap items-center gap-3">
        <p className="label select-none">Fees</p>

        {/* toggle switch */}
        <button
          role="switch"
          aria-checked={enabled}
          onClick={toggleEnabled}
          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${
            enabled ? "bg-[var(--accent)]" : "bg-[color:rgba(141,168,213,0.24)]"
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
              enabled ? "translate-x-[1.125rem]" : "translate-x-0.5"
            }`}
          />
        </button>

        {/* edit button */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={`rounded-lg border border-[color:var(--border)] px-3 py-1 text-xs font-medium transition hover:border-[color:var(--border-strong)] hover:text-[var(--text-primary)] ${
            expanded ? "text-[var(--accent)]" : "text-[var(--text-secondary)]"
          } ${!enabled ? "pointer-events-none opacity-40" : ""}`}
        >
          {expanded ? "Done" : "Edit"}
        </button>

        {/* maker/taker segmented toggle */}
        <div
          className={`inline-flex rounded-full border border-[color:var(--border)] p-0.5 transition ${
            !enabled ? "pointer-events-none opacity-40" : ""
          }`}
        >
          {(["maker", "taker"] as const).map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setRole(role)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition ${
                activeRole === role
                  ? "bg-[var(--accent)] text-white shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {role}
            </button>
          ))}
        </div>

        {/* fee summary badges */}
        <div
          className={`flex flex-wrap items-center gap-1.5 transition ${
            !enabled ? "pointer-events-none opacity-40" : ""
          }`}
        >
          {EXCHANGES.map((ex) => (
            <FeeBadge
              key={ex}
              exchange={ex}
              bps={feePctToBps(fees[ex][activeRole])}
              color={EXCHANGE_COLORS[ex]}
            />
          ))}
        </div>
      </div>

      {/* ── expanded edit panel ── */}
      {expanded && enabled && (
        <div className="card-surface overflow-hidden p-3">
          {/* desktop table */}
          <div className="hidden sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[0.65rem] uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="pb-2 font-semibold">Exchange</th>
                  <th
                    className={`pb-2 font-semibold ${
                      activeRole === "maker" ? "text-[var(--accent)]" : ""
                    }`}
                  >
                    Maker (bps)
                  </th>
                  <th
                    className={`pb-2 font-semibold ${
                      activeRole === "taker" ? "text-[var(--accent)]" : ""
                    }`}
                  >
                    Taker (bps)
                  </th>
                  <th className="pb-2 font-semibold">Fee Page</th>
                </tr>
              </thead>
              <tbody>
                {EXCHANGES.map((ex) => {
                  const color = EXCHANGE_COLORS[ex];
                  const url = FEE_PAGE_URLS[ex];

                  return (
                    <tr
                      key={ex}
                      className="border-t border-[color:var(--border)]"
                    >
                      <td className="py-2 pr-4">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <span className="font-medium text-[var(--text-primary)]">
                            {EXCHANGE_LABELS[ex]}
                          </span>
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        <FeeInput
                          value={fees[ex].maker}
                          disabled={false}
                          highlighted={activeRole === "maker"}
                          onChange={(v) => updateFee(ex, "maker", v)}
                        />
                      </td>
                      <td className="py-2 pr-4">
                        <FeeInput
                          value={fees[ex].taker}
                          disabled={false}
                          highlighted={activeRole === "taker"}
                          onChange={(v) => updateFee(ex, "taker", v)}
                        />
                      </td>
                      <td className="py-2">
                        {url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[var(--accent)] hover:underline"
                          >
                            View fees &rarr;
                          </a>
                        ) : (
                          <span className="text-xs text-[var(--text-muted)]">
                            &mdash;
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* mobile cards */}
          <div className="space-y-3 sm:hidden">
            {EXCHANGES.map((ex) => {
              const color = EXCHANGE_COLORS[ex];
              const url = FEE_PAGE_URLS[ex];

              return (
                <div
                  key={ex}
                  className="space-y-2 rounded-lg border border-[color:var(--border)] p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {EXCHANGE_LABELS[ex]}
                      </span>
                    </span>
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[var(--accent)] hover:underline"
                      >
                        View fees &rarr;
                      </a>
                    ) : null}
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <p
                        className={`mb-1 text-[0.6rem] font-semibold uppercase tracking-wider ${
                          activeRole === "maker"
                            ? "text-[var(--accent)]"
                            : "text-[var(--text-muted)]"
                        }`}
                      >
                        Maker
                      </p>
                      <FeeInput
                        value={fees[ex].maker}
                        disabled={false}
                        highlighted={activeRole === "maker"}
                        onChange={(v) => updateFee(ex, "maker", v)}
                      />
                    </div>
                    <div className="flex-1">
                      <p
                        className={`mb-1 text-[0.6rem] font-semibold uppercase tracking-wider ${
                          activeRole === "taker"
                            ? "text-[var(--accent)]"
                            : "text-[var(--text-muted)]"
                        }`}
                      >
                        Taker
                      </p>
                      <FeeInput
                        value={fees[ex].taker}
                        disabled={false}
                        highlighted={activeRole === "taker"}
                        onChange={(v) => updateFee(ex, "taker", v)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* footer */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[color:var(--border)] pt-3">
            <div className="text-xs text-[var(--text-muted)]">
              {isDydxAutoZero && (
                <span>* dYdX: {ticker} defaults to 0 bps (rebate program)</span>
              )}
            </div>
            <button
              type="button"
              onClick={resetDefaults}
              className="rounded-lg border border-[color:var(--border)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[color:var(--border-strong)] hover:text-[var(--text-primary)]"
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
