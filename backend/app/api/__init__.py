from fastapi import APIRouter

from .routes import auth, crm, finance_invoices, finance_payments, finance_cheques

# Central router that aggregates all sub-routers with the /api prefix.
api_router = APIRouter(prefix="/api")

api_router.include_router(auth.router)
api_router.include_router(crm.router)
api_router.include_router(finance_invoices.router)
api_router.include_router(finance_payments.router)
api_router.include_router(finance_cheques.router)
