package function

import (
	"log"
	"os"
	"path/filepath"
	"strings"
)

const (
	backendEnvVar   = "STORE"
	backendMemory   = "memory"
	backendPostgres = "postgres"
	secretsDir      = "/var/openfaas/secrets"
	dbURLSecretName = "todo-db-url"
)

var todos todoStore = newStore()

func newStore() todoStore {
	switch strings.ToLower(strings.TrimSpace(os.Getenv(backendEnvVar))) {
	case "", backendMemory:
		return newMemoryStore()
	case backendPostgres:
		return newPostgresStore(secretValue(dbURLSecretName))
	default:
		log.Fatalf("unsupported %s value %q, expected %q or %q",
			backendEnvVar, os.Getenv(backendEnvVar), backendMemory, backendPostgres)
		return nil
	}
}

func secretValue(name string) string {
	path := filepath.Join(secretsDir, name)
	raw, err := os.ReadFile(path)
	if err != nil {
		log.Fatalf("read secret %q: %v", name, err)
	}
	value := strings.TrimSpace(string(raw))
	if value == "" {
		log.Fatalf("secret %q is empty", name)
	}
	return value
}
