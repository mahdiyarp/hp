from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List, Any
from typing import Literal


# Role و Permission schemas
class PermissionOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    module: Optional[str]
    
    class Config:
        orm_mode = True


class RoleOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    permissions: List[PermissionOut] = []
    
    class Config:
        orm_mode = True


class RoleCreate(BaseModel):
    name: str
    description: Optional[str] = None


class PermissionCreate(BaseModel):
    name: str
    description: Optional[str] = None
    module: Optional[str] = None


# User schemas
class UserCreate(BaseModel):
    username: str
    password: str
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role_id: Optional[int] = None  # New field for role assignment


class UserOut(BaseModel):
    id: int
    username: str
    email: Optional[EmailStr]
    full_name: Optional[str]
    mobile: Optional[str]
    role: str
    role_id: Optional[int]
    is_active: bool
    otp_enabled: bool
    role_obj: Optional[RoleOut] = None

    class Config:
        orm_mode = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    mobile: Optional[str] = None
    role_id: Optional[int] = None
    is_active: Optional[bool] = None


class Token(BaseModel):
    access_token: str
    refresh_token: str
    otp_required: bool = False
    user: Optional[UserOut] = None
    token_type: str = 'bearer'


class TokenPayload(BaseModel):
    sub: str
    exp: int


class OTPSetupResponse(BaseModel):
    secret: str
    uri: str


class OTPVerifyRequest(BaseModel):
    code: str


class OTPDisableRequest(BaseModel):
    code: Optional[str] = None


class TimeSyncBase(BaseModel):
    client_time: datetime


class TimeSyncCreate(TimeSyncBase):
    pass


class TimeSync(TimeSyncBase):
    id: int
    server_time: datetime
    created_at: datetime

    class Config:
        orm_mode = True
 

class ProductBase(BaseModel):
    name: str
    unit: Optional[str] = None
    group: Optional[str] = None
    description: Optional[str] = None
    code: Optional[str] = None


class ProductCreate(ProductBase):
    pass


class ProductOut(ProductBase):
    id: str
    code: str
    created_at: datetime

    class Config:
        orm_mode = True


class PriceHistoryOut(BaseModel):
    id: int
    product_id: str
    price: int
    type: str
    effective_at: datetime

    class Config:
        orm_mode = True


class PersonBase(BaseModel):
    name: str
    kind: Optional[str] = None
    mobile: Optional[str] = None
    description: Optional[str] = None
    code: Optional[str] = None


class PersonCreate(PersonBase):
    pass


class PersonOut(PersonBase):
    id: str
    code: str
    created_at: datetime

    class Config:
        orm_mode = True


class AccountBase(BaseModel):
    name: str
    kind: Literal['cash', 'bank', 'pos']
    details: Optional[Any] = None
    code: Optional[str] = None


class AccountCreate(AccountBase):
    pass


class AccountOut(AccountBase):
    id: str
    code: str
    created_at: datetime

    class Config:
        orm_mode = True


class InvoiceItemBase(BaseModel):
    description: str
    quantity: int = 1
    unit: Optional[str] = None
    unit_price: int
    product_id: Optional[str] = None


class InvoiceItemCreate(InvoiceItemBase):
    pass


class InvoiceItemOut(InvoiceItemBase):
    id: int

    class Config:
        orm_mode = True


class InvoiceCreate(BaseModel):
    invoice_type: str
    mode: Optional[str] = 'manual'
    party_id: Optional[str] = None
    party_name: Optional[str] = None
    client_time: Optional[datetime] = None
    client_calendar: Optional[Literal['gregorian', 'jalali']] = None
    items: List[InvoiceItemCreate]
    note: Optional[str] = None


class InvoiceOut(BaseModel):
    id: int
    invoice_number: Optional[str]
    invoice_type: str
    mode: str
    party_id: Optional[str]
    party_name: Optional[str]
    client_time: Optional[datetime]
    server_time: datetime
    status: str
    subtotal: Optional[int]
    tax: Optional[int]
    total: Optional[int]
    items: List[InvoiceItemOut]
    related_payments: Optional[List[int]] = None
    tracking_code: Optional[str] = None

    class Config:
        orm_mode = True


