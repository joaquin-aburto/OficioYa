'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import '../login/login.css' // mismos estilos base que el login
import './register.css' // extras del registro

type Tipo = 'cliente' | 'trabajador'
type Oficio = { id: number; nombre: string; icono: string | null }

// Debe coincidir con las llaves que usan los dashboards
const STORAGE_KEY: Record<Tipo, string> = {
  cliente: 'oficioya_usuario',
  trabajador: 'oficioya_trabajador',
}
const DESTINO: Record<Tipo, string> = {
  cliente: '/cliente/dashboard',
  trabajador: '/trabajador/dashboard',
}

const OPCIONES: { id: Tipo; emoji: string; titulo: string; detalle: string }[] = [
  { id: 'cliente', emoji: '🏠', titulo: 'Necesito un profesional', detalle: 'Resuelve problemas en tu casa' },
  { id: 'trabajador', emoji: '🛠️', titulo: 'Soy profesional', detalle: 'Recibe solicitudes y cotiza' },
]

const EMOJI_OFICIO: [string, string][] = [
  ['plom', '🚰'], ['electr', '💡'], ['cerraj', '🔑'], ['pint', '🎨'], ['carpint', '🪚'],
  ['alba', '🧱'], ['aire', '❄️'], ['jardin', '🌿'], ['limp', '🧽'], ['herr', '⚙️'],
]
function emojiDe(o: Oficio) {
  if (o.icono && !o.icono.startsWith('http') && !o.icono.startsWith('/')) return o.icono
  const n = o.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return EMOJI_OFICIO.find(([k]) => n.includes(k))?.[1] ?? '🛠️'
}

