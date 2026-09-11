package function

import (
	"database/sql"
	"errors"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

const todoSchema = `
CREATE TABLE IF NOT EXISTS todos (
	id BIGSERIAL PRIMARY KEY,
	title TEXT NOT NULL,
	completed BOOLEAN NOT NULL DEFAULT FALSE
)`

type postgresStore struct {
	db *sql.DB
}

var _ todoStore = (*postgresStore)(nil)

func newPostgresStore(dsn string) *postgresStore {
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatalf("open postgres connection: %v", err)
	}
	if err := db.Ping(); err != nil {
		log.Fatalf("connect to postgres: %v", err)
	}
	if _, err := db.Exec(todoSchema); err != nil {
		log.Fatalf("prepare postgres schema: %v", err)
	}
	return &postgresStore{db: db}
}

func (s *postgresStore) list() ([]todo, error) {
	rows, err := s.db.Query(`SELECT id, title, completed FROM todos ORDER BY id`)
	if err != nil {
		return nil, fmt.Errorf("query todos: %w", err)
	}
	defer rows.Close()

	items := []todo{}
	for rows.Next() {
		var item todo
		if err := rows.Scan(&item.ID, &item.Title, &item.Completed); err != nil {
			return nil, fmt.Errorf("scan todo: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate todos: %w", err)
	}
	return items, nil
}

func (s *postgresStore) create(title string) (todo, error) {
	var item todo
	err := s.db.QueryRow(
		`INSERT INTO todos (title) VALUES ($1) RETURNING id, title, completed`,
		title,
	).Scan(&item.ID, &item.Title, &item.Completed)
	if err != nil {
		return todo{}, fmt.Errorf("insert todo: %w", err)
	}
	return item, nil
}

func (s *postgresStore) setCompleted(id int, completed bool) (todo, bool, error) {
	var item todo
	err := s.db.QueryRow(
		`UPDATE todos SET completed = $1 WHERE id = $2 RETURNING id, title, completed`,
		completed, id,
	).Scan(&item.ID, &item.Title, &item.Completed)
	if errors.Is(err, sql.ErrNoRows) {
		return todo{}, false, nil
	}
	if err != nil {
		return todo{}, false, fmt.Errorf("update todo: %w", err)
	}
	return item, true, nil
}

func (s *postgresStore) delete(id int) (bool, error) {
	result, err := s.db.Exec(`DELETE FROM todos WHERE id = $1`, id)
	if err != nil {
		return false, fmt.Errorf("delete todo: %w", err)
	}
	deleted, err := result.RowsAffected()
	if err != nil {
		return false, fmt.Errorf("delete todo: %w", err)
	}
	return deleted > 0, nil
}
