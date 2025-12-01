# n8n agent for Hesabpak

- Workflow file: `docs/n8n/hp-agent.json`
- Import/activate helper: `scripts/n8n-import.ps1`

## Prerequisites
- n8n running at `http://localhost:5678/` (or set `N8N_URL`)
- n8n API token: set `N8N_TOKEN` (defaults to the provided token in the script)
- Environment for backend/LLM when triggering the webhook:
  - `HP_BASE_URL` (default `http://localhost:8000`)
  - `HP_USER` / `HP_PASS`
  - `LLM_BASE_URL` (default `http://localhost:11434/v1` for Ollama)
  - `LLM_MODEL` (default `llama-3-8b-instruct`)
  - `LLM_API_KEY` if your LLM endpoint requires it

## Import / Activate
```powershell
# import (creates or updates)
./scripts/n8n-import.ps1

# import and activate
./scripts/n8n-import.ps1 -Activate
```

## Quick test (webhook)
```bash
curl -X POST "http://localhost:5678/webhook/hesabpak-agent" \
  -H "Content-Type: application/json" \
  -d '{"text":"yek faktur forush be name company X 2 laptop 30000000 t"}'
```
Response will be whatever the backend returns for the routed action.

## Flow (if-chain router)
- LLM (HTTP call to OpenAI-compatible endpoint) returns JSON intent.
- Login to `/api/auth/login` → JWT.
- Merge JWT + intent → IF chain on `action`:
  - `invoice.create` → `/api/invoices/manual`
  - `payment.create` → `/api/payments/manual`
  - `report.pnl` → `/api/reports/pnl`
  - `search.product` → `/api/search` (module=products)
  - default → `/api/assistant/chat`
- Webhook responds with the last node output (JSON). Replies are expected to be in Persian; the system prompt instructs the LLM to answer in fa.

## Notes
- If the LLM cannot classify, the request goes to Assistant fallback.
- To add OCR or other endpoints, add new IF branches and connect to the desired HTTP Request node.
- The workflow is activated by default when using `-Activate`; rerun the script after any edits.***
