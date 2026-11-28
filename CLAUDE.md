# ReachRadar — instructions for Claude

- **Keep `readme/` current.** After any change to data, scripts, definitions, methods, findings or decisions, update the matching file(s) in `readme/` in the same turn (and the status table in `readme/README.md`), and add a dated line to `readme/08_changelog.md`. Docs are in Thai.
- Explain the method (what and which algorithm, and why) and get the owner's OK before starting each new analysis step. Order: collect → EDA → grouping → relationships between groups.
- No paid services or APIs. Raw comments and handles stay local; anything published shows aggregates only. Delete `data/secrets/*` right after use.
- Run Python with `.venv/bin/python -W ignore`.
