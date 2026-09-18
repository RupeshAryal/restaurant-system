const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8 }

export function HomeIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v10h14V10" />
    </svg>
  )
}
export function DashboardIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 19V10M11 19V5M18 19v-6" />
    </svg>
  )
}
export function IncomeIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3v18M17 8l-5-5-5 5M7 16l5 5 5-5" />
    </svg>
  )
}
export function ExpensesIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="6" width="18" height="13" rx="1.5" />
      <path d="M3 10h18M8 14h.01" />
    </svg>
  )
}
export function StaffIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.5 20c.8-3.4 3.3-5.5 6.5-5.5s5.7 2.1 6.5 5.5" />
      <circle cx="17.5" cy="8.5" r="2.4" />
      <path d="M16 14.5c2.6.3 4.5 2.2 5.1 5" />
    </svg>
  )
}
export function MenuIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}
export function InboxIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M3 12h4l2 3h6l2-3h4" />
      <path d="M5.5 6h13l2.5 6v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-8l2.5-6Z" />
    </svg>
  )
}
