---
name: wikipedia
track: bonus
kind: live_api
provider: Wikipedia REST API
requires_env: []
inputs: [query, lang]
outputs: [title, extract, url]
side_effect: false
---
# wikipedia

Looks up a quick factual summary for a topic/entity via Wikipedia's public
REST API (no key required). Two-step: search for the best matching page
title, then fetch that page's summary extract.

Use this for "what is X" / definition-style questions about a known
entity, concept, or term — faster and more citable than a full web search.
Not for current events or news (use `lookup` for that).
