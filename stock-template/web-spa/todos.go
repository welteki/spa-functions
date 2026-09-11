package function

import (
	"strings"
	"sync"
)

type todo struct {
	ID        int    `json:"id"`
	Title     string `json:"title"`
	Completed bool   `json:"completed"`
}

type todoStore interface {
	list() ([]todo, error)
	create(title string) (todo, error)
	setCompleted(id int, completed bool) (todo, bool, error)
	delete(id int) (bool, error)
}

// memoryStore keeps todos in process memory. Data is lost on restart and is
// not shared between replicas.
type memoryStore struct {
	mu     sync.Mutex
	nextID int
	items  []todo
}

var _ todoStore = (*memoryStore)(nil)

func newMemoryStore() *memoryStore {
	return &memoryStore{nextID: 1, items: []todo{}}
}

func (s *memoryStore) list() ([]todo, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	items := make([]todo, len(s.items))
	copy(items, s.items)
	return items, nil
}

func (s *memoryStore) create(title string) (todo, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	item := todo{ID: s.nextID, Title: title}
	s.nextID++
	s.items = append(s.items, item)
	return item, nil
}

func (s *memoryStore) setCompleted(id int, completed bool) (todo, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for index := range s.items {
		if s.items[index].ID == id {
			s.items[index].Completed = completed
			return s.items[index], true, nil
		}
	}
	return todo{}, false, nil
}

func (s *memoryStore) delete(id int) (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for index := range s.items {
		if s.items[index].ID == id {
			s.items = append(s.items[:index], s.items[index+1:]...)
			return true, nil
		}
	}
	return false, nil
}

func normalizeTitle(title string) string {
	return strings.TrimSpace(title)
}
