"""PNG data-URL QR for the phone pairing payload."""

from __future__ import annotations

import base64
import io


def qr_data_url(payload: str) -> str:
    payload = str(payload or "")
    if not payload:
        return ""
    try:
        import qrcode  # type: ignore[import-untyped]
        import qrcode.constants  # type: ignore[import-untyped]
    except Exception:
        return ""
    qr = qrcode.QRCode(
        error_correction=qrcode.constants.ERROR_CORRECT_L, box_size=10, border=3
    )
    qr.add_data(payload)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")
