'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import './login.css'

type Tipo = 'cliente' | 'trabajador' | 'admin'

// Mismas llaves que ya usan los tres dashboards
const STORAGE_KEY: Record<Tipo, string> = {
  cliente: 'oficioya_usuario',
  trabajador: 'oficioya_trabajador',
  admin: 'oficioya_admin',
}
const DESTINO: Record<Tipo, string> = {
  cliente: '/cliente/dashboard',
  trabajador: '/trabajador/dashboard',
  admin: '/admin/dashboard',
}



export default function LoginPage() {
  const router = useRouter()
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [cargando, setCargando] = useState(false)
   const [mostrarContrasena, setMostrarContrasena] = useState(false);

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
        const tipo = data.tipo as Tipo
        // Por si había una sesión de otro tipo de cuenta abierta en este navegador
        Object.values(STORAGE_KEY).forEach((k) => localStorage.removeItem(k))
        localStorage.setItem(
          STORAGE_KEY[tipo],
          JSON.stringify(tipo === 'admin' ? { correo: data.user.correo } : { id: data.user.id, nombre: data.user.nombre })
        )
        router.push(DESTINO[tipo])
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
<div className="password-field">
  <input
    id="contrasena"
    name="contrasena"
    type={mostrarContrasena ? "text" : "password"}
    value={contrasena}
    onChange={(event) => setContrasena(event.target.value)}
    placeholder="Tu contraseña"
    autoComplete="current-password"
    required
  />
  <button
    type="button"
    className="toggle-password"
    onClick={() => setMostrarContrasena((prev) => !prev)}
    aria-label={mostrarContrasena ? "Ocultar contraseña" : "Mostrar contraseña"}
    aria-pressed={mostrarContrasena}
  >
    {mostrarContrasena ? (
      // Ojo tachado (ocultar)
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    ) : (
      // Ojo (mostrar)
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )}
  </button>
</div>

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