# Stock-template Todo function

React is built separately, then copied into the `golang-middleware` function
image. See the [root README](../README.md) for the architecture.

Requires Docker, faas-cli, Node.js 24, npm and make. Run these commands from
`stock-template/`.

## Develop

```sh
export VITE_BASE_PATH=/
make frontend
make dev
```

Open the Vite URL printed in the terminal (normally http://localhost:5173).
Vite reloads frontend edits and proxies `/api/*` to port 3005. Backend edits
rebuild the function through `faas-cli local-run --watch`. Stop with Ctrl+C.
`make frontend` installs dependencies and prepares the initial `static/` files.

## Run the packaged function locally

```sh
VITE_BASE_PATH=/ make local
```

Open http://localhost:3005/. This rebuilds the frontend and function, then runs
both from one origin. Stop with Ctrl+C. Use `BACKEND_PORT=3006` to change the
port for either Make workflow.

## Deploy

Authenticate faas-cli to your gateway first. Replace the gateway and owner below;
these commands build and push to `ttl.sh`, then deploy the function as `todo`.

```sh
export OPENFAAS_URL=https://gateway.example.com
export REGISTRY=ttl.sh OWNER=your-name
export VERSION="$(git rev-parse --short HEAD)" TAG="$(git rev-parse --short HEAD)"
VITE_BASE_PATH=/function/todo/ make frontend
faas-cli diff -g "$OPENFAAS_URL"
faas-cli up -g "$OPENFAAS_URL"
faas-cli describe todo -g "$OPENFAAS_URL"
curl -fsS "$OPENFAAS_URL/function/todo/api/version"
```

`diff` exits 1 when changes exist; review them before running `up`. Open
`$OPENFAAS_URL/function/todo/` after the function is Ready. Use a new image tag
for each release. `VERSION` supplies the header version; it defaults to `dev`.

Always rebuild the frontend before the function. If you rename `todo` in
`stack.yaml`, change `VITE_BASE_PATH` to match `/function/<name>/` too.
Both examples use the name `todo`; deploying either replaces the other.

## Check

With Go 1.25 or newer installed:

```sh
(cd todo && go test ./...)
node --test frontend/src/api.test.js
```

Tasks are stored in memory by default and disappear when the function restarts.
