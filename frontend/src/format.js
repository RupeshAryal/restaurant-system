export function fmt(n) {
  n = Number(n || 0)
  return '¥' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

export function fmtNum(n) {
  return Number(n || 0).toLocaleString('en-US')
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function daysAgoStr(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export function monthAgoStr() {
  return daysAgoStr(30)
}

export function weekAgoStr() {
  return daysAgoStr(7)
}
