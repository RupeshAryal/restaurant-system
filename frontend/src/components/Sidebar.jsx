import { DashboardIcon, ExpensesIcon, HomeIcon, IncomeIcon, StaffIcon } from '../icons.jsx'
import { useAuth } from '../AuthContext.jsx'
import { useModal } from '../ModalContext.jsx'
import ChangePasswordForm from '../forms/ChangePasswordForm.jsx'

const NAV_ITEMS = [
  { page: 'home', label: 'Home', Icon: HomeIcon },
  { page: 'dashboard', label: 'Dashboard', Icon: DashboardIcon },
  { page: 'income', label: 'Income', Icon: IncomeIcon },
  { page: 'expenses', label: 'Expenses', Icon: ExpensesIcon },
  { page: 'staff', label: 'Staff', Icon: StaffIcon },
]

export default function Sidebar({ page, onNavigate, open }) {
  const { apiOnline, signOut } = useAuth()
  const { openModal } = useModal()

  return (
    <div className={`sidebar${open ? ' open' : ''}`} id="sidebar">
      <div className="sidebar-brand">
        <div className="mark">Deep Jyoti</div>
        <div className="mark">Restaurant</div>
      </div>
      <nav className="nav">
        {NAV_ITEMS.map(({ page: p, label, Icon }) => (
          <a key={p} className={p === page ? 'active' : ''} onClick={() => onNavigate(p)}>
            <Icon />
            {label}
          </a>
        ))}
      </nav>
      <div className="sidebar-foot">
        <div className="api-status">
          <span className={`api-dot${apiOnline === null ? '' : apiOnline ? ' online' : ' offline'}`} />
          {apiOnline === null ? 'connecting…' : apiOnline ? 'connected' : 'offline'}
        </div>
        <div className="row-flex" style={{ gap: 8 }}>
          <a style={{ cursor: 'pointer', textDecoration: 'underline', color: '#9099b3' }} onClick={() => openModal(<ChangePasswordForm />)}>
            Change password
          </a>
          <span style={{ color: '#4c5473' }}>·</span>
          <a style={{ cursor: 'pointer', textDecoration: 'underline', color: '#9099b3' }} onClick={signOut}>
            Log out
          </a>
        </div>
      </div>
    </div>
  )
}
