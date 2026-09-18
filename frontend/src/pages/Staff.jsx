import { useEffect, useState } from 'react'
import { useApi } from '../useApi.js'
import { useModal } from '../ModalContext.jsx'
import { useToast } from '../ToastContext.jsx'
import EmployeeForm from '../forms/EmployeeForm.jsx'
import PaymentForm from '../forms/PaymentForm.jsx'
import { fmt } from '../format.js'

export default function Staff({ refreshKey, onDataChanged }) {
  const api = useApi()
  const { openModal } = useModal()
  const { notify } = useToast()
  const [employees, setEmployees] = useState(null)
  const [payments, setPayments] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey])

  async function load() {
    setError('')
    try {
      const [emps, pays] = await Promise.all([api('/api/employees'), api('/api/salary-payments')])
      setEmployees(emps)
      setPayments(pays)
    } catch (err) {
      setError(err.message)
      notify(err.message, 'error')
    }
  }

  function refreshAfterSave() {
    onDataChanged()
    load()
  }

  async function handleDeleteEmployee(id) {
    if (!confirm('Delete this employee? Their payment history will also be removed.')) return
    try {
      await api(`/api/employees/${id}`, { method: 'DELETE' })
      notify('Employee deleted.', 'success')
      load()
    } catch (err) {
      notify(err.message, 'error')
    }
  }

  async function handleDeletePayment(id) {
    if (!confirm('Delete this salary payment?')) return
    try {
      await api(`/api/salary-payments/${id}`, { method: 'DELETE' })
      notify('Payment deleted.', 'success')
      load()
    } catch (err) {
      notify(err.message, 'error')
    }
  }

  function openPaymentForm() {
    const activeEmployees = (employees || []).filter((e) => e.active)
    if (!activeEmployees.length) {
      notify('No active employees to pay — add or reactivate a staff member first.', 'error')
      return
    }
    openModal(<PaymentForm employees={activeEmployees} onSaved={refreshAfterSave} />)
  }

  if (error) return <div className="empty">Couldn't load data: {error}</div>

  return (
    <>
      <div className="section-title">
        <h2>Employees</h2>
        <button className="btn" onClick={() => openModal(<EmployeeForm onSaved={refreshAfterSave} />)}>
          + Add employee
        </button>
      </div>
      <div className="card" style={{ padding: 0, overflowX: 'auto', marginBottom: 26 }}>
        {!employees ? (
          <div className="empty">Loading…</div>
        ) : !employees.length ? (
          <div className="empty">No employees yet. Add your first staff member.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Position</th>
                <th style={{ textAlign: 'right' }}>Base salary</th>
                <th>Phone</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.position || '—'}</td>
                  <td className="num" style={{ textAlign: 'right' }}>
                    {fmt(r.base_salary)}
                  </td>
                  <td>{r.phone || '—'}</td>
                  <td>
                    <span className={`tag ${r.active ? 'tag-income' : 'tag-expense'}`}>{r.active ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td>
                    <button className="btn btn-sm btn-outline" onClick={() => openModal(<EmployeeForm employeeId={r.id} onSaved={refreshAfterSave} />)}>
                      Edit
                    </button>{' '}
                    <button className="btn btn-sm btn-danger" onClick={() => handleDeleteEmployee(r.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="section-title">
        <h2>Salary payments</h2>
        <button className="btn btn-outline" onClick={openPaymentForm}>
          + Record payment
        </button>
      </div>
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        {!payments ? (
          <div className="empty">Loading…</div>
        ) : !payments.length ? (
          <div className="empty">No salary payments recorded yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Period</th>
                <th style={{ textAlign: 'right' }}>Base</th>
                <th style={{ textAlign: 'right' }}>Allowance</th>
                <th style={{ textAlign: 'right' }}>Deduction</th>
                <th style={{ textAlign: 'right' }}>Net paid</th>
                <th>Paid on</th>
                <th>Note</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {payments.map((r) => (
                <tr key={r.id}>
                  <td>{r.employee_name}</td>
                  <td>
                    {String(r.month).padStart(2, '0')}/{r.year}
                  </td>
                  <td className="num" style={{ textAlign: 'right' }}>
                    {fmt(r.base_salary)}
                  </td>
                  <td className="num" style={{ textAlign: 'right', color: 'var(--green)' }}>
                    +{fmt(r.allowance)}
                  </td>
                  <td className="num" style={{ textAlign: 'right', color: 'var(--red)' }}>
                    −{fmt(r.deduction)}
                  </td>
                  <td className="num amt-expense" style={{ textAlign: 'right' }}>
                    {fmt(r.net_paid)}
                  </td>
                  <td>{r.payment_date || '—'}</td>
                  <td style={{ whiteSpace: 'normal', minWidth: 140, color: 'var(--text-dim)', fontSize: 12.5 }}>{r.notes || '—'}</td>
                  <td>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDeletePayment(r.id)}>
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
