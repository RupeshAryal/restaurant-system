import { useEffect, useState } from 'react'
import { useApi } from '../useApi.js'
import { useModal } from '../ModalContext.jsx'
import { useToast } from '../ToastContext.jsx'
import ExpenseForm from '../forms/ExpenseForm.jsx'
import { fmt, todayStr, weekAgoStr } from '../format.js'

export default function Expenses({ refreshKey, onDataChanged }) {
  const api = useApi()
  const { openModal } = useModal()
  const { notify } = useToast()
  const [categories, setCategories] = useState([])
  const [start, setStart] = useState(weekAgoStr())
  const [end, setEnd] = useState(todayStr())
  const [category, setCategory] = useState('')
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api('/api/expense-categories')
      .then(setCategories)
      .catch((err) => notify(err.message, 'error'))
    load(start, end, category)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey])

  async function load(s, e, c) {
    setError('')
    try {
      let url = '/api/expenses?limit=500'
      if (s) url += `&start_date=${s}`
      if (e) url += `&end_date=${e}`
      if (c) url += `&category=${encodeURIComponent(c)}`
      setRows(await api(url))
    } catch (err) {
      setError(err.message)
      notify(err.message, 'error')
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this expense?')) return
    try {
      await api(`/api/expenses/${id}`, { method: 'DELETE' })
      notify('Expense deleted.', 'success')
      load(start, end, category)
    } catch (err) {
      notify(err.message, 'error')
    }
  }

  function refreshAfterSave() {
    onDataChanged()
    load(start, end, category)
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
        <div className="field" style={{ width: 160, marginBottom: 0 }}>
          <label>Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ width: 'auto', marginBottom: 0, alignSelf: 'end' }}>
          <button className="btn btn-outline" onClick={() => load(start, end, category)}>
            Filter
          </button>
        </div>
        <div className="field" style={{ width: 'auto', marginBottom: 0, alignSelf: 'end' }}>
          <button className="btn" onClick={() => openModal(<ExpenseForm onSaved={refreshAfterSave} />)}>
            + Add expense
          </button>
        </div>
      </div>
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        {error ? (
          <div className="empty">Couldn't load data: {error}</div>
        ) : !rows ? (
          <div className="empty">Loading…</div>
        ) : !rows.length ? (
          <div className="empty">No expenses in this range.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th>Frequency</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.date}</td>
                  <td>{r.category}</td>
                  <td style={{ whiteSpace: 'normal', minWidth: 160 }}>{r.description || ''}</td>
                  <td style={{ textTransform: 'capitalize' }}>{r.frequency}</td>
                  <td className="num amt-expense" style={{ textAlign: 'right' }}>
                    {fmt(r.amount)}
                  </td>
                  <td>
                    <button className="btn btn-sm btn-outline" onClick={() => openModal(<ExpenseForm expenseId={r.id} onSaved={refreshAfterSave} />)}>
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
