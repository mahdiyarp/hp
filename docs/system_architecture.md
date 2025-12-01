# System Architecture (Hesabpak)

This document summarizes the current production-oriented architecture.

## Overview

- Backend: FastAPI (Python 3.11), SQLAlchemy 2.x, Alembic migrations, JWT auth
- Frontend: React + Vite (TypeScript), Tailwind, RTL-focused UI
- Database: PostgreSQL (primary); SQLite used for tests
- Search: Best-effort fallback DB search; optional Meilisearch integrations
- Automation: Background scheduler (env-gated) + webhook dispatch + SMS notifications
- Ledger/Blockchain: Double-entry ledger entries with blockchain-style chaining and Merkle proofs

## Services

- Finance:
  - Invoices (sale/purchase): lifecycle with inventory updates and ledger entries
  - Payments (in/out): ledger posting; method-account mapping
  - Cheques: linked to payments; near-due/overdue detection; reminders
  - Pricing: time-effective `ProductPrice` with CRUD and effective lookup endpoint
- CRM:
  - Persons, contacts, activities (notes/calls/tasks)
- Integrations:
  - `/api/integrations` Admin CRUD + `test/sms` and `test/webhook`
  - Providers: coinmarketcap, navasan, webhook (HMAC-SHA256)
- Reports:
  - P&L, cash balance, person turnover (UI-aligned schema), stock valuation; natural query endpoint
- Exports & Sharing:
  - Invoice PDF/CSV/XLSX; time-limited public share links
- Settings & Security:
  - Roles & permissions, user preferences, OTP, device login tracking, system settings

## Automation Flow

- Events emitted for `invoice.finalized`, `payment.posted`, `cheque.overdue`
- Scheduler (thread) periodically checks for overdue cheques (configurable interval)
- Dispatchers:
  - SMS via system settings (e.g., IPPanel), best-effort
  - Webhooks: JSON body with optional HMAC signature header `X-HP-Signature`

## Deployment

- Dockerfiles under `backend/` and `frontend/`
- Compose files:
  - `docker-compose.yml` (dev/demo), `docker-compose.demo.yml`, `docker-compose.prod.yml` (production)
- Backend entrypoint runs ordered Alembic upgrades and optional demo seed

## CI

- GitHub Actions workflow (`.github/workflows/ci.yml`):
  - Backend unit/API tests (SQLite)
  - Frontend build (Vite)

## Error Handling & Audit

- HTTP exceptions use FastAPI defaults; audit middleware records requests
- Activity logger records security-sensitive operations

## Security Notes

- JWT access/refresh with rotation
- Role and permission guards enforced on critical endpoints
- Public file sharing is time-bound; webhook requests are signed when secret provided

## Roadmap (Release-ready)

- Increase test coverage for automation/webhook paths
- Add rate limiting to public endpoints (optional)
- Harden CORS settings for production environment
