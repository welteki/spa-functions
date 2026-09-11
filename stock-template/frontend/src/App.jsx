import { useCallback, useEffect, useState } from 'react'
import {
  BrowserRouter,
  Link,
  NavLink,
  Outlet,
  Route,
  Routes,
  useOutletContext,
} from 'react-router-dom'

const basePath = import.meta.env.BASE_URL
const routerBasename = basePath === '/' ? undefined : basePath.replace(/\/$/, '')
const todosURL = `${basePath}api/todos`
const navClass = ({ isActive }) => isActive
  ? 'font-semibold text-cyan-700 underline decoration-2 underline-offset-8'
  : 'text-slate-600 transition hover:text-cyan-700'

function Layout() {
  const [todos, setTodos] = useState([])
  const [error, setError] = useState('')

  const loadTodos = useCallback(async () => {
    try {
      const response = await fetch(todosURL)
      if (!response.ok) throw new Error(`API returned ${response.status}`)
      setTodos(await response.json())
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    }
  }, [])

  useEffect(() => {
    loadTodos()
  }, [loadTodos])

  async function addTodo(title) {
    try {
      const response = await fetch(todosURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      if (!response.ok) throw new Error(`API returned ${response.status}`)
      const created = await response.json()
      setTodos((current) => [...current, created])
      setError('')
      return true
    } catch (requestError) {
      setError(requestError.message)
      return false
    }
  }

  async function setCompleted(todo) {
    try {
      const response = await fetch(`${todosURL}/${todo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !todo.completed }),
      })
      if (!response.ok) throw new Error(`API returned ${response.status}`)
      const updated = await response.json()
      setTodos((current) => current.map((item) => item.id === updated.id ? updated : item))
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function removeTodo(id) {
    try {
      const response = await fetch(`${todosURL}/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error(`API returned ${response.status}`)
      setTodos((current) => current.filter((item) => item.id !== id))
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  const actions = { addTodo, removeTodo, setCompleted }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-6 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-10">
          <Link className="text-lg font-extrabold tracking-tight text-slate-900" to="/">OpenFaaS Todos</Link>
          <nav aria-label="Main navigation" className="flex gap-6 text-sm">
            <NavLink className={navClass} to="/" end>Todos</NavLink>
            <NavLink className={navClass} to="/about">About</NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-6 py-10 lg:px-10 lg:py-16">
        {error && <p className="mb-8 border-l-4 border-rose-600 bg-rose-50 px-4 py-3 text-rose-800">{error}</p>}
        <Outlet context={{ actions, todos }} />
      </main>
    </div>
  )
}

function TodoPage() {
  const { actions, todos } = useOutletContext()
  const [title, setTitle] = useState('')
  const completedCount = todos.filter((todo) => todo.completed).length
  const activeCount = todos.length - completedCount

  async function submit(event) {
    event.preventDefault()
    const value = title.trim()
    if (!value) return
    if (await actions.addTodo(value)) setTitle('')
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-16">
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">SPA with a Go API</p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">One function, frontend and API</h1>
        <p className="mt-4 leading-7 text-slate-600">A simple todo app served by an OpenFaaS function. React handles the interface and page navigation, while Go serves the frontend files and handles API requests.</p>
        <p className="mt-4 leading-7 text-slate-600">Add tasks, mark them complete, and remove the ones you no longer need.</p>

        <form className="mt-8 grid gap-3" onSubmit={submit}>
          <input
            aria-label="New todo"
            className="min-w-0 rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100"
            onChange={(event) => setTitle(event.target.value)}
            placeholder="What needs to be done?"
            value={title}
          />
          <button className="rounded-lg bg-cyan-700 px-6 py-3 font-bold text-white transition hover:bg-cyan-800" type="submit">Add todo</button>
        </form>
      </section>

      <section aria-labelledby="todo-list-heading" className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-2 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-2xl font-bold" id="todo-list-heading">Todo list</h2>
          <p className="text-sm text-slate-500">{activeCount} active · {completedCount} completed</p>
        </div>

        {todos.length === 0 ? (
          <p className="py-12 text-center text-slate-500">No todos yet. Add your first one.</p>
        ) : (
          <ul className="mt-6 grid gap-3">
            {todos.map((todo) => (
              <li className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3" key={todo.id}>
                <label className="flex min-w-0 items-center gap-3">
                  <input
                    checked={todo.completed}
                    className="size-5 shrink-0 accent-cyan-700"
                    onChange={() => actions.setCompleted(todo)}
                    type="checkbox"
                  />
                  <span className={`truncate ${todo.completed ? 'text-slate-400 line-through' : ''}`}>{todo.title}</span>
                </label>
                <button className="shrink-0 text-sm font-semibold text-rose-700 hover:text-rose-900" onClick={() => actions.removeTodo(todo.id)} type="button">Delete</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function About() {
  return (
    <>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">OpenFaaS Todos</p>
      <h1 className="mb-8 mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">About this demo</h1>
      <div className="max-w-3xl space-y-4 leading-7 text-slate-600">
        <p>This todo app demonstrates how to serve a single-page application and its supporting API from one OpenFaaS function. It provides a small, working example of frontend navigation and backend business logic packaged together.</p>
        <p>React displays and updates the task list. Go handles creating, completing, and deleting tasks, and also serves the compiled frontend. React Router provides client-side navigation.</p>
      </div>
    </>
  )
}

function NotFound() {
  return <><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Frontend 404</p><h1 className="mb-8 mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">Page not found</h1><Link className="font-semibold text-cyan-700" to="/">Return to todos</Link></>
}

export default function App() {
  return (
    <BrowserRouter basename={routerBasename}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<TodoPage />} />
          <Route path="about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
