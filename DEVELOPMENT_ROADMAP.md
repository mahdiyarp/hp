# HesabPak Development Roadmap & Implementation Plan

## Project Overview
HesabPak is a comprehensive accounting and financial management system with features for multi-language support, developer API integration, security enhancements, organizational structure management, and blockchain-based audit trails.

---

## ✅ COMPLETED PHASES

### Phase 1: Core Infrastructure & i18n
- ✅ **Dashboard Module** - Added to main menu with overview widgets
- ✅ **Internationalization (i18n)** - 4 language support (Persian, English, Arabic, Kurdish)
  - Frontend: I18nContext, translation files
  - Backend: UserPreferences model for language/currency storage
- ✅ **User Preferences** - Language, Currency, Auto-convert, Theme settings
- ✅ **Database Migration** - 0024_user_preferences

---

## 🔄 IN PROGRESS / TODO

### Phase 2: Developer Tools & API Management

#### 2.1 API Developer Portal
**Purpose**: Allow developers to integrate third-party APIs (AI, FX prices, etc.)

**Backend Requirements**:
- [ ] Create `DeveloperApiKey` model
  - api_key (encrypted, unique)
  - name, description
  - enabled, rate_limit, created_by_user_id
  - endpoints (JSON: which endpoints can use this key)
  - last_used_at, created_at, expires_at

- [ ] Create migrations: `0025_developer_api_keys.py`

- [ ] Pydantic schemas:
  - DeveloperApiKeyCreate
  - DeveloperApiKeyOut
  - DeveloperApiKeyUpdate
  
- [ ] CRUD functions in `crud.py`:
  - create_api_key(session, user_id, payload)
  - get_user_api_keys(session, user_id)
  - rotate_api_key(session, key_id)
  - revoke_api_key(session, key_id)
  
- [ ] Endpoints in `main.py`:
  - GET `/api/developer/keys` - List user's API keys
  - POST `/api/developer/keys` - Create new key
  - PUT `/api/developer/keys/{key_id}` - Update key (enable/disable)
  - DELETE `/api/developer/keys/{key_id}` - Revoke key
  - GET `/api/developer/endpoints` - List available integration endpoints

**Frontend Requirements**:
- [ ] Create `DeveloperModule.tsx` component
  - API Key management interface
  - Key generation with copy-to-clipboard
  - Usage statistics
  - Rate limit display

#### 2.2 External API Integration Endpoints
**Purpose**: Centralized endpoints for external data sources

**Backend API Endpoints to Add**:
- [ ] `GET /api/external/fx-rates` - Currency exchange rates (USD, EUR, GBP, etc.)
  - Uses IntegrationConfig (e.g., "navasan", "exchangerate-api")
  
- [ ] `GET /api/external/crypto-prices` - Cryptocurrency prices
  - Uses IntegrationConfig (e.g., "coinmarketcap")
  
- [ ] `POST /api/external/ai/product-match` - AI product matching
  - Input: product name, category, specs
  - Output: matched product with code, warranty info
  - Uses AI provider integration

- [ ] `POST /api/external/ai/invoice-analysis` - AI invoice OCR & parsing
  - Input: image/PDF of invoice
  - Output: structured invoice data

- [ ] `POST /api/external/customer-verify` - Customer verification via ICCSHOP
  - Input: customer info, business license
  - Output: verified customer data, rating

---

### Phase 3: Security & Audit Enhancement

#### 3.1 Device Tracking & Login Security
**Purpose**: Track all login attempts with device info for security audit

**Backend Requirements**:
- [ ] Create `DeviceLogin` model
  - user_id, device_id (fingerprint: UA hash)
  - ip_address, user_agent, country, city
  - login_at, logout_at, is_active
  - otp_attempts, otp_failed_count (for rate limiting)

- [ ] Create migration: `0025_device_login.py`

- [ ] Enhance OTP security in `sms.py`:
  - Lock account after 3 failed OTP attempts
  - Add cooldown timer (1 hour lockout)
  - Log each attempt with device info

- [ ] Endpoints:
  - GET `/api/security/devices` - List active devices for user
  - DELETE `/api/security/devices/{device_id}` - Logout from device
  - GET `/api/security/login-history` - View login audit trail

**Frontend Requirements**:
- [ ] Security page in SystemModule
  - Active devices list
  - Login history timeline
  - Device revocation UI

#### 3.2 Blockchain Audit Trail
**Purpose**: Immutable record of all transactions using blockchain hashing

**Backend Requirements**:
- [ ] Create `BlockchainEntry` model
  - entity_type (user, invoice, payment, product, person)
  - entity_id
  - action (create, update, delete)
  - data_hash (SHA256 of entity data)
  - previous_hash (for merkle chain)
  - merkle_root
  - timestamp, user_id

- [ ] Create migration: `0026_blockchain_entries.py`

- [ ] Blockchain functions in new `blockchain.py`:
  - hash_entity(entity_type, entity_id, data) -> SHA256
  - create_blockchain_entry(session, entity_type, entity_id, action, data)
  - verify_blockchain_integrity(session) -> bool
  - get_entity_history(session, entity_type, entity_id) -> List[BlockchainEntry]

- [ ] Hook into CRUD operations:
  - After create/update/delete of Invoice, Payment, User, Product, Person
  - Automatically create BlockchainEntry

