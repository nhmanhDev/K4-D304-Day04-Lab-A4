---
name: calculator
track: bonus
kind: local_formatter
provider: none (pure Python, no network call)
requires_env: []
inputs: [expression]
outputs: [result]
side_effect: false
---
# calculator

Safely evaluates a numeric arithmetic expression (`+ - * / ** % ()`) with
no network call and no key — parses via Python's `ast` module and only
allows numeric literals and arithmetic operators (rejects names, calls,
attribute access, etc.), so it cannot execute arbitrary code.

Use for quick math the user asks for inline (percentages, totals, unit
math) instead of guessing an answer in prose. Not a general research tool.
