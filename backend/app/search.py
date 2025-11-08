import os
import logging
from typing import Any, Dict, List, Optional

from .normalizer import normalize_for_search

try:
    from meilisearch import Client
except Exception:
    Client = None

LOGGER = logging.getLogger(__name__)

MEILI_URL = os.getenv('MEILI_URL', 'http://127.0.0.1:7700')
MEILI_KEY = os.getenv('MEILI_KEY', None)

client = None
if Client is not None:
    try:
        client = Client(MEILI_URL, MEILI_KEY)
    except Exception as e:
        LOGGER.warning('Could not initialize Meilisearch client: %s', e)
        client = None


def _get_index(name: str):
    if client is None:
        return None
    try:
        return client.index(name)
    except Exception:
        try:
            return client.create_index(uid=name)
        except Exception as e:
            LOGGER.warning('Failed to create/get index %s: %s', name, e)
            return None


def ensure_indexes():
    # Create indexes with sensible searchable/filterable attributes
    if client is None:
        return
    try:
        # products
        idx = _get_index('products')
        if idx:
            try:
                idx.update_settings({
                    'searchableAttributes': ['name', 'description', 'name_norm'],
                    'filterableAttributes': ['group', 'unit'],
                })
            except Exception:
                pass
        # persons
        idx = _get_index('persons')
        if idx:
            try:
                idx.update_settings({
                    'searchableAttributes': ['name', 'name_norm', 'mobile'],
                    'filterableAttributes': [],
                })
            except Exception:
                pass
        # invoices
        idx = _get_index('invoices')
        if idx:
            try:
                idx.update_settings({
                    'searchableAttributes': ['invoice_number', 'party_name'],
                    'filterableAttributes': ['invoice_type', 'status'],
                })
            except Exception:
                pass
        # payments
        idx = _get_index('payments')
        if idx:
            try:
                idx.update_settings({
                    'searchableAttributes': ['payment_number', 'party_name', 'reference'],
                    'filterableAttributes': ['direction', 'status', 'method'],
                })
            except Exception:
                pass
    except Exception as e:
        LOGGER.warning('ensure_indexes failed: %s', e)


# basic index functions: try/except to avoid hard-failing when Meilisearch unavailable

def index_product(product: Dict[str, Any]):
    """Accepts a dict with at least id,name,description,unit,group,inventory."""
    try:
        idx = _get_index('products')
        if not idx:
            return
        doc = dict(product)
        doc['name_norm'] = normalize_for_search(doc.get('name') or '')
        # Meilisearch expects an 'id' field
        if 'id' not in doc:
            doc['id'] = doc.get('id') or doc.get('product_id')
        idx.add_documents([doc], primary_key='id')
    except Exception as e:
        LOGGER.warning('index_product error: %s', e)


def index_person(person: Dict[str, Any]):
    try:
        idx = _get_index('persons')
        if not idx:
            return
        doc = dict(person)
        doc['name_norm'] = normalize_for_search(doc.get('name') or '')
        if 'id' not in doc:
            doc['id'] = doc.get('id') or doc.get('person_id')
        idx.add_documents([doc], primary_key='id')
    except Exception as e:
        LOGGER.warning('index_person error: %s', e)


def index_invoice(invoice: Dict[str, Any]):
    try:
        idx = _get_index('invoices')
        if not idx:
            return
        doc = dict(invoice)
        if 'id' not in doc:
            doc['id'] = doc.get('id') or doc.get('invoice_id')
        idx.add_documents([doc], primary_key='id')
    except Exception as e:
        LOGGER.warning('index_invoice error: %s', e)


def index_payment(payment: Dict[str, Any]):
    try:
        idx = _get_index('payments')
        if not idx:
            return
        doc = dict(payment)
        if 'id' not in doc:
            doc['id'] = doc.get('id') or doc.get('payment_id')
        idx.add_documents([doc], primary_key='id')
    except Exception as e:
        LOGGER.warning('index_payment error: %s', e)


def delete_doc(index_name: str, doc_id: Any):
    try:
        idx = _get_index(index_name)
        if not idx:
            return
        idx.delete_document(doc_id)
    except Exception as e:
        LOGGER.warning('delete_doc %s %s error: %s', index_name, doc_id, e)


def search_multi(query: str, indexes: Optional[List[str]] = None, filters: Optional[str] = None, limit: int = 10):
    """Search across one or more indexes. Returns dict index->hits."""
    out = {}
    qn = normalize_for_search(query or '')
    idxs = indexes or ['products', 'persons', 'invoices', 'payments']
    for name in idxs:
        try:
            idx = _get_index(name)
            if not idx:
                out[name] = {'hits': []}
                continue
            # try searching both normalized and original fields by sending raw query (Meili will match)
            params = {'limit': limit}
            if filters:
                params['filter'] = filters
            res = idx.search(query, params)
            out[name] = res
        except Exception as e:
            LOGGER.warning('search_multi %s error: %s', name, e)
            out[name] = {'hits': []}
    return out


def suggest_live(query: str, index: str = 'products', limit: int = 7):
    try:
        idx = _get_index(index)
        if not idx:
            return []
        res = idx.search(query, {'limit': limit})
        return res.get('hits', [])
    except Exception as e:
        LOGGER.warning('suggest_live error: %s', e)
        return []


# Ensure indexes exist at import time (best-effort)
ensure_indexes()
