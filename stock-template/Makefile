BACKEND_PORT ?= 3005

.PHONY: frontend build local dev dev-backend dev-frontend

frontend:
	npm --prefix frontend ci
	npm --prefix frontend run build

build: frontend
	faas-cli build --tag=digest

local: frontend
	faas-cli local-run --port $(BACKEND_PORT) --build web-spa-stock

dev:
	$(MAKE) -j2 dev-backend dev-frontend

dev-backend:
	faas-cli local-run --watch --build --port $(BACKEND_PORT) web-spa-stock

dev-frontend:
	VITE_API_PROXY=http://127.0.0.1:$(BACKEND_PORT) npm --prefix frontend run dev
