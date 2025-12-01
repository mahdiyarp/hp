import os
import sys
from datetime import datetime, timedelta, timezone

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.invoice_logic import LineSpec, compute_totals, coerce_datetime, compute_due_date


def test_compute_totals_with_line_and_invoice_discounts_and_tax():
    lines = [
        LineSpec(quantity=2, unit_price=1000, discount=100),
        LineSpec(quantity=1, unit_price=500, discount=0),
    ]
    totals = compute_totals(lines, invoice_discount=200, tax_rate=9)
    assert totals.subtotal == 2400  # (2*1000-100) + 500
    assert totals.line_discount_total == 100
    assert totals.invoice_discount == 200
    assert totals.tax_amount == round((2400 - 200) * 0.09)
    assert totals.total == totals.subtotal - totals.invoice_discount + totals.tax_amount


def test_coerce_datetime_accepts_jalali_and_iso():
    iso = "2025-03-21T00:00:00+00:00"
    assert coerce_datetime(iso).isoformat().startswith("2025-03-21")

    jalali_date = "1403/01/01"
    coerced = coerce_datetime(jalali_date, calendar="jalali")
    assert coerced is not None
    assert isinstance(coerced, datetime)


def test_compute_due_date_prefers_explicit_and_falls_back_to_terms():
    client_dt = datetime.now(timezone.utc)
    explicit = client_dt + timedelta(days=5)
    assert compute_due_date(client_dt, payment_terms_days=30, explicit_due=explicit) == explicit

    derived = compute_due_date(client_dt, payment_terms_days=10, explicit_due=None)
    assert derived.date() == (client_dt + timedelta(days=10)).date()
