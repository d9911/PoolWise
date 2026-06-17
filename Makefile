APP_NAME=poolwise
FRONTEND_DIR=frontend
FRONTEND_PORT=5179
DATABASE_PORT=5432

DB_NAME ?= poolwise
DB_USER ?= poolwise
DB_PASSWORD ?= poolwise
DB_PORT ?= $(DATABASE_PORT)
DATABASE_URL ?= postgresql://$(DB_USER):$(DB_PASSWORD)@localhost:$(DB_PORT)/$(DB_NAME)?schema=public

GREEN  := \033[0;32m
YELLOW := \033[0;33m
BLUE   := \033[0;34m
BOLD   := \033[1m
NC     := \033[0m

export PATH := $(CURDIR)/$(FRONTEND_DIR)/node_modules/.bin:$(PATH)

.PHONY: install setup dev build start test lint format db-create db-create-user db-generate db-migrate db-migrate-dev db-reset seed docker-up docker-down docker-logs clean-ports

install:
	cd $(FRONTEND_DIR) && yarn install

s:
	@cd frontend && ([ -f .env ] || cp .env.example .env)
	@echo "$(GREEN)✅ .env files created (if they were missing)$(NC)"
setup: s install db-create db-migrate seed
	@echo "$(GREEN)✅ PoolWise is ready. Run 'make dev' to start.$(NC)"

dev: clean-ports
	cd $(FRONTEND_DIR) && nohup yarn run dev > /tmp/poolwise-dev.log 2>&1 &
	@echo "$(BLUE)🚀 PoolWise dev server starting at http://localhost:$(FRONTEND_PORT)$(NC)"

build:
	cd $(FRONTEND_DIR) && yarn run build

start:
	cd $(FRONTEND_DIR) && yarn run start

test:
	cd $(FRONTEND_DIR) && yarn run test

lint:
	cd $(FRONTEND_DIR) && yarn run lint

format:
	cd $(FRONTEND_DIR) && yarn run format

db-create-user:
	@echo "$(YELLOW)👤 Creating database user $(DB_USER) (if not exists)...$(NC)"
	-@psql "postgresql://postgres:postgres@localhost:$(DB_PORT)/postgres" -c "CREATE USER $(DB_USER) WITH PASSWORD '$(DB_PASSWORD)' SUPERUSER;" 2>/dev/null || true

db-create: db-create-user
	@echo "$(YELLOW)🗄️  Creating database $(DB_NAME) if it does not exist...$(NC)"
	-@psql "postgresql://$(DB_USER):$(DB_PASSWORD)@localhost:$(DB_PORT)/postgres" -tc "SELECT 1 FROM pg_database WHERE datname='$(DB_NAME)'" | grep -q 1 || psql "postgresql://$(DB_USER):$(DB_PASSWORD)@localhost:$(DB_PORT)/postgres" -c "CREATE DATABASE $(DB_NAME);"
	@echo "$(GREEN)✅ Database $(DB_NAME) is ready.$(NC)"

db-generate:
	cd $(FRONTEND_DIR) && npx prisma generate

db-migrate:
	cd $(FRONTEND_DIR) && DATABASE_URL="$(DATABASE_URL)" npx prisma migrate deploy

db-migrate-dev:
	cd $(FRONTEND_DIR) && DATABASE_URL="$(DATABASE_URL)" npx prisma migrate dev

db-reset:
	cd $(FRONTEND_DIR) && DATABASE_URL="$(DATABASE_URL)" npx prisma migrate reset --force

seed:
	cd $(FRONTEND_DIR) && DATABASE_URL="$(DATABASE_URL)" yarn run seed

docker-up:
	docker compose up -d --build

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f

clean-ports:
	@echo "$(YELLOW)🧹 Очищаем порты...$(NC)"
	-@lsof -ti :$(FRONTEND_PORT) | xargs kill -9 2>/dev/null || true
	@echo "$(GREEN)✅ Порты свободны$(NC)"
