# Ledger — Restaurant Accounts System

A lightweight accounting dashboard for a restaurant managed remotely: daily
sales, expenses, and staff salaries in one place, with a monthly-insights
dashboard and Excel export.

- **Backend:** FastAPI + SQLAlchemy + SQLite (`backend/`) — a pure JSON API.
- **Frontend:** a React app built with Vite (`frontend/`), served as its own
  process and talking to the backend over HTTP.
- These are two separate processes now — run both (see below), or use
  `./start.sh` to launch them together.

## 1. Install & run

Requires Python 3.10+ and Node.js 18+.

**Backend** (in one terminal):

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Frontend** (in another terminal):

```bash
cd frontend
npm install
cp .env.example .env   # only needed if the backend isn't on localhost:8000
npm run dev
```

Open **http://localhost:5173** in a browser — that's the app. The backend API
itself lives at **http://localhost:8000** (docs at `/docs`); a `restaurant.db`
SQLite file is created automatically in `backend/` on first run and holds all
data.

Or just run `./start.sh` from the project root, which does both of the above
(installing dependencies on first run) and prints both URLs.

To let someone else on the same wifi/network reach the frontend, set
`VITE_API_BASE` in `frontend/.env` to your machine's local IP (e.g.
`http://192.168.1.20:8000`) before starting the frontend, and open
`http://192.168.1.20:5173` from their device. For real deployment, see
"Deploying publicly" below — **read that section before putting this on the
internet**.

For a production-style build instead of the dev server, run
`npm run build` in `frontend/` (outputs static files to `frontend/dist/`)
and serve that directory with any static file host — it just needs
`VITE_API_BASE` set at build time to the backend's public URL.

## 2. Logging in

The whole app is behind a login — every page and every API request needs a
valid session except the sign-in screen itself.

**First run:** if no account exists yet, one is created automatically on
startup from environment variables:

```bash
ADMIN_USERNAME=owner ADMIN_PASSWORD="a-real-password" python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

If you don't set these, it falls back to `admin` / `admin` and prints a loud
warning in the terminal — **fine for trying it out locally, not fine for a
public server.** Change it immediately from the sidebar's "Change password"
link after your first login, or just set `ADMIN_PASSWORD` before the very
first run so the weak default is never created.

This build supports one login (the owner's) — it wasn't scoped for separate
staff accounts. If you'd like a second login for whoever sends the daily
numbers, that's a straightforward addition — ask and I can add it.

## 3. Deploying publicly — do this before going live

Since this will be reachable from the internet rather than just your own
machine, a few things matter that don't when running it locally:

1. **Set a real `SECRET_KEY`.** This signs login sessions. Without it, a
   random one is generated every time the server restarts, which silently
   logs everyone out — and more importantly, a predictable/default key would
   let someone forge a valid login. Generate one once and keep it fixed:
   ```bash
   python3 -c "import secrets; print(secrets.token_hex(32))"
   ```
   Then set it as an environment variable wherever you run the app:
   ```bash
   SECRET_KEY="<paste the long string here>" ADMIN_USERNAME=owner ADMIN_PASSWORD="a-real-password" \
     python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
2. **Serve it over HTTPS**, not plain HTTP. Login credentials and the auth
   token travel in plain text over HTTP, so anyone on the same network path
   could read them. The easiest way to get HTTPS without touching this code
   is to put both processes behind a reverse proxy that handles TLS for you
   — e.g. [Caddy](https://caddyserver.com/): build the frontend
   (`npm run build` in `frontend/`, with `VITE_API_BASE` set to your public
   API URL) and point Caddy's `file_server` at `frontend/dist/` for the main
   domain, while proxying `localhost:8000` (the backend) at an `/api` path
   or a separate subdomain. Caddy gets both a certificate automatically; an
   equivalent setup works on whatever hosting provider you use.
3. **Keep `ADMIN_PASSWORD` and `SECRET_KEY` out of any code you share or
   commit** — set them as environment variables / hosting-provider secrets,
   not hardcoded in a file.
4. There's no rate-limiting on the login endpoint in this build. For a
   single-owner tool the risk is low, but if you want brute-force protection
   added (e.g. lock out after repeated failed attempts), ask and it can be
   added.

## 4. What's included

### Home
Snapshot of the last 30 days (sales, expenses, profit, average daily sales)
plus the most recent 20 ledger entries (income and expenses combined), with
quick buttons to add a day's sales or an expense.

### Dashboard
Business insights with a date-range filter: total sales, expenses, profit,
profit margin, average monthly sales/profit, a monthly sales-vs-profit chart,
and a payment-method breakdown (cash / card / Uber / Rocket / PayPay / DamaeCan). "Export to
Excel" downloads a multi-sheet workbook (summary, daily sales, expenses,
salary) for the selected range.

