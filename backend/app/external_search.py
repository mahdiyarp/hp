import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Optional
import re
import logging

logger = logging.getLogger(__name__)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
}


def _fetch(url: str, timeout: int = 6) -> Optional[str]:
    try:
        r = requests.get(url, headers=HEADERS, timeout=timeout)
        if r.status_code == 200:
            return r.text
    except Exception as e:
        logger.debug(f"fetch error {url}: {e}")
    return None


def _extract_og(soup: BeautifulSoup) -> Dict:
    data = {}
    og_title = soup.find('meta', property='og:title')
    if og_title and og_title.get('content'):
        data['title'] = og_title.get('content')
    og_img = soup.find('meta', property='og:image')
    if og_img and og_img.get('content'):
        data['image'] = og_img.get('content')
    og_desc = soup.find('meta', property='og:description')
    if og_desc and og_desc.get('content'):
        data['description'] = og_desc.get('content')
    return data


def _find_price_from_text(text: str) -> Optional[int]:
    if not text:
        return None
    # find numbers like 1,234,567 or ۱۲۳۴۵۶۷ and Persian digits
    # normalize Persian digits
    trans = str.maketrans('۰۱۲۳۴۵۶۷۸۹٫،', '0123456789.,')
    t = text.translate(trans)
    m = re.search(r"(\d[\d,\.\s]{0,20}\d)", t)
    if m:
        num = m.group(1)
        num = re.sub(r"[^0-9]", "", num)
        try:
            return int(num)
        except Exception:
            return None
    return None


def _parse_product_page(url: str) -> Dict:
    html = _fetch(url)
    out = {'source_url': url}
    if not html:
        return out
    soup = BeautifulSoup(html, 'lxml')
    og = _extract_og(soup)
    out.update(og)
    # attempt to find price by common selectors
    selectors = [
        '[itemprop=price]',
        '.c-price',
        '.price',
        '.js-price',
        '.pd-price',
        '.dk-product-price',
    ]
    text = None
    for sel in selectors:
        el = soup.select_one(sel)
        if el:
            text = (el.get('content') or el.get_text() or '').strip()
            if text:
                break
    if not text:
        # fallback: search for text nodes with تومان or ریال
        txt = soup.get_text(separator=' ', strip=True)
        # limit length
        text = txt[:2000]
    price = _find_price_from_text(text)
    if price:
        out['price'] = price
    # find first large image if no og:image
    if 'image' not in out or not out.get('image'):
        img = soup.find('img')
        if img and img.get('src'):
            out['image'] = img.get('src')
    return out


def _search_generic_site(search_url: str, query: str, link_host_substrs: List[str], limit: int = 6) -> List[Dict]:
    qurl = search_url.format(q=requests.utils.requote_uri(query))
    html = _fetch(qurl)
    if not html:
        return []
    soup = BeautifulSoup(html, 'lxml')
    results = []
    anchors = soup.find_all('a', href=True)
    seen = set()
    for a in anchors:
        href = a['href']
        # normalize relative links
        if href.startswith('/'):
            # try to build absolute
            from urllib.parse import urljoin
            href = urljoin(qurl, href)
        for token in link_host_substrs:
            if token in href and href not in seen:
                seen.add(href)
                # attempt to extract short title and image
                title = a.get('title') or a.get_text() or None
                img = None
                img_tag = a.find('img')
                if img_tag and img_tag.get('src'):
                    img = img_tag.get('src')
                results.append({'link': href, 'title': title, 'image': img})
                break
        if len(results) >= limit:
            break
    # for each result, try to fetch product page for OG and price
    enriched = []
    for r in results:
        try:
            detail = _parse_product_page(r['link'])
            if not detail.get('title') and r.get('title'):
                detail['title'] = r.get('title')
            if not detail.get('image') and r.get('image'):
                detail['image'] = r.get('image')
            detail['link'] = r['link']
            enriched.append(detail)
        except Exception as e:
            logger.debug(f"error parsing detail {r.get('link')}: {e}")
    return enriched


def search_digikala(query: str, limit: int = 6) -> List[Dict]:
    # Digikala search page
    url = 'https://www.digikala.com/search/?q={q}'
    return _search_generic_site(url, query, ['digikala.com'], limit=limit)


def search_torob(query: str, limit: int = 6) -> List[Dict]:
    url = 'https://torob.com/search?q={q}'
    return _search_generic_site(url, query, ['torob.com'], limit=limit)


def search_emalls(query: str, limit: int = 6) -> List[Dict]:
    # try emalls.ir and similar marketplaces
    url = 'https://www.emalls.ir/search?q={q}'
    return _search_generic_site(url, query, ['emalls.ir', 'emalls.com'], limit=limit)


def aggregate_search(query: str, sources: Optional[List[str]] = None, limit: int = 6) -> Dict:
    if not sources:
        sources = ['digikala', 'torob', 'emalls']
    out = {}
    for s in sources:
        try:
            if s == 'digikala':
                out['digikala'] = search_digikala(query, limit=limit)
            elif s == 'torob':
                out['torob'] = search_torob(query, limit=limit)
            elif s == 'emalls' or s == 'emall' or s == 'emallz':
                out['emalls'] = search_emalls(query, limit=limit)
            else:
                out[s] = []
        except Exception as e:
            logger.debug(f"error searching {s}: {e}")
            out[s] = []
    return {'query': query, 'results': out}
