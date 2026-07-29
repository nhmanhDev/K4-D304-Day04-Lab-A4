from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any

from tools._shared import ROOT, err, safe_slug

DIGESTS_DIR = ROOT / "digests"


def save_digest(markdown: str = "", filename: str = "", confirmed: bool = False) -> dict[str, Any]:
    if not confirmed:
        return {
            "tool": "save_digest",
            "status": "needs_confirmation",
            "message": "Only save after the user explicitly confirms.",
        }
    try:
        DIGESTS_DIR.mkdir(parents=True, exist_ok=True)
        stem = safe_slug(filename) if filename else datetime.now().strftime("digest_%Y%m%dT%H%M%S")
        path = DIGESTS_DIR / f"{stem}.md"
        path.write_text(markdown, encoding="utf-8")
        return {"tool": "save_digest", "status": "saved", "path": str(path)}
    except Exception as exc:
        return err("save_digest", exc)
