import pytest
from pathlib import Path

try:
    from playwright.sync_api import sync_playwright
except ImportError:  # pragma: no cover
    pytest.skip("playwright not installed", allow_module_level=True)


TEMPLATE_PATH = Path(__file__).resolve().parent.parent / "templates" / "invoice.html"


def test_invoice_print_template_renders_branding_text():
    html = TEMPLATE_PATH.read_text(encoding="utf-8")
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_content(html)
        assert page.locator("text=Hesabpak Invoice").first.is_visible()
        assert page.locator("text=Invoice #").count() >= 1
        browser.close()
