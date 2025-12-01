"""Reports engine: orchestration layer to run queries, materialize datasets and export"""
from typing import Optional, Dict, Any, List
from .. import db, crud
from datetime import datetime

class ReportsEngine:
    def __init__(self, session_factory=None):
        self.session_factory = session_factory or db.SessionLocal

    def run_sales_summary(self, start: Optional[datetime]=None, end: Optional[datetime]=None) -> Dict[str, Any]:
        s = self.session_factory()
        try:
            res = crud.report_pnl(s, start=start, end=end)
            series = crud.dashboard_sales_trends(s)
            return {'summary': res, 'series': series}
        finally:
            s.close()

    def list_stock(self) -> List[Dict[str, Any]]:
        s = self.session_factory()
        try:
            return crud.report_stock_valuation(s)
        finally:
            s.close()

    def cash_balance(self, method: Optional[str]=None) -> Dict[str, Any]:
        s = self.session_factory()
        try:
            return crud.report_cash_balance(s, method=method)
        finally:
            s.close()
