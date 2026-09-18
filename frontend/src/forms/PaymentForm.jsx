import { useState } from 'react'
import { useApi } from '../useApi.js'
import { useModal } from '../ModalContext.jsx'
import { useToast } from '../ToastContext.jsx'
import { todayStr } from '../format.js'

export default function PaymentForm({ employees, onSaved }) {
  const api = useApi()
  const { closeModal } = useModal()
  const { notify } = useToast()
  const now = new Date()

  const [employeeId, setEmployeeId] = useState(employees[0]?.id)
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [baseSalary, setBaseSalary] = useState(employees[0]?.base_salary || 0)
  const [allowance, setAllowance] = useState(0)
  const [deduction, setDeduction] = useState(0)
  const [paymentDate, setPaymentDate] = useState(todayStr())
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function handleEmployeeChange(id) {
    setEmployeeId(id)
    const emp = employees.find((e) => String(e.id) === String(id))
    if (emp) setBaseSalary(emp.base_salary)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const payload = {
      employee_id: parseInt(employeeId),
      month: parseInt(month),
      year: parseInt(year),
      base_salary: parseFloat(baseSalary) || 0,
      allowance: parseFloat(allowance) || 0,
      deduction: parseFloat(deduction) || 0,
      payment_date: paymentDate || null,
      notes,
    }
    try {
      await api('/api/salary-payments', { method: 'POST', body: JSON.stringify(payload) })
      closeModal()
      notify('Salary payment recorded.', 'success')
      onSaved?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <h3>Record salary payment</h3>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Employee</label>
          <select value={employeeId} onChange={(e) => handleEmployeeChange(e.target.value)}>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field-row">
          <div className="field">
            <label>Month</label>
            <select value={month} onChange={(e) => setMonth(e.target.value)}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {String(m).padStart(2, '0')}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Year</label>
            <input type="number" min="2000" max="2100" value={year} onChange={(e) => setYear(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>Base salary (¥)</label>
          <input type="number" step="0.01" value={baseSalary} onChange={(e) => setBaseSalary(e.target.value)} />
        </div>
        <div className="field-row">
          <div className="field">
            <label>Allowance (¥)</label>
            <input type="number" step="0.01" value={allowance} onChange={(e) => setAllowance(e.target.value)} />
          </div>
          <div className="field">
            <label>Deduction (¥)</label>
            <input type="number" step="0.01" value={deduction} onChange={(e) => setDeduction(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>Payment date</label>
          <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
        </div>
        <div className="field">
          <label>Note (optional)</label>
          <textarea rows={2} placeholder="e.g. paid in cash, advance for next month…" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn btn-outline" onClick={closeModal}>
            Cancel
          </button>
          <button type="submit" className="btn" disabled={busy}>
            {busy ? 'Saving…' : 'Record payment'}
          </button>
        </div>
      </form>
    </>
  )
}
