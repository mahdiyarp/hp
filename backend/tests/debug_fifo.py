import os, sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ.setdefault('DATABASE_URL', 'sqlite:///:memory:')

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app import models
from app import db as DB
from app import crud

_engine = create_engine('sqlite:///:memory:', connect_args={'check_same_thread': False}, poolclass=StaticPool)
Session = sessionmaker(autocommit=False, autoflush=False, bind=_engine)
DB.Base.metadata.create_all(bind=_engine)

s = Session()
try:
    # Seed as in tests
    s.query(models.InvoiceItem).delete(); s.query(models.Invoice).delete(); s.query(models.Product).delete(); s.commit()
    prod = models.Product(id='TESTPROD1', name='کالای تستی', name_norm='kalaye testi', code='P-TEST-001', unit='عدد', group='آزمایشی', description=None, inventory=0)
    s.add(prod); s.commit()
    now = datetime.utcnow().replace(tzinfo=timezone.utc)
    t1 = now - timedelta(days=10); t2 = now - timedelta(days=5); t3 = now - timedelta(days=2)
    inv_p1 = models.Invoice(invoice_type='purchase', mode='manual', party_name='تأمین‌کننده', server_time=t1, status='final', subtotal=1000, total=1000)
    s.add(inv_p1); s.flush(); s.add(models.InvoiceItem(invoice_id=inv_p1.id, product_id=prod.id, description='خرید ۱', quantity=10, unit='عدد', unit_price=100, total=1000))
    inv_p2 = models.Invoice(invoice_type='purchase', mode='manual', party_name='تأمین‌کننده', server_time=t2, status='final', subtotal=2000, total=2000)
    s.add(inv_p2); s.flush(); s.add(models.InvoiceItem(invoice_id=inv_p2.id, product_id=prod.id, description='خرید ۲', quantity=10, unit='عدد', unit_price=200, total=2000))
    inv_s = models.Invoice(invoice_type='sale', mode='manual', party_name='مشتری', server_time=t3, status='final', subtotal=3000, total=3000)
    s.add(inv_s); s.flush(); s.add(models.InvoiceItem(invoice_id=inv_s.id, product_id=prod.id, description='فروش', quantity=10, unit='عدد', unit_price=300, total=3000))
    s.commit()
    start = (now - timedelta(days=15)).replace(hour=0, minute=0, second=0, microsecond=0)
    end = (now - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    out_fifo = crud.report_pnl_with_cost(s, start=start, end=end, method='FIFO')
    out_lifo = crud.report_pnl_with_cost(s, start=start, end=end, method='LIFO')
    print('FIFO', out_fifo)
    print('LIFO', out_lifo)
finally:
    s.close()
