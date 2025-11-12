from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.sql import func
from .db import Base


class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(150), unique=True, index=True, nullable=False)
    email = Column(String(254), unique=True, index=True, nullable=True)
    full_name = Column(String(254), nullable=True)
    hashed_password = Column(String(512), nullable=False)
    role = Column(String(50), nullable=False, default='Viewer')
    is_active = Column(Boolean, default=True)
    refresh_token_hash = Column(String(512), nullable=True)
    assistant_enabled = Column(Boolean, nullable=False, default=False)
    otp_secret = Column(String(64), nullable=True)
    otp_enabled = Column(Boolean, nullable=False, default=False)


class TimeSync(Base):
    __tablename__ = 'time_syncs'
    id = Column(Integer, primary_key=True, index=True)
    client_time = Column(DateTime(timezone=True), nullable=False)
    server_time = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class AuditLog(Base):
    __tablename__ = 'audit_logs'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    path = Column(String(1024), nullable=False)
    method = Column(String(10), nullable=False)
    status_code = Column(Integer, nullable=True)
    detail = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Product(Base):
    __tablename__ = 'products'
    id = Column(String(128), primary_key=True, index=True)  # blockchain-based hash id
    name = Column(String(512), nullable=False)
    name_norm = Column(String(512), nullable=False, index=True)
    code = Column(String(64), nullable=False, unique=True, index=True)
    unit = Column(String(64), nullable=True)
    group = Column(String(128), nullable=True)
    description = Column(Text, nullable=True)
    inventory = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class PriceHistory(Base):
    __tablename__ = 'price_histories'
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(String(128), ForeignKey('products.id'), nullable=False)
    price = Column(Integer, nullable=False)
    type = Column(String(16), nullable=False)  # buy or sell
    effective_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Person(Base):
    __tablename__ = 'persons'
    id = Column(String(128), primary_key=True, index=True)
    name = Column(String(512), nullable=False)
    name_norm = Column(String(512), nullable=False, index=True)
    # Allow code to be nullable for tests and for systems that don't require a code.
    # Tests create Person instances without `code` currently, so relax the constraint.
    code = Column(String(64), nullable=True, unique=True, index=True)
    kind = Column(String(32), nullable=True)  # customer, vendor, etc.
    mobile = Column(String(32), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Invoice(Base):
    __tablename__ = 'invoices'
    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String(64), unique=True, index=True, nullable=True)
    invoice_type = Column(String(32), nullable=False)  # sale, purchase, proforma
    mode = Column(String(32), nullable=False, default='manual')  # manual or smart
    party_id = Column(String(128), ForeignKey('persons.id'), nullable=True)
    party_name = Column(String(512), nullable=True)
    client_time = Column(DateTime(timezone=True), nullable=True)
    server_time = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    status = Column(String(32), nullable=False, default='draft')  # draft or final
    subtotal = Column(Integer, nullable=True)
    tax = Column(Integer, nullable=True)
    total = Column(Integer, nullable=True)
    note = Column(Text, nullable=True)


class InvoiceItem(Base):
    __tablename__ = 'invoice_items'
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey('invoices.id'), nullable=False)
    description = Column(String(1024), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    unit = Column(String(64), nullable=True)
    unit_price = Column(Integer, nullable=False)
    total = Column(Integer, nullable=False)


class Payment(Base):
    __tablename__ = 'payments'
    id = Column(Integer, primary_key=True, index=True)
    payment_number = Column(String(64), unique=True, index=True, nullable=True)
    direction = Column(String(16), nullable=False)  # in (receipt) or out (payment)
    mode = Column(String(32), nullable=False, default='manual')  # manual or smart
    party_id = Column(String(128), ForeignKey('persons.id'), nullable=True)
    party_name = Column(String(512), nullable=True)
    method = Column(String(64), nullable=True)  # cash, bank, pos, other
    amount = Column(Integer, nullable=False)
    reference = Column(String(256), nullable=True)
    due_date = Column(DateTime(timezone=True), nullable=True)
    client_time = Column(DateTime(timezone=True), nullable=True)
    server_time = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    status = Column(String(32), nullable=False, default='draft')
    note = Column(Text, nullable=True)


class Account(Base):
    __tablename__ = 'accounts'
    id = Column(String(128), primary_key=True, index=True)
    code = Column(String(64), nullable=False, unique=True, index=True)
    name = Column(String(255), nullable=False)
    name_norm = Column(String(255), nullable=False, index=True)
    kind = Column(String(32), nullable=False)  # cash, bank, pos
    details = Column(JSON, nullable=True)  # JSON blob for extra info
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class LedgerEntry(Base):
    __tablename__ = 'ledger_entries'
    id = Column(Integer, primary_key=True, index=True)
    ref_type = Column(String(64), nullable=True)  # invoice, payment, adjustment
    ref_id = Column(String(128), nullable=True)
    entry_date = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    debit_account = Column(String(128), nullable=False)
    credit_account = Column(String(128), nullable=False)
    amount = Column(Integer, nullable=False)
    party_id = Column(String(128), nullable=True)
    party_name = Column(String(512), nullable=True)
    description = Column(Text, nullable=True)


class AIReport(Base):
    __tablename__ = 'ai_reports'
    id = Column(Integer, primary_key=True, index=True)
    report_date = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    summary = Column(Text, nullable=True)
    findings = Column(Text, nullable=True)  # JSON string
    status = Column(String(32), nullable=False, default='pending')  # pending, reviewed, approved, dismissed
    reviewed_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)


class IntegrationConfig(Base):
    __tablename__ = 'integration_configs'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=False, unique=True)
    provider = Column(String(128), nullable=False)  # e.g., coinmarketcap, navasan, digikala
    enabled = Column(Boolean, nullable=False, default=False)
    api_key = Column(String(512), nullable=True)
    config = Column(Text, nullable=True)  # JSON blob for extra settings (interval, endpoints, flags)
    last_updated = Column(DateTime(timezone=True), nullable=True)


class SharedFile(Base):
    __tablename__ = 'shared_files'
    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(128), unique=True, index=True, nullable=False)
    file_path = Column(String(1024), nullable=False)
    filename = Column(String(256), nullable=True)
    created_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)


class Backup(Base):
    __tablename__ = 'backups'
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(1024), nullable=False)
    file_path = Column(String(2048), nullable=False)
    kind = Column(String(32), nullable=False, default='manual')  # manual or automatic
    created_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    size_bytes = Column(Integer, nullable=True)
    note = Column(Text, nullable=True)
    # `metadata` is a reserved attribute on declarative base; use `metadata_json` as the
    # mapped attribute name but keep the DB column name as `metadata` for backward compatibility.
    metadata_json = Column("metadata", Text, nullable=True)  # JSON blob with summary (counts, tables, etc.)


class FinancialYear(Base):
    __tablename__ = 'financial_years'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=False, unique=True)
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=True)
    is_closed = Column(Boolean, nullable=False, default=False)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    opening_balances = Column(Text, nullable=True)  # JSON: account -> amount
