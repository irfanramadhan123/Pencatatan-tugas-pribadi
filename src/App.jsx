import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const themeStorageKey = 'belajar-react-vite.theme'
const userStorageKey = 'belajar-react-vite.user'
const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim()
const defaultPage = 'tasks'

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

function getPageFromHash() {
  const hash = window.location.hash.replace(/^#/, '').trim().toLowerCase()
  return hash === 'profile' ? 'profile' : defaultPage
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

function formatMonthLabel(date) {
  return new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function formatDeadlineTime(deadline) {
  if (!deadline) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(deadline))
}

function getMonthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

function formatDateKey(date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(date, amount) {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + amount)
  return nextDate
}

function AppIcon({ name }) {
  const icons = {
    tasks: (
      <path d="M4 6.75A2.75 2.75 0 0 1 6.75 4h10.5A2.75 2.75 0 0 1 20 6.75v10.5A2.75 2.75 0 0 1 17.25 20H6.75A2.75 2.75 0 0 1 4 17.25zm3 1.25a.75.75 0 0 0-.75.75v1.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75v-1.5A.75.75 0 0 0 8.5 8zm0 5a.75.75 0 0 0-.75.75v1.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75v-1.5a.75.75 0 0 0-.75-.75zm4-4.25a.75.75 0 0 1 .75-.75h5.25a.75.75 0 0 1 0 1.5h-5.25a.75.75 0 0 1-.75-.75m0 5a.75.75 0 0 1 .75-.75h5.25a.75.75 0 0 1 0 1.5h-5.25a.75.75 0 0 1-.75-.75" />
    ),
    profile: (
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4m0 2c-4.418 0-8 2.015-8 4.5 0 .828.672 1.5 1.5 1.5h13c.828 0 1.5-.672 1.5-1.5 0-2.485-3.582-4.5-8-4.5" />
    ),
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {icons[name] ?? icons.tasks}
    </svg>
  )
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
  const [currentPage, setCurrentPage] = useState(() => getPageFromHash())
  const [calendarMonth, setCalendarMonth] = useState(() => getMonthStart(new Date()))
  const [selectedCalendarDate, setSelectedCalendarDate] = useState('')
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
    function handleHashChange() {
      setCurrentPage(getPageFromHash())
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

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
          theme: theme === 'dark' ? 'filled_black' : 'filled_blue',
          size: 'large',
          type: 'icon',
          shape: 'circle',
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
    let nextTodos = todos

    if (filter === 'active') {
      nextTodos = nextTodos.filter((todo) => !todo.done)
    }

    if (filter === 'done') {
      nextTodos = nextTodos.filter((todo) => todo.done)
    }

    if (selectedCalendarDate) {
      nextTodos = nextTodos.filter(
        (todo) => todo.deadline && formatDateKey(new Date(todo.deadline)) === selectedCalendarDate,
      )
    }

    return nextTodos
  }, [filter, selectedCalendarDate, todos])

  const upcomingTodos = useMemo(
    () =>
      todos
        .filter((todo) => todo.deadline && !todo.done)
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .slice(0, 4),
    [todos],
  )

  const deadlinesByDate = useMemo(() => {
    const grouped = new Map()

    todos.forEach((todo) => {
      if (!todo.deadline) return

      const key = formatDateKey(new Date(todo.deadline))
      const currentItems = grouped.get(key) ?? []
      currentItems.push(todo)
      grouped.set(key, currentItems)
    })

    return grouped
  }, [todos])

  const calendarCells = useMemo(() => {
    const monthStart = getMonthStart(calendarMonth)
    const firstWeekday = (monthStart.getDay() + 6) % 7
    const gridStart = new Date(monthStart)
    gridStart.setDate(monthStart.getDate() - firstWeekday)
    const todayKey = formatDateKey(new Date())
    const tomorrowKey = formatDateKey(addDays(new Date(), 1))

    return Array.from({ length: 35 }, (_, index) => {
      const date = new Date(gridStart)
      date.setDate(gridStart.getDate() + index)

      const dateKey = formatDateKey(date)
      const items = deadlinesByDate.get(dateKey) ?? []
      const hasOverdue = items.some((todo) => isOverdue(todo.deadline, todo.done))
      const isToday = dateKey === todayKey
      const isTomorrow = dateKey === tomorrowKey
      const tone = hasOverdue ? 'overdue' : isToday ? 'today' : isTomorrow ? 'tomorrow' : 'default'

      return {
        key: dateKey,
        date,
        day: date.getDate(),
        isCurrentMonth: date.getMonth() === calendarMonth.getMonth(),
        isToday,
        isTomorrow,
        isSelected: dateKey === selectedCalendarDate,
        tone,
        items,
      }
    })
  }, [calendarMonth, deadlinesByDate, selectedCalendarDate])

  const profileActions = user
    ? [
        {
          label: currentPage === 'profile' ? 'Sedang dibuka' : 'Lihat profile',
          helper:
            currentPage === 'profile'
              ? 'Anda sedang berada di halaman profile.'
              : 'Buka halaman khusus profile pengguna.',
          onClick: () => navigateTo('profile'),
          variant: 'primary',
        },
        {
          label: currentPage === 'tasks' ? 'Sedang dibuka' : 'Lihat tugas',
          helper:
            currentPage === 'tasks'
              ? 'Daftar tugas sedang ditampilkan.'
              : 'Kembali ke halaman tugas Anda.',
          onClick: () => navigateTo('tasks'),
          variant: 'secondary',
        },
      ]
    : []

  const sidebarMenu = [
    {
      key: 'tasks',
      label: 'Daftar tugas',
      helper: `${upcomingTodos.length} deadline dekat`,
      active: currentPage === 'tasks',
      onClick: () => navigateTo('tasks'),
    },
    {
      key: 'profile',
      label: 'Profile saya',
      helper: user ? user.email : 'Butuh login Google',
      active: currentPage === 'profile',
      onClick: () => navigateTo('profile'),
    },
  ]

  function handleLogout() {
    window.location.hash = defaultPage
    setCurrentPage(defaultPage)
    setUser(null)
    setTodos([])
    setTask('')
    setCategory('')
    setDeadline('')
    setMessage('Anda sudah logout.')
    setError('')
  }

  function navigateTo(page) {
    const nextPage = page === 'profile' ? 'profile' : defaultPage
    window.location.hash = nextPage === defaultPage ? '' : nextPage
    setCurrentPage(nextPage)
  }

  function changeCalendarMonth(offset) {
    setCalendarMonth((currentMonth) => addMonths(currentMonth, offset))
  }

  function resetCalendarMonth() {
    setCalendarMonth(getMonthStart(new Date()))
  }

  function handleCalendarDateSelect(dateKey) {
    setSelectedCalendarDate((currentDate) => (currentDate === dateKey ? '' : dateKey))
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
      <header className="navbar">
        <div className="navbar-brand">
          <p className="eyebrow">Project Irfan</p>
          <span className="navbar-title">Pencatatan Tugas Sederhana</span>
        </div>

        <div className="navbar-actions">
          {!user ? (
            googleClientId ? (
              <div className="hero-login-box">
                <div ref={googleButtonRef} className="google-button-slot hero-google-button-slot" />
                {isAuthenticating ? <span className="hero-login-status" /> : null}
              </div>
            ) : null
          ) : null}

          {user ? (
            <div className="hero-user-badge" title={user.email}>
              {user.avatar ? (
                <img className="hero-user-avatar" src={user.avatar} alt={user.fullName} />
              ) : (
                <span>{user.initials || 'U'}</span>
              )}
            </div>
          ) : null}

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
      </header>

      <div className="workspace-layout">
        <aside className="app-sidebar" aria-label="Sidebar kiri">
          <div className="sidebar-brand-card">
            <span className="sidebar-brand-mark">{user?.initials || 'P'}</span>
            <div>
              <strong>{user ? user.fullName : 'Profile panel'}</strong>
              <p>{user ? user.email : 'Login untuk membuka data profile'}</p>
            </div>
          </div>

          <div className="sidebar-menu">
            {sidebarMenu.map((item) => (
              <button
                key={item.key}
                type="button"
                className={item.active ? 'sidebar-nav-item active' : 'sidebar-nav-item'}
                onClick={item.onClick}
              >
                <span className="sidebar-nav-icon">
                  <AppIcon name={item.key} />
                </span>
                <span className="sidebar-nav-text">
                  <strong>{item.label}</strong>
                  <small>{item.helper}</small>
                </span>
              </button>
            ))}
          </div>

          {user ? (
            <div className="sidebar-user-card">
              {user.avatar ? (
                <img className="sidebar-user-photo" src={user.avatar} alt={user.fullName} />
              ) : (
                <span className="sidebar-user-photo sidebar-user-fallback">
                  {user.initials || 'U'}
                </span>
              )}
              <div className="sidebar-user-copy">
                <strong>{user.fullName}</strong>
                <span>{formatMemberSince(user.memberSince)}</span>
              </div>
            </div>
          ) : (
            <div className="sidebar-tip">
              <span className="sidebar-tip-label">Akses profile</span>
              <strong>Sidebar kiri akan menampilkan data akun setelah login.</strong>
              <p>Klik ikon Google di kanan atas untuk memulai sesi.</p>
            </div>
          )}

          <div className="sidebar-profile-meta">
            <div className="sidebar-metric">
              <span>Total tugas</span>
              <strong>{todos.length}</strong>
            </div>
            <div className="sidebar-metric">
              <span>Progress</span>
              <strong>{progress}%</strong>
            </div>
            <div className="sidebar-metric">
              <span>Aktif</span>
              <strong>{remainingTodos}</strong>
            </div>
            <div className="sidebar-metric">
              <span>Selesai</span>
              <strong>{completedTodos}</strong>
            </div>
          </div>

          {user ? (
            <div className="sidebar-actions">
              {profileActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  className={action.variant === 'primary' ? 'sidebar-action' : 'ghost sidebar-action'}
                  onClick={action.onClick}
                >
                  {action.label}
                </button>
              ))}
              <button type="button" className="ghost sidebar-action" onClick={handleLogout}>
                Logout
              </button>
            </div>
          ) : null}
        </aside>

        <section className="workspace-main">
          {currentPage === 'profile' ? (
            <section className="profile-hero">
              <article className="profile-hero-card">
                <p className="eyebrow">Halaman Profile</p>
                <h1>Data Pengguna</h1>
                <p className="intro">
                  Informasi akun ini terhubung langsung dengan sesi login Google yang sedang aktif.
                </p>
              </article>

              <article className="profile-summary-card">
                <span className="profile-summary-label">Status sesi</span>
                <strong>{user ? 'Aktif' : 'Belum login'}</strong>
                <small>{user ? user.email : 'Masuk dengan Google untuk melihat data pengguna.'}</small>
              </article>
            </section>
          ) : (
            <section className="hero">
              <div className="hero-copy">
                <h1>Pencatatan Tugas</h1>
                <p className="intro">
                  Gunakan untuk mencatat tugas agar tidak terlewat. Login Google hanya dipakai untuk menyimpan data tugas sesuai akun Anda.
                </p>
                <div className="hero-highlights">
                  <span className="highlight-pill">Backend API</span>
                  <span className="highlight-pill">Neon PostgreSQL</span>
                  <span className="highlight-pill">Realtime fetch</span>
                </div>
              </div>

              <div className="hero-card">
                <p className="hero-card-label">
                  {user ? `Progress akun ${user.fullName}` : 'Progress '}
                </p>
                <p className="hero-card-value">{progress}%</p>
                <div className="progress-bar">
                  <span style={{ width: `${progress}%` }} />
                </div>
                <small>
                  {completedTodos} selesai dari {todos.length} tugas
                </small>
              </div>
            </section>
          )}

          {message ? <p className="info-state">{message}</p> : null}
          {error ? <p className="error-state">{error}</p> : null}

          {!user ? (
            <section className="auth-layout auth-layout-single">
              <article className="panel profile-panel">
                <div className="panel-head">
                  <div>
                    <h2>Profile</h2>
                    <p className="panel-note">
                      Login Google tersedia di kanan atas. Setelah login, profile dan data tugas
                      akun Anda akan muncul di sini.
                    </p>
                  </div>
                </div>

                <div className="profile-empty">
                  <span className="profile-avatar">G</span>
                  <div>
                    <strong>Belum ada sesi aktif</strong>
                    <p>
                      Masuk dengan ikon Google di kanan atas untuk membuka halaman tugas dan
                      profile pribadi.
                    </p>
                  </div>
                </div>
              </article>
            </section>
          ) : (
            <>
              {currentPage === 'profile' ? (
                <section className="profile-page">
                  <article className="panel profile-page-panel">
                    <div className="panel-head">
                      <div>
                        <h2>Identitas Pengguna</h2>
                        <p className="panel-note">Halaman ini khusus menampilkan data akun Google yang sedang aktif.</p>
                      </div>
                      <span className="badge">{user.initials || 'U'}</span>
                    </div>

                    <div className="profile-card profile-page-card">
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

                    <div className="profile-meta profile-page-meta">
                      <div className="profile-meta-item">
                        <span>Nama lengkap</span>
                        <strong>{user.fullName}</strong>
                      </div>
                      <div className="profile-meta-item">
                        <span>Email</span>
                        <strong>{user.email}</strong>
                      </div>
                      <div className="profile-meta-item">
                        <span>Bergabung</span>
                        <strong>{formatMemberSince(user.memberSince)}</strong>
                      </div>
                      <div className="profile-meta-item">
                        <span>Total tugas</span>
                        <strong>{todos.length}</strong>
                      </div>
                      <div className="profile-meta-item">
                        <span>Tugas aktif</span>
                        <strong>{remainingTodos}</strong>
                      </div>
                      <div className="profile-meta-item">
                        <span>Tugas selesai</span>
                        <strong>{completedTodos}</strong>
                      </div>
                    </div>
                  </article>
                </section>
              ) : (
                <>
                  <section className="dashboard-home">
                    <div className="dashboard-main-column">
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

                      <article className="panel timeline-panel">
                        <div className="panel-head">
                          <div>
                            <h2>Timeline Deadline</h2>
                            <p className="panel-note">
                              Tugas dengan deadline paling dekat untuk akun yang sedang login.
                            </p>
                          </div>
                          <span className="badge">{upcomingTodos.length} terdekat</span>
                        </div>

                        {upcomingTodos.length ? (
                          <div className="deadline-timeline">
                            {upcomingTodos.map((todo) => {
                              const deadlineStatus = getDeadlineStatus(todo.deadline, todo.done)

                              return (
                                <article key={`deadline-${todo.id}`} className="deadline-card">
                                  <div className="deadline-card-copy">
                                    <strong>{todo.text}</strong>
                                    <span>{formatDeadlineTime(todo.deadline)}</span>
                                  </div>
                                  <div className="deadline-card-meta">
                                    <span className="tag">{todo.category || 'Umum'}</span>
                                    <span className={`status-pill ${deadlineStatus.tone}`}>
                                      {deadlineStatus.label}
                                    </span>
                                  </div>
                                </article>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="empty-state">
                            Belum ada deadline aktif. Tambahkan tugas dengan tanggal agar muncul di kalender.
                          </p>
                        )}
                      </article>

                      <article className="panel">
                        <div className="panel-head">
                          <div>
                            <h2>Tugas Anda</h2>
                            <p className="panel-note">
                              Semua data tugas disimpan berdasarkan akun Google yang sedang login.
                            </p>
                          </div>
                          <div className="task-panel-head-actions">
                            {selectedCalendarDate ? (
                              <button type="button" className="ghost selected-date-pill" onClick={() => setSelectedCalendarDate('')}>
                                {selectedCalendarDate}
                              </button>
                            ) : null}
                            <span className="badge">{remainingTodos} tersisa</span>
                          </div>
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
                    </div>

                    <aside className="dashboard-side-column">
                      <section className="stats-row stats-row-side">
                        <article className="stat-box stat-box-total">
                          <span>Deadline</span>
                          <strong>{upcomingTodos.length}</strong>
                        </article>
                        <article className="stat-box stat-box-done">
                          <span>Aktif</span>
                          <strong>{remainingTodos}</strong>
                        </article>
                      </section>

                      <article className="panel calendar-panel">
                        <div className="panel-head calendar-head">
                          <div>
                            <h2>Kalender</h2>
                            <p className="panel-note">
                              Tanggal yang punya deadline akan ditandai di bawah.
                            </p>
                          </div>
                          <div className="calendar-actions">
                            <button type="button" className="ghost calendar-action" onClick={resetCalendarMonth}>
                              Hari ini
                            </button>
                            <button type="button" className="ghost calendar-icon-button" onClick={() => changeCalendarMonth(-1)}>
                              {'<'}
                            </button>
                            <button type="button" className="ghost calendar-icon-button" onClick={() => changeCalendarMonth(1)}>
                              {'>'}
                            </button>
                          </div>
                        </div>

                        <div className="calendar-frame">
                          <div className="calendar-month-title">
                            <strong>{formatMonthLabel(calendarMonth)}</strong>
                            <span>{selectedCalendarDate ? `Filter ${selectedCalendarDate}` : `${upcomingTodos.length} deadline aktif`}</span>
                          </div>

                          <div className="calendar-weekdays">
                            {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((day) => (
                              <span key={day}>{day}</span>
                            ))}
                          </div>

                          <div className="calendar-grid">
                            {calendarCells.map((cell) => (
                              <button
                                key={cell.key}
                                type="button"
                                className={
                                  cell.isCurrentMonth
                                    ? cell.isSelected
                                      ? `calendar-cell current selected tone-${cell.tone}`
                                      : `calendar-cell current tone-${cell.tone}`
                                    : `calendar-cell tone-${cell.tone}`
                                }
                                onClick={() => handleCalendarDateSelect(cell.key)}
                              >
                                <span className="calendar-day-number">{cell.day}</span>
                                {cell.items.length ? (
                                  <div className="calendar-cell-tasks">
                                    {cell.items.slice(0, 2).map((todo) => (
                                      <span key={`calendar-${todo.id}`} className="calendar-task-pill">
                                        {todo.text}
                                      </span>
                                    ))}
                                  </div>
                                ) : null}
                                {cell.items.length ? (
                                  <div className="calendar-tooltip" role="tooltip">
                                    <strong>{formatDeadline(cell.date)}</strong>
                                    <div className="calendar-tooltip-list">
                                      {cell.items.map((todo) => {
                                        const deadlineStatus = getDeadlineStatus(todo.deadline, todo.done)

                                        return (
                                          <div key={`tooltip-${todo.id}`} className="calendar-tooltip-item">
                                            <div className="calendar-tooltip-copy">
                                              <span>{todo.text}</span>
                                              <small>{todo.category || 'Umum'}</small>
                                            </div>
                                            <span className={`status-pill ${deadlineStatus.tone}`}>
                                              {deadlineStatus.label}
                                            </span>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                ) : null}
                              </button>
                            ))}
                          </div>
                        </div>
                      </article>
                    </aside>
                  </section>
                </>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  )
}

export default App
