from __future__ import annotations

from typing import Any

import requests

from tools._shared import TIMEOUT, err

_WEATHER_CODES = {
    0: "clear sky", 1: "mainly clear", 2: "partly cloudy", 3: "overcast",
    45: "fog", 48: "depositing rime fog",
    51: "light drizzle", 53: "moderate drizzle", 55: "dense drizzle",
    61: "slight rain", 63: "moderate rain", 65: "heavy rain",
    71: "slight snow", 73: "moderate snow", 75: "heavy snow",
    80: "rain showers", 81: "moderate rain showers", 82: "violent rain showers",
    95: "thunderstorm", 96: "thunderstorm with hail", 99: "thunderstorm with heavy hail",
}


def _geocode(location: str) -> dict[str, Any] | None:
    response = requests.get(
        "https://geocoding-api.open-meteo.com/v1/search",
        params={"name": location, "count": 1},
        timeout=TIMEOUT,
    )
    response.raise_for_status()
    results = response.json().get("results") or []
    return results[0] if results else None


def get_weather(location: str = "", unit: str = "celsius") -> dict[str, Any]:
    try:
        place = _geocode(location)
        if not place:
            return {"tool": "get_weather", "location": location, "found": False, "message": "Location not found"}

        temperature_unit = "fahrenheit" if unit == "fahrenheit" else "celsius"
        response = requests.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": place["latitude"],
                "longitude": place["longitude"],
                "current": "temperature_2m,weather_code,wind_speed_10m",
                "temperature_unit": temperature_unit,
            },
            timeout=TIMEOUT,
        )
        response.raise_for_status()
        current = response.json().get("current", {})
        code = current.get("weather_code")
        return {
            "tool": "get_weather",
            "location": location,
            "found": True,
            "resolved_name": ", ".join(filter(None, [place.get("name"), place.get("country")])),
            "temperature": current.get("temperature_2m"),
            "unit": temperature_unit,
            "condition": _WEATHER_CODES.get(code, f"code {code}"),
            "wind_speed": current.get("wind_speed_10m"),
        }
    except Exception as exc:
        return err("get_weather", exc)