class PaymentBase(BaseModel):
    direction: Literal['in', 'out']
    mode: Optional[str] = 'manual'
    party_id: Optional[str] = None
    party_name: Optional[str] = None
    method: Optional[str] = None
    amount: int
    reference: Optional[str] = None
    invoice_id: Optional[int] = None
    due_date: Optional[datetime] = None
    client_time: Optional[datetime] = None
    client_calendar: Optional[Literal['gregorian', 'jalali']] = None
    note: Optional[str] = None
    tracking_code: Optional[str] = None


class PaymentCreate(PaymentBase):
    pass


class PaymentOut(PaymentBase):
    id: int
    payment_number: Optional[str]
    server_time: datetime
    status: str
    tracking_code: Optional[str] = None

    class Config:
        orm_mode = True


class LedgerEntryOut(BaseModel):
    id: int
    ref_type: Optional[str]
    ref_id: Optional[str]
    entry_date: datetime
    debit_account: str
    credit_account: str
    amount: int
    party_id: Optional[str]
    party_name: Optional[str]
    description: Optional[str]

    class Config:
        orm_mode = True


class PnLReport(BaseModel):
    start: Optional[datetime]
    end: Optional[datetime]
    sales: int
    purchases: int
    gross_profit: int


class PersonTurnoverItem(BaseModel):
    party_id: Optional[str]
    party_name: Optional[str]
    invoices_total: int
    payments_total: int


class StockValuationItem(BaseModel):
    product_id: str
    name: str
    inventory: int
    unit_price: Optional[int]
    total_value: int


class CashBalanceReport(BaseModel):
    method: str
    balance: int


class ActivityLogOut(BaseModel):
    id: int
    user_id: Optional[int]
    path: str
    method: Optional[str]
    status_code: Optional[int]
    detail: Optional[str]
    created_at: Optional[datetime]

    class Config:
        orm_mode = True


class ActivityLogUpdate(BaseModel):
    detail: Optional[str]


class AIReportOut(BaseModel):
    id: int
    report_date: Optional[datetime]
    summary: Optional[str]
    findings: Optional[str]
    status: str
    reviewed_by: Optional[int]
    reviewed_at: Optional[datetime]

    class Config:
        orm_mode = True


class AIReportReview(BaseModel):
    status: str  # approved | dismissed | reviewed
    note: Optional[str]


class IntegrationConfigOut(BaseModel):
    id: int
    name: str
    provider: str
    enabled: bool
    api_key: Optional[str]
    config: Optional[str]
    last_updated: Optional[datetime]

    class Config:
        orm_mode = True


class IntegrationConfigIn(BaseModel):
    name: str
    provider: str
    enabled: Optional[bool] = False
    api_key: Optional[str] = None
    config: Optional[str] = None


class IntegrationRefreshResult(BaseModel):
    name: str
    provider: str
    enabled: bool
    status: str
    sample: Optional[Any] = None
    last_updated: Optional[datetime]


class AssistantRequest(BaseModel):
    text: str


class AssistantResponse(BaseModel):
    ok: bool
    message: str
    data: Optional[dict] = None


class AssistantToggle(BaseModel):
    enabled: bool


class ExternalProduct(BaseModel):
    source: str
    title: Optional[str]
    price: Optional[int]
    currency: Optional[str] = 'IRR'
    image: Optional[str]
    description: Optional[str]
    link: Optional[str]
    raw: Optional[dict]


class ExternalSearchRequest(BaseModel):
    q: str
    sources: Optional[List[str]] = None
    limit: Optional[int] = 6


class SaveExternalProductRequest(BaseModel):
    source: str
    title: str
    price: Optional[int] = None
    currency: Optional[str] = 'IRR'
    image: Optional[str] = None
    description: Optional[str] = None
    link: Optional[str] = None
    unit: Optional[str] = None
    group: Optional[str] = None
    create_price_history: Optional[bool] = True


class BackupOut(BaseModel):
    id: int
    filename: str
    file_path: str
    kind: str
    created_by: Optional[int]
    created_at: Optional[datetime]
    size_bytes: Optional[int]
    note: Optional[str]

    class Config:
        orm_mode = True


class FinancialYearIn(BaseModel):
    name: str
    start_date: datetime
    end_date: Optional[datetime] = None


