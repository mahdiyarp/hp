# Hesabpak — Architecture & Module Overview

This document captures the current project layout and the agreed roadmap modules. It should be kept up to date as new components land.

## Repository Layout

```
hp/
├── backend/               # FastAPI service
│   ├── app/               # Application package
│   │   ├── activity_logger.py
│   │   ├── ai_*.py
│   │   ├── financial_automation.py
│   │   ├── models.py / schemas.py / crud.py
│   │   ├── security.py / db.py / main.py
│   │   └── ...
│   ├── alembic/           # Database migrations
│   ├── requirements.txt   # Python dependencies
│   ├── Dockerfile
│   └── .env.example
├── frontend/              # React + Vite client
│   ├── src/
│   │   ├── components/    # UI modules (Dashboard, SmartDatePicker, etc.)
│   │   ├── context/
│   │   ├── services/
│   │   └── utils/
│   ├── public/
│   ├── vite.config.ts
│   ├── package.json
│   └── Dockerfile
├── docs/                  # Architectural notes, specs, ADRs
├── infra/                 # Deployment notes and IaC stubs
├── tests/                 # Backend pytest suite
├── docker-compose.yml
└── README.md / README.fa.md
```

## Planned Modules (High Level)

| Category             | Scope |
|----------------------|-------|
| **Auth & RBAC**      | JWT/refresh tokens, role-based permissions, audit logs, 2FA option. |
| **Master Data**      | Products, persons, cash/bank accounts, POS devices, import/export helpers. |
| **Sales & Purchases**| Pre-invoice, invoice, dynamic line items, conversions, ledger integration. |
| **Receipts & Payments** | Cash/bank flows, cheques, settlement against invoices. |
| **Dashboard & Widgets** | Retro themed layout, drag/drop widgets, real-time stats & external feeds. |
| **Reports**          | P&L variations, ledgers, turnover, printable/exportable outputs. |
| **Search**           | Global search bar backed by Meilisearch, per-module filters, fuzzy matching. |
| **Blockchain Bridge**| Hash anchoring of critical documents, verification UI, queue-based sync. |
| **Backup & Time Sync** | Automatic client/server backups, world-clock synchronization, recovery flow. |

## Shared Tooling

- **Python**: `pytest`, `black`, `isort`, `mypy` (planned), `pre-commit`.
- **Node/React**: `eslint` + `@typescript-eslint`, `prettier`, `lint-staged`.
- **Git Hooks**: `pre-commit` (Python) and Husky (frontend) to enforce lint/test before commit.
- **CI/CD**: GitHub Actions workflow under `.github/workflows/`.

Keep this file updated when new modules or services are introduced.
