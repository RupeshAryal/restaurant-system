import io
import os
from datetime import date, datetime
from calendar import monthrange
from typing import Optional, List

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import extract

from . import models, schemas, auth
from .database import engine, get_db, Base, SessionLocal

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Restaurant Ledger API",
    version="1.0.0",
    # Every route in this app requires a valid login except the handful of
    # paths listed in auth.PUBLIC_PATHS (login itself, health check, docs,
    # the frontend shell). See app/auth.py.
    dependencies=[Depends(auth.require_auth)],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def create_default_admin():
    """
    On first run (no users in the database yet), create one admin account
    from environment variables so there's always a way to log in.
    Defaults to username 'admin' / password 'admin' if not set — CHANGE THIS
    before hosting publicly. See README for how to set ADMIN_USERNAME /
    ADMIN_PASSWORD, and use the in-app 'change password' option after your
    first login.
    """
    db = SessionLocal()
    try:
        if db.query(models.User).count() == 0:
            username = os.environ.get("ADMIN_USERNAME", "admin")
            password = os.environ.get("ADMIN_PASSWORD", "admin")
            db.add(models.User(username=username, hashed_password=auth.hash_password(password)))
            db.commit()
            if password == "admin":
                print(
                    "\n"
                    "!! Created default login admin/admin — change this immediately\n"
                    "   (Staff page has no user management yet; use the API's\n"
                    "   /api/auth/change-password endpoint, or set ADMIN_USERNAME\n"
                    "   and ADMIN_PASSWORD before first run instead.)\n"
                )
    finally:
        db.close()


# =====================================================================
# AUTH
# =====================================================================

@app.post("/api/auth/login", response_model=schemas.Token)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == payload.username).first()
    if not user or not auth.verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    token = auth.create_access_token(user.username)
    return schemas.Token(access_token=token, username=user.username)


@app.get("/api/auth/me", response_model=schemas.UserOut)
def me(user: models.User = Depends(auth.get_current_user)):
    return user


@app.post("/api/auth/change-password")
def change_password(
    payload: schemas.ChangePasswordRequest,
    user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    if not auth.verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    user.hashed_password = auth.hash_password(payload.new_password)
    db.commit()
    return {"ok": True}


def enrich_daily(e: models.DailyEntry) -> schemas.DailyEntryOut:
    out = schemas.DailyEntryOut.model_validate(e)
    out.total_sales = (e.lunch_sales or 0) + (e.dinner_sales or 0)
    out.total_guests = (e.lunch_guests or 0) + (e.dinner_guests or 0)
    out.payment_total = (e.cash_payment or 0) + (e.cc_payment or 0) + (e.uber_payment or 0) + (e.rocket_payment or 0)
    return out


# =====================================================================
# DAILY ENTRIES (Income)
# =====================================================================

@app.post("/api/daily", response_model=schemas.DailyEntryOut)
def create_daily(entry: schemas.DailyEntryCreate, db: Session = Depends(get_db)):
    existing = db.query(models.DailyEntry).filter(models.DailyEntry.date == entry.date).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"An entry for {entry.date} already exists. Edit it instead.")
    db_entry = models.DailyEntry(**entry.model_dump())
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return enrich_daily(db_entry)


