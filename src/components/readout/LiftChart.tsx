"use client";

// Cumulative lift over time with its confidence band, drawn as plain SVG (no chart library).
// Reading it: the line is the lift if you had stopped on that day; the band is the 95% (or chosen) range.
// When the band sits fully above zero, a peeking team would have called a win; amber dots mark those days.
import { useEffect, useRef, useState } from "react";
import type { CumulativePoint } from "@/lib/stats";
import { shortDate, spts } from "./format";

const H = 300;
const M = { top: 16, right: 14, bottom: 30, left: 46 };

export default function LiftChart({ series, plannedPerVariant }: { series: CumulativePoint[]; plannedPerVariant: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(600);
  const [active, setActive] = useState<number | null>(null);

  // Measure the real width so text stays readable on a phone instead of shrinking with a fixed viewBox.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(Math.max(260, el.clientWidth)));
    ro.observe(el);
    setW(Math.max(260, el.clientWidth));
    return () => ro.disconnect();
  }, []);

  const n = series.length;
  const pts = series.map((p) => ({ ...p, low: p.absLiftLow * 100, high: p.absLiftHigh * 100, mid: p.absLift * 100 }));
  let yMin = Math.min(0, ...pts.map((p) => p.low));
  let yMax = Math.max(0, ...pts.map((p) => p.high));
  const pad = (yMax - yMin) * 0.08 || 1;
  yMin -= pad;
  yMax += pad;

  const iw = w - M.left - M.right;
  const ih = H - M.top - M.bottom;
  const x = (i: number) => M.left + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => M.top + ((yMax - v) / (yMax - yMin)) * ih;

  const band =
    pts.map((p, i) => `${x(i)},${y(p.high)}`).join(" ") + " " + [...pts].map((p, i) => ({ p, i })).reverse().map(({ p, i }) => `${x(i)},${y(p.low)}`).join(" ");
  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.mid)}`).join(" ");

  // First day on which both arms have the planned sample; the plan says "decide here, not before".
  const planIdx = series.findIndex((p) => Math.min(p.usersA, p.usersB) >= plannedPerVariant);

  const step = (yMax - yMin) / 4;
  const yTicks = Array.from({ length: 5 }, (_, k) => yMin + k * step);
  const xTickIdx = Array.from(new Set([0, ...[1, 2, 3].map((k) => Math.round((k * (n - 1)) / 4)), n - 1]));

  const shown = active ?? n - 1;
  const cur = pts[shown];

  function move(e: React.PointerEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - r.left - M.left) / iw;
    setActive(Math.min(n - 1, Math.max(0, Math.round(rel * (n - 1)))));
  }

  return (
    <div ref={box} className="w-full">
      <p className="min-h-10 text-sm text-zinc-600 dark:text-zinc-400" aria-live="polite">
        <span className="font-medium text-foreground">{shortDate(cur.date)}:</span> lift {spts(cur.mid / 100)}, range {spts(cur.low / 100)} to {spts(cur.high / 100)}
        {cur.low > 0 || cur.high < 0 ? " (range excludes zero)" : " (range includes zero)"}
      </p>
      <svg
        width={w}
        height={H}
        role="img"
        aria-label="Cumulative lift over time with confidence band"
        className="touch-pan-y select-none"
        onPointerMove={move}
        onPointerDown={move}
        onPointerLeave={() => setActive(null)}
      >
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={M.left} x2={w - M.right} y1={y(t)} y2={y(t)} className="stroke-zinc-200 dark:stroke-zinc-800" />
            <text x={M.left - 6} y={y(t)} textAnchor="end" dominantBaseline="middle" className="fill-zinc-500 text-[11px]">
              {t.toFixed(1)}
            </text>
          </g>
        ))}
        <line x1={M.left} x2={w - M.right} y1={y(0)} y2={y(0)} className="stroke-zinc-500" strokeDasharray="4 3" />
        <polygon points={band} className="fill-sky-500/20" />
        {planIdx >= 0 && (
          <g>
            <line x1={x(planIdx)} x2={x(planIdx)} y1={M.top} y2={H - M.bottom} className="stroke-emerald-600" strokeDasharray="2 3" />
            <text x={x(planIdx) - 4} y={M.top + 10} textAnchor="end" className="fill-emerald-700 text-[11px] dark:fill-emerald-400">planned sample reached</text>
          </g>
        )}
        <path d={line} fill="none" className="stroke-sky-600 dark:stroke-sky-400" strokeWidth={2} />
        {pts.map((p, i) =>
          p.low > 0 || p.high < 0 ? <circle key={p.date} cx={x(i)} cy={y(p.mid)} r={3.5} className="fill-amber-500" /> : null,
        )}
        {xTickIdx.map((i) => (
          <text key={i} x={x(i)} y={H - 10} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} className="fill-zinc-500 text-[11px]">
            {shortDate(pts[i].date)}
          </text>
        ))}
        <text x={12} y={M.top + ih / 2} transform={`rotate(-90 12 ${M.top + ih / 2})`} textAnchor="middle" className="fill-zinc-500 text-[11px]">
          lift (rate points)
        </text>
        <line x1={x(shown)} x2={x(shown)} y1={M.top} y2={H - M.bottom} className="stroke-zinc-400" />
        <circle cx={x(shown)} cy={y(cur.mid)} r={4.5} className="fill-sky-600 stroke-white dark:fill-sky-400 dark:stroke-zinc-900" strokeWidth={2} />
      </svg>
      <p className="mt-2 text-xs text-zinc-500">
        Line: lift if you had stopped that day. Shaded: confidence range. <span className="text-amber-600">Amber dots</span>: days a peeking team would have seen a &quot;significant&quot; result.
        Tap or hover for values.
      </p>
    </div>
  );
}
