import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ComparisonChartPoint } from '../utils/marketLogic';
import { formatPKR, formatPercent } from '../utils/marketLogic';

interface ComparisonChartProps {
  data: ComparisonChartPoint[];
  symbolA: string;
  symbolB: string;
  mode: 'percent' | 'price';
}

export function ComparisonChart({
  data,
  symbolA,
  symbolB,
  mode,
}: ComparisonChartProps) {
  return (
    <div style={{ width: '100%', height: 320 }} data-testid="comparison-chart-container">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 24, left: 0, bottom: 8 }}>
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
            width={62}
            tickFormatter={(val: number) =>
              mode === 'percent' ? `${val > 0 ? '+' : ''}${val.toFixed(0)}%` : val.toFixed(0)
            }
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as ComparisonChartPoint;
              return (
                <div className="rounded-lg bg-[#151F19] border border-[#25332A] px-3.5 py-2.5 shadow-xl space-y-1.5">
                  <div className="font-mono text-[11px] text-[#89968D]">{label}</div>
                  <div className="flex items-center justify-between gap-4 font-mono text-xs">
                    <span className="text-[#39E879] font-semibold">{symbolA}</span>
                    <span className="text-[#F2F5F2]">
                      {mode === 'percent'
                        ? `${formatPercent(point.valueA)} (${formatPKR(point.rawPriceA)})`
                        : formatPKR(point.rawPriceA)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 font-mono text-xs">
                    <span className="text-[#8BE9A8] font-semibold">{symbolB}</span>
                    <span className="text-[#F2F5F2]">
                      {mode === 'percent'
                        ? `${formatPercent(point.valueB)} (${formatPKR(point.rawPriceB)})`
                        : formatPKR(point.rawPriceB)}
                    </span>
                  </div>
                </div>
              );
            }}
          />
          <Legend
            wrapperStyle={{
              fontFamily: 'JetBrains Mono',
              fontSize: '12px',
              paddingTop: '10px',
            }}
          />
          <Line
            type="monotone"
            dataKey="valueA"
            name={symbolA}
            stroke="#39E879"
            strokeWidth={2.2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="valueB"
            name={symbolB}
            stroke="#F2F5F2"
            strokeWidth={1.9}
            strokeDasharray="4 3"
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