class FinancialYearOut(BaseModel):
    id: int
    name: str
    start_date: datetime
    end_date: Optional[datetime]
    is_closed: bool
    closed_at: Optional[datetime]
    opening_balances: Optional[str]

    class Config:
        orm_mode = True


# SMS Configuration schemas
class UserSmsConfigCreate(BaseModel):
    api_key: str  # IPPanel API key (will be encrypted)
    sender_name: Optional[str] = None
    provider: str = 'ippanel'
    enabled: bool = False
    auto_sms_enabled: bool = False


class UserSmsConfigUpdate(BaseModel):
    api_key: Optional[str] = None
    sender_name: Optional[str] = None
    provider: Optional[str] = None
    enabled: Optional[bool] = None
    auto_sms_enabled: Optional[bool] = None


class UserSmsConfigOut(BaseModel):
    id: int
    user_id: int
    provider: str
    sender_name: Optional[str]
    enabled: bool
    auto_sms_enabled: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class SmsSendRequest(BaseModel):
    to: str  # phone number
    message: str


class SmsTestResponse(BaseModel):
    success: bool
    message: str


class PhoneLoginRequest(BaseModel):
    phone: str  # mobile number like 09123456789


class PhoneLoginResponse(BaseModel):
    success: bool
    message: str
    session_id: Optional[str] = None


class PhoneOtpVerifyRequest(BaseModel):
    session_id: str
    otp_code: str  # 6-digit OTP code


class PhoneOtpVerifyResponse(BaseModel):
    success: bool
    access_token: Optional[str] = None
    token_type: Optional[str] = 'bearer'
    message: Optional[str] = None


class UserPreferencesOut(BaseModel):
    id: int
    user_id: int
    language: str  # fa, en, ar, ku
    currency: str  # irr, usd, aed
    auto_convert_currency: bool
    theme_preference: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class UserPreferencesUpdate(BaseModel):
    language: Optional[str] = None
    currency: Optional[str] = None
    auto_convert_currency: Optional[bool] = None
    theme_preference: Optional[str] = None


class DeviceLoginOut(BaseModel):
    id: int
    user_id: int
    device_id: str
    ip_address: Optional[str]
    user_agent: Optional[str]
    country: Optional[str]
    city: Optional[str]
    login_at: datetime
    logout_at: Optional[datetime]
    is_active: bool
    otp_attempts: int
    otp_failed_count: int
    otp_locked_until: Optional[datetime]
    created_at: datetime

    class Config:
        orm_mode = True


class DeveloperApiKeyCreate(BaseModel):
    name: str
    description: Optional[str] = None
    rate_limit_per_minute: int = 60
    endpoints: Optional[List[str]] = None  # List of allowed endpoints


class DeveloperApiKeyOut(BaseModel):
    id: int
    user_id: int
    name: str
    description: Optional[str]
    enabled: bool
    rate_limit_per_minute: int
    endpoints: Optional[str]
    last_used_at: Optional[datetime]
    created_at: datetime
    expires_at: Optional[datetime]
    revoked_at: Optional[datetime]

    class Config:
        orm_mode = True


class DeveloperApiKeyWithKey(DeveloperApiKeyOut):
    """Response when creating a key - shows the actual key once"""
    api_key: str


class DeveloperApiKeyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    enabled: Optional[bool] = None
    rate_limit_per_minute: Optional[int] = None
    endpoints: Optional[List[str]] = None


class ApiKeyRotateResponse(BaseModel):
    message: str
    old_key_id: int
    new_key_id: int
    new_api_key: str


class BlockchainEntryOut(BaseModel):
    id: int
    entity_type: str
    entity_id: str
    action: str
    data_hash: str
    previous_hash: Optional[str]
    merkle_root: Optional[str]
    user_id: Optional[int]
    timestamp: datetime
    created_at: datetime

    class Config:
        orm_mode = True


class BlockchainVerifyResponse(BaseModel):
    is_valid: bool
    message: str
    entries_checked: int


class BlockchainProof(BaseModel):
    entity_type: str
    entity_id: str
    entry_id: int
    data_hash: str
    previous_hash: Optional[str]
    merkle_root: Optional[str]
    timestamp: datetime
    action: str
    chain_is_valid: bool
    chain_message: str
    total_entries_in_chain: int
    entry_position: int