@app.get("/api/daily", response_model=List[schemas.DailyEntryOut])
def list_daily(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    limit: int = Query(default=1000, le=5000),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    q = db.query(models.DailyEntry)
    if start_date:
        q = q.filter(models.DailyEntry.date >= start_date)
    if end_date:
        q = q.filter(models.DailyEntry.date <= end_date)
    q = q.order_by(models.DailyEntry.date.desc()).offset(offset).limit(limit)
    return [enrich_daily(e) for e in q.all()]


@app.get("/api/daily/{entry_id}", response_model=schemas.DailyEntryOut)
def get_daily(entry_id: int, db: Session = Depends(get_db)):
    e = db.query(models.DailyEntry).get(entry_id)
    if not e:
        raise HTTPException(status_code=404, detail="Entry not found")
    return enrich_daily(e)


@app.put("/api/daily/{entry_id}", response_model=schemas.DailyEntryOut)
def update_daily(entry_id: int, entry: schemas.DailyEntryUpdate, db: Session = Depends(get_db)):
    e = db.query(models.DailyEntry).get(entry_id)
    if not e:
        raise HTTPException(status_code=404, detail="Entry not found")
    for k, v in entry.model_dump(exclude_unset=True).items():
        setattr(e, k, v)
    db.commit()
    db.refresh(e)
    return enrich_daily(e)


@app.delete("/api/daily/{entry_id}")
def delete_daily(entry_id: int, db: Session = Depends(get_db)):
    e = db.query(models.DailyEntry).get(entry_id)
    if not e:
        raise HTTPException(status_code=404, detail="Entry not found")
    db.delete(e)
    db.commit()
    return {"ok": True}


# =====================================================================
# EXPENSES
# =====================================================================

@app.post("/api/expenses", response_model=schemas.ExpenseOut)
def create_expense(expense: schemas.ExpenseCreate, db: Session = Depends(get_db)):
    db_expense = models.Expense(**expense.model_dump())
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    return db_expense


@app.get("/api/expenses", response_model=List[schemas.ExpenseOut])
def list_expenses(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    category: Optional[str] = None,
    frequency: Optional[str] = None,
    limit: int = Query(default=1000, le=5000),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    q = db.query(models.Expense)
    if start_date:
        q = q.filter(models.Expense.date >= start_date)
    if end_date:
        q = q.filter(models.Expense.date <= end_date)
    if category:
        q = q.filter(models.Expense.category == category)
    if frequency:
        q = q.filter(models.Expense.frequency == frequency)
    q = q.order_by(models.Expense.date.desc()).offset(offset).limit(limit)
    return q.all()


@app.put("/api/expenses/{expense_id}", response_model=schemas.ExpenseOut)
def update_expense(expense_id: int, expense: schemas.ExpenseUpdate, db: Session = Depends(get_db)):
    e = db.query(models.Expense).get(expense_id)
    if not e:
        raise HTTPException(status_code=404, detail="Expense not found")
    for k, v in expense.model_dump(exclude_unset=True).items():
        setattr(e, k, v)
    db.commit()
    db.refresh(e)
    return e


@app.delete("/api/expenses/{expense_id}")
def delete_expense(expense_id: int, db: Session = Depends(get_db)):
    e = db.query(models.Expense).get(expense_id)
    if not e:
        raise HTTPException(status_code=404, detail="Expense not found")
    db.delete(e)
    db.commit()
    return {"ok": True}


@app.get("/api/expense-categories")
def expense_categories(db: Session = Depends(get_db)):
    rows = db.query(models.Expense.category).distinct().all()
    defaults = ["Rent", "Maintenance", "Utilities", "Shopping", "Supplies", "Marketing", "Other"]
    existing = [r[0] for r in rows]
    merged = list(dict.fromkeys(defaults + existing))
    return merged


# =====================================================================
# EMPLOYEES
# =====================================================================

@app.post("/api/employees", response_model=schemas.EmployeeOut)
def create_employee(employee: schemas.EmployeeCreate, db: Session = Depends(get_db)):
    db_employee = models.Employee(**employee.model_dump())
    db.add(db_employee)
    db.commit()
    db.refresh(db_employee)
    return db_employee


@app.get("/api/employees", response_model=List[schemas.EmployeeOut])
def list_employees(active_only: bool = False, db: Session = Depends(get_db)):
    q = db.query(models.Employee)
    if active_only:
        q = q.filter(models.Employee.active == True)  # noqa: E712
    return q.order_by(models.Employee.name).all()


@app.get("/api/employees/{employee_id}", response_model=schemas.EmployeeOut)
def get_employee(employee_id: int, db: Session = Depends(get_db)):
    e = db.query(models.Employee).get(employee_id)
    if not e:
        raise HTTPException(status_code=404, detail="Employee not found")
    return e


@app.put("/api/employees/{employee_id}", response_model=schemas.EmployeeOut)
def update_employee(employee_id: int, employee: schemas.EmployeeUpdate, db: Session = Depends(get_db)):
    e = db.query(models.Employee).get(employee_id)
    if not e:
        raise HTTPException(status_code=404, detail="Employee not found")
    for k, v in employee.model_dump(exclude_unset=True).items():
        setattr(e, k, v)
    db.commit()
    db.refresh(e)
    return e


@app.delete("/api/employees/{employee_id}")
def delete_employee(employee_id: int, db: Session = Depends(get_db)):
    e = db.query(models.Employee).get(employee_id)
    if not e:
        raise HTTPException(status_code=404, detail="Employee not found")
    db.delete(e)
    db.commit()
    return {"ok": True}


# =====================================================================
# SALARY PAYMENTS
# =====================================================================

def enrich_payment(p: models.SalaryPayment) -> schemas.SalaryPaymentOut:
    out = schemas.SalaryPaymentOut.model_validate(p)
    out.employee_name = p.employee.name if p.employee else None
    return out


@app.post("/api/salary-payments", response_model=schemas.SalaryPaymentOut)
def create_payment(payment: schemas.SalaryPaymentCreate, db: Session = Depends(get_db)):
    emp = db.query(models.Employee).get(payment.employee_id)
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    if not emp.active:
        raise HTTPException(status_code=400, detail=f"{emp.name} is marked inactive — reactivate them before recording a payment.")
    data = payment.model_dump()
    net_paid = data["base_salary"] + data["allowance"] - data["deduction"]
    db_payment = models.SalaryPayment(**data, net_paid=net_paid)
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    return enrich_payment(db_payment)


@app.get("/api/salary-payments", response_model=List[schemas.SalaryPaymentOut])
def list_payments(
    employee_id: Optional[int] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
):
    q = db.query(models.SalaryPayment)
    if employee_id:
        q = q.filter(models.SalaryPayment.employee_id == employee_id)
    if month:
        q = q.filter(models.SalaryPayment.month == month)
    if year:
        q = q.filter(models.SalaryPayment.year == year)
    q = q.order_by(models.SalaryPayment.year.desc(), models.SalaryPayment.month.desc())
    return [enrich_payment(p) for p in q.all()]


@app.put("/api/salary-payments/{payment_id}", response_model=schemas.SalaryPaymentOut)
def update_payment(payment_id: int, payment: schemas.SalaryPaymentUpdate, db: Session = Depends(get_db)):
    p = db.query(models.SalaryPayment).get(payment_id)
    if not p:
        raise HTTPException(status_code=404, detail="Payment not found")
    for k, v in payment.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    p.net_paid = p.base_salary + p.allowance - p.deduction
    db.commit()
    db.refresh(p)
    return enrich_payment(p)


@app.delete("/api/salary-payments/{payment_id}")
def delete_payment(payment_id: int, db: Session = Depends(get_db)):
    p = db.query(models.SalaryPayment).get(payment_id)
    if not p:
        raise HTTPException(status_code=404, detail="Payment not found")
    db.delete(p)
    db.commit()
    return {"ok": True}


# =====================================================================
# DASHBOARD / INSIGHTS
# =====================================================================

def _period_query(db, model, start_date, end_date):
    q = db.query(model)
    if start_date:
        q = q.filter(model.date >= start_date)
    if end_date:
        q = q.filter(model.date <= end_date)
    return q


@app.get("/api/dashboard/summary")
def dashboard_summary(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
):
    daily = _period_query(db, models.DailyEntry, start_date, end_date).all()
    expenses = _period_query(db, models.Expense, start_date, end_date).all()

    total_sales = sum((d.lunch_sales or 0) + (d.dinner_sales or 0) for d in daily)
    total_lunch_sales = sum(d.lunch_sales or 0 for d in daily)
    total_dinner_sales = sum(d.dinner_sales or 0 for d in daily)
    total_guests = sum((d.lunch_guests or 0) + (d.dinner_guests or 0) for d in daily)
    total_shopping = sum(d.shopping_expense or 0 for d in daily)
    total_other_expenses = sum(e.amount for e in expenses)

    # salary payments in range: use payment_date if set, otherwise the month/year
    salary_q = db.query(models.SalaryPayment)
    if start_date:
        salary_q = salary_q.filter(
            (models.SalaryPayment.payment_date >= start_date) | (models.SalaryPayment.payment_date.is_(None))
        )
    if end_date:
        salary_q = salary_q.filter(
            (models.SalaryPayment.payment_date <= end_date) | (models.SalaryPayment.payment_date.is_(None))
        )
    payments = salary_q.all()
    if start_date and end_date:
        payments = [
            p for p in payments
            if p.payment_date is not None and start_date <= p.payment_date <= end_date
        ]
    total_salary = sum(p.net_paid for p in payments)

    total_expenses = total_shopping + total_other_expenses + total_salary
    profit = total_sales - total_expenses

    payment_breakdown = {
        "cash": sum(d.cash_payment or 0 for d in daily),
        "credit_card": sum(d.cc_payment or 0 for d in daily),
        "uber": sum(d.uber_payment or 0 for d in daily),
        "rocket": sum(d.rocket_payment or 0 for d in daily),
    }

    num_days = len(daily) or 1

    return {
        "total_sales": total_sales,
        "total_lunch_sales": total_lunch_sales,
        "total_dinner_sales": total_dinner_sales,
        "total_guests": total_guests,
        "total_shopping_expense": total_shopping,
        "total_other_expenses": total_other_expenses,
        "total_salary_paid": total_salary,
        "total_expenses": total_expenses,
        "profit": profit,
        "profit_margin_pct": (profit / total_sales * 100) if total_sales else 0,
        "avg_daily_sales": total_sales / num_days,
        "avg_daily_guests": total_guests / num_days,
        "avg_spend_per_guest": (total_sales / total_guests) if total_guests else 0,
        "days_recorded": len(daily),
        "payment_breakdown": payment_breakdown,
    }


@app.get("/api/dashboard/monthly")
def dashboard_monthly(
    months: int = Query(default=12, le=36),
    db: Session = Depends(get_db),
):
    """Monthly aggregated sales, expenses, profit for the trailing N months."""
    daily = db.query(models.DailyEntry).all()
    expenses = db.query(models.Expense).all()
    payments = db.query(models.SalaryPayment).all()

    buckets = {}

    def bucket(d: date):
        key = f"{d.year:04d}-{d.month:02d}"
        if key not in buckets:
            buckets[key] = {
                "month": key, "sales": 0.0, "guests": 0,
                "shopping": 0.0, "expenses": 0.0, "salary": 0.0,
            }
        return buckets[key]

    for d in daily:
        b = bucket(d.date)
        b["sales"] += (d.lunch_sales or 0) + (d.dinner_sales or 0)
        b["guests"] += (d.lunch_guests or 0) + (d.dinner_guests or 0)
        b["shopping"] += d.shopping_expense or 0

    for e in expenses:
        b = bucket(e.date)
        b["expenses"] += e.amount

    for p in payments:
        key = f"{p.year:04d}-{p.month:02d}"
        if key not in buckets:
            buckets[key] = {
                "month": key, "sales": 0.0, "guests": 0,
                "shopping": 0.0, "expenses": 0.0, "salary": 0.0,
            }
        buckets[key]["salary"] += p.net_paid

    rows = sorted(buckets.values(), key=lambda r: r["month"])
    for r in rows:
        r["total_expenses"] = r["shopping"] + r["expenses"] + r["salary"]
        r["profit"] = r["sales"] - r["total_expenses"]

    rows = rows[-months:]

    if rows:
        avg_sales = sum(r["sales"] for r in rows) / len(rows)
        avg_profit = sum(r["profit"] for r in rows) / len(rows)
    else:
        avg_sales = avg_profit = 0

    return {"months": rows, "avg_monthly_sales": avg_sales, "avg_monthly_profit": avg_profit}


@app.get("/api/ledger")
def combined_ledger(limit: int = 20, offset: int = 0, db: Session = Depends(get_db)):
    """Combined income + expense + salary feed for the Home page, paginated newest-first."""
    rows = []

    # Pull a generous cap from each source (not just `limit`) since the three
    # sources interleave by date — truncating each to the page size before
    # merging would silently drop rows and break pagination past page one.
    SOURCE_CAP = 5000

    daily = db.query(models.DailyEntry).order_by(models.DailyEntry.date.desc()).limit(SOURCE_CAP).all()
    for d in daily:
        total = (d.lunch_sales or 0) + (d.dinner_sales or 0)
        rows.append({
            "date": d.date.isoformat(), "type": "income", "category": "Daily Sales",
            "description": f"Lunch {d.lunch_guests or 0}g / Dinner {d.dinner_guests or 0}g",
            "amount": total, "ref": f"daily-{d.id}",
        })
        if d.shopping_expense:
            rows.append({
                "date": d.date.isoformat(), "type": "expense", "category": "Shopping",
                "description": "Daily shopping expense", "amount": d.shopping_expense, "ref": f"daily-shop-{d.id}",
            })

    expenses = db.query(models.Expense).order_by(models.Expense.date.desc()).limit(SOURCE_CAP).all()
    for e in expenses:
        rows.append({
            "date": e.date.isoformat(), "type": "expense", "category": e.category,
            "description": e.description or e.category, "amount": e.amount, "ref": f"exp-{e.id}",
        })

    payments = db.query(models.SalaryPayment).order_by(
        models.SalaryPayment.year.desc(), models.SalaryPayment.month.desc()
    ).limit(SOURCE_CAP).all()
    for p in payments:
        emp_name = p.employee.name if p.employee else "Employee"
        d = p.payment_date.isoformat() if p.payment_date else f"{p.year:04d}-{p.month:02d}-01"
        rows.append({
            "date": d, "type": "expense", "category": "Salary",
            "description": f"Salary — {emp_name} ({p.month:02d}/{p.year})",
            "amount": p.net_paid, "ref": f"pay-{p.id}",
        })

    rows.sort(key=lambda r: r["date"], reverse=True)
    total = len(rows)
    page = rows[offset:offset + limit]
    return {"rows": page, "total": total, "has_more": offset + len(page) < total}


# =====================================================================
# EXCEL EXPORT
# =====================================================================

@app.get("/api/export/excel")
def export_excel(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
):
    import pandas as pd

    daily = _period_query(db, models.DailyEntry, start_date, end_date).order_by(models.DailyEntry.date).all()
    expenses = _period_query(db, models.Expense, start_date, end_date).order_by(models.Expense.date).all()
    payments = db.query(models.SalaryPayment).order_by(
        models.SalaryPayment.year, models.SalaryPayment.month
    ).all()

    daily_df = pd.DataFrame([{
        "Date": d.date, "Lunch Sales": d.lunch_sales, "Lunch Guests": d.lunch_guests,
        "Dinner Sales": d.dinner_sales, "Dinner Guests": d.dinner_guests,
        "Total Sales": (d.lunch_sales or 0) + (d.dinner_sales or 0),
        "Shopping Expense": d.shopping_expense,
        "Cash": d.cash_payment, "Card": d.cc_payment, "Uber": d.uber_payment, "Rocket": d.rocket_payment,
        "Notes": d.notes,
    } for d in daily])

    expense_df = pd.DataFrame([{
        "Date": e.date, "Category": e.category, "Description": e.description,
        "Amount": e.amount, "Frequency": e.frequency,
    } for e in expenses])

    salary_df = pd.DataFrame([{
        "Employee": p.employee.name if p.employee else "", "Month": p.month, "Year": p.year,
        "Base Salary": p.base_salary, "Allowance": p.allowance, "Deduction": p.deduction,
        "Net Paid": p.net_paid, "Payment Date": p.payment_date,
    } for p in payments])

    summary = dashboard_summary(start_date, end_date, db)
    summary_df = pd.DataFrame(
        [(k.replace("_", " ").title(), v) for k, v in summary.items() if k != "payment_breakdown"],
        columns=["Metric", "Value"],
    )

    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        summary_df.to_excel(writer, sheet_name="Summary", index=False)
        if not daily_df.empty:
            daily_df.to_excel(writer, sheet_name="Daily Sales", index=False)
        if not expense_df.empty:
            expense_df.to_excel(writer, sheet_name="Expenses", index=False)
        if not salary_df.empty:
            salary_df.to_excel(writer, sheet_name="Salary", index=False)
    buf.seek(0)

    filename = f"restaurant_report_{start_date or 'all'}_{end_date or 'all'}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@app.get("/api/health")
def health():
    return {"status": "ok", "time": datetime.utcnow().isoformat()}
