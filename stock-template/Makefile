BACKEND_PORT ?= 3005

.PHONY: frontend build local dev dev-backend dev-frontend

frontend:
	# For a deploy, set VITE_BASE_PATH=/function/todo so assets and
	# routes match the gateway mount path; otherwise they 404 under the sub-path.
	npm --prefix frontend ci
	npm --prefix frontend run build

build: frontend
	faas-cli build --tag=digest

local: frontend
	faas-cli local-run --port $(BACKEND_PORT) --build todo

dev:
	$(MAKE) -j2 dev-backend dev-frontend

dev-backend:
	faas-cli local-run --watch --build --port $(BACKEND_PORT) todo

dev-frontend:
	VITE_API_PROXY=http://127.0.0.1:$(BACKEND_PORT) npm --prefix frontend run dev
