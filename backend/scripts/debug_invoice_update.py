import os, sys, pathlib
os.environ.setdefault("DATABASE_URL","sqlite:///:memory:")
repo_root = pathlib.Path(__file__).resolve().parents[2]
backend_app = repo_root / 'backend' / 'app'
sys.path.insert(0, str(backend_app))
sys.path.insert(0, str(repo_root))
from fastapi.testclient import TestClient
import importlib
db = importlib.import_module('db')
models = importlib.import_module('models')
from app.main import app  # reuse existing FastAPI app (shim may fail for db/models but we imported directly)

# Single shared engine
engine = db.create_test_engine()
models.Base.metadata.create_all(bind=engine)
from sqlalchemy.orm import sessionmaker
Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    s = Session()
    try:
        yield s
    finally:
        s.close()

app.dependency_overrides[db.get_db] = override_get_db
client = TestClient(app)

payload = {
    "invoice_type": "sale",
    "mode": "manual",
    "party_name": "API Customer",
    "tax_rate": 9,
    "discount_total": 100,
    "payment_terms_days": 5,
    "client_time": "1403/01/10",
    "client_calendar": "jalali",
    "items": [{"description": "Widget", "quantity": 2, "unit_price": 1000, "discount": 50}],
}
cr = client.post("/api/invoices/manual", json=payload)
print("CREATE STATUS", cr.status_code)
print(cr.text)
inv_id = cr.json()["id"]
upd = dict(payload)
upd["party_name"] = "Updated Customer"
upd["discount_total"] = 0
pr = client.put(f"/api/invoices/{inv_id}", json=upd)
print("PUT STATUS", pr.status_code)
print(pr.text)
