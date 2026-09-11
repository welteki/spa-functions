BACKEND_PORT ?= 3005

.PHONY: build local dev dev-backend dev-frontend

build:
	faas-cli build --tag=digest

local:
	faas-cli local-run --build --port $(BACKEND_PORT) web-spa-custom

dev:
	$(MAKE) -j2 dev-backend dev-frontend

dev-backend:
	faas-cli local-run --watch --build --port $(BACKEND_PORT) web-spa-custom

dev-frontend:
	VITE_API_PROXY=http://127.0.0.1:$(BACKEND_PORT) npm --prefix web-spa/frontend run dev