### Income
Every daily sales entry (lunch + dinner sales and guest counts, shopping
expense, and the cash/card/Uber/Rocket/PayPay/DamaeCan payment split), filterable by date,
with edit/delete.

### Expenses
One-off and recurring expenses (rent, maintenance, utilities, etc.), each
tagged **daily**, **monthly**, or **one-time**, filterable by date and
category.

### Staff
Employee records (name, position, base salary, contact, active/inactive) and
a full salary payment history per employee, with allowances and deductions
tracked separately from the base salary (net pay = base + allowance −
deduction).

## 5. Daily data-entry workflow

Whoever sends the daily numbers (SN, lunch sales/guests, dinner sales/guests,
shopping expenses, cash/CC/Uber/Rocket/PayPay/DamaeCan payments) — the owner enters this once
a day from **Home → "+ Add daily sales"** or the **Income** tab. It takes
under a minute per day instead of the end-of-month manual tally. Other
expenses (salary, rent, maintenance, etc.) go in under **Expenses** or
**Staff** as they happen.

## 6. API

Interactive API docs are at **http://localhost:8000/docs** (auto-generated by
FastAPI) if you ever want to script something against it or hook up another
tool.

Key endpoints:
- `POST /api/auth/login` — sign in, returns a bearer token
- `POST /api/auth/change-password` — change the logged-in user's password
- `POST/GET/PUT/DELETE /api/daily` — daily sales entries
- `POST/GET/PUT/DELETE /api/expenses` — expenses
- `POST/GET/PUT/DELETE /api/employees` — staff
- `POST/GET/PUT/DELETE /api/salary-payments` — salary payment history
- `GET /api/dashboard/summary` — totals & profit for a date range
- `GET /api/dashboard/monthly` — monthly trend for charts
- `GET /api/ledger` — combined recent income/expense feed (Home page)
- `GET /api/export/excel` — download the Excel report

All of the above except `/api/auth/login` require an `Authorization: Bearer
<token>` header.

## 7. Backing up data

Everything lives in one file: `backend/restaurant.db`. Copy that file
somewhere safe (cloud drive, email to yourself, etc.) periodically — that is
your entire backup. To move the system to a new computer, just copy the whole
`restaurant-system` folder including this file.

## 8. Running it as an always-on service (optional detail)

For daily use from Nepal (or anywhere) without keeping a laptop running: the
simplest option is a small always-on VM (e.g. a $5/mo box from any cloud
provider) — install Python and Node, copy this folder over, set the
environment variables from section 3, run `npm run build` in `frontend/`
once (with `VITE_API_BASE` set to the server's public API URL), and run the
`uvicorn` command plus a static file server for `frontend/dist/` (or the
reverse proxy from section 3) under a process manager like `systemd` or
`pm2` so everything restarts on reboot / after crashes.

## 9. Notes on the data model

- A daily sales entry is **one row per calendar day** (adding a second entry
  for a date you've already logged will ask you to edit the existing one
  instead).
- The payment fields (cash/card/Uber/Rocket/PayPay/DamaeCan) are a breakdown of how the same
  day's total sales were received — they're shown next to total sales rather
  than as separate income, so nothing gets double-counted.
- "Shopping expense" is kept on the daily entry (matching how the raw data
  arrives) but is fully included in expense/profit totals everywhere.
- Monthly recurring expenses (rent etc.) are just entered once, dated within
  the month they apply to — mark them `monthly` for your own filtering/
  reporting, the totals treat all expense rows the same regardless of tag.
