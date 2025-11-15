from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .db import Base


class Role(Base):
    __tablename__ = 'roles'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False, unique=True)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    users = relationship('User', back_populates='role_obj')
    permissions = relationship('Permission', secondary='role_permissions', back_populates='roles')


class Permission(Base):
    __tablename__ = 'permissions'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True, index=True)
    description = Column(String(255), nullable=True)
    module = Column(String(50), nullable=True, index=True)  # sales, finance, people, inventory, settings
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    roles = relationship('Role', secondary='role_permissions', back_populates='permissions')


class RolePermission(Base):
    __tablename__ = 'role_permissions'
    id = Column(Integer, primary_key=True, index=True)
    role_id = Column(Integer, ForeignKey('roles.id', ondelete='CASCADE'), nullable=False, index=True)
    permission_id = Column(Integer, ForeignKey('permissions.id', ondelete='CASCADE'), nullable=False, index=True)
    __table_args__ = (UniqueConstraint('role_id', 'permission_id', name='uq_role_permission'),)


class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(150), unique=True, index=True, nullable=False)
    email = Column(String(254), unique=True, index=True, nullable=True)
    full_name = Column(String(254), nullable=True)
    mobile = Column(String(32), nullable=True, index=True)  # phone number for SMS login
    hashed_password = Column(String(512), nullable=False)
    role = Column(String(50), nullable=False, default='Viewer')  # Legacy field for backwards compatibility
    role_id = Column(Integer, ForeignKey('roles.id'), nullable=True, index=True)
    is_active = Column(Boolean, default=True)
    refresh_token_hash = Column(String(512), nullable=True)
    assistant_enabled = Column(Boolean, nullable=False, default=False)
    otp_secret = Column(String(64), nullable=True)
    otp_enabled = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    role_obj = relationship('Role', back_populates='users')
    
    def has_permission(self, permission_name: str) -> bool:
        """بررسی اینکه آیا کاربر دارای permission است"""
        if self.role_obj is None:
            return False
        return any(p.name == permission_name for p in self.role_obj.permissions)
    
    def has_module_access(self, module: str) -> bool:
        """بررسی دسترسی به یک ماژول"""
        if self.role_obj is None:
            return False
        return any(p.module == module for p in self.role_obj.permissions)


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
    tracking_code = Column(String(64), nullable=True, index=True)
    note = Column(Text, nullable=True)


class InvoiceItem(Base):
    __tablename__ = 'invoice_items'
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey('invoices.id'), nullable=False)
    product_id = Column(String(128), ForeignKey('products.id'), nullable=True)
    description = Column(String(1024), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    unit = Column(String(64), nullable=True)
    unit_price = Column(Integer, nullable=False)
    total = Column(Integer, nullable=False)
    
    product = relationship('Product', backref='invoice_items')


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
    invoice_id = Column(Integer, ForeignKey('invoices.id'), nullable=True, index=True)
    due_date = Column(DateTime(timezone=True), nullable=True)
    client_time = Column(DateTime(timezone=True), nullable=True)
    server_time = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    status = Column(String(32), nullable=False, default='draft')
    note = Column(Text, nullable=True)
    tracking_code = Column(String(64), nullable=True, index=True)

    invoice = relationship('Invoice', backref='payments')


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
    tracking_code = Column(String(64), nullable=True, index=True)


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


class UserSmsConfig(Base):
    __tablename__ = 'user_sms_configs'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, unique=True, index=True)
    provider = Column(String(50), nullable=False, default='ippanel')  # sms provider
    api_key = Column(String(512), nullable=True)  # encrypted IPPanel API key or other provider key
    sender_name = Column(String(128), nullable=True)  # sender ID (for IPPanel)
    enabled = Column(Boolean, nullable=False, default=False)  # user wants to use own SMS config
    auto_sms_enabled = Column(Boolean, nullable=False, default=False)  # send auto SMS on invoice/payment events
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    user = relationship('User', backref='sms_config')


class UserPreferences(Base):
    __tablename__ = 'user_preferences'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, unique=True, index=True)
    language = Column(String(5), nullable=False, default='fa')  # fa, en, ar, ku
    currency = Column(String(3), nullable=False, default='irr')  # irr, usd, aed
    auto_convert_currency = Column(Boolean, nullable=False, default=False)
    theme_preference = Column(String(50), nullable=True, default='default')
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    user = relationship('User', backref='preferences')


class DeviceLogin(Base):
    __tablename__ = 'device_logins'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    device_id = Column(String(128), nullable=False, index=True)  # UA fingerprint hash
    ip_address = Column(String(45), nullable=True, index=True)  # IPv4 or IPv6
    user_agent = Column(String(512), nullable=True)
    country = Column(String(2), nullable=True)  # ISO country code
    city = Column(String(128), nullable=True)
    login_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    logout_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    otp_attempts = Column(Integer, nullable=False, default=0)
    otp_failed_count = Column(Integer, nullable=False, default=0)
    otp_locked_until = Column(DateTime(timezone=True), nullable=True)  # Lockout time
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    user = relationship('User', backref='device_logins')


