ifneq (,$(wildcard .env))
    include .env
    export
endif

.PHONY: help dev down setup init-db sync-competition-tags sync-competitions sync-personal-bests sync-results prod-up prod-down

help:
	@echo ""
	@echo "Usage:"
	@echo "  make setup                  One-time initialisation: create DB tables + sync competitions"
	@echo "  make dev                    Start the full stack in development mode"
	@echo "  make down                   Stop and remove containers"
	@echo ""
	@echo "Individual init steps (run from backend/ with uv, no app required):"
	@echo "  make init-db                Create DB schema"
	@echo "  make sync-competition-tags  Sync competition tags from CSPS"
	@echo "  make sync-competitions      Sync all competitions from CSPS"
	@echo ""
	@echo "Ongoing sync (run inside the running backend container):"
	@echo "  make sync-personal-bests    Sync personal bests"
	@echo "  make sync-results           Sync results"
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

# ── Ongoing sync tasks ───────────────────────────────────────────────────────
sync-personal-bests:
	docker compose exec backend uv run python -m scripts.db.sync_personal_bests

sync-results:
	docker compose exec backend uv run python -m scripts.db.sync_results
