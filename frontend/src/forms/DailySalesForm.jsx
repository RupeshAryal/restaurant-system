import { useEffect, useState } from 'react'
import { useApi } from '../useApi.js'
import { useModal } from '../ModalContext.jsx'
import { useToast } from '../ToastContext.jsx'
import { todayStr } from '../format.js'

const BLANK = {
  date: todayStr(),
  lunch_sales: 0,
  lunch_guests: 0,
  dinner_sales: 0,
  dinner_guests: 0,
  cash_payment: 0,
  cc_payment: 0,
  uber_payment: 0,
  rocket_payment: 0,
  notes: '',
}

export default function DailySalesForm({ entryId, onSaved }) {
  const api = useApi()
  const { closeModal } = useModal()
  const { notify } = useToast()
  const editing = !!entryId
  const [form, setForm] = useState(BLANK)
  const [loading, setLoading] = useState(editing)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!editing) return
    api(`/api/daily/${entryId}`)
      .then(setForm)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryId])

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const payload = {
      date: form.date,
      lunch_sales: parseFloat(form.lunch_sales) || 0,
      lunch_guests: parseInt(form.lunch_guests) || 0,
      dinner_sales: parseFloat(form.dinner_sales) || 0,
      dinner_guests: parseInt(form.dinner_guests) || 0,
      cash_payment: parseFloat(form.cash_payment) || 0,
      cc_payment: parseFloat(form.cc_payment) || 0,
      uber_payment: parseFloat(form.uber_payment) || 0,
      rocket_payment: parseFloat(form.rocket_payment) || 0,
      notes: form.notes,
    }
    try {
      if (editing) await api(`/api/daily/${entryId}`, { method: 'PUT', body: JSON.stringify(payload) })
      else await api('/api/daily', { method: 'POST', body: JSON.stringify(payload) })
      closeModal()
      notify(editing ? 'Daily sales entry updated.' : 'Daily sales entry added.', 'success')
      onSaved?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="empty">Loading…</div>

  return (
    <>
      <h3>{editing ? 'Edit' : 'Add'} daily sales</h3>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Date</label>
          <input type="date" required value={form.date} onChange={(e) => set('date', e.target.value)} />
        </div>
        <div className="field-row">
          <div className="field">
            <label>Lunch sales (¥)</label>
            <input type="number" step="0.01" value={form.lunch_sales} onChange={(e) => set('lunch_sales', e.target.value)} />
          </div>
          <div className="field">
            <label>Lunch guests</label>
            <input type="number" value={form.lunch_guests} onChange={(e) => set('lunch_guests', e.target.value)} />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label>Dinner sales (¥)</label>
            <input type="number" step="0.01" value={form.dinner_sales} onChange={(e) => set('dinner_sales', e.target.value)} />
          </div>
          <div className="field">
            <label>Dinner guests</label>
            <input type="number" value={form.dinner_guests} onChange={(e) => set('dinner_guests', e.target.value)} />
          </div>
        </div>
        <div className="field-row3">
          <div className="field">
            <label>Cash (¥)</label>
            <input type="number" step="0.01" value={form.cash_payment} onChange={(e) => set('cash_payment', e.target.value)} />
          </div>
          <div className="field">
            <label>Credit card (¥)</label>
            <input type="number" step="0.01" value={form.cc_payment} onChange={(e) => set('cc_payment', e.target.value)} />
          </div>
          <div className="field">
            <label>Uber (¥)</label>
            <input type="number" step="0.01" value={form.uber_payment} onChange={(e) => set('uber_payment', e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>Rocket (¥)</label>
          <input type="number" step="0.01" value={form.rocket_payment} onChange={(e) => set('rocket_payment', e.target.value)} />
        </div>
        <div className="field">
          <label>Notes</label>
          <textarea rows={2} value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} />
        </div>
        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn btn-outline" onClick={closeModal}>
            Cancel
          </button>
          <button type="submit" className="btn" disabled={busy}>
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Add entry'}
          </button>
        </div>
      </form>
    </>
  )
}
