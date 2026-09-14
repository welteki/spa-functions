package function

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

const staticDir = "static"

// mux routes all requests for the function.
var mux *http.ServeMux

func init() {
	mux = http.NewServeMux()
	mux.HandleFunc("/api/version", handleVersion)
	mux.HandleFunc("/api/todos", handleTodos)
	mux.HandleFunc("/api/todos/", handleTodo)
	mux.HandleFunc("/api/", handleAPINotFound)
	mux.HandleFunc("/", serveReactApp)
}

// Handle serves both the JSON API and the pre-built React application.
func Handle(w http.ResponseWriter, r *http.Request) {
	mux.ServeHTTP(w, r)
}
func handleVersion(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", "GET")
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	version := strings.TrimSpace(os.Getenv("VERSION"))
	if version == "" {
		version = "dev"
	}
	w.Header().Set("Cache-Control", "no-store")
	writeJSON(w, http.StatusOK, map[string]string{
		"name":     "todos",
		"template": "golang-middleware",
		"version":  version,
	})
}

func handleTodos(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		items, err := todos.list()
		if err != nil {
			log.Printf("list todos: %v", err)
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to list todos"})
			return
		}
		writeJSON(w, http.StatusOK, items)
	case http.MethodPost:
		defer r.Body.Close()
		var input struct {
			Title string `json:"title"`
		}
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON"})
			return
		}

		title := normalizeTitle(input.Title)
		if title == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "title is required"})
			return
		}

		item, err := todos.create(title)
		if err != nil {
			log.Printf("create todo: %v", err)
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to create todo"})
			return
		}
		writeJSON(w, http.StatusCreated, item)
	default:
		w.Header().Set("Allow", "GET, POST")
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
	}
}

func handleTodo(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(strings.TrimPrefix(r.URL.Path, "/api/todos/"))
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "todo not found"})
		return
	}

	switch r.Method {
	case http.MethodPatch:
		defer r.Body.Close()
		var input struct {
			Completed *bool `json:"completed"`
		}
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil || input.Completed == nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "completed is required"})
			return
		}

		todo, found, err := todos.setCompleted(id, *input.Completed)
		if err != nil {
			log.Printf("update todo %d: %v", id, err)
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to update todo"})
			return
		}
		if !found {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "todo not found"})
			return
		}
		writeJSON(w, http.StatusOK, todo)
	case http.MethodDelete:
		deleted, err := todos.delete(id)
		if err != nil {
			log.Printf("delete todo %d: %v", id, err)
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to delete todo"})
			return
		}
		if !deleted {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "todo not found"})
			return
		}
		w.WriteHeader(http.StatusNoContent)
	default:
		w.Header().Set("Allow", "PATCH, DELETE")
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
	}
}

func handleAPINotFound(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func serveReactApp(w http.ResponseWriter, r *http.Request) {
	requested := strings.TrimPrefix(filepath.ToSlash(filepath.Clean("/"+r.URL.Path)), "/")
	if requested == "" {
		requested = "index.html"
	}

	target := filepath.Join(staticDir, filepath.FromSlash(requested))
	info, err := os.Stat(target)
	if err != nil || info.IsDir() {
		if !strings.Contains(r.Header.Get("Accept"), "text/html") {
			http.NotFound(w, r)
			return
		}
		target = filepath.Join(staticDir, "index.html")
	}

	if filepath.Base(target) == "index.html" {
		w.Header().Set("Cache-Control", "no-cache")
	}
	http.ServeFile(w, r, target)
}