export default function RegisterPage() {
  const router = useRouter()

  const [tipo, setTipo] = useState<Tipo>('cliente')
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [telefono, setTelefono] = useState('')
  const [contrasena, setContrasena] = useState('')

  // Solo profesionales
  const [oficios, setOficios] = useState<Oficio[] | null>(null)
  const [errorOficios, setErrorOficios] = useState(false)
  const [intento, setIntento] = useState(0)
  const [seleccion, setSeleccion] = useState<number[]>([])
  const [anos, setAnos] = useState('')
  const [descripcion, setDescripcion] = useState('')

  const [mensaje, setMensaje] = useState('')
  const [cargando, setCargando] = useState(false)

  // Los oficios se piden solo cuando alguien elige "Soy profesional"
  useEffect(() => {
    if (tipo !== 'trabajador' || oficios !== null) return
    let vivo = true
    fetch('/api/especialidades')
      .then((r) => r.json())
      .then((d) => vivo && (setOficios(d.especialidades ?? []), setErrorOficios(false)))
      .catch(() => vivo && setErrorOficios(true))
    return () => {
      vivo = false
    }
  }, [tipo, oficios, intento])

  function alternarOficio(id: number) {
    setSeleccion((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMensaje('')

    if (contrasena.length < 8) return setMensaje('La contraseña debe tener al menos 8 caracteres.')
    if (tipo === 'trabajador' && seleccion.length === 0) {
      return setMensaje('Elige al menos un oficio para poder recibir solicitudes.')
    }

    setCargando(true)
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo,
          nombre,
          correo,
          telefono,
          contrasena,
          ...(tipo === 'trabajador'
            ? { especialidadIds: seleccion, anosExperiencia: anos, descripcion }
            : {}),
        }),
      })
      const data = await response.json()

      if (response.ok) {
        // Inicia sesión directamente y lleva a su panel
        localStorage.setItem(STORAGE_KEY[tipo], JSON.stringify({ id: data.user.id, nombre: data.user.nombre }))
        router.push(DESTINO[tipo])
        return
      }
      setMensaje(data.error || 'No se pudo crear la cuenta.')
    } catch {
      setMensaje('No pudimos conectar con el servidor. Intenta nuevamente.')
    } finally {
      setCargando(false)
    }
  }

  const esTrabajador = tipo === 'trabajador'

  return (
    <main className="login-page register-page">
      <section className="login-panel" aria-labelledby="register-title">
        <Link className="login-brand" href="/" aria-label="Volver a OficioYa">
          <img
            src="https://jqhlnwusmwtqxxvtitht.supabase.co/storage/v1/object/public/ImagesOficioYa/OficioYa/Logo/LogoOficioYa-Log.png"
            alt="OficioYa"
            className="brand-logo"
          />
          <span>OficioYa</span>
        </Link>

        <div className="login-copy">
          <p className="eyebrow">Únete a OficioYa</p>
          <h1 id="register-title">Crea tu cuenta</h1>
          <p>
            {esTrabajador
              ? 'Regístrate como profesional y empieza a recibir solicitudes de tu zona.'
              : 'Regístrate gratis y encuentra ayuda profesional para tu casa.'}
          </p>
        </div>

        {/* Selector de tipo de cuenta (fuera del <form> para que no herede sus estilos) */}
        <div className="role-picker" role="radiogroup" aria-label="Tipo de cuenta">
          {OPCIONES.map((o) => (
            <label key={o.id} className={`role-option ${tipo === o.id ? 'on' : ''}`}>
              <input
                type="radio"
                name="tipo"
                value={o.id}
                checked={tipo === o.id}
                onChange={() => {
                  setTipo(o.id)
                  setMensaje('')
                }}
              />
              <span className="role-emoji" aria-hidden="true">{o.emoji}</span>
              <strong>{o.titulo}</strong>
              <span className="role-detail">{o.detalle}</span>
            </label>
          ))}
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="nombre">Nombre completo</label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Tu nombre"
            autoComplete="name"
            required
          />

          <label htmlFor="correo">Correo electrónico</label>
          <input
            id="correo"
            name="correo"
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="tu@correo.com"
            autoComplete="email"
            required
          />

          <label htmlFor="telefono">Teléfono {esTrabajador ? '(los clientes te llamarán a este número)' : '(opcional)'}</label>
          <input
            id="telefono"
            name="telefono"
            type="tel"
            inputMode="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="10 dígitos"
            autoComplete="tel"
            required={esTrabajador}
          />

          <label htmlFor="contrasena">Contraseña</label>
          <input
            id="contrasena"
            name="contrasena"
            type="password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
            minLength={8}
            required
          />

          {esTrabajador && (
            <>
              <fieldset className="oficio-fieldset">
                <legend>¿Qué oficios ofreces?</legend>
                {oficios === null && !errorOficios && <p className="reg-hint">Cargando oficios…</p>}
                {errorOficios && (
                  <p className="reg-hint reg-hint-error">
                    No pudimos cargar los oficios.{' '}
                    <button type="button" className="reg-link" onClick={() => {
                        setErrorOficios(false)
                        setIntento((n) => n + 1)
                      }}>
                      Reintentar
                    </button>
                  </p>
                )}
                {oficios?.length === 0 && (
                  <p className="reg-hint">Todavía no hay oficios registrados en la base de datos.</p>
                )}
                <div className="oficio-chips">
                  {oficios?.map((o) => {
                    const on = seleccion.includes(o.id)
                    return (
                      <label key={o.id} className={`oficio-chip ${on ? 'on' : ''}`}>
                        <input type="checkbox" checked={on} onChange={() => alternarOficio(o.id)} />
                        <span aria-hidden="true">{emojiDe(o)}</span> {o.nombre}
                      </label>
                    )
                  })}
                </div>
              </fieldset>

              <label htmlFor="anos">Años de experiencia (opcional)</label>
              <input
                id="anos"
                name="anos"
                type="number"
                inputMode="numeric"
                min={0}
                max={60}
                value={anos}
                onChange={(e) => setAnos(e.target.value)}
                placeholder="Ej. 8"
              />

              <label htmlFor="descripcion">Cuéntale a tus clientes quién eres (opcional)</label>
              <textarea
                id="descripcion"
                name="descripcion"
                rows={3}
                maxLength={500}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Tu experiencia, en qué trabajos eres mejor, zonas donde trabajas…"
              />
            </>
          )}

          <button type="submit" disabled={cargando}>
            {cargando ? 'Creando cuenta...' : esTrabajador ? 'Crear cuenta de profesional' : 'Crear mi cuenta'}
          </button>
        </form>

        {mensaje && <p className="login-message" role="alert">{mensaje}</p>}

        {esTrabajador && (
          <p className="reg-hint reg-verif">
            Revisaremos tu perfil para darte la insignia de <strong>verificado</strong>. Mientras tanto ya puedes cotizar.
          </p>
        )}

        <p className="signup-text">
          ¿Ya tienes cuenta? <Link href="/auth/login">Inicia sesión</Link>
        </p>
      </section>

      <aside className="login-aside" aria-label="Beneficios de OficioYa">
        <div className="aside-content">
          <span className="aside-badge">OficioYa</span>
          {esTrabajador ? (
            <>
              <h2>Consigue clientes cerca de ti, sin salir a buscarlos.</h2>
              <p>Recibe solicitudes de tus oficios, cotiza con tu precio y cobra por tu trabajo.</p>
              <div className="aside-points">
                <span>Solicitudes de tu zona</span>
                <span>Tú fijas tu precio</span>
              </div>
            </>
          ) : (
            <>
              <h2>Soluciones confiables, justo cuando las necesitas.</h2>
              <p>Conecta con profesionales verificados de tu zona y resuelve cada pendiente con tranquilidad.</p>
              <div className="aside-points">
                <span>Profesionales verificados</span>
                <span>Atención cerca de ti</span>
              </div>
            </>
          )}
        </div>
      </aside>
    </main>
  )
}