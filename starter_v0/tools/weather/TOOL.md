---
name: weather
track: bonus
kind: live_api
provider: Open-Meteo
requires_env: []
inputs: [location, unit]
outputs: [resolved_name, temperature, condition, wind_speed]
side_effect: false
---
# weather

Gets current weather for a place name via Open-Meteo (free, no API key).
Two-step: geocode the place name to lat/lon, then fetch current
conditions for those coordinates.

Use only when the user explicitly asks about weather/temperature/climate
for a place. Not related to news or research search — do not use for
general "what's happening in <city>" requests (use `lookup` for that).
