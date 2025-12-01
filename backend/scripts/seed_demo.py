#!/usr/bin/env python3
"""Seed demo data for Hesabpak: 10 products, 10 persons, 10 invoices, a few payments."""
import os
import sys
from datetime import datetime, timezone, timedelta
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
        
        # Ensure roles exist
        print("[SEED] Ensuring default roles", flush=True)
        admin_role = session.query(models.Role).filter(models.Role.name == 'Admin').first()
        if not admin_role:
            admin_role = models.Role(name='Admin', description='System administrator')
            session.add(admin_role)
            session.commit()
            session.refresh(admin_role)
        viewer_role = session.query(models.Role).filter(models.Role.name == 'Viewer').first()
        if not viewer_role:
            viewer_role = models.Role(name='Viewer', description='Read-only user')
            session.add(viewer_role)
            session.commit()
            session.refresh(viewer_role)

        # Create admin user if doesn't exist
        print("[SEED] Checking for admin user", flush=True)
        admin = session.query(models.User).filter(models.User.username == 'admin').first()
        if not admin:
            print("[SEED] Admin user not found, creating", flush=True)
            admin = models.User(
                username='admin',
                email='admin@example.com',
                full_name='Administrator',
                hashed_password=get_password_hash('admin123'),
                role='Admin',
                role_id=admin_role.id,
                is_active=True
            )
            session.add(admin)
            session.commit()
            print("[SEED] Created admin user", flush=True)
        else:
            print("[SEED] Admin user already exists", flush=True)

        # Create viewer/demo user
        print("[SEED] Checking for viewer user", flush=True)
        viewer = session.query(models.User).filter(models.User.username == 'viewer').first()
        if not viewer:
            viewer = models.User(
                username='viewer',
                email='viewer@hesabpak.local',
                full_name='Viewer Demo',
                hashed_password=get_password_hash('viewer123'),
                role='Viewer',
                role_id=viewer_role.id,
                is_active=True
            )
            session.add(viewer)
            session.commit()
            print("[SEED] Created viewer user", flush=True)
        else:
            print("[SEED] Viewer user already exists", flush=True)

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
                role_id=admin_role.id,
                is_active=True
            )
            session.add(developer)
            session.commit()
            print("[SEED] Created developer user", flush=True)
        else:
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
                products.append(p)
                print(f"[SEED] Created product {i}: {p.id[:8]}...", flush=True)
            except IntegrityError as e:
                print(f"[SEED] Product {i} already exists (skipped)", flush=True)
                session.rollback()
                p = session.query(models.Product).filter(models.Product.name == name).first()
                if p:
                    products.append(p)
        
        print(f"[SEED] Total products: {len(products)}", flush=True)

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
        
        print(f"[SEED] Total persons: {len(persons)}", flush=True)

        # Ensure contacts exist for each person
        print("[SEED] Linking contacts", flush=True)
        for per in persons:
            contact = session.query(models.Contact).filter(models.Contact.person_id == per.id).first()
            if not contact:
                contact = models.Contact(
                    person_id=per.id,
                    email=f"{per.name.replace(' ', '').lower()}@demo.local",
                    phone=per.mobile,
                    status='active',
                    tags='demo,seed'
                )
                session.add(contact)
        session.commit()

        # Seed a simple CRM activity for the first contact
        first_contact = session.query(models.Contact).first()
        if first_contact:
            activity_exists = session.query(models.CRMActivity).filter(models.CRMActivity.contact_id == first_contact.id).first()
            if not activity_exists:
                session.add(models.CRMActivity(
                    contact_id=first_contact.id,
                    title='تماس اولیه',
                    kind='call',
                    content='معرفی سیستم حساب‌پاک و هماهنگی دمو.',
                    status='open',
                    due_date=datetime.now(timezone.utc) + timedelta(days=2)
                ))
                session.commit()

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
                    crud.finalize_invoice(session, inv.id)
                    print(f"[SEED] Finalized invoice {i}", flush=True)
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

        # Create cheque-based outgoing payments
        print("[SEED] Creating cheque payments", flush=True)
        for i in range(1, 4):
            if not persons:
                break
            pay_payload = schemas.PaymentCreate(
                direction='out',
                mode='manual',
                party_id=persons[0].id,
                party_name=persons[0].name,
                method='cheque',
                amount=random.randint(50000, 150000),
                note='Demo cheque payment',
                due_date=datetime.now(timezone.utc) + timedelta(days=15 + i)
            )
            cheque_payment = crud.create_payment_manual(session, pay_payload)
            crud.finalize_payment(session, cheque_payment.id)
            session.add(models.Cheque(
                payment_id=cheque_payment.id,
                cheque_number=f'CHK-{i:03d}',
                bank_name='Tejarat',
                branch_name='Vanak',
                status='pending',
                issue_date=datetime.now(timezone.utc),
                due_date=datetime.now(timezone.utc) + timedelta(days=15 + i)
            ))
            session.commit()
            print(f"[SEED] Created cheque payment {cheque_payment.id}", flush=True)

        # Seed product stock and prices
        print("[SEED] Creating stock items & prices", flush=True)
        for prod in products:
            stock = session.query(models.StockItem).filter(
                models.StockItem.product_id == prod.id,
                models.StockItem.location == 'main'
            ).first()
            if not stock:
                session.add(models.StockItem(
                    product_id=prod.id,
                    location='main',
                    quantity=random.randint(5, 30),
                    reserved_quantity=0,
                    threshold=5
                ))
            price = session.query(models.ProductPrice).filter(
                models.ProductPrice.product_id == prod.id,
                models.ProductPrice.price_type == 'sale'
            ).first()
            if not price:
                session.add(models.ProductPrice(
                    product_id=prod.id,
                    price_type='sale',
                    currency='IRR',
                    amount=random.randint(20000, 80000)
                ))
        session.commit()

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
