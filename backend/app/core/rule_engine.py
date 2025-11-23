from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class RuleMessage:
    code: str
    message: str
    level: str = "error"  # error or warning


class RuleEngineError(Exception):
    def __init__(self, errors: List[RuleMessage], warnings: Optional[List[RuleMessage]] = None):
        self.errors = errors
        self.warnings = warnings or []
        message = errors[0].message if errors else "Rule engine validation failed"
        super().__init__(message)


class RuleEngine:
    def __init__(self):
        self.errors: List[RuleMessage] = []
        self.warnings: List[RuleMessage] = []

    def error(self, code: str, message: str):
        self.errors.append(RuleMessage(code=code, message=message, level="error"))

    def warn(self, code: str, message: str):
        self.warnings.append(RuleMessage(code=code, message=message, level="warning"))

    def ensure(self, condition: bool, code: str, message: str):
        if not condition:
            self.error(code, message)

    def raise_if_errors(self):
        if self.errors:
            raise RuleEngineError(self.errors, self.warnings)

    def result(self) -> dict:
        return {
            "errors": [msg.__dict__ for msg in self.errors],
            "warnings": [msg.__dict__ for msg in self.warnings],
        }


def check_fiscal_year_open(fy) -> RuleEngine:
    re = RuleEngine()
    if not fy:
        re.error("fiscal_year_missing", "سال مالی فعالی وجود ندارد.")
    elif fy.status != "open":
        re.error("fiscal_year_closed", f"سال مالی {fy.title} فعال نیست.")
    return re


def check_fiscal_year_range(fy, entry_date) -> RuleEngine:
    re = RuleEngine()
    if not fy or not entry_date:
        return re
    try:
        entry_day = entry_date.date() if hasattr(entry_date, "date") else entry_date
    except Exception:
        return re
    if entry_day < fy.start_date or entry_day > fy.end_date:
        re.warn("fiscal_year_range", "تاریخ ثبت سند خارج از محدوده سال مالی است.")
    return re
