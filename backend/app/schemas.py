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
    mobile: Optional[str] = None
    role_id: Optional[int] = None  # New field for role assignment
    role: Optional[str] = None


class UserOut(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    mobile: Optional[str] = None
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
    active_financial_year_id: Optional[int] = None


class UserPartySyncUserSample(BaseModel):
    id: int
    username: Optional[str] = None
    mobile: Optional[str] = None


class UserPartySyncPartySample(BaseModel):
    id: str
    name: Optional[str] = None
    mobile: Optional[str] = None


class UserPartySyncStats(BaseModel):
    total_users: int
    mobile_users: int
    missing_mobile_users: int
    linked_users: int
    linked_parties: int
    orphan_parties_count: int
    coverage_percent: int
    unlinked_users_total: int
    orphan_parties_total: int
    sample_limit: int
    generated_at: datetime
    top_unlinked_users: List[UserPartySyncUserSample]
    top_orphan_parties: List[UserPartySyncPartySample]


class PageTemplateBase(BaseModel):
    name: str
    html: str
    css: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None


class PageTemplateUpsert(PageTemplateBase):
    id: Optional[int] = None


class PageTemplateOut(PageTemplateBase):
    id: int
    updated_at: datetime


class Token(BaseModel):
    access_token: str
    refresh_token: str
    otp_required: bool = False
    user: Optional[UserOut] = None
    token_type: str = 'bearer'


class TokenPayload(BaseModel):
    sub: str
    exp: int


class TokenRefreshRequest(BaseModel):
    refresh_token: str


class OTPSetupResponse(BaseModel):
    secret: str
    uri: str
class OTPVerifyRequest(BaseModel):
    code: str

class OTPDisableRequest(BaseModel):
    code: Optional[str] = None



# ==================== موبائل سے رجسٹریشن کے لیے Schemas ====================

class MobileOTPRequest(BaseModel):
    """موبائل نمبر سے OTP کی درخواست"""
    mobile: str  # فارمیٹ: +989123456789 یا 9123456789


class MobileOTPVerifyRequest(BaseModel):
    """OTP تصدیق اور صارف بنانے کے لیے"""
    mobile: str
    otp_code: str
    username: str
    password: str
    full_name: Optional[str] = None


class MobileOTPResponse(BaseModel):
    """OTP کی جواب"""
    success: bool
    message: str
    session_id: Optional[str] = None


class MobileRegisterResponse(BaseModel):
    """موبائل رجسٹریشن کی جواب"""
    success: bool
    message: str
    user: Optional[UserOut] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None


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
    inventory: Optional[int] = 0
    last_purchase_price: Optional[int] = None  # آخرین قیمت خرید
    avg_purchase_price: Optional[int] = None   # میانگین قیمت خرید
    last_sale_price: Optional[int] = None      # آخرین قیمت فروش
    avg_sale_price: Optional[int] = None       # میانگین قیمت فروش

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


# ==================== Product Pricing ====================

class ProductPriceCreate(BaseModel):
    price_type: str = 'sale'  # sale, purchase, retail, wholesale
    currency: str = 'IRR'
    amount: int
    effective_at: Optional[datetime] = None


class ProductPriceUpdate(BaseModel):
    price_type: Optional[str] = None
    currency: Optional[str] = None
    amount: Optional[int] = None
    effective_at: Optional[datetime] = None


class ProductPriceOut(BaseModel):
    id: int
    product_id: str
    price_type: str
    currency: str
    amount: int
    effective_at: datetime
    created_at: datetime

    class Config:
        orm_mode = True


class EffectivePriceOut(BaseModel):
    product_id: str
    price_type: str
    at: Optional[datetime]
    amount: Optional[int]
    currency: Optional[str]


class PersonBase(BaseModel):
    name: str
    kind: Optional[str] = None
    mobile: Optional[str] = None
    description: Optional[str] = None
    code: Optional[str] = None
    tax_id: Optional[str] = None
    national_id: Optional[str] = None
    address: Optional[str] = None
    payment_terms: Optional[str] = None
    credit_limit: Optional[int] = None
    tax_id: Optional[str] = None
    national_id: Optional[str] = None
    address: Optional[str] = None
    payment_terms: Optional[str] = None
    credit_limit: Optional[int] = None


class PersonCreate(PersonBase):
    pass


class PersonOut(PersonBase):
    id: str
    code: Optional[str] = None
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
    discount: Optional[int] = 0
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
    client_time: Optional[str] = None
    client_calendar: Optional[Literal['gregorian', 'jalali']] = None
    tax_rate: Optional[int] = 0
    discount_total: Optional[int] = 0
    payment_terms_days: Optional[int] = None
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
    due_date: Optional[str] = None
    client_time: Optional[str] = None
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


# ==================== Cheques ====================

class ChequeCreate(BaseModel):
    payment_id: int
    cheque_number: Optional[str] = None
    bank_name: Optional[str] = None
    branch_name: Optional[str] = None
    status: Optional[str] = None
    issue_date: Optional[datetime] = None
    issue_date_jalali: Optional[str] = None
    due_date: Optional[datetime] = None
    due_date_jalali: Optional[str] = None
    clearing_date: Optional[datetime] = None


class ChequeUpdate(BaseModel):
    cheque_number: Optional[str] = None
    bank_name: Optional[str] = None
    branch_name: Optional[str] = None
    status: Optional[str] = None
    issue_date: Optional[datetime] = None
    issue_date_jalali: Optional[str] = None
    due_date: Optional[datetime] = None
    due_date_jalali: Optional[str] = None
    clearing_date: Optional[datetime] = None


class ChequePaymentMini(BaseModel):
    id: int
    payment_number: Optional[str]
    party_name: Optional[str]
    amount: int

    class Config:
        orm_mode = True


class ChequeOut(BaseModel):
    id: int
    payment_id: int
    cheque_number: Optional[str]
    bank_name: Optional[str]
    branch_name: Optional[str]
    status: str
    issue_date: Optional[datetime]
    due_date: Optional[datetime]
    clearing_date: Optional[datetime]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    payment: Optional[ChequePaymentMini]
    due_date_jalali: Optional[str] = None
    issue_date_jalali: Optional[str] = None

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

"""Assistant chat schemas aligned with tests expecting message/mode and reply fields."""
class AssistantChatRequest(BaseModel):
    message: str
    mode: Optional[str] = None
    session_id: Optional[int] = None
    title: Optional[str] = None
    context: Optional[dict] = None

class AssistantChatResponse(BaseModel):
    reply: str
    session_id: Optional[int] = None
    mode: Optional[str] = None

class AssistantSettingsOut(BaseModel):
    provider: Optional[str] = None
    base_url: Optional[str] = None
    model_name: Optional[str] = None
    language: Optional[str] = None
    enable_doc_understanding: Optional[bool] = None
    enable_journal_suggestions: Optional[bool] = None
    enable_alerts: Optional[bool] = None
    max_tokens: Optional[int] = None
    temperature: Optional[float] = None
    top_p: Optional[float] = None
    enabled: bool = False
    api_key_masked: Optional[str] = None


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

# Backward-compat alias expected by tests
class FiscalYearOut(FinancialYearOut):
    pass


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
    id: Optional[int] = None
    user_id: Optional[int] = None
    provider: Optional[str] = None
    sender_name: Optional[str] = None
    enabled: Optional[bool] = None
    auto_sms_enabled: Optional[bool] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True

class SmsSettingsOut(BaseModel):
    provider: Optional[str] = None
    base_url: Optional[str] = None
    default_sender: Optional[str] = None
    enabled: bool = False
    low_credit_threshold: Optional[int] = None
    api_key_masked: Optional[str] = None
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True


class SmsSendRequest(BaseModel):
    to: str  # phone number
    message: str

class SmsTestRequest(BaseModel):
    to: str
    message: str


class SmsTestResponse(BaseModel):
    success: bool
    message: str

class SmsTemplateOut(BaseModel):
    id: int
    code: str
    pattern_id: Optional[str] = None
    text: Optional[str] = None
    is_active: bool
    description: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True

class SmsTemplateIn(BaseModel):
    code: str
    pattern_id: Optional[str] = None
    text: Optional[str] = None
    is_active: bool = True
    description: Optional[str] = None

class SmsTemplateTestRequest(BaseModel):
    template_key: str
    to: str
    variables: Optional[dict] = None


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

# Assistant document analysis result expected by tests
class DocumentAnalysisResult(BaseModel):
    doc_type: str
    title: Optional[str] = None
    party: Optional[dict] = None
    date_issued: Optional[str] = None
    items: list = []
    totals: Optional[dict] = None
    confidence_scores: Optional[dict] = None
    suggested_journal: list = []

class JournalSuggestion(BaseModel):
    account_debit: str
    account_credit: str
    amount: int
    description: Optional[str] = None
    confidence: Optional[float] = None

# Backward-compat input for SMS settings API
class SmsSettingsIn(BaseModel):
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    default_sender: Optional[str] = None
    provider: Optional[str] = None
    enabled: Optional[bool] = None
    low_credit_threshold: Optional[int] = None


class UserPreferencesOut(BaseModel):
    id: int
    user_id: int
    language: str  # fa, en, ar, ku
    currency: str  # irr, usd, aed
    auto_convert_currency: bool
    theme_preference: Optional[str]
    active_financial_year_id: Optional[int] = None
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


# ==================== Payment Methods ====================

class PaymentMethodCreate(BaseModel):
    key: str
    name: str
    parent_id: Optional[int] = None
    enabled: Optional[bool] = True
    order: Optional[int] = 0
    account: Optional[str] = None
    is_cheque: Optional[bool] = False
    config: Optional[str] = None


class PaymentMethodUpdate(BaseModel):
    name: Optional[str] = None
    parent_id: Optional[int] = None
    enabled: Optional[bool] = None
    order: Optional[int] = None
    account: Optional[str] = None
    is_cheque: Optional[bool] = None
    config: Optional[str] = None


class PaymentMethodOut(BaseModel):
    id: int
    key: str
    name: str
    parent_id: Optional[int]
    enabled: bool
    order: int
    account: Optional[str]
    is_cheque: bool
    config: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


# ==================== Person Activities (CRM Notes) ====================

class PersonActivityCreate(BaseModel):
    content: str
    kind: Optional[str] = 'note'
    next_action_at: Optional[datetime] = None


class PersonActivityOut(BaseModel):
    id: int
    person_id: str
    kind: Optional[str]
    content: str
    next_action_at: Optional[datetime]
    created_by: Optional[int]
    created_at: datetime

    class Config:
        orm_mode = True


# ==================== Sales (Sale Orders) ====================

class SaleOrderItemBase(BaseModel):
    description: str
    quantity: int = 1
    unit: Optional[str] = None
    unit_price: int
    product_id: Optional[str] = None
    discount: Optional[int] = None
    tax_rate: Optional[int] = None


class SaleOrderItemCreate(SaleOrderItemBase):
    pass


class SaleOrderItemOut(SaleOrderItemBase):
    id: int

    class Config:
        orm_mode = True


class SaleOrderCreate(BaseModel):
    party_id: Optional[str] = None
    party_name: Optional[str] = None
    client_time: Optional[datetime] = None
    items: List[SaleOrderItemCreate]
    note: Optional[str] = None
    currency: Optional[str] = 'IRR'


class SaleOrderOut(BaseModel):
    id: int
    order_number: Optional[str]
    status: str
    party_id: Optional[str]
    party_name: Optional[str]
    client_time: Optional[datetime]
    server_time: datetime
    subtotal: Optional[int]
    discount: Optional[int]
    tax: Optional[int]
    shipping: Optional[int]
    total: Optional[int]
    currency: str
    note: Optional[str]
    tracking_code: Optional[str]
    invoice_id: Optional[int]
    items: List[SaleOrderItemOut] = []

    class Config:
        orm_mode = True
