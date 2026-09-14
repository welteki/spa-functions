import { useCallback, useEffect, useRef, useState } from 'react'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import './styles.css'
import { loggedFetch } from './api.js'

// Keep API calls under the gateway mount path configured by Vite.
const basePath = import.meta.env.BASE_URL
const routerBasename = basePath === '/' ? undefined : basePath.replace(/\/$/, '')
const versionURL = `${basePath}api/version`
const todosURL = `${basePath}api/todos`

function TodoPage({ doneOnly = false }) {
  const [todos, setTodos] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const inputRef = useRef(null)
  const nextTemporaryID = useRef(-1)
  const draftRevision = useRef(0)
  const pendingIDs = useRef(new Set())
  const [version, setVersion] = useState(null)
  const [requests, setRequests] = useState([])
  const nextRequestID = useRef(0)
  const recordRequest = useCallback((request) => {
    const entry = { ...request, id: nextRequestID.current++ }
    setRequests((current) => [entry, ...current].slice(0, 8))
  }, [])
  const apiFetch = useCallback((url, options) => loggedFetch(url, options, recordRequest), [recordRequest])

  useEffect(() => {
    let active = true
    async function loadTodos() {
      try {
        const response = await apiFetch(todosURL)
        if (!response.ok) throw new Error(`API returned ${response.status}`)
        const items = await response.json()
        if (active) setTodos(items)
      } catch (requestError) {
        if (active) setError(`Could not load tasks: ${requestError.message}`)
      } finally {
        if (active) setLoading(false)
      }
    }
    loadTodos()
    return () => { active = false }
  }, [apiFetch])

  useEffect(() => {
    let active = true
    async function loadVersion() {
      try {
        const response = await apiFetch(versionURL)
        if (!response.ok) throw new Error(`API returned ${response.status}`)
        const info = await response.json()
        if (typeof info.name !== 'string' || typeof info.version !== 'string' || !info.name || !info.version) {
          throw new Error('Invalid version response')
        }
        if (active) setVersion(info)
      } catch {
        if (active) setVersion(null)
      }
    }
    loadVersion()
    return () => { active = false }
  }, [apiFetch])

  async function addTodo(title) {
    const temporary = { id: nextTemporaryID.current--, title, completed: false, pending: 'create' }
    setTodos((current) => [...current, temporary])
    setError('')
    try {
      const response = await apiFetch(todosURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      if (!response.ok) throw new Error(`API returned ${response.status}`)
      const created = await response.json()
      setTodos((current) => current.map((item) => item.id === temporary.id ? created : item))
      return true
    } catch (requestError) {
      setTodos((current) => current.filter((item) => item.id !== temporary.id))
      setError(`Could not add “${title}”: ${requestError.message}`)
      return false
    }
  }

  async function setCompleted(todo) {
    if (todo.pending || pendingIDs.current.has(todo.id)) return
    pendingIDs.current.add(todo.id)
    setTodos((current) => current.map((item) => item.id === todo.id ? { ...item, completed: !todo.completed, pending: 'update' } : item))
    setError('')
    try {
      const response = await apiFetch(`${todosURL}/${todo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !todo.completed }),
      })
      if (!response.ok) throw new Error(`API returned ${response.status}`)
      const updated = await response.json()
      setTodos((current) => current.map((item) => item.id === todo.id ? updated : item))
    } catch (requestError) {
      setTodos((current) => current.map((item) => item.id === todo.id ? todo : item))
      setError(`Could not update “${todo.title}”: ${requestError.message}`)
    } finally {
      pendingIDs.current.delete(todo.id)
    }
  }

  async function removeTodo(todo) {
    if (todo.pending || pendingIDs.current.has(todo.id)) return
    pendingIDs.current.add(todo.id)
    // Keep a hidden row in its original position until deletion succeeds.
    setTodos((current) => current.map((item) => item.id === todo.id ? { ...item, pending: 'delete' } : item))
    setError('')
    try {
      const response = await apiFetch(`${todosURL}/${todo.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error(`API returned ${response.status}`)
      setTodos((current) => current.filter((item) => item.id !== todo.id))
    } catch (requestError) {
      setTodos((current) => current.map((item) => item.id === todo.id ? todo : item))
      setError(`Could not delete “${todo.title}”: ${requestError.message}`)
    } finally {
      pendingIDs.current.delete(todo.id)
    }
  }

  const [title, setTitle] = useState('')
  const remainingTodos = todos.filter((todo) => todo.pending !== 'delete')
  const completedCount = remainingTodos.filter((todo) => todo.completed).length
  const activeCount = remainingTodos.length - completedCount
  const visibleTodos = doneOnly ? remainingTodos.filter((todo) => todo.completed) : remainingTodos

  async function submit(event) {
    event.preventDefault()
    const value = title.trim()
    if (!value || loading) return
    const revision = ++draftRevision.current
    setTitle('')
    inputRef.current?.focus()
    if (!await addTodo(value) && draftRevision.current === revision) {
      setTitle(value)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">OpenFaaS Todos <span>served by one function</span></div>
        <span className="version" aria-label={version ? undefined : 'Version unavailable'}>
          {version ? `${version.name} ${version.version === 'dev' ? 'dev' : `v${version.version.replace(/^v/, '')}`}` : 'todos —'}
        </span>
      </header>
      <main>
        {error && <p className="error" role="alert">{error}</p>}
        <form className="composer" onSubmit={submit}>
          <input
            ref={inputRef}
            aria-label="Add a task"
            onChange={(event) => {
              draftRevision.current++
              setTitle(event.target.value)
            }}
            placeholder="Add a task"
            value={title}
          />
          <button type="submit" disabled={loading || !title.trim()}>Add</button>
        </form>
        <section aria-label="Tasks">
          {loading ? (
            <p className="empty" role="status">Loading tasks…</p>
          ) : visibleTodos.length === 0 ? (
            <p className="empty">{doneOnly ? 'No completed tasks yet.' : 'Nothing here yet. Add a task.'}</p>
          ) : (
            <ul className="task-list">
              {visibleTodos.map((todo) => (
                <li className={todo.completed ? 'completed' : ''} key={todo.id}>
                  <label>
                    <input
                      checked={todo.completed}
                      disabled={Boolean(todo.pending)}
                      onChange={() => setCompleted(todo)}
                      type="checkbox"
                    />
                    <span className="task-title">{todo.title}</span>
                  </label>
                  <button
                    aria-label={`Delete ${todo.title}`}
                    className="delete"
                    onClick={() => removeTodo(todo)}
                    disabled={Boolean(todo.pending)}
                    title="Delete task"
                    type="button"
                  >
                    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6m4-6v6" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="count">{activeCount} to do, {completedCount} done</p>
          <Link className="filter-link" to={doneOnly ? '/' : '/done'}>{doneOnly ? 'Show all' : 'Show done'}</Link>
        </section>
        <section className="request-log" aria-labelledby="requests-heading">
          <h2 id="requests-heading">Requests</h2>
          <ol role="log" aria-label="API requests" aria-relevant="additions">
            {requests.map((request) => (
              <li key={request.id}>
                <time dateTime={request.timestamp} title="Local time">{new Date(request.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</time>
                <span className={request.status >= 200 && request.status < 300 ? 'status-ok' : request.status >= 400 || request.status === 'ERR' ? 'status-error' : ''}>{request.status}</span>
                <span>{request.method}</span>
                <span className="request-path">{request.path}</span>
                <span>{request.duration}ms</span>
              </li>
            ))}
          </ol>
        </section>
        <p className="about">
          The page, the API and the request log above all come from one Go function built with the golang-middleware template. React is compiled ahead of time and shipped inside the function image.{' '}
          <a href="https://github.com/welteki/spa-functions">Source</a>
        </p>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter basename={routerBasename}>
      <Routes>
        <Route path="/" element={<TodoPage />} />
        <Route path="/done" element={<TodoPage doneOnly />} />
      </Routes>
    </BrowserRouter>
  )
}
