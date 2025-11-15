# API Security & Authentication Documentation

## 🔐 Authentication System

### 1. Login Flow

```
POST /api/auth/login
Content-Type: application/x-www-form-urlencoded

username=mehdi_pakzamir&password=MehdiDev@2025

Response:
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer",
  "user": {
    "id": 19,
    "username": "mehdi_pakzamir",
    "full_name": "مهدی پاک‌ضمیر",
    "email": "mahdiyarp@gmail.com",
    "mobile": "09123506545",
    "role": {
      "id": 19,
      "name": "Developer_1763156124"
    },
    "permissions": [23 permissions...],
    "modules": ["reports", "finance", "sales", "people", "inventory", "settings"]
  }
}
```

### 2. Token Usage

```
Authorization: Bearer <access_token>

Example:
GET /api/auth/me
Authorization: Bearer eyJhbGc...
```

### 3. Current User Info

```
GET /api/auth/me

Response:
{
  "id": 19,
  "username": "mehdi_pakzamir",
  "full_name": "مهدی پاک‌ضمیر",
  "email": "mahdiyarp@gmail.com",
  "mobile": "09123506545",
  "role": {
    "id": 19,
    "name": "Developer_1763156124"
  },
  "permissions": [23 permissions...],
  "modules": ["reports", "finance", "sales", "people", "inventory", "settings"],
  "is_otp_enabled": false
}
```

---

## 🛡️ Authorization Model

### Permission-Based Access Control (PBAC)

```python
def require_permissions(permission_names: List[str]):
    """
    Check if user has any of the required permissions.
    Returns decorator that raises HTTPException 403 if not authorized.
    
    Args:
        permission_names: List of permission strings to check
        
    Returns:
        Decorator function for use with FastAPI endpoints
    """
```

### Usage Example

```python
@app.get('/api/payments')
def list_payments(
    q: Optional[str] = None, 
    session: Session = Depends(db.get_db), 
    current: models.User = Depends(get_current_user)
):
    # Check if user has finance_view permission
    require_permissions(['finance_view'])(current)
    
    # If user doesn't have permission, 403 Forbidden is raised
    payments = crud.get_payments(session, q=q)
    return payments
```

### Permission Check Logic

```
User has permission if:
  user.role.permissions ∩ [required_permissions] ≠ ∅
  
In English:
  "User's role permissions" AND "Required permissions" = at least one match
```

---

## 📊 Protected Endpoints

### Finance Module

| Endpoint | Method | Permission | Description |
|----------|--------|------------|-------------|
| `/api/payments` | GET | finance_view | List all payments |
| `/api/payments/{id}` | GET | finance_view | Get payment details |
| `/api/payments/manual` | POST | finance_create | Create manual payment |
| `/api/payments/from-draft` | POST | finance_create | Create from draft |
| `/api/payments/{id}` | PATCH | finance_edit | Edit payment |
| `/api/payments/{id}/finalize` | POST | finance_edit | Finalize payment |
| `/api/reports/pnl` | GET | finance_report | P&L Report |
| `/api/reports/cashflow` | GET | finance_report | Cash Flow Report |
| `/api/reports/stock` | GET | finance_report | Stock Report |

### Sales Module

| Endpoint | Method | Permission | Description |
|----------|--------|------------|-------------|
| `/api/invoices` | GET | sales_view | List invoices |
| `/api/invoices` | POST | sales_create | Create invoice |
| `/api/invoices/{id}` | PATCH | sales_edit | Edit invoice |
| `/api/invoices/{id}/finalize` | POST | sales_finalize | Finalize invoice |

### People Module

| Endpoint | Method | Permission | Description |
|----------|--------|------------|-------------|
| `/api/customers` | GET | people_view | List customers |
| `/api/customers` | POST | people_create | Create customer |
| `/api/customers/{id}` | PATCH | people_edit | Edit customer |
| `/api/suppliers` | GET | people_view | List suppliers |
| `/api/suppliers` | POST | people_create | Create supplier |

### Settings Module

| Endpoint | Method | Permission | Description |
|----------|--------|------------|-------------|
| `/api/sms/config` | GET | settings_view | View SMS config |
| `/api/sms/config` | POST | settings_edit | Set SMS config |
| `/api/sms/send-test` | POST | settings_edit | Send test SMS |
| `/api/backups` | GET | backup_manage | List backups |
| `/api/backups` | POST | backup_manage | Create backup |

---

## 🔑 Developer Account Credentials

### Login Information

```
Username:  mehdi_pakzamir
Email:     mahdiyarp@gmail.com
Mobile:    09123506545
Password:  MehdiDev@2025  ⚠️ Change on first login
```

### Account Details

```
User ID:              19
Role:                 Developer_1763156124
Permissions:          23 (all system permissions)
Accessible Modules:   6 (reports, finance, sales, people, inventory, settings)
Status:               Active ✅
2FA Enabled:          false (can be enabled)
```

---

## 🔒 Security Features

### 1. Password Security
- ✅ Hashed with bcrypt (salt: 12 rounds)
- ✅ Minimum length: 8 characters
- ✅ Change password endpoint: `POST /api/users/{id}/change-password`

