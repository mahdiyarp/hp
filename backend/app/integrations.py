import requests
import time
import json
from typing import Optional, Dict, Any
from . import db, models
from .crud import get_ai_reports
import logging

logger = logging.getLogger(__name__)


def _get_config_by_provider(db_session, provider: str):
    return db_session.query(models.IntegrationConfig).filter(models.IntegrationConfig.provider == provider).first()


def fetch_fx_coinmarketcap(db_session, api_key: Optional[str] = None) -> Dict[str, Any]:
    # Fetch latest quotes from CoinMarketCap using the provided API key
    if not api_key:
        cfg = _get_config_by_provider(db_session, 'coinmarketcap')
        if cfg and cfg.api_key:
            api_key = cfg.api_key
    if not api_key:
        raise RuntimeError('CoinMarketCap API key not configured')
    url = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest'
    headers = {'X-CMC_PRO_API_KEY': api_key}
    params = {'start': 1, 'limit': 10, 'convert': 'USD'}
    r = requests.get(url, headers=headers, params=params, timeout=5)
    r.raise_for_status()
    return r.json()


def fetch_fx_navasan(db_session, api_key: Optional[str] = None) -> Dict[str, Any]:
    # Navasan (example) public API for fx; many Iranian services require API keys
    cfg = _get_config_by_provider(db_session, 'navasan')
    if cfg and cfg.api_key:
        api_key = api_key or cfg.api_key
    # Example endpoint (may vary) — fallback to exchangerate.host if missing
    try:
        if api_key:
            url = f'https://api.navasan.com/v1/latest?api_key={api_key}'
            r = requests.get(url, timeout=5)
            r.raise_for_status()
            return r.json()
    except Exception:
        logger.debug('navasan fetch failed, falling back to exchangerate.host')
    # fallback
    r = requests.get('https://api.exchangerate.host/latest?base=USD', timeout=5)
    r.raise_for_status()
    return r.json()


def fetch_integration_status(db_session, integration: models.IntegrationConfig) -> Dict[str, Any]:
    res = {'name': integration.name, 'provider': integration.provider, 'enabled': integration.enabled, 'last_updated': integration.last_updated.isoformat() if integration.last_updated else None}
    try:
        if not integration.enabled:
            res['status'] = 'disabled'
            return res
        if integration.provider == 'coinmarketcap':
            data = fetch_fx_coinmarketcap(db_session, api_key=integration.api_key)
            res['status'] = 'ok'
            res['sample'] = data.get('data', [])[:3]
        elif integration.provider == 'navasan':
            data = fetch_fx_navasan(db_session, api_key=integration.api_key)
            res['status'] = 'ok'
            res['sample'] = data
        else:
            # other providers (marketplaces) don't need API key—use health check via GET
            url = integration.config and json.loads(integration.config).get('health_url')
            if url:
                r = requests.get(url, timeout=5)
                res['status'] = 'ok' if r.status_code == 200 else f'error:{r.status_code}'
            else:
                res['status'] = 'unknown-provider'
    except Exception as e:
        res['status'] = f'error:{str(e)}'
    return res


def refresh_integration(db_session, integration_id: int):
    integration = db_session.query(models.IntegrationConfig).filter(models.IntegrationConfig.id == integration_id).first()
    if not integration:
        return None
    stat = fetch_integration_status(db_session, integration)
    # update last_updated
    from datetime import datetime
    integration.last_updated = datetime.utcnow()
    db_session.add(integration)
    db_session.commit()
    db_session.refresh(integration)
    return stat
