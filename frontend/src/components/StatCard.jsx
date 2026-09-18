export default function StatCard({ label, value, color, foot }) {
  return (
    <div className="stat">
      <div className="accent" style={{ background: color }} />
      <div className="label">{label}</div>
      <div className="value" style={{ color }}>
        {value}
      </div>
      <div className="foot">{foot || ''}</div>
    </div>
  )
}
