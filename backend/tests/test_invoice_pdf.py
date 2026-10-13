"""Invoice logo regression tests: packaged assets, embedding, and missing files."""
import asyncio
from datetime import datetime
import logging
import os
from pathlib import Path
import shutil

from fastapi import HTTPException
from jinja2 import Environment, FileSystemLoader
import pytest
import weasyprint

from app.routers import invoices


class InvoiceConnection:
    async def fetch(self, query, *args):
        return [dict(treatment_name='General Consultation', treatment_code=1,
                     quantity=1, unit_price=2500, total_price=2500)]

    async def fetchrow(self, query, *args):
        return dict(total_paid=0)


async def invoice_header(*args, **kwargs):
    return dict(invoice_id=1, invoice_code='INV-000001', consultation_id=1,
                created_at=datetime(2026, 10, 14), patient_name='Lionel Messi',
                patient_address='10 Football Lane, Colombo 03, Sri Lanka',
                patient_phone='0770000016', patient_nic='199600000016',
                doctor_name='James Moriarty', total_amount=2500, insurance_amount=0)


def test_invoice_logo_embedded_from_app_only_package(tmp_path, monkeypatch, caplog):
    # Reproduce COPY app ./app with no backend-root medsync.webp.
    templates = tmp_path / 'app' / 'templates'
    shutil.copytree(invoices.TEMPLATE_DIR, templates)
    monkeypatch.setattr(invoices, '__file__', str(tmp_path / 'app' / 'routers' / 'invoices.py'))
    monkeypatch.setattr(invoices, 'fetch_invoice_by_id_or_code', invoice_header)
    monkeypatch.chdir(tmp_path)
    # Keep the regression test offline: external fonts are unrelated to the logo.
    template = templates / 'invoice_template.html'
    template.write_text('\n'.join(line for line in template.read_text().splitlines()
                                  if 'fonts.googleapis.com' not in line))
    monkeypatch.setattr(invoices, 'env', Environment(loader=FileSystemLoader(str(templates))))
    real_html = weasyprint.HTML

    def render_after_asset_removed(*args, **kwargs):
        assert 'data:image/png;base64,' in kwargs['string']
        (templates / 'report_logo.png').unlink()
        return real_html(*args, **kwargs)

    monkeypatch.setattr(weasyprint, 'HTML', render_after_asset_removed)
    caplog.set_level(logging.ERROR, logger='weasyprint')
    response = asyncio.run(invoices.download_invoice_pdf('INV-000001', InvoiceConnection()))
    assert response.media_type == 'application/pdf'
    assert b'/Subtype /Image' in response.body
    assert not [r for r in caplog.records if r.name.startswith('weasyprint') and r.levelno >= logging.ERROR]
    if preview := os.getenv('INVOICE_PDF_PREVIEW'):
        Path(preview).write_bytes(response.body)


def test_missing_packaged_invoice_logo_fails_clearly(tmp_path, monkeypatch):
    monkeypatch.setattr(invoices, '__file__', str(tmp_path / 'app' / 'routers' / 'invoices.py'))
    monkeypatch.setattr(invoices, 'fetch_invoice_by_id_or_code', invoice_header)
    with pytest.raises(HTTPException) as error:
        asyncio.run(invoices.download_invoice_pdf('INV-000001', InvoiceConnection()))
    assert error.value.status_code == 500
    assert error.value.detail == 'Invoice logo is unavailable.'


def test_invoice_template_loader_uses_absolute_packaged_path():
    assert Path(invoices.env.loader.searchpath[0]).is_absolute()
    assert invoices.env.get_template('invoice_template.html')
