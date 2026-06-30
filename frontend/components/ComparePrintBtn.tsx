"use client";

export default function ComparePrintBtn({ label }: { label: string }) {
  return (
    <button className="cmp-print-btn" onClick={() => window.print()}>
      ⬇ {label}
    </button>
  );
}
