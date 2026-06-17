.PHONY: install dev build start test lint format db-generate db-migrate db-reset seed docker-up docker-down docker-logs clean-ports

APP_NAME=poolwise
FRONTEND_DIR=frontend
FRONTEND_PORT=5179
DATABASE_PORT=5432

GREEN  := \033[0;32m
YELLOW := \033[0;33m
BLUE   := \033[0;34m
BOLD   := \033[1m
NC     := \033[0m


setup:
	@cd backend && ([ -f .env ] || cp .env.example .env)
	@cd frontend && ([ -f .env ] || cp .env.example .env)
	@echo "$(GREEN)✅ .env files created (if they were missing)$(NC)"


install:
	cd $(FRONTEND_DIR) && npm install

dev: clean-ports
	cd $(FRONTEND_DIR) && npm run dev -- -p $(FRONTEND_PORT)

build:
	cd $(FRONTEND_DIR) && npm run build

start:
	cd $(FRONTEND_DIR) && npm run start -- -p $(FRONTEND_PORT)

test:
	cd $(FRONTEND_DIR) && npm run test

lint:
	cd $(FRONTEND_DIR) && npm run lint

format:
	cd $(FRONTEND_DIR) && npm run format

db-generate:
	cd $(FRONTEND_DIR) && npx prisma generate

db-migrate:
	cd $(FRONTEND_DIR) && npx prisma migrate dev

db-reset:
	cd $(FRONTEND_DIR) && npx prisma migrate reset --force

seed:
	cd $(FRONTEND_DIR) && npm run seed

docker-up:
	docker compose up -d --build

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f

clean-ports:
	@echo "$(YELLOW)🧹 Очищаем порты...$(NC)"
	@-lsof -ti :$(BACKEND_PORT) | xargs kill -9 2>/dev/null || true
	@-lsof -ti :$(FRONTEND_PORT) | xargs kill -9 2>/dev/null || true
	@echo "$(GREEN)✅ Порты свободны$(NC)"