- [ ] Endpoints:
  - GET `/api/blockchain/entries?entity_type=invoice&entity_id=123` - Get hash chain
  - GET `/api/blockchain/verify` - Verify integrity of database
  - POST `/api/blockchain/export` - Export merkle proof

**Frontend Requirements**:
- [ ] Blockchain Explorer page in SystemModule
  - Search by entity type and ID
  - Display merkle chain visually
  - Hash verification badge
  - Integrity status

---

### Phase 4: Organizational Structure (ICC Shop Integration)

#### 4.1 Category > Centers > Units > Extensions Hierarchy
**Purpose**: Model ICC Shop's organizational structure

**Backend Requirements**:
- [ ] Create models:
  - `ProductCategory` (تلويزيون، ایکس باکس، لپ تاپ، etc.)
    - name, parent_category_id, icon
  
  - `ServiceCenter` (مرکز سرويس)
    - name, description, address, phone
    - category_id, external_id (from ICC)
  
  - `Unit` (واحد داخل مرکز)
    - name, unit_number (557)
    - service_center_id
  
  - `UnitExtension` (شماره داخلی)
    - unit_id, extension_number (5571)
    - department, contact_info

- [ ] Create migrations: `0027_icc_structure.py`

- [ ] Sync endpoint:
  - `POST /api/admin/sync-icc-shop` - Fetch and sync from ICC website

- [ ] CRUD endpoints:
  - GET `/api/categories` - List all categories
  - GET `/api/centers?category_id=1` - List centers by category
  - GET `/api/units?center_id=1` - List units by center
  - GET `/api/units/{unit_id}/extensions` - List extensions

#### 4.2 Customer Groups
**Purpose**: Editable customer groupings for filtering and access control

**Backend Requirements**:
- [ ] Create `CustomerGroup` model
  - name, description, created_by_user_id
  - is_shared (global vs private)
  - permissions (which users can see)

- [ ] Create association model: `CustomerGroupMember`
  - group_id, person_id

- [ ] Create migration: `0028_customer_groups.py`

- [ ] CRUD endpoints:
  - GET `/api/customer-groups` - List groups
  - POST `/api/customer-groups` - Create group
  - PUT `/api/customer-groups/{group_id}` - Edit
  - DELETE `/api/customer-groups/{group_id}` - Delete
  - POST `/api/customer-groups/{group_id}/members` - Add customer
  - DELETE `/api/customer-groups/{group_id}/members/{person_id}` - Remove customer

**Frontend Requirements**:
- [ ] Customer Groups management in SystemModule Settings
  - CRUD interface for groups
  - Member management (add/remove customers)
  - Permission visibility controls

---

### Phase 5: Shared Resources & Advanced Features

#### 5.1 Shared Products & Customers
**Purpose**: Allow users to use products/customers created by others (if enabled in settings)

**Backend Requirements**:
- [ ] Extend `Product` and `Person` models:
  - created_by_user_id
  - is_global (shareable across users)
  - visibility: 'private', 'shared', 'global'

- [ ] Endpoints with filtering:
  - GET `/api/products?shared=true` - Global + shared products
  - GET `/api/customers?shared=true` - Global + shared customers

- [ ] Setting in SystemModule to enable/disable sharing

#### 5.2 AI-Powered Product Matching
**Purpose**: Auto-fill product details using AI

**Backend Requirement**:
- [ ] Enhance `POST /api/external/ai/product-match`
  - Input: partial product name or barcode
  - Output:
    - Matched product name
    - Global product code
    - Warranty info
    - Category suggestion

**Frontend Requirement**:
- [ ] Invoice Item form with AI autocomplete
  - As user types product name
  - Show AI suggestions with confidence score
  - One-click insertion

---

## 📊 DATABASE SCHEMA ADDITIONS

```
NEW TABLES (Planned):
- 0025: developer_api_keys
- 0025: device_logins
- 0026: blockchain_entries
- 0027: product_categories, service_centers, units, unit_extensions
- 0028: customer_groups, customer_group_members

MODIFIED TABLES:
- products: added created_by_user_id, is_global, visibility
- persons: added created_by_user_id, is_global, visibility
```

---

## 🔐 Security Considerations

1. **API Key Storage**: All API keys encrypted at rest using RSA or Fernet
2. **OTP Rate Limiting**: Lock after 3 failed attempts for 1 hour
3. **Device Tracking**: User-Agent fingerprinting + IP logging
4. **Blockchain Immutability**: Use SHA256 merkle chains for audit trail
5. **Permission-Based Access**: Role-based filtering for shared resources

---

## 📈 Implementation Priority

**High Priority (Week 1-2)**:
1. API Developer Portal
2. OTP Enhancement & Device Tracking
3. Blockchain Audit Trail

**Medium Priority (Week 3-4)**:
1. ICC Shop Integration
2. Customer Groups Management

**Low Priority (Week 5+)**:
1. Shared Resources Enhancement
2. Advanced AI Features

---

## 🚀 Deployment Notes

- All migrations must maintain backward compatibility
- Use `alembic stamp` for existing deployments to mark migrations as applied
- Database backups recommended before running migrations
- Frontend should gracefully handle missing preferences (fallback to defaults)