class CustomerGroupMemberOut(BaseModel):
    id: int
    group_id: int
    person_id: str
    added_at: datetime
    
    class Config:
        orm_mode = True


class CustomerGroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    is_shared: bool = False


class CustomerGroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_shared: Optional[bool] = None


class CustomerGroupOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    created_by_user_id: int
    is_shared: bool
    created_at: datetime
    updated_at: datetime
    members: List[CustomerGroupMemberOut] = []
    
    class Config:
        orm_mode = True


# ==================== ICC Shop Schemas ====================

class IccCategoryCreate(BaseModel):
    external_id: str
    name: str
    description: Optional[str] = None
    parent_external_id: Optional[str] = None
    sync_url: Optional[str] = None


class IccCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    parent_external_id: Optional[str] = None


class IccCategoryOut(BaseModel):
    id: int
    external_id: str
    name: str
    description: Optional[str]
    parent_external_id: Optional[str]
    last_synced_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True


class IccCenterCreate(BaseModel):
    external_id: str
    category_id: int
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    manager_name: Optional[str] = None
    location_lat: Optional[str] = None
    location_lng: Optional[str] = None
    sync_url: Optional[str] = None


class IccCenterUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    manager_name: Optional[str] = None
    location_lat: Optional[str] = None
    location_lng: Optional[str] = None


class IccCenterOut(BaseModel):
    id: int
    external_id: str
    category_id: int
    name: str
    address: Optional[str]
    phone: Optional[str]
    manager_name: Optional[str]
    location_lat: Optional[str]
    location_lng: Optional[str]
    last_synced_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True


class IccUnitCreate(BaseModel):
    external_id: str
    center_id: int
    name: str
    description: Optional[str] = None
    unit_type: Optional[str] = None
    capacity: Optional[int] = None
    sync_url: Optional[str] = None


class IccUnitUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    unit_type: Optional[str] = None
    capacity: Optional[int] = None


class IccUnitOut(BaseModel):
    id: int
    external_id: str
    center_id: int
    name: str
    description: Optional[str]
    unit_type: Optional[str]
    capacity: Optional[int]
    last_synced_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True


class IccExtensionCreate(BaseModel):
    external_id: str
    unit_id: int
    name: str
    responsible_name: Optional[str] = None
    responsible_mobile: Optional[str] = None
    status: str = 'active'
    sync_url: Optional[str] = None


class IccExtensionUpdate(BaseModel):
    name: Optional[str] = None
    responsible_name: Optional[str] = None
    responsible_mobile: Optional[str] = None
    status: Optional[str] = None


class IccExtensionOut(BaseModel):
    id: int
    external_id: str
    unit_id: int
    name: str
    responsible_name: Optional[str]
    responsible_mobile: Optional[str]
    status: str
    last_synced_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True


# System Settings schemas
class SystemSettingOut(BaseModel):
    id: int
    key: str
    value: Optional[str]
    setting_type: str
    display_name: Optional[str]
    description: Optional[str]
    category: Optional[str]
    is_secret: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True


class SystemSettingCreate(BaseModel):
    key: str
    value: Optional[str] = None
    setting_type: str = 'string'
    display_name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    is_secret: bool = False


class SystemSettingUpdate(BaseModel):
    value: Optional[str] = None
    display_name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    is_secret: Optional[bool] = None


# Dashboard Widget schemas
class DashboardWidgetOut(BaseModel):
    id: int
    user_id: int
    widget_type: str
    title: Optional[str]
    position_x: int
    position_y: int
    width: int
    height: int
    config: Optional[str]
    enabled: bool
    order: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True


class DashboardWidgetCreate(BaseModel):
    widget_type: str
    title: Optional[str] = None
    position_x: int = 0
    position_y: int = 0
    width: int = 3
    height: int = 3
    config: Optional[str] = None
    enabled: bool = True
    order: int = 0


class DashboardWidgetUpdate(BaseModel):
    title: Optional[str] = None
    position_x: Optional[int] = None
    position_y: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    config: Optional[str] = None
    enabled: Optional[bool] = None
    order: Optional[int] = None
