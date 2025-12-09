#!/usr/bin/env python3
"""Seed demo data for Hesabpak: 10 products, 10 persons, 10 invoices, a few payments."""
import os
import sys
from datetime import datetime, timezone
import random
from sqlalchemy.exc import IntegrityError, ProgrammingError

ROOT = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, ROOT)

from app import db, crud, models, schemas
from app.security import get_password_hash


def seed():
    # Ensure new tables (like nft_assets) exist only in dev/demo or when explicitly allowed
    try:
        allow_create_all = str(os.getenv('ALLOW_CREATE_ALL_IN_SEED', '')).lower() in ('1', 'true', 'yes', 'dev') or \
                           getattr(db.engine, 'dialect', None) and getattr(db.engine.dialect, 'name', '') == 'sqlite'
        if allow_create_all:
            models.Base.metadata.create_all(bind=db.engine)
    except Exception:
        pass
    session = db.SessionLocal()
    try:
        print("[SEED] Starting demo data seeding", flush=True)
        
        # Create admin user if doesn't exist
        print("[SEED] Checking for admin user", flush=True)
        admin = session.query(models.User).filter(models.User.username == 'admin').first()
        if not admin:
            print("[SEED] Admin user not found, creating", flush=True)
            admin = models.User(
                username='admin',
                email='admin@example.com',
                full_name='Administrator',
                hashed_password=get_password_hash('admin'),
                role='Admin',
                is_active=True
            )
            session.add(admin)
            session.commit()
            print("[SEED] Created admin user", flush=True)
        else:
            print("[SEED] Admin user already exists", flush=True)

        # Create developer user if doesn't exist
        print("[SEED] Checking for developer user", flush=True)
        developer = session.query(models.User).filter(models.User.username == 'developer').first()
        if not developer:
            print("[SEED] Developer user not found, creating", flush=True)
            # Get Admin role (should be ID 1 based on migrations)
            admin_role = session.query(models.Role).filter(models.Role.name == 'Admin').first()
            role_id = admin_role.id if admin_role else 1
            developer = models.User(
                username='developer',
                email='developer@hesabpak.local',
                full_name='Developer User',
                mobile='09123506545',
                hashed_password=get_password_hash('09123506545'),
                role='Admin',
                role_id=role_id,
                is_active=True
            )
            session.add(developer)
            session.commit()
            print("[SEED] Created developer user", flush=True)
        else:
            print("[SEED] Developer user already exists", flush=True)

        # Assign an NFT asset to developer for organization-level access
        try:
            print("[SEED] Ensuring developer NFT asset", flush=True)
            token_id = 'HP-NFT-DEV-0001'
            nft = crud.create_nft_asset(session,
                                        owner_user_id=developer.id if developer else None,
                                        token_id=token_id,
                                        chain='hesabpak',
                                        contract_address='ORG-ROOT',
                                        metadata={
                                            'kind': 'org-access',
                                            'scope': 'all',
                                            'issued_for': 'developer',
                                            'features': ['invoices','payments','products','persons','reports','backup']
                                        })
            print(f"[SEED] Developer NFT ready: {nft.token_id}", flush=True)
        except Exception as e:
            print(f"[SEED] NFT assign failed: {e}", flush=True)
            session.rollback()

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
                products.append(p)
                print(f"[SEED] Created product {i}: {p.id[:8]}...", flush=True)
            except IntegrityError as e:
                print(f"[SEED] Product {i} already exists (skipped)", flush=True)
                session.rollback()
                p = session.query(models.Product).filter(models.Product.name == name).first()
                if p:
                    products.append(p)
        
        print(f"[SEED] Total products: {len(products)}", flush=True)

        # Seed initial inventory so finalize validations pass
        try:
            for p in products:
                p.inventory = random.randint(5, 20)
            session.commit()
            print("[SEED] Seeded initial inventory for products", flush=True)
        except Exception as e:
            print(f"[SEED] Inventory seeding skipped: {e}", flush=True)
            session.rollback()

        # Create 10 persons (skip duplicates)
        print("[SEED] Creating persons", flush=True)
        persons = []
        for i in range(1, 11):
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
            except ProgrammingError as e:
                print(f"[SEED] Persons seeding skipped due to schema mismatch: {e}", flush=True)
                session.rollback()
                # Break out to avoid repeating the same error for remaining persons
                persons = []
                break
        
        print(f"[SEED] Total persons: {len(persons)}", flush=True)

        # Create 10 invoices
        print("[SEED] Creating invoices", flush=True)
        if products and persons:
            for i in range(1, min(11, len(persons) + 1)):
                inv_items = []
                cnt = random.randint(1, 3)
                for j in range(cnt):
                    if products:
                        prod = random.choice(products)
                        qty = random.randint(1, 5)
                        price = random.randint(10000, 50000)
                        inv_items.append({
                            'description': prod.name,
                            'quantity': qty,
                            'unit': prod.unit or 'pcs',
                            'unit_price': price,
                            'product_id': prod.id
                        })

                payload = schemas.InvoiceCreate(
                    invoice_type='sale' if i % 2 == 0 else 'purchase',
                    mode='manual',
                    party_name=persons[i-1].name,
                    party_id=persons[i-1].id,
                    client_time=datetime.now(timezone.utc),
                    items=[schemas.InvoiceItemCreate(**it) for it in inv_items],
                    note='Demo invoice'
                )
                inv = crud.create_invoice_manual(session, payload)
                print(f"[SEED] Created invoice {i}: {inv.id}", flush=True)
                # finalize half of them
                if i % 2 == 0:
                    try:
                        crud.finalize_invoice(session, inv.id)
                        print(f"[SEED] Finalized invoice {i}", flush=True)
                    except Exception as e:
                        print(f"[SEED] Finalize skipped for invoice {i}: {e}", flush=True)
        else:
            print(f"[SEED] Cannot create invoices: products={len(products)}, persons={len(persons)}", flush=True)

        # Create some payments
        print("[SEED] Creating payments", flush=True)
        for i in range(1, min(6, len(persons) + 1)):
            pay_payload = schemas.PaymentCreate(
                direction='in',
                mode='manual',
                party_id=persons[i-1].id,
                party_name=persons[i-1].name,
                method='cash',
                amount=random.randint(20000, 200000),
                reference=None,
                client_time=datetime.now(timezone.utc),
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
