# syntax=docker/dockerfile:1

FROM --platform=${TARGETPLATFORM:-linux/amd64} ghcr.io/openfaas/of-watchdog:0.11.9 AS watchdog

FROM --platform=${BUILDPLATFORM:-linux/amd64} node:24-alpine AS frontend

WORKDIR /frontend
# Must match the gateway mount path (/function/<name>) or asset URLs 404.
ARG VITE_BASE_PATH="/function/todo"
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN VITE_BASE_PATH=${VITE_BASE_PATH} npm run build

FROM --platform=${BUILDPLATFORM:-linux/amd64} golang:1.26-alpine AS backend

ARG TARGETOS
ARG TARGETARCH
ENV CGO_ENABLED=0

WORKDIR /src
COPY go.mod ./
COPY . .

RUN test -z "$(gofmt -l $(find . -type f -name '*.go'))" || { echo 'Run gofmt on the listed files'; exit 1; }
RUN GOOS=${TARGETOS} GOARCH=${TARGETARCH} go test ./... -cover
RUN GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build -ldflags "-s -w" -o /out/server ./cmd/server

FROM --platform=${TARGETPLATFORM:-linux/amd64} alpine:3.24.1 AS runtime

RUN apk --no-cache add ca-certificates \
    && addgroup -S app && adduser -S -G app app \
    && mkdir -p /home/app \
    && chown app:app /home/app

WORKDIR /home/app

COPY --from=watchdog --chown=app:app /fwatchdog ./fwatchdog
COPY --from=backend --chown=app:app /out/server ./server
COPY --from=frontend --chown=app:app /frontend/dist ./static

USER app

ENV fprocess="./server"
ENV mode="http"
ENV upstream_url="http://127.0.0.1:3000"
ENV prefix_logs="false"

CMD ["./fwatchdog"]
