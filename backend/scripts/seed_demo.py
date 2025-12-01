#!/usr/bin/env python3
"""Seed demo data for Hesabpak: 10 products, 10 persons, 10 invoices, a few payments."""
import os
import sys
from datetime import datetime, timezone
import random
from sqlalchemy.exc import IntegrityError

ROOT = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, ROOT)

from app import db, crud, models, schemas
from app.security import get_password_hash


def seed():
    session = db.SessionLocal()
    try:
        print("[SEED] Starting demo data seeding", flush=True)
        
        # Create admin user if doesn't exist
        print("[SEED] Checking for admin user", flush=True)
        admin = session.query(models.User).filter(models.User.username == 'admin').first()
        admin_role = session.query(models.Role).filter(models.Role.name == 'Admin').first()
        admin_role_id = admin_role.id if admin_role else 1
        if not admin:
            print("[SEED] Admin user not found, creating", flush=True)
            admin = models.User(
                username='admin',
                email='admin@example.com',
                full_name='Administrator',
                hashed_password=get_password_hash('admin'),
                role='Admin',
                role_id=admin_role_id,
                is_active=True
            )
            session.add(admin)
            session.commit()
            print("[SEED] Created admin user", flush=True)
        else:
            if not admin.role_id:
                admin.role_id = admin_role_id
                session.add(admin)
                session.commit()
                print("[SEED] Admin role_id set to Admin role", flush=True)
            print("[SEED] Admin user already exists", flush=True)

        # Create developer user if doesn't exist
        print("[SEED] Checking for developer user", flush=True)
        developer = session.query(models.User).filter(models.User.username == 'developer').first()
        if not developer:
            print("[SEED] Developer user not found, creating", flush=True)
            developer = models.User(
                username='developer',
                email='developer@hesabpak.local',
                full_name='Developer User',
                mobile='09123506545',
                hashed_password=get_password_hash('09123506545'),
                role='Admin',
                role_id=admin_role_id,
                is_active=True
            )
            session.add(developer)
            session.commit()
            print("[SEED] Created developer user", flush=True)
        else:
            if not developer.role_id:
                developer.role_id = admin_role_id
                session.add(developer)
                session.commit()
                print("[SEED] Developer role_id set to Admin role", flush=True)
            print("[SEED] Developer user already exists", flush=True)

        # Create 10 products (skip duplicates)
        print("[SEED] Creating products", flush=True)
        products = []
        for i in range(1, 11):
            name = f"Demo Product {i}"
            try:
                p = crud.create_product(session, schemas.ProductCreate(
                    name=name,
                    unit='pcs',
                    group='demo',
                    description=f'Demo item {i}',
                    code=f'DEM-{i:03d}'
                ))
                # give each product base inventory and a price history so stock valuation/reports work
                p.inventory = random.randint(200, 600)
                session.add(p)
                session.flush()
                session.add(models.PriceHistory(
                    product_id=p.id,
                    price=random.randint(80000, 320000),
                    type='buy',
                    effective_at=datetime.now(timezone.utc),
                ))
                products.append(p)
                print(f"[SEED] Created product {i}: {p.id[:8]}...", flush=True)
            except IntegrityError as e:
                print(f"[SEED] Product {i} already exists (skipped)", flush=True)
                session.rollback()
                p = session.query(models.Product).filter(models.Product.name == name).first()
                if p:
                    if p.inventory is None or p.inventory <= 0:
                        p.inventory = random.randint(200, 600)
                        session.add(p)
                    # ensure at least one price history entry exists
                    has_price = session.query(models.PriceHistory).filter(models.PriceHistory.product_id == p.id).first()
                    if not has_price:
                        session.add(models.PriceHistory(
                            product_id=p.id,
                            price=random.randint(80000, 320000),
                            type='buy',
                            effective_at=datetime.now(timezone.utc),
                        ))
                    products.append(p)
        # Ensure all products have usable inventory before invoices
        for p in session.query(models.Product).all():
            if p.inventory is None or p.inventory < 150:
                p.inventory = max(250, p.inventory or 0)
                session.add(p)
            has_price = session.query(models.PriceHistory).filter(models.PriceHistory.product_id == p.id).first()
            if not has_price:
                session.add(models.PriceHistory(
                    product_id=p.id,
                    price=random.randint(80000, 320000),
                    type='buy',
                    effective_at=datetime.now(timezone.utc),
                ))
        session.commit()
        
        print(f"[SEED] Total products: {len(products)}", flush=True)

        # Create 10 persons (skip duplicates)
        print("[SEED] Creating persons", flush=True)
        persons = []
        for i in range(1, 17):
            name = f"Demo Customer {i}"
            try:
                per = crud.create_person(session, schemas.PersonCreate(
                    name=name,
                    kind='customer',
                    mobile=f'0912{i:07d}',
                    description='Demo customer',
                    code=f'CUS-{i:03d}'
                ))
                persons.append(per)
                print(f"[SEED] Created person {i}: {per.id[:8]}...", flush=True)
            except IntegrityError as e:
                print(f"[SEED] Person {i} already exists (skipped)", flush=True)
                session.rollback()
                per = session.query(models.Person).filter(models.Person.name == name).first()
                if per:
                    persons.append(per)
        
        print(f"[SEED] Total persons: {len(persons)}", flush=True)

        # Create 10 invoices
        print("[SEED] Creating invoices", flush=True)
        if products and persons:
            invoice_count = min(16, len(persons))
            # finalize purchase invoices first to top up inventory, then sales
            for i in range(1, invoice_count + 1):
                inv_items = []
                cnt = random.randint(2, 5)
                for j in range(cnt):
                    if products:
                        prod = random.choice(products)
                        qty = random.randint(2, 12)
                        price = random.randint(120000, 650000)
                        inv_items.append({
                            'description': prod.name,
                            'quantity': qty,
                            'unit': prod.unit or 'pcs',
                            'unit_price': price,
                            'product_id': prod.id
                        })

                invoice_type = 'sale' if i % 2 == 0 else 'purchase'
                # ensure client_time is a string to match InvoiceCreate schema
                payload = schemas.InvoiceCreate(
                    invoice_type=invoice_type,
                    mode='manual',
                    party_name=persons[i-1].name,
                    party_id=persons[i-1].id,
                    client_time=datetime.now(timezone.utc).isoformat(),
                    items=[schemas.InvoiceItemCreate(**it) for it in inv_items],
                    note='Demo invoice'
                )
                inv = crud.create_invoice_manual(session, payload)
                print(f"[SEED] Created invoice {i}: {inv.id}", flush=True)
                try:
                    # finalize everything; purchases first naturally add inventory for later sales
                    crud.finalize_invoice(session, inv.id)
                    print(f"[SEED] Finalized invoice {i} ({invoice_type})", flush=True)
                except ValueError as exc:
                    # If inventory shortage happens, top up all products and retry once
                    print(f"[SEED] Invoice finalize warning, topping up inventory: {exc}", flush=True)
                    for p in session.query(models.Product).all():
                        p.inventory = max(120, p.inventory or 0)
                        session.add(p)
                    session.commit()
                    crud.finalize_invoice(session, inv.id)
                    print(f"[SEED] Finalized invoice {i} after restock ({invoice_type})", flush=True)
        else:
            print(f"[SEED] Cannot create invoices: products={len(products)}, persons={len(persons)}", flush=True)

        # Create some payments
        print("[SEED] Creating payments", flush=True)
        payments_count = min(8, len(persons))
        for i in range(1, payments_count + 1):
            pay_payload = schemas.PaymentCreate(
                direction='in',
                mode='manual',
                party_id=persons[i-1].id,
                party_name=persons[i-1].name,
                method='cash',
                amount=random.randint(250000, 1200000),
                reference=None,
                client_time=datetime.now(timezone.utc).isoformat(),
                note='Demo payment'
            )
            p = crud.create_payment_manual(session, pay_payload)
            print(f"[SEED] Created payment {i}: {p.id}", flush=True)
            crud.finalize_payment(session, p.id)
            print(f"[SEED] Finalized payment {i}", flush=True)

        print('[SEED] Seeding completed successfully', flush=True)
    except Exception as e:
        print(f'[SEED] ERROR: {e}', flush=True)
        import traceback
        traceback.print_exc()
        session.rollback()
    finally:
        session.close()


if __name__ == '__main__':
    seed()
