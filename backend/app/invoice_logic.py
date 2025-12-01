from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Iterable, Optional

from app.utils.date import parse_shamsi_date


@dataclass
class LineSpec:
    quantity: float
    unit_price: float
    discount: float = 0


@dataclass
class InvoiceTotals:
    subtotal: int
    line_discount_total: int
    invoice_discount: int
    tax_amount: int
    total: int


def coerce_datetime(value: Optional[object], calendar: str = "jalali") -> Optional[datetime]:
    """Normalize user supplied date/datetime values to an aware UTC datetime."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        # Try ISO first
        try:
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except Exception:
            pass
        if calendar == "jalali":
            try:
                dt = parse_shamsi_date(value)
                if dt:
                    return dt.replace(tzinfo=timezone.utc)
            except Exception:
                return None
    return None


def compute_totals(
    lines: Iterable[LineSpec],
    invoice_discount: float | int = 0,
    tax_rate: float | int = 0.0,
) -> InvoiceTotals:
    """Calculate invoice totals with per-line discount, invoice-level discount, and tax."""
    subtotal = 0
    line_discount_total = 0
    for line in lines:
        qty = float(line.quantity or 0)
        price = float(line.unit_price or 0)
        raw_total = max(0, qty * price)
        line_discount = max(0, min(float(line.discount or 0), raw_total))
        line_discount_total += int(round(line_discount))
        subtotal += int(round(raw_total - line_discount))

    invoice_discount_value = max(0, int(round(invoice_discount or 0)))
    invoice_discount_value = min(invoice_discount_value, subtotal)
    taxable_base = max(0, subtotal - invoice_discount_value)
    tax_amount = int(round(taxable_base * (float(tax_rate or 0) / 100)))
    total = taxable_base + tax_amount

    return InvoiceTotals(
        subtotal=int(subtotal),
        line_discount_total=int(line_discount_total),
        invoice_discount=int(invoice_discount_value),
        tax_amount=int(tax_amount),
        total=int(total),
    )


def compute_due_date(
    client_time: Optional[datetime],
    payment_terms_days: Optional[int] = None,
    explicit_due: Optional[object] = None,
    calendar: str = "jalali",
) -> Optional[datetime]:
    """Return a due date based on terms or explicit value."""
    if explicit_due is not None:
        parsed = coerce_datetime(explicit_due, calendar=calendar)
        if parsed:
            return parsed
    if client_time and payment_terms_days:
        return client_time + timedelta(days=int(payment_terms_days))
    return None
