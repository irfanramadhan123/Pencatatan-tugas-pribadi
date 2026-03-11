import { useEffect, useMemo, useState } from 'react'
import './App.css'

const themeStorageKey = 'belajar-react-vite.theme'

const apiBaseUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

function buildApiUrl(pathname) {
  return apiBaseUrl ? `${apiBaseUrl}${pathname}` : pathname
}

async function requestJson(pathname, options) {
  const response = await fetch(buildApiUrl(pathname), {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message ?? 'Permintaan ke server gagal.')
  }

  return data
}

function formatDeadline(deadline) {
  if (!deadline) return 'Tanpa deadline'

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(deadline))
}

function isOverdue(deadline, done) {
  if (!deadline || done) return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return new Date(deadline) < today
}

function getDeadlineStatus(deadline, done) {
  if (!deadline) {
    return { label: 'Fleksibel', tone: 'neutral' }
  }

  if (done) {
    return { label: 'Selesai', tone: 'success' }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const dueDate = new Date(deadline)
  const diffInDays = Math.round((dueDate - today) / 86400000)

  if (diffInDays < 0) {
    return { label: 'Terlambat', tone: 'danger' }
  }

  if (diffInDays === 0) {
    return { label: 'Hari ini', tone: 'warning' }
  }

  if (diffInDays === 1) {
    return { label: 'Besok', tone: 'info' }
  }

  return { label: `${diffInDays} hari lagi`, tone: 'neutral' }
}

function App() {
  const [task, setTask] = useState('')
  const [category, setCategory] = useState('')
  const [deadline, setDeadline] = useState('')
  const [filter, setFilter] = useState('all')
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem(themeStorageKey) ?? 'light'
  })
  const [todos, setTodos] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(themeStorageKey, theme)
  }, [theme])

  useEffect(() => {
    let isMounted = true

    async function loadTodos() {
      try {
        setError('')
        const data = await requestJson('/api/todos')

        if (isMounted) {
          setTodos(data)
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadTodos()

    return () => {
      isMounted = false
    }
  }, [])

  const completedTodos = useMemo(
    () => todos.filter((todo) => todo.done).length,
    [todos],
  )

  const remainingTodos = todos.length - completedTodos
  const progress = todos.length
    ? Math.round((completedTodos / todos.length) * 100)
    : 0

  const filteredTodos = useMemo(() => {
    if (filter === 'active') {
      return todos.filter((todo) => !todo.done)
    }

    if (filter === 'done') {
      return todos.filter((todo) => todo.done)
    }

    return todos
  }, [filter, todos])

  async function handleSubmit(event) {
    event.preventDefault()

    const trimmedTask = task.trim()
    if (!trimmedTask) return

    try {
      setIsSaving(true)
      setError('')
      setMessage('')

      const newTodo = await requestJson('/api/todos', {
        method: 'POST',
        body: JSON.stringify({
          text: trimmedTask,
          category,
          deadline,
        }),
      })

      setTodos((currentTodos) => [newTodo, ...currentTodos])
      setTask('')
      setCategory('')
      setDeadline('')
      setMessage('Tugas tersimpan ke Neon.')
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function toggleTodo(id, done) {
    try {
      setError('')
      setMessage('')

      const updatedTodo = await requestJson(`/api/todos/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ done: !done }),
      })

      setTodos((currentTodos) =>
        currentTodos.map((todo) => (todo.id === id ? updatedTodo : todo)),
      )
    } catch (toggleError) {
      setError(toggleError.message)
    }
  }

  async function deleteTodo(id) {
    try {
      setError('')
      setMessage('')
      await requestJson(`/api/todos/${id}`, {
        method: 'DELETE',
      })

      setTodos((currentTodos) => currentTodos.filter((todo) => todo.id !== id))
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  async function clearCompleted() {
    try {
      setError('')
      setMessage('')
      await requestJson('/api/todos/completed', {
        method: 'DELETE',
      })

      setTodos((currentTodos) => currentTodos.filter((todo) => !todo.done))
      setMessage('Semua tugas selesai dihapus dari Neon.')
    } catch (clearError) {
      setError(clearError.message)
    }
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-topbar">
            <p className="eyebrow">Irfan (1) </p>
            <button
              type="button"
              className="theme-toggle"
              onClick={() =>
                setTheme((currentTheme) =>
                  currentTheme === 'light' ? 'dark' : 'light',
                )
              }
            >
              {theme === 'light' ? 'Dark mode' : 'Light mode'}
            </button>
          </div>
          <h1>Pencatatan Tugas </h1>
          <p className="intro">
            gunakan untuk mancatat tugas agar tidak terlewat.
          </p>
          <div className="hero-highlights">
            <span className="highlight-pill">Backend API</span>
            <span className="highlight-pill">Neon PostgreSQL</span>
            <span className="highlight-pill">Realtime fetch</span>
          </div>
        </div>

        <div className="hero-card">
          <p className="hero-card-label">Progress hari ini</p>
          <p className="hero-card-value">{progress}%</p>
          <div className="progress-bar">
            <span style={{ width: `${progress}%` }} />
          </div>
          <small>
            {completedTodos} selesai dari {todos.length} tugas
          </small>
        </div>
      </section>

      <section className="stats-row">
        <article className="stat-box stat-box-total">
          <span>Total</span>
          <strong>{todos.length}</strong>
        </article>
        <article className="stat-box stat-box-active">
          <span>Aktif</span>
          <strong>{remainingTodos}</strong>
        </article>
        <article className="stat-box stat-box-done">
          <span>Selesai</span>
          <strong>{completedTodos}</strong>
        </article>
      </section>

      <section className="planner-section">
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Tugas Anda</h2>
              <p className="panel-note">
                Data tersimpan di Neon lewat backend Node, bukan lagi di
                localStorage.
              </p>
            </div>
            <span className="badge">{remainingTodos} tersisa</span>
          </div>

          <form className="todo-form" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Tulis tugas baru"
              value={task}
              onChange={(event) => setTask(event.target.value)}
            />
            <input
              type="text"
              placeholder="Jenis tugas"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            />
            <input
              type="date"
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
            />
            <button type="submit" disabled={isSaving}>
              {isSaving ? 'Menyimpan...' : 'Tambah'}
            </button>
          </form>

          <div className="toolbar">
            <div className="filters">
              <button
                type="button"
                className={filter === 'all' ? 'filter active' : 'filter'}
                onClick={() => setFilter('all')}
              >
                Semua
              </button>
              <button
                type="button"
                className={filter === 'active' ? 'filter active' : 'filter'}
                onClick={() => setFilter('active')}
              >
                Aktif
              </button>
              <button
                type="button"
                className={filter === 'done' ? 'filter active' : 'filter'}
                onClick={() => setFilter('done')}
              >
                Selesai
              </button>
            </div>

            <button type="button" className="ghost" onClick={clearCompleted}>
              Hapus selesai
            </button>
          </div>

          {message ? <p className="info-state">{message}</p> : null}
          {error ? <p className="error-state">{error}</p> : null}
          {isLoading ? <p className="empty-state">Memuat data dari backend...</p> : null}

          {!isLoading ? (
            <ul className="todo-list">
              {filteredTodos.map((todo) => {
                const deadlineStatus = getDeadlineStatus(todo.deadline, todo.done)

                return (
                  <li
                    key={todo.id}
                    className={
                      todo.done
                        ? 'todo done'
                        : isOverdue(todo.deadline, todo.done)
                          ? 'todo overdue'
                          : 'todo'
                    }
                  >
                    <label className="todo-main">
                      <input
                        type="checkbox"
                        checked={todo.done}
                        onChange={() => toggleTodo(todo.id, todo.done)}
                      />
                      <span className="todo-text-group">
                        <strong>{todo.text}</strong>
                        <small>{formatDeadline(todo.deadline)}</small>
                      </span>
                    </label>

                    <div className="todo-meta">
                      <span className="tag">{todo.category}</span>
                      <span className={`status-pill ${deadlineStatus.tone}`}>
                        {deadlineStatus.label}
                      </span>
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => deleteTodo(todo.id)}
                      >
                        Hapus
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : null}

          {!isLoading && filteredTodos.length === 0 ? (
            <p className="empty-state">
              Belum ada tugas pada filter ini. Tambah tugas baru untuk menyimpan
              data ke Neon.
            </p>
          ) : null}
        </article>
      </section>
    </main>
  )
}

export default App
