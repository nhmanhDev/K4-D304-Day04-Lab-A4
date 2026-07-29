from __future__ import annotations

from typing import Any
from urllib.parse import quote

import requests

from tools._shared import TIMEOUT, err


def _search_title(query: str, lang: str) -> str | None:
    response = requests.get(
        f"https://{lang}.wikipedia.org/w/api.php",
        params={"action": "query", "list": "search", "srsearch": query, "format": "json", "srlimit": 1},
        timeout=TIMEOUT,
        headers={"User-Agent": "AI20k-Day04-Research-Agent/1.0 (educational lab)"},
    )
    response.raise_for_status()
    hits = response.json().get("query", {}).get("search", [])
    return hits[0]["title"] if hits else None


def wikipedia_summary(query: str = "", lang: str = "vi") -> dict[str, Any]:
    try:
        lang = lang or "vi"
        title = _search_title(query, lang)
        if not title:
            return {"tool": "wikipedia_summary", "query": query, "found": False, "message": "No matching Wikipedia page"}

        response = requests.get(
            f"https://{lang}.wikipedia.org/api/rest_v1/page/summary/{quote(title)}",
            timeout=TIMEOUT,
            headers={"User-Agent": "AI20k-Day04-Research-Agent/1.0 (educational lab)"},
        )
        response.raise_for_status()
        data = response.json()
        return {
            "tool": "wikipedia_summary",
            "query": query,
            "found": True,
            "title": data.get("title"),
            "extract": data.get("extract"),
            "url": (data.get("content_urls") or {}).get("desktop", {}).get("page"),
        }
    except Exception as exc:
        return err("wikipedia_summary", exc)
