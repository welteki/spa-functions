# Custom-Dockerfile Todo function

One Dockerfile builds the React frontend and Go backend into the function image.
See the [root README](../README.md) for the architecture.

Requires Docker, faas-cli and make. For frontend development, also install
Node.js 24 and npm; for the host Go server, Go 1.25 or newer. Run commands from
`custom-template/`.

## Develop

Install frontend dependencies once:

```sh
npm --prefix todo/frontend ci
```

Run the backend in one terminal:

```sh
(cd todo && HTTP_PORT=3005 go run ./cmd/server)
```

Run the frontend in another:

```sh
VITE_BASE_PATH=/ npm --prefix todo/frontend run dev
```

Open the Vite URL (normally http://localhost:5173). Vite reloads frontend edits
and proxies `/api/*` to port 3005. Restart `go run` after backend edits.
Alternatively, `VITE_BASE_PATH=/ make dev` runs a watched function container
alongside Vite; changes inside `todo/` trigger a full image rebuild. Stop with
Ctrl+C.

## Run the packaged function locally

```sh
VITE_BASE_PATH=/ make local
```

Open http://localhost:3005/. Docker builds both parts; no separate frontend build
is needed. Stop with Ctrl+C. Add `BACKEND_PORT=3006` to use a different port.

## Deploy

Authenticate faas-cli to your gateway first. Replace the gateway and owner below;
these commands build and push to `ttl.sh`, then deploy the function as `todo`.

```sh
export OPENFAAS_URL=https://gateway.example.com
export REGISTRY=ttl.sh OWNER=your-name
export VERSION="$(git rev-parse --short HEAD)" TAG="$(git rev-parse --short HEAD)"
export VITE_BASE_PATH=/function/todo/
faas-cli diff -g "$OPENFAAS_URL"
faas-cli up -g "$OPENFAAS_URL"
faas-cli describe todo -g "$OPENFAAS_URL"
curl -fsS "$OPENFAAS_URL/function/todo/api/version"
```

`diff` exits 1 when changes exist; review them before running `up`. Open
`$OPENFAAS_URL/function/todo/` after the function is Ready. Use a new image tag
for each release. `VERSION` supplies the header version; it defaults to `dev`.

The Dockerfile receives `VITE_BASE_PATH` through `stack.yaml`. If you rename
`todo`, change it to match `/function/<name>/`. Both examples use the name `todo`;
deploying either replaces the other.

## Check

```sh
(cd todo && go test ./...)
node --test todo/frontend/src/api.test.js
```

The Dockerfile also runs the Go tests during builds. Tasks are stored in memory
by default and disappear when the function restarts.
