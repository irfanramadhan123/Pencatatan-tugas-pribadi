import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const themeStorageKey = 'belajar-react-vite.theme'
const userStorageKey = 'belajar-react-vite.user'
const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim()

const apiBaseUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

function buildApiUrl(pathname) {
  return apiBaseUrl ? `${apiBaseUrl}${pathname}` : pathname
}

function getStoredUser() {
  try {
    const value = localStorage.getItem(userStorageKey)
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

function buildAuthHeaders(user) {
  return user?.sessionToken
    ? { Authorization: `Bearer ${user.sessionToken}` }
    : {}
}

async function requestJson(pathname, options = {}) {
  const response = await fetch(buildApiUrl(pathname), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message ?? 'Permintaan ke server gagal.')
  }

  return data
}

function loadGoogleScript() {
  if (window.google?.accounts?.id) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[data-google-gsi="true"]')

    if (existingScript) {
      existingScript.addEventListener('load', resolve, { once: true })
      existingScript.addEventListener('error', reject, { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.dataset.googleGsi = 'true'
    script.addEventListener('load', resolve, { once: true })
    script.addEventListener('error', reject, { once: true })
    document.body.appendChild(script)
  })
}

function formatDeadline(deadline) {
  if (!deadline) return 'Tanpa deadline'

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(deadline))
}

function formatMemberSince(date) {
  if (!date) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
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
  const [theme, setTheme] = useState(() => localStorage.getItem(themeStorageKey) ?? 'light')
  const [user, setUser] = useState(() => getStoredUser())
  const [todos, setTodos] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const googleButtonRef = useRef(null)
  const sessionToken = user?.sessionToken ?? ''

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(themeStorageKey, theme)
  }, [theme])

  useEffect(() => {
    if (user) {
      localStorage.setItem(userStorageKey, JSON.stringify(user))
      return
    }

    localStorage.removeItem(userStorageKey)
  }, [user])

  useEffect(() => {
    if (user || !googleClientId || !googleButtonRef.current) {
      return undefined
    }

    let isMounted = true

    async function renderGoogleButton() {
      try {
        await loadGoogleScript()

        if (!isMounted || !googleButtonRef.current || !window.google?.accounts?.id) {
          return
        }

        googleButtonRef.current.innerHTML = ''
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response) => {
            try {
              setIsAuthenticating(true)
              setError('')
              setMessage('')

              const authResult = await requestJson('/api/auth/google', {
                method: 'POST',
                body: JSON.stringify({ credential: response.credential }),
              })

              setUser({
                ...authResult.user,
                sessionToken: authResult.sessionToken,
              })
              setMessage(`Login Google berhasil sebagai ${authResult.user.email}.`)
            } catch (loginError) {
              setError(loginError.message)
            } finally {
              setIsAuthenticating(false)
            }
          },
        })

        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: theme === 'dark' ? 'filled_black' : 'outline',
          size: 'large',
          shape: 'pill',
          text: 'signin_with',
          width: 320,
        })
      } catch {
        if (isMounted) {
          setError('Script Google Sign-In gagal dimuat.')
        }
      }
    }

    renderGoogleButton()

    return () => {
      isMounted = false
    }
  }, [theme, user])

  useEffect(() => {
    let isMounted = true

    async function loadUserData() {
      if (!sessionToken) {
        setTodos([])
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError('')

        const headers = { Authorization: `Bearer ${sessionToken}` }
        const [profile, todoData] = await Promise.all([
          requestJson('/api/profile', { headers }),
          requestJson('/api/todos', { headers }),
        ])

        if (isMounted) {
          setUser((currentUser) => ({
            ...profile,
            sessionToken: currentUser?.sessionToken ?? sessionToken,
          }))
          setTodos(todoData)
        }
      } catch (loadError) {
        if (isMounted) {
          setUser(null)
          setTodos([])
          setError(loadError.message)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadUserData()

    return () => {
      isMounted = false
    }
  }, [sessionToken])

  const completedTodos = useMemo(
    () => todos.filter((todo) => todo.done).length,
    [todos],
  )
  const remainingTodos = todos.length - completedTodos
  const progress = todos.length ? Math.round((completedTodos / todos.length) * 100) : 0

  const filteredTodos = useMemo(() => {
    if (filter === 'active') {
      return todos.filter((todo) => !todo.done)
    }

    if (filter === 'done') {
      return todos.filter((todo) => todo.done)
    }

    return todos
  }, [filter, todos])

  function handleLogout() {
    setUser(null)
    setTodos([])
    setTask('')
    setCategory('')
    setDeadline('')
    setMessage('Anda sudah logout.')
    setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const trimmedTask = task.trim()
    if (!trimmedTask || !user) return

    try {
      setIsSaving(true)
      setError('')
      setMessage('')

      const newTodo = await requestJson('/api/todos', {
        method: 'POST',
        headers: buildAuthHeaders(user),
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
      setMessage('Tugas tersimpan untuk akun Anda.')
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function toggleTodo(id, done) {
    if (!user) return

    try {
      setError('')
      setMessage('')

      const updatedTodo = await requestJson(`/api/todos/${id}`, {
        method: 'PATCH',
        headers: buildAuthHeaders(user),
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
    if (!user) return

    try {
      setError('')
      setMessage('')
      await requestJson(`/api/todos/${id}`, {
        method: 'DELETE',
        headers: buildAuthHeaders(user),
      })

      setTodos((currentTodos) => currentTodos.filter((todo) => todo.id !== id))
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  async function clearCompleted() {
    if (!user) return

    try {
      setError('')
      setMessage('')
      await requestJson('/api/todos/completed', {
        method: 'DELETE',
        headers: buildAuthHeaders(user),
      })

      setTodos((currentTodos) => currentTodos.filter((todo) => !todo.done))
      setMessage('Semua tugas selesai untuk akun ini sudah dihapus.')
    } catch (clearError) {
      setError(clearError.message)
    }
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-topbar">
            <p className="eyebrow">Belajar React + Vite</p>
            <button
              type="button"
              className="theme-toggle"
              onClick={() =>
                setTheme((currentTheme) => (currentTheme === 'light' ? 'dark' : 'light'))
              }
            >
              {theme === 'light' ? 'Dark mode' : 'Light mode'}
            </button>
          </div>
          <h1>Todo dengan Google Auth</h1>
          <p className="intro">
            Masuk dengan akun Google, lihat profile singkat, lalu kelola tugas
            per akun di dashboard yang sama.
          </p>
          <div className="hero-highlights">
            <span className="highlight-pill">Google Sign-In</span>
            <span className="highlight-pill">Profile pengguna</span>
            <span className="highlight-pill">Todo per akun</span>
          </div>
        </div>

        <div className="hero-card">
          {user ? (
            <>
              <p className="hero-card-label">Progress akun {user.fullName}</p>
              <p className="hero-card-value">{progress}%</p>
              <div className="progress-bar">
                <span style={{ width: `${progress}%` }} />
              </div>
              <small>
                {completedTodos} selesai dari {todos.length} tugas
              </small>
            </>
          ) : (
            <>
              <p className="hero-card-label">Masuk dengan Google</p>
              <p className="hero-card-value">OAuth</p>
              <small>Gunakan akun Google untuk membuka dashboard pribadi Anda.</small>
            </>
          )}
        </div>
      </section>

      {message ? <p className="info-state">{message}</p> : null}
      {error ? <p className="error-state">{error}</p> : null}

      {!user ? (
        <section className="auth-layout">
          <article className="panel auth-panel">
            <div className="panel-head">
              <div>
                <h2>Login Google</h2>
                <p className="panel-note">
                  Login memakai Google Identity Services. Verifikasi token dilakukan di backend.
                </p>
              </div>
            </div>

            {googleClientId ? (
              <div className="google-login-box">
                <div ref={googleButtonRef} className="google-button-slot" />
                {isAuthenticating ? <p className="panel-note">Memproses login Google...</p> : null}
              </div>
            ) : (
              <div className="profile-empty">
                <span className="profile-avatar">!</span>
                <div>
                  <strong>Client ID Google belum diatur</strong>
                  <p>Isi `GOOGLE_CLIENT_ID` dan `VITE_GOOGLE_CLIENT_ID` di environment project.</p>
                </div>
              </div>
            )}
          </article>

          <article className="panel profile-panel">
            <div className="panel-head">
              <div>
                <h2>Profile</h2>
                <p className="panel-note">
                  Setelah login, data akun Google dan statistik tugas akan muncul di sini.
                </p>
              </div>
            </div>

            <div className="profile-empty">
              <span className="profile-avatar">G</span>
              <div>
                <strong>Belum ada sesi aktif</strong>
                <p>Login dengan Google dulu untuk melihat profile dan daftar tugas Anda.</p>
              </div>
            </div>
          </article>
        </section>
      ) : (
        <>
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

          <section className="dashboard-grid">
            <article className="panel profile-panel">
              <div className="panel-head">
                <div>
                  <h2>Profile</h2>
                  <p className="panel-note">Akun Google yang sedang aktif.</p>
                </div>
                <span className="badge">{user.initials || 'U'}</span>
              </div>

              <div className="profile-card">
                {user.avatar ? (
                  <img className="profile-photo" src={user.avatar} alt={user.fullName} />
                ) : (
                  <span className="profile-avatar">{user.initials || 'U'}</span>
                )}
                <div className="profile-details">
                  <strong>{user.fullName}</strong>
                  <span>{user.email}</span>
                </div>
              </div>

              <div className="profile-meta">
                <div className="profile-meta-item">
                  <span>Bergabung</span>
                  <strong>{formatMemberSince(user.memberSince)}</strong>
                </div>
                <div className="profile-meta-item">
                  <span>Tugas aktif</span>
                  <strong>{remainingTodos}</strong>
                </div>
              </div>

              <button type="button" className="ghost logout-button" onClick={handleLogout}>
                Logout
              </button>
            </article>

            <article className="panel">
              <div className="panel-head">
                <div>
                  <h2>Tugas Anda</h2>
                  <p className="panel-note">
                    Semua data tugas disimpan berdasarkan akun Google yang sedang login.
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

              {isLoading ? <p className="empty-state">Memuat data tugas akun Anda...</p> : null}

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
                  Belum ada tugas untuk akun ini pada filter yang dipilih.
                </p>
              ) : null}
            </article>
          </section>
        </>
      )}
    </main>
  )
}

export default App
