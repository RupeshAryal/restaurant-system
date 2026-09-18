import { useEffect, useState } from 'react'
import { useApi } from '../useApi.js'
import { useModal } from '../ModalContext.jsx'
import { useToast } from '../ToastContext.jsx'

const BLANK = { name: '', position: '', base_salary: 0, phone: '', join_date: '', active: true, notes: '' }

export default function EmployeeForm({ employeeId, onSaved }) {
  const api = useApi()
  const { closeModal } = useModal()
  const { notify } = useToast()
  const editing = !!employeeId
  const [form, setForm] = useState(BLANK)
  const [loading, setLoading] = useState(editing)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!editing) return
    api(`/api/employees/${employeeId}`)
      .then(setForm)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId])

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const payload = {
      name: form.name,
      position: form.position,
      base_salary: parseFloat(form.base_salary) || 0,
      phone: form.phone,
      join_date: form.join_date || null,
      active: !!form.active,
      notes: form.notes,
    }
    try {
      if (editing) await api(`/api/employees/${employeeId}`, { method: 'PUT', body: JSON.stringify(payload) })
      else await api('/api/employees', { method: 'POST', body: JSON.stringify(payload) })
      closeModal()
      notify(editing ? 'Employee updated.' : 'Employee added.', 'success')
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
      <h3>{editing ? 'Edit' : 'Add'} employee</h3>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Name</label>
          <input type="text" required value={form.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div className="field-row">
          <div className="field">
            <label>Position</label>
            <input type="text" value={form.position || ''} onChange={(e) => set('position', e.target.value)} />
          </div>
          <div className="field">
            <label>Base salary (¥/mo)</label>
            <input type="number" step="0.01" value={form.base_salary} onChange={(e) => set('base_salary', e.target.value)} />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label>Phone</label>
            <input type="text" value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} />
          </div>
          <div className="field">
            <label>Join date</label>
            <input type="date" value={form.join_date || ''} onChange={(e) => set('join_date', e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={!!form.active} onChange={(e) => set('active', e.target.checked)} />
            Active
          </label>
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
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Add employee'}
          </button>
        </div>
      </form>
    </>
  )
}
