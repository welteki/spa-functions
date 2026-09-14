BACKEND_PORT ?= 3005

.PHONY: build local dev dev-backend dev-frontend

build:
	# VITE_BASE_PATH defaults to /function/todo in stack.yaml; override
	# it only if the function is deployed under a different name.
	faas-cli build --tag=digest

local:
	faas-cli local-run --build --port $(BACKEND_PORT) todo

dev:
	$(MAKE) -j2 dev-backend dev-frontend

dev-backend:
	faas-cli local-run --watch --build --port $(BACKEND_PORT) todo

dev-frontend:
	VITE_API_PROXY=http://127.0.0.1:$(BACKEND_PORT) npm --prefix todo/frontend run dev
