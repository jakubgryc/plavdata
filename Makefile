

dev:
	docker compose up db backend

.PHONY: backend
backend:
	docker compose up backend


clean:
	docker compose stop
	docker ps -aq | xargs -r docker rm


init-db:
	docker compose exec -it backend python -m scripts.db.init_db


sync-pb:
	docker compose exec -it backend python -m scripts.db.sync_personal_bests

sync-results:
	docker compose exec -it backend python -m scripts.db.sync_results

debug:
	docker compose exec -it backend python -m scripts.debug

db:
	docker exec -it postgres_db psql -U postgres -d plavdata
