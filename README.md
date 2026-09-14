# Serving an SPA and API from one OpenFaaS function

This repository demonstrates a pattern in which one OpenFaaS function serves a
single-page application (SPA) and its supporting API from the same origin:

```text
Browser ──> OpenFaaS function
              ├── /api/*        backend endpoints
              ├── /assets/*     compiled frontend assets
              └── other paths   index.html for client-side routing
```

The examples use Go, React, Vite, and React Router, but the pattern applies to
other backend and frontend stacks.

Serving the frontend and API from the same function gives the browser one
origin for pages and API calls. This can simplify cookies, authentication, and
CORS configuration, while allowing the frontend and backend to be released as
one unit.

## Example application

The example is a todo app with a React frontend and a Go API. You can add,
complete, and delete tasks, and switch between all tasks and completed tasks
without reloading the page. A live request log shows the API calls as you use
the app.

Tasks are stored in memory by default, so they are lost when the function
restarts and are not shared between replicas. Optional PostgreSQL storage keeps
tasks across restarts and shares them between replicas.

The repository shows two ways to package this app: build the frontend separately
and include it using the OpenFaaS [golang-middleware template](https://docs.openfaas.com/languages/go/),
or build the frontend and backend together using the OpenFaaS
[Dockerfile template](https://docs.openfaas.com/languages/dockerfile/).
The sections below explain the tradeoffs.

## Approach 1: copy a separately built frontend

[`stock-template`](stock-template) keeps frontend source outside the function
handler. The frontend toolchain produces a `static/` artifact, and
`configuration.copy` adds only that artifact to the standard OpenFaaS language
template during the function build.

### Local development

The backend and frontend have independent development loops:

- Run the backend with `faas-cli local-run --watch`. Backend changes rebuild
  and restart the function container.
- Run the frontend with its local development server. It provides browser hot
  reload and proxies `/api/*` to the locally running function.

Because frontend source is outside the handler, editing it does not trigger an
OpenFaaS function rebuild. To test the packaged application, build `static/`
first and then run `faas-cli local-run`; the function will serve both parts from
one URL just as the deployed image does.

### CI and deployment

CI must build the frontend before building the function. This works well with
the stock OpenFaaS template and keeps frontend dependencies out of the function
context, but the pipeline must enforce the ordering. A missing or stale
`static/` directory can otherwise result in an incomplete image.

## Approach 2: build everything with an application Dockerfile

[`custom-template`](custom-template) keeps frontend and backend source in one
application directory and uses `lang: dockerfile`. Its multi-stage Dockerfile
builds the SPA, tests and compiles the backend, and packages both behind
`of-watchdog`.

### Local development

There are two useful workflows:

1. Run the Go server and frontend development server directly on the host. The
   frontend proxies `/api/*` to Go, giving fast backend restarts and frontend
   hot reload without rebuilding a container. This is the fastest feedback
   loop, but it does not exercise the production image or `of-watchdog`.
2. Run the function with `faas-cli local-run --watch`. This exercises the real
   Dockerfile and runtime, but both frontend and backend are inside the watched
   context. A change to either side can rebuild the multi-stage image and
   restart the container. That is slower than a frontend development server
   and does not provide browser hot-module replacement for the bundled SPA.

The first workflow is usually preferable for everyday development. The second
is valuable as an integration check before publishing an image.

### CI and deployment

CI invokes one function build, and the Dockerfile produces the complete image.
There is no separately prepared frontend artifact to forget or leave stale.
This makes the production build atomic and reproducible, at the cost of a
larger build context and application-owned container maintenance.

## Choosing an approach

The separate-build approach gives cleaner watch scopes and the simplest use of
a stock OpenFaaS language template. The Dockerfile approach gives stronger
build reproducibility and a simpler CI contract. Both produce the same runtime
shape: one function serving the SPA and API.

When serving a frontend through the OpenFaaS gateway, account for the path
where the function is exposed: `/function/<function-name>/`. Static asset
URLs, client-side routes, and API requests must all use this base path.
Configure the frontend build accordingly; a build intended for the server
root (`/`) may work locally but fail under the gateway's function path.

If the base path is embedded at build time, changing the function name or
exposure path requires rebuilding the frontend. Keep this configuration
consistent across local development, frontend builds, and deployment.

Here, both functions are named `todo`, so `VITE_BASE_PATH` is
`/function/todo/`:

- **Stock template:** build the frontend with the correct base path before
  including its static assets in the function build.
- **Custom template:** pass the base path as a Docker build argument so the
  Dockerfile can set it when building the frontend.
