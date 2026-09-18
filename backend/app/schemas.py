from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


# ---------- Auth ----------
class LoginRequest(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str


# ---------- Daily Entry ----------
class DailyEntryBase(BaseModel):
    date: date
    lunch_sales: float = 0
    lunch_guests: int = 0
    dinner_sales: float = 0
    dinner_guests: int = 0
    shopping_expense: float = 0
    cash_payment: float = 0
    cc_payment: float = 0
    uber_payment: float = 0
    rocket_payment: float = 0
    notes: Optional[str] = None


class DailyEntryCreate(DailyEntryBase):
    pass


class DailyEntryUpdate(BaseModel):
    date: Optional[date] = None
    lunch_sales: Optional[float] = None
    lunch_guests: Optional[int] = None
    dinner_sales: Optional[float] = None
    dinner_guests: Optional[int] = None
    shopping_expense: Optional[float] = None
    cash_payment: Optional[float] = None
    cc_payment: Optional[float] = None
    uber_payment: Optional[float] = None
    rocket_payment: Optional[float] = None
    notes: Optional[str] = None


class DailyEntryOut(DailyEntryBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    total_sales: float = 0
    total_guests: int = 0
    payment_total: float = 0


# ---------- Expense ----------
class ExpenseBase(BaseModel):
    date: date
    category: str
    description: Optional[str] = None
    amount: float
    frequency: str = "daily"  # daily | monthly | one-time


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(BaseModel):
    date: Optional[date] = None
    category: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    frequency: Optional[str] = None


class ExpenseOut(ExpenseBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ---------- Employee ----------
class EmployeeBase(BaseModel):
    name: str
    position: Optional[str] = None
    base_salary: float = 0
    phone: Optional[str] = None
    join_date: Optional[date] = None
    active: bool = True
    notes: Optional[str] = None


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    position: Optional[str] = None
    base_salary: Optional[float] = None
    phone: Optional[str] = None
    join_date: Optional[date] = None
    active: Optional[bool] = None
    notes: Optional[str] = None


class EmployeeOut(EmployeeBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ---------- Salary Payment ----------
class SalaryPaymentBase(BaseModel):
    employee_id: int
    month: int
    year: int
    base_salary: float = 0
    allowance: float = 0
    deduction: float = 0
    payment_date: Optional[date] = None
    notes: Optional[str] = None


class SalaryPaymentCreate(SalaryPaymentBase):
    pass


class SalaryPaymentUpdate(BaseModel):
    month: Optional[int] = None
    year: Optional[int] = None
    base_salary: Optional[float] = None
    allowance: Optional[float] = None
    deduction: Optional[float] = None
    payment_date: Optional[date] = None
    notes: Optional[str] = None


class SalaryPaymentOut(SalaryPaymentBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    net_paid: float
    employee_name: Optional[str] = None
