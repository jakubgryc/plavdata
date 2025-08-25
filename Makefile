ifneq (,$(wildcard .env))
    include .env
    export
endif

run:
	echo ${DB_USER} ${DB_PASSWORD}

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

pb-export:
	docker compose exec -it backend python -m scripts.records

debug:
	docker compose exec -it backend python -m scripts.debug

db-explore:
	docker compose exec -it backend python -m scripts.db_explorer

db-query:
	docker compose exec -it backend python -m scripts.db_explorer --interactive

db:
	docker exec -it plavdata_db psql -U jakub -d plavdata_db
