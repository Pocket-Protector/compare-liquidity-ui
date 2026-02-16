"use client";

import { useEffect, useRef, useState } from "react";

export type ConsoleMode = "realtime" | "historical";

interface ModeSelectorProps {
  value: ConsoleMode;
  onChange: (mode: ConsoleMode) => void;
  label?: string;
}

const MODE_OPTIONS: Array<{ value: ConsoleMode; label: string }> = [
  { value: "realtime", label: "Realtime" },
  { value: "historical", label: "Historical" },
];

export function ModeSelector({ value, onChange, label = "Mode" }: ModeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
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

  const selected = MODE_OPTIONS.find((option) => option.value === value) ?? MODE_OPTIONS[0];

  return (
    <div ref={wrapperRef} className="relative w-full max-w-sm">
      <p className="label mb-2">{label}</p>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="card-surface flex w-full items-center justify-between px-4 py-3 text-left transition hover:border-[color:var(--border-strong)]"
      >
        <span className="data-mono text-lg font-medium text-[var(--text-primary)]">{selected.label}</span>
        <span className="text-xs text-[var(--text-secondary)]">{isOpen ? "Close" : "Select"}</span>
      </button>

      {isOpen ? (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-secondary)] shadow-[0_18px_35px_rgba(2,8,20,0.66)]">
          <ul className="p-2">
            {MODE_OPTIONS.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm transition hover:bg-[color:rgba(79,140,255,0.18)] ${
                    option.value === value ? "bg-[color:rgba(79,140,255,0.2)] text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                  }`}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
