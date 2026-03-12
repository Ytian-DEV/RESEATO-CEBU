import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AdminChartPoint } from "../../lib/api/admin.api";

function formatDayLabel(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return dateKey;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function toPeso(minor: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format((Number(minor) || 0) / 100);
}

type TooltipState = {
  x: number;
  y: number;
  point: AdminChartPoint;
};

export function ReservationsLineChart({ points }: { points: AdminChartPoint[] }) {
  const width = 780;
  const height = 280;
  const padX = 42;
  const padY = 26;
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const line = useMemo(() => {
    if (!points.length) return null;

    const values = points.map((point) => Number(point.total ?? 0));
    const maxValue = Math.max(1, ...values);

    const innerWidth = width - padX * 2;
    const innerHeight = height - padY * 2;
    const stepX = points.length > 1 ? innerWidth / (points.length - 1) : 0;

    const coords = values.map((value, index) => ({
      x: padX + index * stepX,
      y: padY + innerHeight - (value / maxValue) * innerHeight,
      point: points[index],
    }));

    const path = coords
      .map((coord, index) => `${index === 0 ? "M" : "L"} ${coord.x} ${coord.y}`)
      .join(" ");

    const area = `${path} L ${coords[coords.length - 1].x} ${padY + innerHeight} L ${coords[0].x} ${padY + innerHeight} Z`;

    const tickValues = Array.from({ length: 5 }, (_, index) =>
      Math.round((maxValue * (4 - index)) / 4),
    );

    return {
      coords,
      path,
      area,
      maxValue,
      tickValues,
      innerHeight,
      labelStep: Math.max(1, Math.floor(points.length / 6)),
    };
  }, [points]);

  if (!line) {
    return <div className="grid h-[280px] place-items-center text-sm text-[#8b97a8]">No chart data.</div>;
  }

  return (
    <div className="relative h-[280px] w-full" onMouseLeave={() => setTooltip(null)}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[280px] w-full">
        {line.tickValues.map((tick) => {
          const y = padY + line.innerHeight - (tick / line.maxValue) * line.innerHeight;
          return (
            <g key={`tick-${tick}`}>
              <line
                x1={padX}
                x2={width - padX}
                y1={y}
                y2={y}
                stroke="rgba(148,163,184,0.32)"
                strokeDasharray="3 4"
              />
              <text x={10} y={y + 4} fontSize="11" fill="rgba(100,116,139,0.8)">
                {tick}
              </text>
            </g>
          );
        })}

        <motion.path
          d={line.area}
          fill="rgba(183,106,115,0.16)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        />

        <motion.path
          d={line.path}
          fill="none"
          stroke="#8b3d4a"
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.75, ease: "easeOut" }}
        />

        {line.coords.map((coord, index) => (
          <motion.circle
            key={`dot-${coord.point.date}`}
            cx={coord.x}
            cy={coord.y}
            r="4"
            fill="#fdf2f4"
            stroke="#7f3a41"
            strokeWidth="1.2"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.08 + index * 0.014, duration: 0.2 }}
            onMouseEnter={() => setTooltip({ x: coord.x, y: coord.y, point: coord.point })}
          >
            <title>{`${coord.point.date}: ${coord.point.total} reservations`}</title>
          </motion.circle>
        ))}

        {line.coords.map((coord, index) => {
          if (index !== 0 && index !== line.coords.length - 1 && index % line.labelStep !== 0) {
            return null;
          }

          return (
            <text
              key={`label-${coord.point.date}`}
              x={coord.x}
              y={height - 8}
              textAnchor="middle"
              fontSize="10"
              fill="rgba(100,116,139,0.78)"
            >
              {formatDayLabel(coord.point.date)}
            </text>
          );
        })}
      </svg>

      {tooltip && (
        <div
          className="pointer-events-none absolute z-20 min-w-[190px] -translate-x-1/2 rounded-xl border border-[#d9c3c8] bg-white px-3 py-2 text-xs text-[#475467] shadow-[0_18px_40px_rgba(15,23,42,0.16)]"
          style={{
            left: `${(tooltip.x / width) * 100}%`,
            top: `${Math.max(8, (tooltip.y / height) * 100 - 5)}%`,
          }}
        >
          <div className="font-semibold text-[#1f2937]">{formatDayLabel(tooltip.point.date)}</div>
          <div className="mt-1">Total: {tooltip.point.total}</div>
          <div>Pending: {tooltip.point.pending}</div>
          <div>Confirmed: {tooltip.point.confirmed}</div>
          <div>Paid: {tooltip.point.paid}</div>
          <div>Revenue: {toPeso(tooltip.point.revenueMinor)}</div>
        </div>
      )}
    </div>
  );
}

