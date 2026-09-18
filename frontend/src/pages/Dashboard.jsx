import { useEffect, useState } from 'react'
import { Chart, Doughnut } from 'react-chartjs-2'
import '../chartSetup.js'
import { useApi } from '../useApi.js'
import { useToast } from '../ToastContext.jsx'
import { API_BASE, getToken } from '../api.js'
import StatCard from '../components/StatCard.jsx'
import { fmt, fmtNum, monthAgoStr, todayStr } from '../format.js'

export default function Dashboard({ refreshKey }) {
  const api = useApi()
  const { notify } = useToast()
  const [start, setStart] = useState(monthAgoStr())
  const [end, setEnd] = useState(todayStr())
  const [summary, setSummary] = useState(null)
  const [monthly, setMonthly] = useState(null)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    load(start, end)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey])

  async function load(s, e) {
    setError('')
    try {
      const [sm, mo] = await Promise.all([api(`/api/dashboard/summary?start_date=${s}&end_date=${e}`), api('/api/dashboard/monthly?months=12')])
      setSummary(sm)
      setMonthly(mo)
    } catch (err) {
      setError(err.message)
      notify(err.message, 'error')
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const res = await fetch(`${API_BASE}/api/export/excel?start_date=${start}&end_date=${end}`, {
        headers: { Authorization: 'Bearer ' + getToken() },
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `restaurant_report_${start}_${end}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      notify(err.message, 'error')
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <div className="pill-filters">
        <div className="field" style={{ width: 160, marginBottom: 0 }}>
          <label>From</label>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="field" style={{ width: 160, marginBottom: 0 }}>
          <label>To</label>
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <div className="field" style={{ width: 'auto', marginBottom: 0, alignSelf: 'end' }}>
          <button className="btn btn-outline" onClick={() => load(start, end)}>
            Apply
          </button>
        </div>
        <div className="field" style={{ width: 'auto', marginBottom: 0, alignSelf: 'end' }}>
          <button className="btn" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export to Excel'}
          </button>
        </div>
      </div>

      {error && <div className="empty">Couldn't load data: {error}</div>}

      {summary && monthly && (
        <>
          <div className="stat-grid">
            <StatCard label="Total sales" value={fmt(summary.total_sales)} color="var(--green)" foot={`${fmtNum(summary.total_guests)} guests served`} />
            <StatCard label="Total expenses" value={fmt(summary.total_expenses)} color="var(--red)" foot="incl. shopping &amp; salary" />
            <StatCard
              label="Profit"
              value={fmt(summary.profit)}
              color={summary.profit >= 0 ? 'var(--green)' : 'var(--red)'}
              foot={`${summary.profit_margin_pct.toFixed(1)}% margin`}
            />
            <StatCard
              label="Avg. monthly profit"
              value={fmt(monthly.avg_monthly_profit)}
              color="var(--ink)"
              foot={`Avg. monthly sales ${fmt(monthly.avg_monthly_sales)}`}
            />
          </div>
          <div className="grid-2">
            <div className="card">
              <div className="section-title">
                <h2>Monthly sales &amp; profit</h2>
              </div>
              <div className="chart-box">
                <SalesChart months={monthly.months} />
              </div>
            </div>
            <div className="card">
              <div className="section-title">
                <h2>Payment method breakdown</h2>
              </div>
              <div className="chart-box">
                <BreakdownChart breakdown={summary.payment_breakdown} />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

function SalesChart({ months }) {
  const data = {
    labels: months.map((m) => m.month),
    datasets: [
      { type: 'bar', label: 'Sales', data: months.map((m) => m.sales), backgroundColor: '#3C6B52', borderRadius: 3, order: 2 },
      { type: 'line', label: 'Profit', data: months.map((m) => m.profit), borderColor: '#AB4234', backgroundColor: '#AB4234', tension: 0.3, order: 1 },
    ],
  }
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } },
    scales: { y: { ticks: { callback: (v) => '¥' + v / 1000 + 'k' } }, x: { grid: { display: false } } },
  }
  return <Chart type="bar" data={data} options={options} />
}

function BreakdownChart({ breakdown }) {
  const data = {
    labels: ['Cash', 'Card', 'Uber', 'Rocket'],
    datasets: [{ data: [breakdown.cash, breakdown.credit_card, breakdown.uber, breakdown.rocket], backgroundColor: ['#1C2438', '#3C6B52', '#AB4234', '#9c7423'] }],
  }
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } },
  }
  return <Doughnut data={data} options={options} />
}
