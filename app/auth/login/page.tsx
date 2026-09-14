'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import './login.css'

export default function LoginPage() {
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
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, contrasena }),
      })
      const data = await response.json()

      if (response.ok) {
        router.push('../../pruebaB')
        return
      }

      setMensaje(data.error || data.message || 'No se pudo iniciar sesión.')
    } catch {
      setMensaje('No pudimos conectar con el servidor. Intenta nuevamente.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <Link className="login-brand" href="/" aria-label="Volver a OficioYa">
          <img
            src="https://jqhlnwusmwtqxxvtitht.supabase.co/storage/v1/object/public/ImagesOficioYa/OficioYa/Logo/LogoOficioYa-Log.png"
            alt="OficioYa"
            className="brand-logo"
          />
          <span>OficioYa</span>
        </Link>

        <div className="login-copy">
          <p className="eyebrow">Tu comunidad de confianza</p>
          <h1 id="login-title">Bienvenido de nuevo</h1>
          <p>Ingresa para encontrar ayuda profesional cerca de ti.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="correo">Correo electrónico</label>
          <input
            id="correo"
            name="correo"
            type="email"
            value={correo}
            onChange={(event) => setCorreo(event.target.value)}
            placeholder="tu@correo.com"
            autoComplete="email"
            required
          />

          <div className="password-row">
            <label htmlFor="contrasena">Contraseña</label>
            <Link href="/auth/login/recoverPassword">¿La olvidaste?</Link>
          </div>
          <input
            id="contrasena"
            name="contrasena"
            type="password"
            value={contrasena}
            onChange={(event) => setContrasena(event.target.value)}
            placeholder="Tu contraseña"
            autoComplete="current-password"
            required
          />

          <button type="submit" disabled={cargando}>
            {cargando ? 'Ingresando...' : 'Entrar a mi cuenta'}
          </button>
        </form>

        {mensaje && <p className="login-message" role="status">{mensaje}</p>}

        <p className="signup-text">
          ¿Todavía no tienes cuenta? <Link href="/auth/register">Crea una gratis</Link>
        </p>
      </section>

      <aside className="login-aside" aria-label="Beneficios de OficioYa">
        <div className="aside-content">
          <span className="aside-badge">OficioYa</span>
          <h2>Soluciones confiables, justo cuando las necesitas.</h2>
          <p>Conecta con profesionales verificados de tu zona y resuelve cada pendiente con tranquilidad.</p>
          <div className="aside-points">
            <span>Profesionales verificados</span>
            <span>Atención cerca de ti</span>
          </div>
        </div>
      </aside>
    </main>
  )
}
