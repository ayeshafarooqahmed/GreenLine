import * as d3 from 'd3';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AiBriefResponse, MarketOverviewResponse, SentimentPoint } from '../types/market';
import { deriveDailySentimentSeries } from '../utils/marketLogic';

interface D3SentimentChartProps {
  overview: MarketOverviewResponse | null;
  brief: AiBriefResponse | null;
}

export function D3SentimentChart({ overview, brief }: D3SentimentChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const series = useMemo(() => {
    if (!overview) return [];
    const kseSeries = overview.kse100History['1M'] ?? [];
    return deriveDailySentimentSeries(
      kseSeries,
      overview.advancersCount,
      overview.declinersCount,
      brief
    );
  }, [overview, brief]);

  const activePoint =
    (hoveredDate ? series.find((p) => p.date === hoveredDate) : null) ??
    series[series.length - 1] ??
    null;

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || series.length === 0) return;

    const width = 760;
    const height = 250;
    const margin = { top: 20, right: 24, bottom: 32, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const defs = svg.append('defs');
    const gradient = defs
      .append('linearGradient')
      .attr('id', 'd3-sentiment-area-grad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    gradient.append('stop').attr('offset', '0%').attr('stop-color', '#39E879').attr('stop-opacity', 0.28);
    gradient.append('stop').attr('offset', '100%').attr('stop-color', '#39E879').attr('stop-opacity', 0.0);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3
      .scalePoint<string>()
      .domain(series.map((d) => d.date))
      .range([0, innerWidth])
      .padding(0.25);

    const y = d3.scaleLinear().domain([10, 95]).range([innerHeight, 0]);

    // Horizontal gridlines
    const ticks = [25, 50, 75];
    g.selectAll('.sentiment-grid')
      .data(ticks)
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => y(d))
      .attr('y2', (d) => y(d))
      .attr('stroke', (d) => (d === 50 ? '#35493C' : '#25332A'))
      .attr('stroke-dasharray', (d) => (d === 50 ? '4,4' : '2,3'))
      .attr('stroke-width', 1);

    // Axes
    const xAxis = d3
      .axisBottom(x)
      .tickValues(
        series
          .filter((_, idx) => idx === 0 || idx === series.length - 1 || idx % 3 === 0)
          .map((d) => d.date)
      )
      .tickSize(0)
      .tickPadding(10);

    const yAxis = d3.axisLeft(y).tickValues([25, 50, 75]).tickSize(0).tickPadding(10);

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .call((axis) => axis.select('.domain').attr('stroke', '#25332A'))
      .selectAll('text')
      .attr('fill', '#89968D')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('font-size', '10px');

    g.append('g')
      .call(yAxis)
      .call((axis) => axis.select('.domain').remove())
      .selectAll('text')
      .attr('fill', '#89968D')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('font-size', '10px');

    // Area + Line
    const areaGen = d3
      .area<SentimentPoint>()
      .x((d) => x(d.date) ?? 0)
      .y0(innerHeight)
      .y1((d) => y(d.score))
      .curve(d3.curveMonotoneX);

    const lineGen = d3
      .line<SentimentPoint>()
      .x((d) => x(d.date) ?? 0)
      .y((d) => y(d.score))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(series)
      .attr('fill', 'url(#d3-sentiment-area-grad)')
      .attr('d', areaGen);

    g.append('path')
      .datum(series)
      .attr('fill', 'none')
      .attr('stroke', '#39E879')
      .attr('stroke-width', 2.4)
      .attr('d', lineGen);

    // Data nodes
    g.selectAll('.sentiment-node')
      .data(series)
      .enter()
      .append('circle')
      .attr('class', 'sentiment-node')
      .attr('tabindex', 0)
      .attr('aria-label', (d) => `${d.date}: ${d.score}/100 ${d.label}`)
      .attr('cx', (d) => x(d.date) ?? 0)
      .attr('cy', (d) => y(d.score))
      .attr('r', (d) => (d.source === 'AI Brief' ? 5.5 : 3.2))
      .attr('fill', (d) =>
        d.source === 'AI Brief'
          ? '#39E879'
          : d.score >= 50
            ? '#8BE9A8'
            : '#F06B72'
      )
      .attr('stroke', '#080B09')
      .attr('stroke-width', 1.6)
      .style('cursor', 'pointer')
      .on('mouseenter', (_event, d) => setHoveredDate(d.date))
      .on('focus', (_event, d) => setHoveredDate(d.date));
  }, [series]);

  if (!overview || series.length === 0) {
    return (
      <div className="h-64 rounded-xl bg-[#101713] border border-[#25332A] animate-pulse" />
    );
  }

  return (
    <section
      aria-labelledby="d3-sentiment-heading"
      className="rounded-xl bg-[#101713] border border-[#25332A] p-6 space-y-4"
      data-testid="d3-sentiment-chart"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2
            id="d3-sentiment-heading"
            className="font-display text-lg font-semibold text-[#F2F5F2]"
          >
            Daily Market Sentiment Trend
          </h2>
          <p className="text-xs text-[#89968D] mt-0.5">
            D3 visualization combining KSE-100 session breadth with{' '}
            {brief ? 'active Gemini AI Brief scoring' : 'historical breadth (generate AI Brief to score today)'}.
          </p>
        </div>

        {activePoint && (
          <div className="flex items-center gap-3 px-3.5 py-2 rounded-lg bg-[#151F19] border border-[#25332A] text-xs font-mono">
            <span className="text-[#89968D]">{activePoint.date}</span>
            <span aria-hidden="true" className="text-[#25332A]">|</span>
            <span
              className={`font-semibold ${
                activePoint.score >= 50 ? 'text-[#39E879]' : 'text-[#F06B72]'
              }`}
            >
              {activePoint.score}/100 ({activePoint.label})
            </span>
            <span aria-hidden="true" className="text-[#25332A]">|</span>
            <span className="text-[#8BE9A8]">{activePoint.source}</span>
          </div>
        )}
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox="0 0 760 250"
          role="img"
          aria-label="D3 line chart showing 14-day PSX market sentiment trend"
          className="w-full h-auto min-w-[460px]"
        />
      </div>

      {activePoint && (
        <div className="pt-3 border-t border-[#25332A]/70 flex flex-wrap items-center justify-between gap-2 text-xs text-[#89968D]">
          <span>
            Driver ({activePoint.date}): <span className="text-[#F2F5F2]">{activePoint.note}</span>
          </span>
          <span className="font-mono text-[11px]">50 = Neutral Baseline</span>
        </div>
      )}
    </section>
  );
}
