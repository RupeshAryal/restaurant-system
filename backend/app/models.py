from sqlalchemy import (
    Column, Integer, Float, String, Date, DateTime, ForeignKey, Boolean, func
)
from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class DailyEntry(Base):
    __tablename__ = "daily_entries"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, unique=True, index=True, nullable=False)

    lunch_sales = Column(Float, default=0)
    lunch_guests = Column(Integer, default=0)
    dinner_sales = Column(Float, default=0)
    dinner_guests = Column(Integer, default=0)

    shopping_expense = Column(Float, default=0)

    cash_payment = Column(Float, default=0)
    cc_payment = Column(Float, default=0)
    uber_payment = Column(Float, default=0)
    rocket_payment = Column(Float, default=0)

    notes = Column(String, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, index=True, nullable=False)
    category = Column(String, nullable=False)
    description = Column(String, nullable=True)
    amount = Column(Float, nullable=False)
    frequency = Column(String, default="daily")  # daily | monthly | one-time

    created_at = Column(DateTime, server_default=func.now())


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    position = Column(String, nullable=True)
    base_salary = Column(Float, default=0)
    phone = Column(String, nullable=True)
    join_date = Column(Date, nullable=True)
    active = Column(Boolean, default=True)
    notes = Column(String, nullable=True)

    payments = relationship("SalaryPayment", back_populates="employee", cascade="all, delete-orphan")


class SalaryPayment(Base):
    __tablename__ = "salary_payments"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    base_salary = Column(Float, default=0)
    allowance = Column(Float, default=0)
    deduction = Column(Float, default=0)
    net_paid = Column(Float, default=0)
    payment_date = Column(Date, nullable=True)
    notes = Column(String, nullable=True)

    employee = relationship("Employee", back_populates="payments")
