import { useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';

export default function ChartCard({ title, subtitle, option, points = 24, legendItems = [] }) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 560);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 560);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const minWidth = useMemo(() => {
    const pointWidth = isMobile ? 24 : 34;
    const minBase = isMobile ? 300 : 420;
    return Math.max(minBase, Math.min(2400, points * pointWidth));
  }, [isMobile, points]);

  const chartHeight = isMobile ? 252 : 320;

  return (
    <section className="chart-card">
      <div className="chart-header">
        <h3>{title}</h3>
        {subtitle ? <p>{subtitle}</p> : null}
        {legendItems.length > 1 ? (
          <div className="chart-legend" aria-hidden="true">
            {legendItems.map((item) => (
              <span key={item.name} className="legend-chip">
                <span className="legend-dot" style={{ backgroundColor: item.color }} />
                {item.name}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="chart-scroll">
        <div style={{ minWidth: `${minWidth}px` }}>
          <ReactECharts option={option} style={{ height: `${chartHeight}px`, width: '100%' }} notMerge lazyUpdate />
        </div>
      </div>
    </section>
  );
}
