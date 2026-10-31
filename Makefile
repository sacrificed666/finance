# 💰 Finance: run `make` to list every command
SHELL := /bin/bash
.DEFAULT_GOAL := help
.SILENT:

# The Docker environment: development, staging or production
ENV ?= development
ENVS := development staging production
# The env file of ENV: .env for development, .env.staging or .env.production
ENV_FILE = $(if $(filter development,$(ENV)),.env,.env.$(ENV))
# Docker Compose with the overlay of the environment and its settings
COMPOSE = docker compose $(if $(wildcard $(ENV_FILE)),--env-file $(ENV_FILE)) -f compose.yaml -f docker/$(ENV).yaml
# The oldest supported Node.js major version
NODE_MIN := 24
# Ports of the dev server and the throwaway database
PORT ?= 3000
DB_PORT := 4030
# The port of the Next.js server inside the container
CONTAINER_PORT := 3000
# Where database dumps go, and the stamp in their names
BACKUPS := backups
STAMP = $(shell date +%Y%m%d-%H%M%S)
# Keys of the throwaway database only, never of a real one; anyone may sign up
THROWAWAY = DATABASE_URL=postgresql://postgres@127.0.0.1:$(DB_PORT)/postgres DATABASE_POOL_MAX=1 \
  AUTH_SECRET=throwaway-auth-secret-for-local-runs AUTH_URL=http://localhost:$(PORT) REMINDERS=off OWNER_EMAIL=

