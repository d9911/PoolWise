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

.PHONY: install setup dev build start test lint format db-create db-create-user db-generate db-migrate db-migrate-dev db-reset seed docker-up docker-down docker-logs clean-ports db-start db-wait

install:
	cd $(FRONTEND_DIR) && yarn install

s:
	@cd frontend && ([ -f .env ] || cp .env.example .env)
	@echo "$(GREEN)✅ .env files created (if they were missing)$(NC)"

db-start:
	@echo "$(YELLOW)🐘 Starting PostgreSQL via Docker...$(NC)"
	docker compose up -d postgres
	@echo "$(GREEN)✅ PostgreSQL started$(NC)"

db-wait:
	@echo "$(YELLOW)⏳ Waiting for PostgreSQL to be ready...$(NC)"
	@until pg_isready -h localhost -p $(DB_PORT) -U $(DB_USER) > /dev/null 2>&1; do \
	    sleep 1; \
	done
	@echo "$(GREEN)✅ PostgreSQL is ready$(NC)"

db-create-user:
	@echo "$(YELLOW)👤 Database user already created via docker-compose$(NC)"

db-create: db-create-user db-wait
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

setup: s install db-start db-create db-migrate seed
	@echo "$(GREEN)✅ PoolWise is ready. Run 'make dev' to start.$(NC)"

i: setup build lint test dev