#!/usr/bin/env python3
"""Seed demo data for Hesabpak: 10 products, 10 persons, 10 invoices, a few payments and ledger entries."""
import os
from datetime import datetime, timezone
import random

ROOT = os.path.dirname(os.path.dirname(__file__))
import sys
sys.path.insert(0, ROOT)

from app import db
from app import crud
from app import models


def seed():
    session = db.SessionLocal()
    #!/usr/bin/env python3
    """Seed demo data for Hesabpak: 10 products, 10 persons, 10 invoices, a few payments and ledger entries."""
    import os
    from datetime import datetime, timezone
    import random
    from sqlalchemy.exc import IntegrityError

    ROOT = os.path.dirname(os.path.dirname(__file__))
    import sys
    sys.path.insert(0, ROOT)

    from app import db
    from app import crud
    from app import models


    def seed():
        session = db.SessionLocal()
        try:
            # create 10 products (skip duplicates)
            products = []
            for i in range(1, 11):
                name = f"Demo Product {i}"
                try:
                    p = crud.create_product(session, type('P', (), {'name': name, 'unit': 'pcs', 'group': 'demo', 'description': f'Demo item {i}'}))
                except IntegrityError:
                    # product already exists, fetch by name
                    session.rollback()
                    p = session.query(models.Product).filter(models.Product.name == name).first()
                    if not p:
                        continue
                products.append(p)

            # create 10 persons (skip duplicates)
            persons = []
            for i in range(1, 11):
                name = f"Demo Customer {i}"
                try:
                    per = crud.create_person(session, type('C', (), {'name': name, 'kind': 'customer', 'mobile': f'0912{i:07d}', 'description': ''}))
                except IntegrityError:
                    session.rollback()
                    per = session.query(models.Person).filter(models.Person.name == name).first()
                    if not per:
                        continue
                persons.append(per)

            # create 10 invoices
            for i in range(1, 11):
                inv_items = []
                cnt = random.randint(1, 4)
                for j in range(cnt):
                    prod = random.choice(products)
                    qty = random.randint(1, 5)
                    price = random.randint(10000, 50000)
                    inv_items.append({'description': prod.name, 'quantity': qty, 'unit': prod.unit or 'pcs', 'unit_price': price})
                payload = type('Inv', (), {
                    'invoice_type': 'sale',
                    'mode': 'manual',
                    'party_id': persons[i-1].id,
                    'party_name': persons[i-1].name,
                    'client_time': datetime.now(timezone.utc),
                    'items': [ type('It', (), it) for it in inv_items ],
                    'note': 'Demo invoice'
                })
                inv = crud.create_invoice_manual(session, payload)
                # finalize half of them
                if i % 2 == 0:
                    crud.finalize_invoice(session, inv.id)

            # create some payments
            for i in range(1, 6):
                pay_payload = type('P', (), {
                    'direction': 'in',
                    'mode': 'manual',
                    'party_id': persons[i-1].id,
                    'party_name': persons[i-1].name,
                    'method': 'cash',
                    'amount': random.randint(20000, 200000),
                    'reference': None,
                    'client_time': datetime.now(timezone.utc),
                    'note': 'Demo payment'
                })
                p = crud.create_payment_manual(session, pay_payload)
                crud.finalize_payment(session, p.id)

            print('Seeding completed')
        finally:
            session.close()


    if __name__ == '__main__':
        seed()
