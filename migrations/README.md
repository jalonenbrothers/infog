# Migrations

**Infographic #1 (UK wealth timeline) uses no database** — all content is
static JSON/Markdown under `data/`. No migration files exist yet, so
there is nothing to run.

Future apps that add a database will number plain SQL files here
(`001_description.sql`, idempotent, copy-paste into phpMyAdmin in order).
