import { useEffect, useState } from 'react'
import { useApi } from '../useApi.js'
import { useModal } from '../ModalContext.jsx'
import { useToast } from '../ToastContext.jsx'
import DailySalesForm from '../forms/DailySalesForm.jsx'
import { fmt, todayStr, weekAgoStr } from '../format.js'

export default function Income({ refreshKey, onDataChanged }) {
  const api = useApi()
  const { openModal } = useModal()
  const { notify } = useToast()
  const [start, setStart] = useState(weekAgoStr())
  const [end, setEnd] = useState(todayStr())
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    load(start, end)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey])

  async function load(s, e) {
    setError('')
    try {
      let url = '/api/daily?limit=500'
      if (s) url += `&start_date=${s}`
      if (e) url += `&end_date=${e}`
      setRows(await api(url))
    } catch (err) {
      setError(err.message)
      notify(err.message, 'error')
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this daily sales entry?')) return
    try {
      await api(`/api/daily/${id}`, { method: 'DELETE' })
      notify('Entry deleted.', 'success')
      load(start, end)
    } catch (err) {
      notify(err.message, 'error')
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
            Filter
          </button>
        </div>
        <div className="field" style={{ width: 'auto', marginBottom: 0, alignSelf: 'end' }}>
          <button className="btn" onClick={() => openModal(<DailySalesForm onSaved={() => { onDataChanged(); load(start, end) }} />)}>
            + Add daily sales
          </button>
        </div>
      </div>
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        {error ? (
          <div className="empty">Couldn't load data: {error}</div>
        ) : !rows ? (
          <div className="empty">Loading…</div>
        ) : !rows.length ? (
          <div className="empty">No sales entries in this range.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Lunch</th>
                <th style={{ textAlign: 'right' }}>Dinner</th>
                <th style={{ textAlign: 'right' }}>Total sales</th>
                <th style={{ textAlign: 'right' }}>Guests</th>
                <th>Payments (cash/card/uber/rocket)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.date}</td>
                  <td className="num" style={{ textAlign: 'right' }}>
                    {fmt(r.lunch_sales)}
                    <br />
                    <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>{r.lunch_guests}g</span>
                  </td>
                  <td className="num" style={{ textAlign: 'right' }}>
                    {fmt(r.dinner_sales)}
                    <br />
                    <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>{r.dinner_guests}g</span>
                  </td>
                  <td className="num amt-income" style={{ textAlign: 'right' }}>
                    {fmt(r.total_sales)}
                  </td>
                  <td className="num" style={{ textAlign: 'right' }}>
                    {r.total_guests}
                  </td>
                  <td className="num" style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                    {fmt(r.cash_payment)} / {fmt(r.cc_payment)} / {fmt(r.uber_payment)} / {fmt(r.rocket_payment)}
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => openModal(<DailySalesForm entryId={r.id} onSaved={() => { onDataChanged(); load(start, end) }} />)}
                    >
                      Edit
                    </button>{' '}
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(r.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
