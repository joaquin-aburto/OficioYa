'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import '../../auth/login/login.css'

const STORAGE_KEY = 'oficioya_admin'

export default function AdminLoginPage() {
  const router = useRouter()
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [cargando, setCargando] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMensaje('')
    setCargando(true)

    try {
      const response = await fetch('/api/auth/login-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, contrasena }),
      })
      const data = await response.json()

      if (response.ok) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ correo: data.user.correo }))
        router.push('/admin/dashboard')
        return
      }
      setMensaje(data.error || 'No se pudo iniciar sesión.')
    } catch {
      setMensaje('No pudimos conectar con el servidor. Intenta nuevamente.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <main className="login-page admin-login-page">
      <section className="login-panel" aria-labelledby="admin-title">
        <div className="login-brand">
          <span className="admin-badge" aria-hidden="true">🛡️</span>
          <span>OficioYa Admin</span>
        </div>

        <div className="login-copy">
          <h1 id="admin-title">Panel de administración</h1>
          <p>Acceso restringido. Inicia sesión con tu cuenta de administrador.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="correo">Correo electrónico</label>
          <input
            id="correo"
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="admin@oficioya.com"
            autoComplete="username"
            required
          />

          <label htmlFor="contrasena">Contraseña</label>
          <input
            id="contrasena"
            type="password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            placeholder="Tu contraseña"
            autoComplete="current-password"
            required
          />

          <button type="submit" disabled={cargando}>
            {cargando ? 'Ingresando...' : 'Entrar al panel'}
          </button>
        </form>

        {mensaje && <p className="login-message" role="status">{mensaje}</p>}
      </section>
    </main>
  )
}