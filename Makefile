COMPOSE_DEV=docker compose -f docker-compose.dev.yml --env-file .env.dev
COMPOSE_PROD=docker compose -f docker-compose.prod.yml --env-file .env.prod

.PHONY: dev-up dev-down dev-logs dev-ps prod-up prod-down prod-logs prod-ps env-local-perms

dev-up:
	$(COMPOSE_DEV) up -d --build

dev-down:
	$(COMPOSE_DEV) down

dev-logs:
	$(COMPOSE_DEV) logs -f --tail=200

dev-ps:
	$(COMPOSE_DEV) ps

prod-up:
	$(COMPOSE_PROD) up -d --build

prod-down:
	$(COMPOSE_PROD) down

prod-logs:
	$(COMPOSE_PROD) logs -f --tail=200

prod-ps:
	$(COMPOSE_PROD) ps

env-local-perms:
	chmod 600 .env.local