export function CompletionBarChart({ points }: { points: AdminChartPoint[] }) {
  const width = 780;
  const height = 280;
  const padX = 42;
  const padY = 26;
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const bars = useMemo(() => {
    if (!points.length) return null;

    const maxValue = Math.max(
      1,
      ...points.map((point) => Math.max(Number(point.completed ?? 0), Number(point.cancelled ?? 0))),
    );

    const innerWidth = width - padX * 2;
    const innerHeight = height - padY * 2;
    const groupStep = innerWidth / Math.max(1, points.length);
    const barWidth = Math.max(3, Math.min(14, groupStep * 0.3));
    const gap = Math.max(2, barWidth * 0.35);

    const items = points.map((point, index) => {
      const centerX = padX + index * groupStep + groupStep / 2;
      const completed = Number(point.completed ?? 0);
      const cancelled = Number(point.cancelled ?? 0);
      const completedHeight = (completed / maxValue) * innerHeight;
      const cancelledHeight = (cancelled / maxValue) * innerHeight;

      return {
        point,
        index,
        completedX: centerX - barWidth - gap / 2,
        cancelledX: centerX + gap / 2,
        completedY: padY + innerHeight - completedHeight,
        cancelledY: padY + innerHeight - cancelledHeight,
        completedHeight,
        cancelledHeight,
      };
    });

    const tickValues = Array.from({ length: 5 }, (_, index) =>
      Math.round((maxValue * (4 - index)) / 4),
    );

    return {
      items,
      tickValues,
      maxValue,
      innerHeight,
      barWidth,
      labelStep: Math.max(1, Math.floor(points.length / 6)),
      baselineY: padY + innerHeight,
    };
  }, [points]);

  if (!bars) {
    return <div className="grid h-[280px] place-items-center text-sm text-[#8b97a8]">No chart data.</div>;
  }

  return (
    <div className="relative h-[280px] w-full" onMouseLeave={() => setTooltip(null)}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[280px] w-full">
        {bars.tickValues.map((tick) => {
          const y = padY + bars.innerHeight - (tick / bars.maxValue) * bars.innerHeight;
          return (
            <g key={`tick-${tick}`}>
              <line
                x1={padX}
                x2={width - padX}
                y1={y}
                y2={y}
                stroke="rgba(148,163,184,0.32)"
                strokeDasharray="3 4"
              />
              <text x={10} y={y + 4} fontSize="11" fill="rgba(100,116,139,0.8)">
                {tick}
              </text>
            </g>
          );
        })}

        {bars.items.map((item) => (
          <g key={`bars-${item.point.date}`}>
            <motion.rect
              x={item.completedX}
              y={bars.baselineY}
              width={bars.barWidth}
              height={0}
              rx={2}
              fill="#10b981"
              initial={{ y: bars.baselineY, height: 0 }}
              animate={{ y: item.completedY, height: item.completedHeight }}
              transition={{ duration: 0.45, delay: item.index * 0.01 }}
              onMouseEnter={() =>
                setTooltip({
                  x: item.completedX + bars.barWidth / 2,
                  y: item.completedY,
                  point: item.point,
                })
              }
            >
              <title>{`${item.point.date}: Completed ${item.point.completed}`}</title>
            </motion.rect>
            <motion.rect
              x={item.cancelledX}
              y={bars.baselineY}
              width={bars.barWidth}
              height={0}
              rx={2}
              fill="#fb7185"
              initial={{ y: bars.baselineY, height: 0 }}
              animate={{ y: item.cancelledY, height: item.cancelledHeight }}
              transition={{ duration: 0.45, delay: item.index * 0.01 + 0.05 }}
              onMouseEnter={() =>
                setTooltip({
                  x: item.cancelledX + bars.barWidth / 2,
                  y: item.cancelledY,
                  point: item.point,
                })
              }
            >
              <title>{`${item.point.date}: Cancelled ${item.point.cancelled}`}</title>
            </motion.rect>
          </g>
        ))}

        {bars.items.map((item, index) => {
          if (index !== 0 && index !== bars.items.length - 1 && index % bars.labelStep !== 0) {
            return null;
          }

          return (
            <text
              key={`label-${item.point.date}`}
              x={item.completedX + bars.barWidth + 2}
              y={height - 8}
              textAnchor="middle"
              fontSize="10"
              fill="rgba(100,116,139,0.78)"
            >
              {formatDayLabel(item.point.date)}
            </text>
          );
        })}
      </svg>

      {tooltip && (
        <div
          className="pointer-events-none absolute z-20 min-w-[210px] -translate-x-1/2 rounded-xl border border-[#d9c3c8] bg-white px-3 py-2 text-xs text-[#475467] shadow-[0_18px_40px_rgba(15,23,42,0.16)]"
          style={{
            left: `${(tooltip.x / width) * 100}%`,
            top: `${Math.max(8, (tooltip.y / height) * 100 - 5)}%`,
          }}
        >
          <div className="font-semibold text-[#1f2937]">{formatDayLabel(tooltip.point.date)}</div>
          <div className="mt-1">Completed: {tooltip.point.completed}</div>
          <div>Cancelled/Declined: {tooltip.point.cancelled}</div>
          <div>Total Reservations: {tooltip.point.total}</div>
          <div>Completion Share: {tooltip.point.total > 0 ? ((tooltip.point.completed / tooltip.point.total) * 100).toFixed(1) : "0.0"}%</div>
          <div>Cancellation Share: {tooltip.point.total > 0 ? ((tooltip.point.cancelled / tooltip.point.total) * 100).toFixed(1) : "0.0"}%</div>
        </div>
      )}
    </div>
  );
}
