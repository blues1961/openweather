COMPOSE_DEV=docker compose -f docker-compose.dev.yml --env-file .env.dev
COMPOSE_PROD=docker compose -f docker-compose.prod.yml --env-file .env.prod

.DEFAULT_GOAL := help

.PHONY: env-link-dev env-link-prod env-local-perms dev-up dev-down dev-logs dev-ps prod-up prod-down prod-logs prod-ps

help:
	@echo "Options disponibles:"
	@echo "  make env-link-dev     # .env -> .env.dev"
	@echo "  make env-link-prod    # .env -> .env.prod"
	@echo "  make env-local-perms  # chmod 600 .env.local"
	@echo "  make dev-up           # build + start dev"
	@echo "  make dev-down         # stop dev"
	@echo "  make dev-logs         # logs dev"
	@echo "  make dev-ps           # ps dev"
	@echo "  make prod-up          # build + start prod"
	@echo "  make prod-down        # stop prod"
	@echo "  make prod-logs        # logs prod"
	@echo "  make prod-ps          # ps prod"

env-link-dev:
	ln -sfn .env.dev .env

env-link-prod:
	ln -sfn .env.prod .env

dev-up: env-link-dev env-local-perms
	$(COMPOSE_DEV) up -d --build

dev-down:
	$(COMPOSE_DEV) down

dev-logs:
	$(COMPOSE_DEV) logs -f --tail=200

dev-ps:
	$(COMPOSE_DEV) ps

prod-up: env-link-prod env-local-perms
	$(COMPOSE_PROD) up -d --build

prod-down:
	$(COMPOSE_PROD) down

prod-logs:
	$(COMPOSE_PROD) logs -f --tail=200

prod-ps:
	$(COMPOSE_PROD) ps

env-local-perms:
	chmod 600 .env.local
