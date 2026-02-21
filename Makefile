ifneq (,$(wildcard .env))
    include .env
    export
endif

.PHONY: help dev down setup init-db sync-competition-tags sync-competitions sync sync-results link-results update-personal-bests update-club-records calculate-improvements sync-personal-bests prod-up prod-down

help:
	@echo ""
	@echo "Usage:"
	@echo "  make setup                  One-time initialisation: create DB tables + sync competitions"
	@echo "  make dev                    Start the full stack in development mode"
	@echo "  make down                   Stop and remove containers"
	@echo ""
	@echo "Individual init steps (no running app needed, uses uv):"
	@echo "  make init-db                Create DB schema"
	@echo "  make sync-competition-tags  Sync competition tags from CSPS"
	@echo "  make sync-competitions      Sync all competitions from CSPS"
	@echo ""
	@echo "Result sync (no running app needed, uses uv):"
	@echo "  make sync                   Full sync: results + all post-processing steps"
	@echo "  make sync-results           Fetch results from CSPS (optional: AFTER=YYYY-MM-DD BEFORE=YYYY-MM-DD)"
	@echo "  make link-results           Link results to competitions"
	@echo "  make calculate-improvements Calculate improvement flags per swimmer"
	@echo "  make update-personal-bests  Recompute personal bests from results"
	@echo "  make update-club-records    Recompute club records from results"
	@echo ""
	@echo "Ongoing sync (requires running backend container):"
	@echo "  make sync-personal-bests    Sync personal bests from CSPS API"
	@echo ""

# ── One-time setup ──────────────────────────────────────────────────────────

setup: init-db sync-competition-tags sync-competitions
	@echo ""
	@echo "✓ Setup complete. You can now run: make dev"

init-db:
	@echo ">>> Initialising database schema..."
	cd backend && uv run python -m scripts.db.init_db

sync-competition-tags:
	@echo ">>> Syncing competition tags..."
	cd backend && uv run python -m scripts.db.sync_competition_tags

sync-competitions:
	@echo ">>> Syncing competitions (this may take a while)..."
	cd backend && uv run python -m scripts.db.sync_competitions

# ── Development stack ────────────────────────────────────────────────────────

dev:
	docker compose up --build

down:
	docker compose down

# ── Production stack ───────────────────────────────────────────────────────

prod-up:
	docker compose -f docker-compose.prod.yml --env-file .env.prod up --build -d

prod-down:
	docker compose -f docker-compose.prod.yml down

# ── Ongoing sync (requires running backend container) ────────────────────────

sync-personal-bests:
	docker compose exec backend uv run python -m scripts.db.sync_personal_bests

# ── Result sync (no running app needed, uses uv) ─────────────────────────────

# Full sync pipeline in one go.
# Optional date range: make sync AFTER=2024-01-01 BEFORE=2024-12-31
sync: sync-results link-results calculate-improvements update-personal-bests update-club-records
	@echo ""
	@echo "✓ Full sync complete."

AFTER  ?= 2000-01-01
BEFORE ?= $(shell date +%Y-%m-%d)

sync-results:
	@echo ">>> Fetching results ($(AFTER) → $(BEFORE))..."
	cd backend && uv run python -m scripts.db.sync_results --after $(AFTER) --before $(BEFORE)

link-results:
	@echo ">>> Linking results to competitions..."
	cd backend && uv run python -m scripts.db.link_results_to_competitions

calculate-improvements:
	@echo ">>> Calculating improvements..."
	cd backend && uv run python -m scripts.db.calculate_improvements

update-personal-bests:
	@echo ">>> Updating personal bests..."
	cd backend && uv run python -m app.crud.update_personal_bests

update-club-records:
	@echo ">>> Updating club records..."
	cd backend && uv run python -m app.crud.update_club_records
