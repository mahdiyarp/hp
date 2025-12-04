from fastapi import APIRouter

from .routes import auth, crm, finance_invoices, finance_payments, finance_cheques, finance_pricing, system_backup, integrations, sales, reports, users, roles, permissions, products, sms, exports, prints, financial, developer, blockchain, customer_groups, icc, admin, dashboard, search, test, identity, external_ai
from .routers import assistant as assistant_router
from .routers import fiscal_years as fiscal_years_router
from app.sms_router import router as sms_settings_router

# Central router that aggregates all sub-routers with the /api prefix.
api_router = APIRouter(prefix="/api")

api_router.include_router(auth.router)
api_router.include_router(crm.router)
api_router.include_router(finance_invoices.router)
api_router.include_router(finance_payments.router)
api_router.include_router(finance_cheques.router)
api_router.include_router(finance_pricing.router)
api_router.include_router(system_backup.router)
api_router.include_router(integrations.router)
api_router.include_router(sales.router)
api_router.include_router(reports.router)
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(roles.router, prefix="/roles", tags=["roles"])
api_router.include_router(permissions.router, prefix="/permissions", tags=["permissions"])
api_router.include_router(products.router, prefix="/products", tags=["products"])
api_router.include_router(sms.router, prefix="/sms", tags=["sms"])
api_router.include_router(assistant_router.router)
api_router.include_router(external_ai.router)
api_router.include_router(sms_settings_router)
api_router.include_router(exports.router, prefix="/exports", tags=["exports"])
api_router.include_router(prints.router, prefix="/prints", tags=["prints"])
api_router.include_router(financial.router, prefix="/financial", tags=["financial"])
api_router.include_router(developer.router, prefix="/developer", tags=["developer"])
api_router.include_router(blockchain.router, prefix="/blockchain", tags=["blockchain"])
api_router.include_router(customer_groups.router, prefix="/customer-groups", tags=["customer-groups"])
api_router.include_router(icc.router, prefix="/icc", tags=["icc"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(search.router, prefix="/search", tags=["search"])
api_router.include_router(test.router, prefix="/test", tags=["test"])
api_router.include_router(identity.router, prefix="/identity", tags=["identity"])
api_router.include_router(fiscal_years_router.router, prefix="/fiscal-years", tags=["fiscal-years"])
