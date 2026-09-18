import { useEffect, useState } from 'react'
import { useApi } from '../useApi.js'
import { useModal } from '../ModalContext.jsx'
import { useToast } from '../ToastContext.jsx'
import { todayStr } from '../format.js'

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

function dateToYearMonth(dateStr) {
  const [year, month] = (dateStr || todayStr()).split('-')
  return { year, month }
}

function yearMonthToDate(year, month) {
  return `${year}-${String(month).padStart(2, '0')}-01`
}

export default function ExpenseForm({ expenseId, onSaved }) {
  const api = useApi()
  const { closeModal } = useModal()
  const { notify } = useToast()
  const editing = !!expenseId
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState({ date: todayStr(), category: '', description: '', amount: 0, frequency: 'daily' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    Promise.all([api('/api/expense-categories'), editing ? api(`/api/expenses/${expenseId}`) : Promise.resolve(null)])
      .then(([cats, existing]) => {
        setCategories(cats)
        if (existing) setForm(existing)
        else setForm((f) => ({ ...f, category: cats[0] || 'Other' }))
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenseId])

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function handleFrequencyChange(value) {
    setForm((f) => {
      if (value === 'monthly') {
        const { year, month } = dateToYearMonth(f.date)
        return { ...f, frequency: value, date: yearMonthToDate(year, month) }
      }
      return { ...f, frequency: value }
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const payload = {
      date: form.date,
      category: form.category,
      frequency: form.frequency,
      amount: parseFloat(form.amount) || 0,
      description: form.description,
    }
    try {
      if (editing) await api(`/api/expenses/${expenseId}`, { method: 'PUT', body: JSON.stringify(payload) })
      else await api('/api/expenses', { method: 'POST', body: JSON.stringify(payload) })
      closeModal()
      notify(editing ? 'Expense updated.' : 'Expense added.', 'success')
      onSaved?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="empty">Loading…</div>

  const { year, month } = dateToYearMonth(form.date)

  return (
    <>
      <h3>{editing ? 'Edit' : 'Add'} expense</h3>
      <form onSubmit={handleSubmit}>
        {form.frequency === 'monthly' ? (
          <div className="field-row">
            <div className="field">
              <label>Month</label>
              <select value={Number(month)} onChange={(e) => set('date', yearMonthToDate(year, e.target.value))}>
                {MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {String(m).padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Year</label>
              <input type="number" required min="2000" max="2100" value={year} onChange={(e) => set('date', yearMonthToDate(e.target.value, month))} />
            </div>
          </div>
        ) : (
          <div className="field">
            <label>Date</label>
            <input type="date" required value={form.date} onChange={(e) => set('date', e.target.value)} />
          </div>
        )}
        <div className="field-row">
          <div className="field">
            <label>Category</label>
            <select value={form.category} onChange={(e) => set('category', e.target.value)}>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Frequency</label>
            <select value={form.frequency} onChange={(e) => handleFrequencyChange(e.target.value)}>
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
              <option value="one-time">One-time</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label>Amount (¥)</label>
          <input type="number" step="0.01" required value={form.amount} onChange={(e) => set('amount', e.target.value)} />
        </div>
        <div className="field">
          <label>Description</label>
          <textarea rows={2} value={form.description || ''} onChange={(e) => set('description', e.target.value)} />
        </div>
        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn btn-outline" onClick={closeModal}>
            Cancel
          </button>
          <button type="submit" className="btn" disabled={busy}>
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Add expense'}
          </button>
        </div>
      </form>
    </>
  )
}
