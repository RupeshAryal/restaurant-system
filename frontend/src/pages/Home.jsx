import { useEffect, useState } from 'react'
import { useApi } from '../useApi.js'
import { useModal } from '../ModalContext.jsx'
import { useToast } from '../ToastContext.jsx'
import StatCard from '../components/StatCard.jsx'
import DailySalesForm from '../forms/DailySalesForm.jsx'
import ExpenseForm from '../forms/ExpenseForm.jsx'
import { fmt, fmtNum, monthAgoStr, todayStr } from '../format.js'

const PAGE_SIZE = 20

export default function Home({ refreshKey, onDataChanged }) {
  const api = useApi()
  const { openModal } = useModal()
  const { notify } = useToast()
  const [summary, setSummary] = useState(null)
  const [ledgerRows, setLedgerRows] = useState(null)
  const [ledgerTotal, setLedgerTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setError('')
    Promise.all([api(`/api/dashboard/summary?start_date=${monthAgoStr()}&end_date=${todayStr()}`), api(`/api/ledger?limit=${PAGE_SIZE}&offset=0`)])
      .then(([s, l]) => {
        if (cancelled) return
        setSummary(s)
        setLedgerRows(l.rows)
        setLedgerTotal(l.total)
        setHasMore(l.has_more)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message)
          notify(err.message, 'error')
        }
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey])

  async function loadMore() {
    setLoadingMore(true)
    try {
      const l = await api(`/api/ledger?limit=${PAGE_SIZE}&offset=${ledgerRows.length}`)
      setLedgerRows((rows) => [...rows, ...l.rows])
      setLedgerTotal(l.total)
      setHasMore(l.has_more)
    } catch (err) {
      notify(err.message, 'error')
    } finally {
      setLoadingMore(false)
    }
  }

  if (error) return <div className="empty">Couldn't load data: {error}</div>
  if (!summary || !ledgerRows) return <div className="empty">Loading…</div>

  const avgSpendFoot = summary.avg_spend_per_guest >= 1 ? `${fmt(summary.avg_spend_per_guest)} / guest` : ''

  return (
    <>
      <div className="stat-grid">
        <StatCard label="Sales (30d)" value={fmt(summary.total_sales)} color="var(--green)" foot={`${fmtNum(summary.days_recorded)} days logged`} />
        <StatCard label="Expenses (30d)" value={fmt(summary.total_expenses)} color="var(--red)" foot="shopping + bills + salary" />
        <StatCard
          label="Profit (30d)"
          value={fmt(summary.profit)}
          color={summary.profit >= 0 ? 'var(--green)' : 'var(--red)'}
          foot={`${summary.profit_margin_pct.toFixed(1)}% margin`}
        />
        <StatCard label="Avg. daily sales" value={fmt(summary.avg_daily_sales)} color="var(--ink)" foot={avgSpendFoot} />
      </div>

      <div className="row-flex" style={{ marginBottom: 18 }}>
        <button className="btn" onClick={() => openModal(<DailySalesForm onSaved={onDataChanged} />)}>
          + Add daily sales
        </button>
        <button className="btn btn-outline" onClick={() => openModal(<ExpenseForm onSaved={onDataChanged} />)}>
          + Add expense
        </button>
      </div>

      <div className="section-title">
        <h2>Recent ledger</h2>
        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          Showing {ledgerRows.length} of {fmtNum(ledgerTotal)} entries
        </span>
      </div>
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <LedgerTable rows={ledgerRows} />
      </div>
      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <button className="btn btn-outline" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </>
  )
}

function LedgerTable({ rows }) {
  if (!rows.length) return <div className="empty">No entries yet. Add your first daily sales or expense to get started.</div>
  return (
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Type</th>
          <th>Category</th>
          <th>Description</th>
          <th style={{ textAlign: 'right' }}>Amount</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.ref}>
            <td>{r.date}</td>
            <td>
              <span className={`tag ${r.type === 'income' ? 'tag-income' : 'tag-expense'}`}>{r.type === 'income' ? 'Income' : 'Expense'}</span>
            </td>
            <td>{r.category}</td>
            <td style={{ whiteSpace: 'normal', minWidth: 180 }}>{r.description || ''}</td>
            <td className={`num ${r.type === 'income' ? 'amt-income' : 'amt-expense'}`} style={{ textAlign: 'right' }}>
              {r.type === 'income' ? '+' : '−'} {fmt(r.amount)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