### 2. Token Security
- ✅ JWT with HS256 signature
- ✅ Token expiration: 24 hours
- ✅ Refresh token: available (optional 2FA)

### 3. OTP (Optional 2FA)
- ✅ Time-based OTP (TOTP)
- ✅ 6-digit codes
- ✅ 30-second window
- ✅ Endpoints:
  - `POST /api/auth/otp/enable` — Enable 2FA
  - `POST /api/auth/otp/verify` — Verify OTP code
  - `POST /api/auth/otp/disable` — Disable 2FA

### 4. Rate Limiting
- ✅ Login attempts: 5 per minute per IP
- ✅ API calls: 1000 per hour per token
- ✅ SMS sends: 100 per hour per user

### 5. Audit Logging
- ✅ All API requests logged (except GET /api/logs)
- ✅ User, timestamp, endpoint, method, status, response time
- ✅ Query: `GET /api/activity-logs`

---

## 🔐 SMS & Integration Security

### 1. SMS Gateway Configuration

```
Provider:       IPPanel (Kavenegar, Ghasedak also supported)
Auth Method:    Bearer Token
Encryption:     API Keys stored encrypted in database
Endpoint:       https://api.ippanel.com/api/v1/sms/send
```

### 2. API Key Protection

```
❌ Never logged in plaintext
❌ Never sent in URL parameters
✅ Encrypted at rest (database)
✅ Encrypted in transit (HTTPS)
✅ Only accessible by authenticated users with settings_edit permission
```

### 3. Test Endpoint

```
POST /api/sms/send-test
Authorization: Bearer <token>
Content-Type: application/json

{
  "provider": "ippanel",
  "to": "09123456789",
  "message": "Test message from HP"
}

Response:
{
  "success": true,
  "message_id": "1234567890",
  "status": "delivered"
}
```

---

## 🛠️ Integration APIs

### 1. Available Services

#### SMS Providers
- ✅ IPPanel: `https://api.ippanel.com/api/v1/sms/send`
- ✅ Kavenegar: `https://api.kavenegar.com/v1/{apikey}/sms/send.json`
- ✅ Ghasedak: `https://api.ghasedak.me/v2/sms/send/simple`

#### Payment Gateways
- Available: Configure and test
- Status: Active
- Developer can: Test & configure

### 2. Webhook Support

```
POST /api/webhooks/sms
POST /api/webhooks/payment
POST /api/webhooks/invoice

All webhooks require:
- Bearer token authentication
- HMAC signature verification
- Timestamp validation (5 min window)
```

---

## 🔍 Activity Audit Log

### Log Format

```json
{
  "id": 1,
  "user_id": 19,
  "username": "mehdi_pakzamir",
  "action": "CREATE",
  "resource": "Payment",
  "resource_id": 123,
  "endpoint": "/api/payments/manual",
  "method": "POST",
  "status_code": 201,
  "ip_address": "192.168.1.1",
  "user_agent": "curl/7.68.0",
  "timestamp": "2025-11-14T12:30:45Z",
  "duration_ms": 145,
  "details": {
    "old_value": null,
    "new_value": { "amount": 1000000, "currency": "IRR" }
  }
}
```

### Query Examples

```
# All activities by developer
GET /api/activity-logs?user_id=19

# Finance module changes today
GET /api/activity-logs?resource=Payment&date_from=2025-11-14&date_to=2025-11-15

# Failed auth attempts
GET /api/activity-logs?action=LOGIN&status_code=401

# Export for auditing
GET /api/activity-logs/export?format=csv&date_from=2025-11-01&date_to=2025-11-30
```

---

## 🚨 Error Handling

### Standard HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | Request succeeded |
| 201 | Created | Resource created |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate or constraint violation |
| 500 | Server Error | Internal error |

### Error Response Format

```json
{
  "detail": "User does not have required permissions",
  "error_code": "PERMISSION_DENIED",
  "status": 403
}
```

---

## 🔄 Best Practices

### 1. API Usage
```
✅ Always use HTTPS
✅ Include Bearer token in Authorization header
✅ Handle token expiration (refresh if needed)
✅ Log all requests for audit
✅ Implement exponential backoff for retries
```

### 2. Security
```
✅ Change default password on first login
✅ Enable 2FA for sensitive operations
✅ Rotate API keys periodically
✅ Monitor audit logs for suspicious activity
✅ Use HTTPS everywhere
```

### 3. Error Handling
```
✅ Don't expose sensitive data in errors
✅ Log errors server-side
✅ Return generic error messages to clients
✅ Include error_code for debugging
✅ Provide support contact info in errors
```

---

## 📞 Support & Escalation

### For Technical Issues:
- **Email**: mahdiyarp@gmail.com
- **Mobile**: 09123506545
- **Phone**: 88808881

### Response Times:
- **Critical**: < 2 hours
- **High**: < 4 hours
- **Medium**: < 24 hours
- **Low**: < 48 hours

---

**سند مرجع**: API Security & Authentication  
**وضعیت**: ✅ فعال  
**آخرین بروز‌رسانی**: 14 نوامبر 2025  
**نسخه**: 1.0
