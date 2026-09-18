import { MenuIcon } from '../icons.jsx'
import { useModal } from '../ModalContext.jsx'
import DailySalesForm from '../forms/DailySalesForm.jsx'
import ExpenseForm from '../forms/ExpenseForm.jsx'

const PAGE_TITLES = { home: 'Home', dashboard: 'Dashboard', income: 'Income', expenses: 'Expenses', staff: 'Staff' }

export default function TopBar({ page, onMenuClick, onDataChanged }) {
  const { openModal } = useModal()

  return (
    <div className="topbar">
      <div className="row-flex">
        <button className="menu-btn" onClick={onMenuClick}>
          <MenuIcon />
        </button>
        <h1>{PAGE_TITLES[page]}</h1>
      </div>
      <div className="row-flex">
        <button className="btn btn-outline" onClick={() => openModal(<ExpenseForm onSaved={onDataChanged} />)}>
          + Expense
        </button>
        <button className="btn" onClick={() => openModal(<DailySalesForm onSaved={onDataChanged} />)}>
          + Daily Sales
        </button>
      </div>
    </div>
  )
}
