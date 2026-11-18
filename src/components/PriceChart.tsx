import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PricePoint, TimeRange } from '../types/market';
import { formatNumber, formatPKR, formatPercent } from '../utils/marketLogic';

const TIME_RANGES: TimeRange[] = ['1D', '1W', '1M', '3M', '6M', '1Y', 'ALL'];

interface PriceChartProps {
  title: string;
  history: Record<TimeRange, PricePoint[]>;
  range: TimeRange;
  onRangeChange: (range: TimeRange) => void;
  unit?: 'PKR' | 'PTS';
  height?: number;
}

export function PriceChart({
  title,
  history,
  range,
  onRangeChange,
  unit = 'PKR',
  height = 340,
}: PriceChartProps) {
  const data = history[range] ?? [];
  const first = data[0]?.price ?? 0;
  const last = data[data.length - 1]?.price ?? 0;
  const delta = last - first;
  const deltaPct = first > 0 ? (delta / first) * 100 : 0;
  const isPositive = delta >= 0;
  const strokeColor = isPositive ? '#39E879' : '#F06B72';
  const gradientId = `priceGradient_${title.replace(/[^a-zA-Z0-9]/g, '')}_${isPositive ? 'pos' : 'neg'}`;

  return (
    <div className="rounded-xl bg-[#101713] border border-[#25332A] p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="font-display text-base font-semibold text-[#F2F5F2]">{title}</h2>
            <span className="text-xs text-[#89968D]">·</span>
            <span
              className={`font-mono text-xs font-medium ${
                isPositive ? 'text-[#39E879]' : 'text-[#F06B72]'
              }`}
            >
              {range} return: {formatPercent(deltaPct)}
            </span>
          </div>
        </div>

        <div
          role="group"
          aria-label="Chart timeframe selector"
          className="inline-flex items-center gap-1 p-1 rounded-lg bg-[#080B09] border border-[#25332A] self-start sm:self-auto"
        >
          {TIME_RANGES.map((r) => {
            const active = r === range;
            return (
              <button
                key={r}
                type="button"
                onClick={() => onRangeChange(r)}
                aria-pressed={active}
                className={`px-2.5 py-1 rounded-md font-mono text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#19251D] text-[#39E879] border border-[#39E879]/40'
                    : 'text-[#89968D] hover:text-[#F2F5F2] border border-transparent'
                }`}
              >
                {r}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ width: '100%', height }} data-testid="price-chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.22} />
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#25332A" strokeDasharray="3 3" vertical={false} opacity={0.6} />
            <XAxis
              dataKey="date"
              padding={{ left: 6, right: 14 }}
              tick={{ fill: '#89968D', fontSize: 11, fontFamily: 'JetBrains Mono' }}
              axisLine={{ stroke: '#25332A' }}
              tickLine={false}
              minTickGap={28}
            />
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fill: '#89968D', fontSize: 11, fontFamily: 'JetBrains Mono' }}
              axisLine={false}
              tickLine={false}
              width={68}
              tickFormatter={(val: number) =>
                unit === 'PTS' ? val.toLocaleString('en-US', { maximumFractionDigits: 0 }) : val.toFixed(0)
              }
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const val = Number(payload[0].value ?? 0);
                return (
                  <div className="rounded-lg bg-[#151F19] border border-[#25332A] px-3 py-2 shadow-xl">
                    <div className="font-mono text-[11px] text-[#89968D] mb-0.5">{label}</div>
                    <div className="font-mono text-sm font-semibold text-[#F2F5F2]">
                      {unit === 'PTS' ? `${formatNumber(val, 2)} pts` : formatPKR(val)}
                    </div>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke={strokeColor}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              activeDot={{ r: 4, fill: strokeColor, stroke: '#080B09', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
