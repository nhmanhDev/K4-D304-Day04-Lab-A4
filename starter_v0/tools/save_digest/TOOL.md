---
name: save_digest
track: bonus
kind: action
provider: local filesystem
requires_env: []
inputs: [markdown, filename, confirmed]
outputs: [status, path]
side_effect: local_file_write
requires_confirmation: true
---
# save_digest

Writes a markdown digest (usually the output of `format`) to a local file
under `digests/`. Local-only side effect — nothing leaves the machine.

Same confirmation boundary as `send`: the FIRST call must have
`confirmed=false` (or omitted); only write to disk after the user has
explicitly confirmed via `clarify(response_type="yes_no")`.
