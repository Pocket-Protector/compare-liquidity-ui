"use client";

export function Header() {
  return (
    <header className="panel relative overflow-hidden px-6 py-8 sm:px-8 sm:py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-10 right-0 h-36 w-36 rounded-full bg-[color:var(--accent-soft)] blur-3xl" />
        <div className="absolute bottom-0 left-12 h-24 w-24 rounded-full bg-[rgba(35,214,183,0.12)] blur-2xl" />
      </div>

      <div className="relative z-10">
        <p className="label">Compare Liquidity across DEXs & CEXs</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-[var(--text-primary)] sm:text-5xl">
          Perps Liquidity Comparison
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-[var(--text-secondary)] sm:text-base">
          Comparison dashboard for spreads and depth across DEXs & CEXs
        </p>
      </div>
    </header>
  );
}