# Colours and emoji, off with NO_COLOR=1 or when the output is not a terminal
ifeq ($(NO_COLOR)$(shell [ -t 2 ] || echo pipe),)
  B := \033[1m
  D := \033[2m
  R := \033[31m
  G := \033[32m
  Y := \033[33m
  C := \033[36m
  M := \033[35m
  X := \033[0m
endif

# Status lines: a step, a success, a warning and a failure that stops make
step = printf "\n$(B)$(C)▶ %s$(X)\n" "$(1)"
ok = printf "$(G)✅ %s$(X)\n" "$(1)"
warn = printf "$(Y)⚠️  %s$(X)\n" "$(1)"
fail = { printf "$(R)❌ %s$(X)\n" "$(1)"; exit 1; }
# Opens an address on macOS or Linux
opener = $(shell command -v open || command -v xdg-open || echo echo)

# Colours the environment tags of the help
tags = gsub(/\[DEV\]/, "$(G)[DEV]$(X)", s); gsub(/\[STAGE\]/, "$(Y)[STAGE]$(X)", s); gsub(/\[PROD\]/, "$(R)[PROD]$(X)", s)

##@ 📖 Help

help: ## 📖 Show every command
	printf "\n$(B)💰 Finance$(X) $(D)make <command>$(X)   $(G)[DEV]$(X) $(D)development$(X)  $(Y)[STAGE]$(X) $(D)staging$(X)  $(R)[PROD]$(X) $(D)production$(X)\n"
	awk 'BEGIN {FS = ":.*## "} \
	  /^##@/ {s = substr($$0, 5); $(tags); printf "\n$(B)%s$(X)\n", s} \
	  /^[a-zA-Z0-9_-]+:.*## / {s = $$2; $(tags); printf "  $(C)%-15s$(X) %s\n", $$1, s}' $(MAKEFILE_LIST)
	printf "\n$(D)Examples: make setup · make dev-db · make check · make prod-up · make backup-now$(X)\n\n"

##@ 🧰 Setup

setup: install env browsers hooks ## 🧰 Everything for the first run: packages, .env, browsers and Git hooks
	$(call ok,Ready. Next: make dev-up or make dev-db)

install: node-version ## 📦 Install the exact dependencies from package-lock.json
	$(call step,Installing dependencies)
	npm ci

env: env-guard ## 🔐 Create the env file of ENV from .env.example with fresh keys
	if [ -f "$(ENV_FILE)" ]; then $(call ok,$(ENV_FILE) already exists); \
	else \
	  sed -e "s|^AUTH_SECRET=.*|AUTH_SECRET=$$(openssl rand -base64 32)|" \
	      -e "s|^DATA_ENCRYPTION_KEY=.*|DATA_ENCRYPTION_KEY=$$(openssl rand -base64 32)|" \
	      -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$$(openssl rand -hex 16)|" .env.example > "$(ENV_FILE)" \
	  && $(call ok,Created $(ENV_FILE) with new keys) && $(call warn,Fill in AUTH_URL and OWNER_EMAIL in $(ENV_FILE)); \
	fi

keys: ## 🔑 Print a new AUTH_SECRET and DATA_ENCRYPTION_KEY
	printf "AUTH_SECRET=%s\nDATA_ENCRYPTION_KEY=%s\n" "$$(openssl rand -base64 32)" "$$(openssl rand -base64 32)"

browsers: ## 🎭 Install Chromium and WebKit for the end-to-end tests
	$(call step,Installing Playwright Chromium and WebKit)
	npx playwright install chromium webkit

hooks: ## 🪝 Check format, lint, text and commit messages before every commit
	git config core.hooksPath .githooks
	$(call ok,Git hooks are on: .githooks/pre-commit and .githooks/commit-msg)

# Stops when Node.js is older than NODE_MIN
node-version:
	major=$$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0); \
	if [ "$$major" -lt "$(NODE_MIN)" ]; then $(call fail,Node.js $(NODE_MIN) or newer is required (found $$(node -v 2>/dev/null || echo none))); fi

doctor: ## 🩺 Check Node, npm, Docker and the env file
	$(call step,Checking the tools)
	printf "  %-10s %s\n" "Node.js" "$$(node -v 2>/dev/null || echo missing)" "npm" "$$(npm -v 2>/dev/null || echo missing)" "Docker" "$$(docker --version 2>/dev/null | cut -d, -f1 | sed 's/Docker version //' || echo missing)"
	$(MAKE) --no-print-directory node-version && $(call ok,Node.js $(NODE_MIN)+ found)
	[ -d node_modules ] && $(call ok,Dependencies installed) || $(call warn,Dependencies missing: run make install)
	grep -qs "^AUTH_SECRET=." .env && $(call ok,AUTH_SECRET is set in .env) || $(call warn,AUTH_SECRET is empty or .env is missing: run make env)
	grep -qs "^DATA_ENCRYPTION_KEY=." .env && $(call ok,DATA_ENCRYPTION_KEY is set in .env) || $(call warn,DATA_ENCRYPTION_KEY is empty: records would only be sealed with AUTH_SECRET)

##@ 🛠️  [DEV] Development: on this machine or in Docker with hot reload

dev: node-version ## 🚀 [DEV] Start the dev server on PORT (3000) against DATABASE_URL in .env
	grep -qs "^DATABASE_URL=." .env || $(call fail,Set DATABASE_URL in .env or use make dev-db or make dev-up)
	npx next dev --port $(PORT)

dev-db: node-version ## 🧪 [DEV] Start the dev server on a throwaway database in memory, no Docker needed
	$(call step,Throwaway Postgres on $(DB_PORT) and the app on $(PORT); nothing is kept)
	trap 'kill 0' EXIT; \
	E2E_DB_PORT=$(DB_PORT) node e2e/postgres.ts & \
	sleep 1; $(THROWAWAY) npx next dev --port $(PORT)

open: ## 🌐 [DEV] Open the dev server in the browser
	$(opener) http://localhost:$(PORT)

screenshots: build ## 📸 [DEV] Retake the README pictures from a fresh build on a throwaway database
	$(call step,Throwaway Postgres on $(DB_PORT) and the build on $(PORT); nothing is kept)
	E2E_DB_PORT=$(DB_PORT) node e2e/postgres.ts & db=$$!; \
	sleep 1; $(THROWAWAY) node_modules/.bin/next start --port $(PORT) & app=$$!; \
	trap 'kill $$app $$db 2>/dev/null' EXIT; \
	until curl -fsS http://localhost:$(PORT)/healthz >/dev/null 2>&1; do sleep 1; done; \
	node scripts/screenshots.mjs http://localhost:$(PORT)

dev-up: ## 🐳 [DEV] Start the development containers with hot reload on port 3000
	$(MAKE) --no-print-directory up ENV=development

dev-down: ## 🛑 [DEV] Stop the development containers
	$(MAKE) --no-print-directory down ENV=development

dev-restart: ## 🔄 [DEV] Rebuild and restart the development containers
	$(MAKE) --no-print-directory restart ENV=development

dev-logs: ## 📜 [DEV] Follow the logs of the development containers
	$(MAKE) --no-print-directory logs ENV=development

dev-ps: ## 📋 [DEV] Show the state and health of the development containers
	$(MAKE) --no-print-directory ps ENV=development

dev-shell: ## 🐚 [DEV] Open a shell in the development app container
	$(MAKE) --no-print-directory shell ENV=development

dev-psql: ## 🐘 [DEV] Open psql in the development database
	$(MAKE) --no-print-directory psql ENV=development

dev-open: ## 🌐 [DEV] Open the development container in the browser
	$(MAKE) --no-print-directory open-env ENV=development

dev-clean: ## 🧹 [DEV] Remove the development containers, database and image
	$(MAKE) --no-print-directory docker-clean ENV=development

##@ ✅ Quality: the same checks for every environment

lint: ## 🔍 Lint the code with Oxlint
	npm run lint

fix: ## 🪄 Fix lint findings and format everything
	npm run lint:fix
	npm run format
	$(call ok,Fixed and formatted)

format: ## 🎨 Format the code with Oxfmt
	npm run format

typecheck: ## 🧠 Check the types
	npm run typecheck

test: ## 🧪 Run the unit tests once
	npm run test:run

test-watch: ## 👀 Run the unit tests on every change
	npm test

coverage: ## 📊 Run the unit tests with coverage
	npm run test:coverage

e2e: ## 🎭 Run the end-to-end tests with axe and Lighthouse on a throwaway database
	npm run test:e2e

e2e-ui: ## 🖱️  Open the end-to-end tests in the Playwright UI
	npx playwright test --ui

e2e-chromium: ## 🎭 Run the end-to-end tests in Chromium with Lighthouse, like CI
	npx playwright test --project=lighthouse

e2e-webkit: ## 🧭 Run the end-to-end tests in WebKit, like CI
	npx playwright test --project=webkit

check: ## ✅ Lint, the dash check, format check, types and unit tests
	$(call step,Checking everything)
	npm run check
	$(call ok,All checks passed)

ci: node-version ## 🚦 What CI runs: signatures, changelog, checks, coverage, build and e2e
	$(call step,Checking the registry signatures and the changelog)
	npm audit signatures
	node scripts/release-notes.mjs > /dev/null
	$(call step,Checks and coverage)
	npm run lint
	npm run lint:text
	npm run format:check
	npm run typecheck
	npm run test:coverage
	$(MAKE) --no-print-directory build
	$(call step,End-to-end tests)
	npm run test:e2e
	$(call ok,CI passed)

##@ 🧪 [STAGE] Staging: the production build in Docker on a database of its own

stage-up: ## 🐳 [STAGE] Build and start staging in the background on port 3001
	$(MAKE) --no-print-directory up ENV=staging

stage-down: ## 🛑 [STAGE] Stop staging
	$(MAKE) --no-print-directory down ENV=staging

stage-restart: ## 🔄 [STAGE] Rebuild and restart staging
	$(MAKE) --no-print-directory restart ENV=staging

stage-logs: ## 📜 [STAGE] Follow the logs of staging
	$(MAKE) --no-print-directory logs ENV=staging

stage-ps: ## 📋 [STAGE] Show the state and health of staging
	$(MAKE) --no-print-directory ps ENV=staging

stage-shell: ## 🐚 [STAGE] Open a shell in the staging app container
	$(MAKE) --no-print-directory shell ENV=staging

stage-psql: ## 🐘 [STAGE] Open psql in the staging database
	$(MAKE) --no-print-directory psql ENV=staging

stage-open: ## 🌐 [STAGE] Open staging in the browser
	$(MAKE) --no-print-directory open-env ENV=staging

stage-clean: ## 🧹 [STAGE] Remove the staging containers, database and image
	$(MAKE) --no-print-directory docker-clean ENV=staging

##@ 🚀 [PROD] Production

build: node-version ## 🏗️  [PROD] Build for production and check the output
	$(call step,Building)
	npm run build
	node scripts/build-report.mjs

start: ## ▶️  [PROD] Serve the production build on PORT
	npx next start --port $(PORT)

live: ## 📡 [PROD] Check a running site, like the hourly monitor: make live URL=https://…
	node scripts/check-live.mjs $(URL)

live-lighthouse: ## 🚦 [PROD] Run Lighthouse on a running site: make live-lighthouse URL=https://…
	node scripts/lighthouse-live.mjs $(URL)

prod-up: ## 🐳 [PROD] Build and start production in the background on port 3000
	$(MAKE) --no-print-directory up ENV=production

prod-down: ## 🛑 [PROD] Stop production (asks first)
	$(MAKE) --no-print-directory down ENV=production

prod-restart: ## 🔄 [PROD] Back up, rebuild and restart production (asks first)
	$(MAKE) --no-print-directory backup ENV=production
	$(MAKE) --no-print-directory restart ENV=production

prod-logs: ## 📜 [PROD] Follow the logs of production
	$(MAKE) --no-print-directory logs ENV=production

prod-ps: ## 📋 [PROD] Show the state and health of production
	$(MAKE) --no-print-directory ps ENV=production

prod-shell: ## 🐚 [PROD] Open a shell in the production app container
	$(MAKE) --no-print-directory shell ENV=production

prod-psql: ## 🐘 [PROD] Open psql in the production database
	$(MAKE) --no-print-directory psql ENV=production

prod-open: ## 🌐 [PROD] Open production in the browser
	$(MAKE) --no-print-directory open-env ENV=production

prod-clean: ## 🧹 [PROD] Remove the production containers, database and image (asks twice)
	$(MAKE) --no-print-directory docker-clean ENV=production

##@ 💾 [PROD] Backups: the nightly service and dumps on request

backup-now: ## 🛟 [PROD] Take a nightly-style backup right now with the backup service
	$(COMPOSE_PROD) run --rm -e BACKUP_ONCE=1 backup

backup-check: ## 🧪 [PROD] Back up, then restore into a scratch database to prove it works
	$(COMPOSE_PROD) run --rm -e BACKUP_ONCE=1 -e BACKUP_RESTORE_CHECK=now backup

backups: ## 📂 [PROD] List the nightly backups
	ls -lh $(BACKUPS)/auto 2>/dev/null || $(call warn,No nightly backups yet: the backup service writes them to $(BACKUPS)/auto)

##@ 🐳 Docker for any ENV (ENV=development, staging or production)

# The production overlay, whatever ENV says
COMPOSE_PROD = docker compose $(if $(wildcard .env.production),--env-file .env.production) -f compose.yaml -f docker/production.yaml

# Stops when ENV is not one of ENVS
env-guard:
	$(if $(filter $(ENV),$(ENVS)),,$(call fail,ENV must be one of: $(ENVS)))

# Creates the env file of ENV on the first start and stops so it can be filled in
docker-env:
	if [ ! -f "$(ENV_FILE)" ]; then \
	  $(MAKE) --no-print-directory env ENV=$(ENV) && $(call warn,Check $(ENV_FILE) and run it again) && exit 1; \
	fi

# Asks before changing production; YES=1 answers for scripts
confirm:
	if [ "$(ENV)" = production ] && [ "$(YES)" != 1 ]; then \
	  read -r -p "⚠️  This changes production. Type yes to continue: " answer; \
	  [ "$$answer" = yes ] || $(call fail,Cancelled); \
	fi

up: env-guard docker-env ## 🐳 Start ENV: development with hot reload, others in the background
	if [ "$(ENV)" = development ]; then \
	  $(call step,Starting $(ENV) with hot reload); $(COMPOSE) up --build --watch; \
	else \
	  $(call step,Starting $(ENV) in the background); $(COMPOSE) up --build -d && $(call ok,$(ENV) is running: make logs ENV=$(ENV)); \
	fi

down: env-guard confirm ## 🛑 Stop ENV and remove its containers; the database stays
	$(COMPOSE) down
	$(call ok,$(ENV) stopped)

restart: env-guard confirm docker-env ## 🔄 Rebuild and restart ENV
	$(COMPOSE) down
	$(MAKE) --no-print-directory up ENV=$(ENV)

logs: env-guard ## 📜 Follow the logs of ENV
	$(COMPOSE) logs -f --tail=100

ps: env-guard ## 📋 Show the containers of ENV and their health
	$(COMPOSE) ps

shell: env-guard ## 🐚 Open a shell in the running ENV app container
	$(COMPOSE) exec app sh

psql: env-guard ## 🐘 Open psql in the database of ENV
	$(COMPOSE) exec db sh -c 'psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"'

backup: env-guard ## 💾 Dump the database of ENV to backups/<env>-<time>.sql
	mkdir -p $(BACKUPS)
	$(call step,Dumping the $(ENV) database)
	$(COMPOSE) exec -T db sh -c 'pg_dump -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"' > $(BACKUPS)/$(ENV)-$(STAMP).sql
	$(call ok,Saved $(BACKUPS)/$(ENV)-$(STAMP).sql)

restore: env-guard confirm ## ♻️  Restore the database of ENV from FILE=backups/… (.sql or .dump)
	[ -f "$(FILE)" ] || $(call fail,Pass FILE=backups/<name>.sql or .dump)
	$(call step,Restoring $(ENV) from $(FILE))
	case "$(FILE)" in \
	  *.dump) $(COMPOSE) exec -T db sh -c 'pg_restore --clean --if-exists --no-owner -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"' < "$(FILE)" ;; \
	  *) $(COMPOSE) exec -T db sh -c 'psql -v ON_ERROR_STOP=1 -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"' < "$(FILE)" ;; \
	esac
	$(call ok,$(ENV) restored from $(FILE))

open-env: env-guard ## 🌐 Open the running ENV in the browser
	address=$$($(COMPOSE) port app $(CONTAINER_PORT) 2>/dev/null | head -n 1 | sed 's/^0\.0\.0\.0/localhost/'); \
	if [ -z "$$address" ]; then $(call fail,$(ENV) is not running: start it with make up ENV=$(ENV)); fi; \
	$(opener) "http://$$address"

build-image: env-guard docker-env ## 🏗️  Build the image of ENV without starting it
	$(call step,Building finance:$(ENV))
	$(COMPOSE) build
	$(call ok,Image finance:$(ENV) built)

config: env-guard docker-env ## 🧾 Print the merged Compose configuration of ENV
	$(COMPOSE) config

docker-clean: env-guard confirm ## 🧹 Remove the containers, database and images of ENV
	if [ "$(ENV)" = production ] && [ "$(YES)" != 1 ]; then \
	  read -r -p "⚠️  This deletes the production database. Type delete production to continue: " answer; \
	  [ "$$answer" = "delete production" ] || $(call fail,Cancelled); \
	fi
	$(COMPOSE) down --rmi local --volumes --remove-orphans
	$(call ok,$(ENV) cleaned up)

status: ## 🚦 Show which environments are running
	for env in $(ENVS); do \
	  printf "\n$(B)%s$(X)\n" "$$env"; \
	  docker compose -f compose.yaml -f docker/$$env.yaml ps --format "table {{.Service}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || $(call warn,Docker is not running); \
	done

##@ 📦 Maintenance

outdated: ## 📦 List outdated packages
	npm outdated || true

audit: ## 🛡️  Check the dependencies for known vulnerabilities
	npm audit

shared: ## 🔗 Compare the files shared with ../tasks, ../weather and ../faceit-stats
	node scripts/check-shared.mjs

shared-sync: ## 🔁 Copy the shared files of this app over the other three
	node scripts/check-shared.mjs --sync

clean: ## 🧹 Remove build output, caches and reports
	rm -rf .next coverage test-results playwright-report blob-report lighthouse-live tsconfig.tsbuildinfo
	$(call ok,Cleaned)

reset: clean ## ♻️  Clean, then reinstall the dependencies from scratch
	rm -rf node_modules
	$(MAKE) --no-print-directory install

info: ## ℹ️  Show the versions of the app and the tools
	printf "  %-12s %s\n" "Finance" "$$(node -p "require('./package.json').version")" "Node.js" "$$(node -v)" "npm" "$$(npm -v)" "Docker" "$$(docker --version 2>/dev/null | cut -d, -f1 | sed 's/Docker version //' || echo missing)"

.PHONY: help setup install env keys browsers hooks node-version doctor dev dev-db open screenshots dev-up dev-down dev-restart dev-logs dev-ps dev-shell dev-psql dev-open dev-clean lint fix format typecheck test test-watch coverage e2e e2e-ui e2e-chromium e2e-webkit check ci stage-up stage-down stage-restart stage-logs stage-ps stage-shell stage-psql stage-open stage-clean build start live live-lighthouse prod-up prod-down prod-restart prod-logs prod-ps prod-shell prod-psql prod-open prod-clean backup-now backup-check backups env-guard docker-env confirm up down restart logs ps shell psql backup restore open-env build-image config docker-clean status outdated audit shared shared-sync clean reset info