class DeveloperApiKey(Base):
    __tablename__ = 'developer_api_keys'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    api_key = Column(String(512), nullable=False)  # encrypted full key
    api_key_hash = Column(String(64), nullable=False, unique=True, index=True)  # SHA256 for lookups
    name = Column(String(128), nullable=False)
    description = Column(Text, nullable=True)
    enabled = Column(Boolean, nullable=False, default=True, index=True)
    rate_limit_per_minute = Column(Integer, nullable=False, default=60)
    endpoints = Column(Text, nullable=True)  # JSON: list of allowed endpoints
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    
    user = relationship('User', backref='api_keys')


class BlockchainEntry(Base):
    __tablename__ = 'blockchain_entries'
    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String(64), nullable=False, index=True)  # user, invoice, payment, product, person
    entity_id = Column(String(128), nullable=False, index=True)
    action = Column(String(32), nullable=False)  # create, update, delete
    data_hash = Column(String(64), nullable=False, unique=True, index=True)  # SHA256
    previous_hash = Column(String(64), nullable=True)  # Link to previous
    merkle_root = Column(String(64), nullable=True)  # Merkle tree root
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    user = relationship('User', backref='blockchain_entries')


class CustomerGroup(Base):
    __tablename__ = 'customer_groups'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    description = Column(Text, nullable=True)
    created_by_user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    is_shared = Column(Boolean, nullable=False, default=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    created_by_user = relationship('User', backref='customer_groups')
    members = relationship('CustomerGroupMember', backref='group', cascade='all, delete-orphan')


class CustomerGroupMember(Base):
    __tablename__ = 'customer_group_members'
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey('customer_groups.id'), nullable=False, index=True)
    person_id = Column(String(128), ForeignKey('persons.id'), nullable=False, index=True)
    added_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    person = relationship('Person')
    __table_args__ = (UniqueConstraint('group_id', 'person_id', name='uq_group_person'),)


# ==================== ICC Shop Organization Structure ====================

class IccCategory(Base):
    """دسته‌بندی کالاهای ICC از iccshop.ir"""
    __tablename__ = 'icc_categories'
    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String(128), nullable=False, unique=True, index=True)  # ICC Shop ID
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    parent_external_id = Column(String(128), nullable=True, index=True)  # برای ساختار سلسله‌مراتبی
    sync_url = Column(String(512), nullable=True)  # URL برای sync اطلاعات
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    centers = relationship('IccCenter', backref='category', cascade='all, delete-orphan')


class IccCenter(Base):
    """مراکز فروش ICC (مثل تهران، تبریز، ...)"""
    __tablename__ = 'icc_centers'
    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String(128), nullable=False, unique=True, index=True)
    category_id = Column(Integer, ForeignKey('icc_categories.id'), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    address = Column(Text, nullable=True)
    phone = Column(String(32), nullable=True)
    manager_name = Column(String(255), nullable=True)
    location_lat = Column(String(32), nullable=True)
    location_lng = Column(String(32), nullable=True)
    sync_url = Column(String(512), nullable=True)
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    units = relationship('IccUnit', backref='center', cascade='all, delete-orphan')


class IccUnit(Base):
    """واحدهای توزیعی در هر مرکز"""
    __tablename__ = 'icc_units'
    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String(128), nullable=False, unique=True, index=True)
    center_id = Column(Integer, ForeignKey('icc_centers.id'), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    unit_type = Column(String(64), nullable=True)  # warehouse, store, etc
    capacity = Column(Integer, nullable=True)
    sync_url = Column(String(512), nullable=True)
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    extensions = relationship('IccExtension', backref='unit', cascade='all, delete-orphan')


class IccExtension(Base):
    """شاخه‌های توسعه‌ای در هر واحد"""
    __tablename__ = 'icc_extensions'
    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String(128), nullable=False, unique=True, index=True)
    unit_id = Column(Integer, ForeignKey('icc_units.id'), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    responsible_name = Column(String(255), nullable=True)
    responsible_mobile = Column(String(32), nullable=True)
    status = Column(String(32), nullable=False, default='active')  # active, inactive, pending
    sync_url = Column(String(512), nullable=True)
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class SystemSettings(Base):
    """Global system settings (SMS, Email, Payment APIs, etc.)"""
    __tablename__ = 'system_settings'
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(128), nullable=False, unique=True, index=True)
    value = Column(Text, nullable=True)  # JSON for complex values
    setting_type = Column(String(32), nullable=False, default='string')  # string, json, int, bool
    display_name = Column(String(255), nullable=True)  # Label for admin UI
    description = Column(Text, nullable=True)  # Help text
    category = Column(String(64), nullable=True, index=True)  # sms, email, payment, etc.
    is_secret = Column(Boolean, nullable=False, default=False)  # Hide sensitive values
    updated_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    updated_by_user = relationship('User', foreign_keys=[updated_by], backref='updated_settings')
