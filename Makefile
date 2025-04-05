

dev:
	docker compose up db backend


clean:
	docker compose stop
	docker ps -aq | xargs -r docker rm


init-db:
	docker compose build init-db
	docker compose run --rm init-db


sync-pb:
	docker compose build sync-pb
	docker compose run --rm sync-pb

sync-results:
	docker compose exec -it backend python -m scripts.db.sync_results

debug:
	docker compose exec -it backend python -m scripts.debug

db:
	docker exec -it postgres_db psql -U postgres -d plavdata
