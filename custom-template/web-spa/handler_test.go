package function

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestTodoLifecycle(t *testing.T) {
	todos = newMemoryStore()
	initial := request(t, http.MethodGet, "/api/todos", "")
	if initial.Body.String() != "[]\n" {
		t.Fatalf("expected an empty JSON array, got %q", initial.Body.String())
	}

	created := request(t, http.MethodPost, "/api/todos", `{"title":"Write an OpenFaaS function"}`)
	if created.Code != http.StatusCreated {
		t.Fatalf("expected create status 201, got %d: %s", created.Code, created.Body.String())
	}

	var item todo
	decode(t, created, &item)
	if item.ID != 1 || item.Title != "Write an OpenFaaS function" || item.Completed {
		t.Fatalf("unexpected created todo: %#v", item)
	}

	updated := request(t, http.MethodPatch, "/api/todos/1", `{"completed":true}`)
	if updated.Code != http.StatusOK {
		t.Fatalf("expected update status 200, got %d: %s", updated.Code, updated.Body.String())
	}
	decode(t, updated, &item)
	if !item.Completed {
		t.Fatal("expected todo to be completed")
	}

	deleted := request(t, http.MethodDelete, "/api/todos/1", "")
	if deleted.Code != http.StatusNoContent {
		t.Fatalf("expected delete status 204, got %d", deleted.Code)
	}

	listed := request(t, http.MethodGet, "/api/todos", "")
	var items []todo
	decode(t, listed, &items)
	if len(items) != 0 {
		t.Fatalf("expected empty todo list, got %#v", items)
	}
}

func TestUnknownAPIDoesNotFallThroughToReact(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/not-found", nil)
	req.Header.Set("Accept", "text/html")
	res := httptest.NewRecorder()
	Handle(res, req)

	if res.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d", res.Code)
	}
	if contentType := res.Header().Get("Content-Type"); contentType != "application/json; charset=utf-8" {
		t.Fatalf("expected JSON response, got %q", contentType)
	}
}

func request(t *testing.T, method, target, body string) *httptest.ResponseRecorder {
	t.Helper()

	req := httptest.NewRequest(method, target, bytes.NewBufferString(body))
	if body != "" {
		req.Header.Set("Content-Type", "application/json")
	}
	res := httptest.NewRecorder()
	Handle(res, req)
	return res
}

func decode(t *testing.T, response *httptest.ResponseRecorder, target any) {
	t.Helper()
	if err := json.NewDecoder(response.Body).Decode(target); err != nil {
		t.Fatalf("decode response: %v", err)
	}
}
