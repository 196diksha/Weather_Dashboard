export default function MetricCard({ title, value, unit, hint }) {
  return (
    <article className="metric-card">
      <p className="metric-title">{title}</p>
      <p className="metric-value">
        {value}
        {unit ? <span className="metric-unit"> {unit}</span> : null}
      </p>
      {hint ? <p className="metric-hint">{hint}</p> : null}
    </article>
  );
}
