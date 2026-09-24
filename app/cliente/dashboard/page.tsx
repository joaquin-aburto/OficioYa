'use client'

import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import './dashboard.css'

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

type Urgencia = 'Normal' | 'Urgente'

type Especialidad = { id: number; nombre: string; descripcion: string | null; icono: string | null }
type Direccion = {
  id: number
  alias: string | null
  calle: string
  colonia: string | null
  ciudad: string | null
}
type TrabajadorMini = {
  id: number
  nombre: string
  fotoPerfil: string | null
  verificado: boolean
  calificacion: number | null
  totalResenas: number
}
type Cotizacion = {
  id: number
  solicitudId: number
  monto: number
  comentario: string | null
  estado: 'Enviada' | 'Aceptada' | 'Rechazada'
  fechaEnvio: string
  trabajador: TrabajadorMini
}
type Solicitud = {
  id: number
  descripcion: string
  urgencia: Urgencia
  estado: string
  fechaCreacion: string
  fechaDeseada: string | null
  especialidad: { id: number; nombre: string; icono: string | null }
  direccion: { alias: string | null; calle: string; colonia: string | null }
  trabajadorAsignado: { id: number; nombre: string; fotoPerfil: string | null; telefono: string | null } | null
  yaCalificada: boolean
  cotizaciones: Cotizacion[]
}
type Profesional = {
  id: number
  nombre: string
  fotoPerfil: string | null
  descripcion: string | null
  anosExperiencia: number | null
  verificado: boolean
  especialidades: { id: number; nombre: string }[]
  precioDesde: number | null
  calificacion: number | null
  totalResenas: number
}
type Notificacion = {
  id: number
  tipo: string
  mensaje: string
  leido: boolean
  fechaCreacion: string
}
type DashboardData = {
  usuario: { id: number; nombre: string; fotoPerfil: string | null }
  solicitudes: Solicitud[]
  direcciones: Direccion[]
  especialidades: Especialidad[]
  notificaciones: Notificacion[]
  profesionales: Profesional[]
}

/* ------------------------------------------------------------------ */
/* Constantes y utilidades                                             */
/* ------------------------------------------------------------------ */

// Debe coincidir con lo que guardes en el login (ver instrucciones)
const STORAGE_KEY = 'oficioya_usuario'

const PASOS = ['Pendiente', 'Cotizada', 'Aceptada', 'EnCurso', 'Terminada', 'Calificada']
const ACTIVAS = ['Pendiente', 'Cotizada', 'Aceptada', 'EnCurso']
const ETIQUETA_ESTADO: Record<string, string> = {
  Pendiente: 'Esperando cotizaciones',
  Cotizada: 'Ya hay cotizaciones',
  Aceptada: 'Profesional confirmado',
  EnCurso: 'Trabajo en curso',
  Terminada: 'Trabajo terminado',
  Calificada: 'Calificado',
  Rechazada: 'Rechazada',
  Cancelada: 'Cancelada',
}

const EMOJI_OFICIO: [string, string][] = [
  ['plom', '🚰'],
  ['electr', '💡'],
  ['cerraj', '🔑'],
  ['pint', '🎨'],
  ['carpint', '🪚'],
  ['alba', '🧱'],
  ['aire', '❄️'],
  ['jardin', '🌿'],
  ['limp', '🧽'],
  ['herr', '⚙️'],
]

// Palabras que la gente usa para describir un problema → tipo de oficio
const PALABRAS_CLAVE: [string, string[]][] = [
  ['plom', ['fuga', 'gotea', 'tuberia', 'drenaje', 'lavabo', 'excusado', 'inodoro', 'tinaco', 'boiler', 'calentador', 'regadera', 'tapad', 'sin agua', 'coladera', 'fregadero']],
  ['electr', ['luz', 'foco', 'apag', 'corto', 'contacto', 'cable', 'interruptor', 'breaker', 'chispa', 'lampara']],
  ['cerraj', ['cerradura', 'chapa', 'candado', 'puerta trabada', 'me quede afuera']],
  ['pint', ['pintar', 'pintura', 'humedad', 'salitre', 'descarapel']],
  ['carpint', ['madera', 'mueble', 'closet', 'ropero', 'cajon', 'cocina integral']],
  ['alba', ['pared', 'grieta', 'azulejo', 'piso', 'techo', 'loseta', 'cemento', 'barda']],
  ['aire', ['minisplit', 'clima', 'aire acondicionado', 'no enfria']],
  ['jardin', ['pasto', 'jardin', 'poda', 'planta']],
  ['limp', ['limpieza', 'limpiar']],
]

const quitarAcentos = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

function adivinarEspecialidad(texto: string, lista: Especialidad[]): number | null {
  const t = quitarAcentos(texto)
  for (const [clave, palabras] of PALABRAS_CLAVE) {
    if (palabras.some((p) => t.includes(p))) {
      const esp = lista.find((e) => quitarAcentos(e.nombre).includes(clave))
      if (esp) return esp.id
    }
  }
  return null
}

function emojiDe(nombre: string, icono?: string | null) {
  if (icono && !icono.startsWith('http') && !icono.startsWith('/')) return icono
  const n = quitarAcentos(nombre)
  return EMOJI_OFICIO.find(([k]) => n.includes(k))?.[1] ?? '🛠️'
}

const dinero = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)

const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })

function hace(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.round(h / 24)
  return d === 1 ? 'ayer' : `hace ${d} días`
}

function saludo() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

/* ------------------------------------------------------------------ */
/* Piezas pequeñas                                                     */
/* ------------------------------------------------------------------ */

const ICONOS: Record<string, ReactNode> = {
  home: <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10" />,
  search: <><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></>,
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  quote: <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />,
  bell: <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />,
  pin: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4" />,
  out: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  phone: <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.4-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />,
  close: <path d="M18 6L6 18M6 6l12 12" />,
}

function Icon({ name, size = 18 }: { name: keyof typeof ICONOS; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONOS[name]}
    </svg>
  )
}

function Avatar({ nombre, foto, size = 40 }: { nombre: string; foto: string | null; size?: number }) {
  const iniciales = nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
  return foto ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="avatar" src={foto} alt="" style={{ width: size, height: size }} />
  ) : (
    <span className="avatar avatar-initials" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {iniciales || '?'}
    </span>
  )
}

function Estrellas({ valor, total }: { valor: number | null; total: number }) {
  if (valor === null) return <span className="rating rating-nuevo">Sin reseñas aún</span>
  return (
    <span className="rating" title={`${valor.toFixed(1)} de 5`}>
      <span className="rating-star" aria-hidden="true">★</span>
      <strong>{valor.toFixed(1)}</strong>
      <span className="rating-count">({total})</span>
    </span>
  )
}

function ProgresoSolicitud({ estado }: { estado: string }) {
  if (estado === 'Cancelada' || estado === 'Rechazada') {
    return <div className="progress progress-off" aria-label={ETIQUETA_ESTADO[estado]} />
  }
  const idx = PASOS.indexOf(estado)
  return (
    <div className="progress" role="img" aria-label={`Paso ${idx + 1} de ${PASOS.length}: ${ETIQUETA_ESTADO[estado]}`}>
      {PASOS.map((p, i) => (
        <span key={p} className={i <= idx ? 'on' : ''} />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

type BorradorSolicitud = { especialidadId: number | null; urgencia: Urgencia; descripcion: string }

export default function ClienteDashboardPage() {
  const router = useRouter()

  const [usuarioId, setUsuarioId] = useState<number | null>(null)
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)

  const [tab, setTab] = useState<'activas' | 'historial'>('activas')
  const [filtroEsp, setFiltroEsp] = useState<number | null>(null)
  const [problema, setProblema] = useState('')
  const [borrador, setBorrador] = useState<BorradorSolicitud | null>(null)
  const [calificando, setCalificando] = useState<Solicitud | null>(null)
  const [toast, setToast] = useState('')
  const [ocupado, setOcupado] = useState(false)

  /* --- sesión mínima (localStorage). Reemplázala por cookie/sesión real --- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const id = raw ? Number(JSON.parse(raw).id) : NaN
      if (!id) {
        router.replace('/auth/login')
        return
      }
      setUsuarioId(id)
    } catch {
      router.replace('/auth/login')
    }
  }, [router])

  const cargar = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/cliente/dashboard?usuarioId=${id}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setData(json)
      setError('')
    } catch {
      setError('No pudimos cargar tu panel. Revisa tu conexión e intenta de nuevo.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    if (usuarioId) cargar(usuarioId)
  }, [usuarioId, cargar])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 3500)
    return () => clearTimeout(t)
  }, [toast])

  /* --- acciones contra la API --- */
  async function ejecutar(body: Record<string, unknown>, exito: string): Promise<boolean> {
    if (!usuarioId) return false
    setOcupado(true)
    try {
      const res = await fetch('/api/cliente/acciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuarioId, ...body }),
      })
      const json = await res.json()
      if (!res.ok) {
        setToast(json.error || 'No se pudo completar la acción.')
        return false
      }
      setToast(exito)
      await cargar(usuarioId)
      return true
    } catch {
      setToast('No pudimos conectar con el servidor.')
      return false
    } finally {
      setOcupado(false)
    }
  }

  function cerrarSesion() {
    localStorage.removeItem(STORAGE_KEY)
    router.push('/auth/login')
  }

  /* --- datos derivados --- */
  const solicitudes = data?.solicitudes ?? []
  const activas = useMemo(() => solicitudes.filter((s) => ACTIVAS.includes(s.estado)), [solicitudes])
  const historial = useMemo(() => solicitudes.filter((s) => !ACTIVAS.includes(s.estado)), [solicitudes])
  const cotizacionesPendientes = useMemo(
    () =>
      activas.flatMap((s) =>
        s.cotizaciones.filter((c) => c.estado === 'Enviada').map((c) => ({ cot: c, sol: s }))
      ),
    [activas]
  )
  const porCalificar = useMemo(
    () => solicitudes.filter((s) => s.estado === 'Terminada' && !s.yaCalificada),
    [solicitudes]
  )
  const terminadas = solicitudes.filter((s) => ['Terminada', 'Calificada'].includes(s.estado)).length
  const noLeidas = (data?.notificaciones ?? []).filter((n) => !n.leido).length

  const profesionales = useMemo(() => {
    const lista = data?.profesionales ?? []
    return filtroEsp ? lista.filter((p) => p.especialidades.some((e) => e.id === filtroEsp)) : lista
  }, [data, filtroEsp])

  const listaSolicitudes = tab === 'activas' ? activas : historial

  function abrirNuevaSolicitud(parcial: Partial<BorradorSolicitud> = {}) {
    if (!data) return
    const texto = parcial.descripcion ?? problema
    setBorrador({
      especialidadId: parcial.especialidadId ?? adivinarEspecialidad(texto, data.especialidades),
      urgencia: parcial.urgencia ?? 'Normal',
      descripcion: texto,
    })
  }

  /* --- estados de carga / error --- */
  if (cargando) {
    return (
      <div className="dash-estado" role="status">
        <span className="spinner" aria-hidden="true" />
        Cargando tu panel…
      </div>
    )
  }
  if (error || !data) {
    return (
      <div className="dash-estado">
        <p>{error || 'Algo salió mal.'}</p>
        <button className="btn btn-primary" onClick={() => usuarioId && cargar(usuarioId)}>
          Reintentar
        </button>
      </div>
    )
  }

  const primerNombre = data.usuario.nombre.split(' ')[0]

  return (
    <div className="dash">
      {/* ----------------------------- Barra lateral ----------------------------- */}
      <aside className="side">
        <Link href="/" className="side-brand" aria-label="OficioYa, inicio">
          <img
            src="https://jqhlnwusmwtqxxvtitht.supabase.co/storage/v1/object/public/ImagesOficioYa/OficioYa/Logo/LogoOficioYa-Log.png"
            alt=""
            className="side-logo"
          />
          <span>OficioYa</span>
        </Link>

        <nav className="side-nav" aria-label="Secciones">
          <a href="#inicio"><Icon name="home" /> Inicio</a>
          <a href="#cotizaciones">
            <Icon name="quote" /> Cotizaciones
            {cotizacionesPendientes.length > 0 && <b className="pill">{cotizacionesPendientes.length}</b>}
          </a>
          <a href="#solicitudes"><Icon name="list" /> Mis solicitudes</a>
          <a href="#profesionales"><Icon name="search" /> Profesionales</a>
          <a href="#direcciones"><Icon name="pin" /> Mis direcciones</a>
        </nav>

        <button className="side-out" onClick={cerrarSesion}>
          <Icon name="out" /> Cerrar sesión
        </button>
      </aside>

      {/* ----------------------------- Contenido ----------------------------- */}
      <div className="main">
        <header className="top">
          <p className="top-hello">
            {saludo()}, <strong>{primerNombre}</strong>
          </p>
          <div className="top-right">
            <a href="#notificaciones" className="bell" aria-label={`Notificaciones, ${noLeidas} sin leer`}>
              <Icon name="bell" />
              {noLeidas > 0 && <b className="pill pill-alert">{noLeidas}</b>}
            </a>
            <Avatar nombre={data.usuario.nombre} foto={data.usuario.fotoPerfil} size={38} />
          </div>
        </header>

        {/* Hero: describir el problema */}
        <section className="hero" id="inicio" aria-labelledby="hero-title">
          <h1 id="hero-title">¿Qué se descompuso en casa?</h1>
          <p className="hero-sub">Cuéntanos el problema y te conectamos con profesionales verificados de tu zona.</p>

          <form
            className="hero-form"
            onSubmit={(e: FormEvent) => {
              e.preventDefault()
              abrirNuevaSolicitud()
            }}
          >
            <label htmlFor="problema" className="sr-only">Describe tu problema</label>
            <input
              id="problema"
              value={problema}
              onChange={(e) => setProblema(e.target.value)}
              placeholder="Ej. La regadera gotea y el boiler no calienta"
              autoComplete="off"
            />
            <button type="submit" className="btn btn-accent">Pedir ayuda</button>
          </form>

          <div className="oficios" role="group" aria-label="Elige un tipo de oficio">
            {data.especialidades.map((e) => (
              <button
                key={e.id}
                className="oficio"
                onClick={() => abrirNuevaSolicitud({ especialidadId: e.id })}
              >
                <span className="oficio-emoji" aria-hidden="true">{emojiDe(e.nombre, e.icono)}</span>
                {e.nombre}
              </button>
            ))}
            {data.especialidades.length === 0 && (
              <p className="muted">Aún no hay oficios registrados en la base de datos.</p>
            )}
          </div>

          <button className="urgente" onClick={() => abrirNuevaSolicitud({ urgencia: 'Urgente' })}>
            <span className="urgente-dot" aria-hidden="true" />
            Tengo una urgencia (fuga, corto, cerradura)
          </button>
        </section>

        {/* Resumen */}
        <section className="stats" aria-label="Resumen de tu actividad">
          <div className="stat">
            <strong>{activas.length}</strong>
            <span>{activas.length === 1 ? 'solicitud activa' : 'solicitudes activas'}</span>
          </div>
          <div className={`stat ${cotizacionesPendientes.length ? 'stat-hot' : ''}`}>
            <strong>{cotizacionesPendientes.length}</strong>
            <span>por responder</span>
          </div>
          <div className={`stat ${porCalificar.length ? 'stat-hot' : ''}`}>
            <strong>{porCalificar.length}</strong>
            <span>por calificar</span>
          </div>
          <div className="stat">
            <strong>{terminadas}</strong>
            <span>{terminadas === 1 ? 'trabajo terminado' : 'trabajos terminados'}</span>
          </div>
        </section>

        <div className="cols">
          <div className="col-main">
            {/* Cotizaciones por responder */}
            <section id="cotizaciones" className="block" aria-labelledby="t-cot">
              <div className="block-head">
                <h2 id="t-cot">Cotizaciones por responder</h2>
              </div>

              {cotizacionesPendientes.length === 0 ? (
                <p className="vacio">
                  No tienes cotizaciones nuevas. Cuando un profesional te envíe una, aparecerá aquí para que la aceptes o la rechaces.
                </p>
              ) : (
                <ul className="cot-list">
                  {cotizacionesPendientes.map(({ cot, sol }) => (
                    <li key={cot.id} className="cot">
                      <div className="cot-who">
                        <Avatar nombre={cot.trabajador.nombre} foto={cot.trabajador.fotoPerfil} size={44} />
                        <div>
                          <p className="cot-name">
                            {cot.trabajador.nombre}
                            {cot.trabajador.verificado && (
                              <span className="verif" title="Profesional verificado"><Icon name="shield" size={14} /> Verificado</span>
                            )}
                          </p>
                          <Estrellas valor={cot.trabajador.calificacion} total={cot.trabajador.totalResenas} />
                          <p className="muted small">
                            Para: {sol.especialidad.nombre} · solicitud #{sol.id}
                          </p>
                        </div>
                      </div>
                      <div className="cot-price">
                        <strong>{dinero(cot.monto)}</strong>
                        <span className="muted small">{hace(cot.fechaEnvio)}</span>
                      </div>
                      {cot.comentario && <p className="cot-note">“{cot.comentario}”</p>}
                      <div className="cot-actions">
                        <button
                          className="btn btn-primary"
                          disabled={ocupado}
                          onClick={() => ejecutar({ accion: 'aceptarCotizacion', cotizacionId: cot.id }, 'Cotización aceptada. Avisamos al profesional.')}
                        >
                          Aceptar cotización
                        </button>
                        <button
                          className="btn btn-ghost"
                          disabled={ocupado}
                          onClick={() => ejecutar({ accion: 'rechazarCotizacion', cotizacionId: cot.id }, 'Cotización rechazada.')}
                        >
                          Rechazar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Por calificar */}
            {porCalificar.length > 0 && (
              <section className="block block-calificar" aria-labelledby="t-cal">
                <div className="block-head"><h2 id="t-cal">Cuéntanos cómo te fue</h2></div>
                <ul className="cal-list">
                  {porCalificar.map((s) => (
                    <li key={s.id}>
                      <span>
                        <strong>{s.especialidad.nombre}</strong> con {s.trabajadorAsignado?.nombre ?? 'tu profesional'}
                      </span>
                      <button className="btn btn-accent" onClick={() => setCalificando(s)}>Calificar servicio</button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Solicitudes */}
            <section id="solicitudes" className="block" aria-labelledby="t-sol">
              <div className="block-head">
                <h2 id="t-sol">Mis solicitudes</h2>
                <div className="tabs" role="tablist">
                  <button role="tab" aria-selected={tab === 'activas'} className={tab === 'activas' ? 'on' : ''} onClick={() => setTab('activas')}>
                    Activas ({activas.length})
                  </button>
                  <button role="tab" aria-selected={tab === 'historial'} className={tab === 'historial' ? 'on' : ''} onClick={() => setTab('historial')}>
                    Historial ({historial.length})
                  </button>
                </div>
              </div>

              {listaSolicitudes.length === 0 ? (
                <div className="vacio">
                  <p>
                    {tab === 'activas'
                      ? 'No tienes solicitudes activas. Describe tu problema arriba y empieza a recibir cotizaciones.'
                      : 'Aquí verás tus trabajos terminados y cancelados.'}
                  </p>
                  {tab === 'activas' && (
                    <button className="btn btn-primary" onClick={() => abrirNuevaSolicitud()}>
                      <Icon name="plus" size={16} /> Nueva solicitud
                    </button>
                  )}
                </div>
              ) : (
                <ul className="sol-list">
                  {listaSolicitudes.map((s) => {
                    const nuevas = s.cotizaciones.filter((c) => c.estado === 'Enviada').length
                    return (
                      <li key={s.id} className="sol">
                        <div className="sol-top">
                          <span className="sol-emoji" aria-hidden="true">{emojiDe(s.especialidad.nombre, s.especialidad.icono)}</span>
                          <div className="sol-title">
                            <h3>{s.especialidad.nombre}</h3>
                            <p className="muted small">
                              #{s.id} · creada el {fechaCorta(s.fechaCreacion)}
                              {s.fechaDeseada ? ` · para el ${fechaCorta(s.fechaDeseada)}` : ''}
                            </p>
                          </div>
                          {s.urgencia === 'Urgente' && <span className="tag tag-urgente">Urgente</span>}
                        </div>

                        <p className="sol-desc">{s.descripcion}</p>

                        <ProgresoSolicitud estado={s.estado} />
                        <p className="sol-estado">
                          <strong>{ETIQUETA_ESTADO[s.estado] ?? s.estado}</strong>
                          {nuevas > 0 && <span className="tag tag-hot">{nuevas} por responder</span>}
                        </p>

                        <p className="muted small sol-dir">
                          <Icon name="pin" size={14} /> {s.direccion.alias ? `${s.direccion.alias} · ` : ''}
                          {s.direccion.calle}
                          {s.direccion.colonia ? `, ${s.direccion.colonia}` : ''}
                        </p>

                        {s.trabajadorAsignado && (
                          <div className="sol-pro">
                            <Avatar nombre={s.trabajadorAsignado.nombre} foto={s.trabajadorAsignado.fotoPerfil} size={32} />
                            <span>{s.trabajadorAsignado.nombre}</span>
                            {s.trabajadorAsignado.telefono && ACTIVAS.includes(s.estado) && (
                              <a className="btn btn-ghost btn-sm" href={`tel:${s.trabajadorAsignado.telefono}`}>
                                <Icon name="phone" size={14} /> Llamar
                              </a>
                            )}
                          </div>
                        )}

                        {['Pendiente', 'Cotizada'].includes(s.estado) && (
                          <button
                            className="link-danger"
                            disabled={ocupado}
                            onClick={() => {
                              if (confirm('¿Cancelar esta solicitud? Las cotizaciones recibidas se descartarán.')) {
                                ejecutar({ accion: 'cancelarSolicitud', solicitudId: s.id }, 'Solicitud cancelada.')
                              }
                            }}
                          >
                            Cancelar solicitud
                          </button>
                        )}
                        {s.estado === 'Terminada' && !s.yaCalificada && (
                          <button className="btn btn-accent btn-sm" onClick={() => setCalificando(s)}>Calificar servicio</button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            {/* Profesionales */}
            <section id="profesionales" className="block" aria-labelledby="t-pro">
              <div className="block-head">
                <h2 id="t-pro">Profesionales verificados</h2>
              </div>

              <div className="chips" role="group" aria-label="Filtrar por oficio">
                <button className={filtroEsp === null ? 'on' : ''} onClick={() => setFiltroEsp(null)}>Todos</button>
                {data.especialidades.map((e) => (
                  <button key={e.id} className={filtroEsp === e.id ? 'on' : ''} onClick={() => setFiltroEsp(e.id)}>
                    {e.nombre}
                  </button>
                ))}
              </div>

              {profesionales.length === 0 ? (
                <p className="vacio">Todavía no hay profesionales verificados para este oficio en tu zona.</p>
              ) : (
                <ul className="pro-grid">
                  {profesionales.map((p) => (
                    <li key={p.id} className="pro">
                      <div className="pro-head">
                        <Avatar nombre={p.nombre} foto={p.fotoPerfil} size={52} />
                        <div>
                          <h3>{p.nombre}</h3>
                          <Estrellas valor={p.calificacion} total={p.totalResenas} />
                        </div>
                      </div>
                      <p className="pro-esp">{p.especialidades.map((e) => e.nombre).join(', ') || 'Oficios varios'}</p>
                      {p.descripcion && <p className="pro-desc">{p.descripcion}</p>}
                      <div className="pro-meta">
                        {p.anosExperiencia ? <span>{p.anosExperiencia} años de experiencia</span> : <span>Verificado</span>}
                        {p.precioDesde !== null && <span>Desde {dinero(p.precioDesde)}</span>}
                      </div>
                      <button
                        className="btn btn-ghost btn-block"
                        onClick={() => abrirNuevaSolicitud({ especialidadId: p.especialidades[0]?.id ?? null })}
                      >
                        Pedir cotización
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* ----------------------------- Columna lateral ----------------------------- */}
          <aside className="col-side">
            <section id="notificaciones" className="block block-side" aria-labelledby="t-not">
              <div className="block-head"><h2 id="t-not">Avisos</h2></div>
              {data.notificaciones.length === 0 ? (
                <p className="vacio">Sin avisos por ahora.</p>
              ) : (
                <ul className="not-list">
                  {data.notificaciones.map((n) => (
                    <li key={n.id} className={n.leido ? '' : 'nueva'}>
                      <p>{n.mensaje}</p>
                      <span className="muted small">{hace(n.fechaCreacion)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section id="direcciones" className="block block-side" aria-labelledby="t-dir">
              <div className="block-head"><h2 id="t-dir">Mis direcciones</h2></div>
              {data.direcciones.length === 0 ? (
                <p className="vacio">Agrega una dirección al crear tu primera solicitud.</p>
              ) : (
                <ul className="dir-list">
                  {data.direcciones.map((d) => (
                    <li key={d.id}>
                      <Icon name="pin" size={16} />
                      <div>
                        <strong>{d.alias || 'Dirección'}</strong>
                        <p className="muted small">
                          {d.calle}
                          {d.colonia ? `, ${d.colonia}` : ''}
                          {d.ciudad ? `, ${d.ciudad}` : ''}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
        </div>
      </div>

      {/* ----------------------------- Modales ----------------------------- */}
      {borrador && (
        <NuevaSolicitudModal
          borrador={borrador}
          especialidades={data.especialidades}
          direcciones={data.direcciones}
          ocupado={ocupado}
          onClose={() => setBorrador(null)}
          onSubmit={async (payload) => {
            const ok = await ejecutar(
              { accion: 'crearSolicitud', ...payload },
              'Solicitud enviada. Avisamos a los profesionales de tu zona.'
            )
            if (ok) {
              setBorrador(null)
              setProblema('')
              setTab('activas')
            }
          }}
        />
      )}

      {calificando && (
        <CalificarModal
          solicitud={calificando}
          ocupado={ocupado}
          onClose={() => setCalificando(null)}
          onSubmit={async (puntuacion, comentario) => {
            const ok = await ejecutar(
              { accion: 'calificar', solicitudId: calificando.id, puntuacion, comentario },
              'Gracias por tu calificación.'
            )
            if (ok) setCalificando(null)
          }}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Modal: nueva solicitud                                              */
/* ------------------------------------------------------------------ */

function NuevaSolicitudModal({
  borrador,
  especialidades,
  direcciones,
  ocupado,
  onClose,
  onSubmit,
}: {
  borrador: BorradorSolicitud
  especialidades: Especialidad[]
  direcciones: Direccion[]
  ocupado: boolean
  onClose: () => void
  onSubmit: (payload: Record<string, unknown>) => void
}) {
  const [especialidadId, setEspecialidadId] = useState<number | null>(borrador.especialidadId)
  const [descripcion, setDescripcion] = useState(borrador.descripcion)
  const [urgencia, setUrgencia] = useState<Urgencia>(borrador.urgencia)
  const [fechaDeseada, setFechaDeseada] = useState('')
  const [direccionId, setDireccionId] = useState<string>(direcciones[0] ? String(direcciones[0].id) : 'nueva')
  const [calle, setCalle] = useState('')
  const [colonia, setColonia] = useState('')
  const [ciudad, setCiudad] = useState('')
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function enviar(e: FormEvent) {
    e.preventDefault()
    if (!especialidadId) return setAviso('Elige qué tipo de profesional necesitas.')
    if (descripcion.trim().length < 10) return setAviso('Cuéntanos un poco más del problema (mínimo 10 caracteres).')
    if (direccionId === 'nueva' && !calle.trim()) return setAviso('Agrega la dirección donde se necesita el servicio.')
    setAviso('')

    onSubmit({
      especialidadId,
      descripcion,
      urgencia,
      fechaDeseada: fechaDeseada || null,
      ...(direccionId === 'nueva'
        ? { direccionNueva: { alias: 'Casa', calle, colonia, ciudad } }
        : { direccionId: Number(direccionId) }),
    })
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" role="dialog" aria-modal="true" aria-labelledby="m-title" onSubmit={enviar}>
        <div className="modal-head">
          <h2 id="m-title">Nueva solicitud</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <Icon name="close" />
          </button>
        </div>

        <fieldset className="field">
          <legend>¿Qué tipo de profesional necesitas?</legend>
          <div className="chips">
            {especialidades.map((e) => (
              <button
                type="button"
                key={e.id}
                className={especialidadId === e.id ? 'on' : ''}
                onClick={() => setEspecialidadId(e.id)}
              >
                {emojiDe(e.nombre, e.icono)} {e.nombre}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="field">
          <label htmlFor="m-desc">Cuéntanos qué pasa</label>
          <textarea
            id="m-desc"
            rows={4}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Desde cuándo pasa, dónde está el problema, si ya intentaste algo…"
          />
        </div>

        <fieldset className="field">
          <legend>¿Qué tan pronto lo necesitas?</legend>
          <div className="seg">
            <button type="button" className={urgencia === 'Normal' ? 'on' : ''} onClick={() => setUrgencia('Normal')}>
              Puedo esperar
            </button>
            <button type="button" className={urgencia === 'Urgente' ? 'on on-urgente' : ''} onClick={() => setUrgencia('Urgente')}>
              Es urgente
            </button>
          </div>
        </fieldset>

        <div className="field">
          <label htmlFor="m-fecha">Fecha que prefieres (opcional)</label>
          <input id="m-fecha" type="date" value={fechaDeseada} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setFechaDeseada(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="m-dir">¿Dónde es el trabajo?</label>
          <select id="m-dir" value={direccionId} onChange={(e) => setDireccionId(e.target.value)}>
            {direcciones.map((d) => (
              <option key={d.id} value={d.id}>
                {(d.alias ? d.alias + ' — ' : '') + d.calle}
              </option>
            ))}
            <option value="nueva">+ Agregar otra dirección</option>
          </select>
        </div>

        {direccionId === 'nueva' && (
          <div className="field field-grid">
            <input aria-label="Calle y número" placeholder="Calle y número" value={calle} onChange={(e) => setCalle(e.target.value)} />
            <input aria-label="Colonia" placeholder="Colonia" value={colonia} onChange={(e) => setColonia(e.target.value)} />
            <input aria-label="Ciudad" placeholder="Ciudad" value={ciudad} onChange={(e) => setCiudad(e.target.value)} />
          </div>
        )}

        {aviso && <p className="form-aviso" role="alert">{aviso}</p>}

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={ocupado}>
            {ocupado ? 'Enviando…' : 'Enviar solicitud'}
          </button>
        </div>
      </form>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Modal: calificar                                                    */
/* ------------------------------------------------------------------ */

function CalificarModal({
  solicitud,
  ocupado,
  onClose,
  onSubmit,
}: {
  solicitud: Solicitud
  ocupado: boolean
  onClose: () => void
  onSubmit: (puntuacion: number, comentario: string) => void
}) {
  const [puntos, setPuntos] = useState(0)
  const [comentario, setComentario] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form
        className="modal modal-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="c-title"
        onSubmit={(e) => {
          e.preventDefault()
          if (puntos) onSubmit(puntos, comentario)
        }}
      >
        <div className="modal-head">
          <h2 id="c-title">Califica el servicio</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <Icon name="close" />
          </button>
        </div>
        <p className="muted">
          {solicitud.especialidad.nombre} con {solicitud.trabajadorAsignado?.nombre ?? 'tu profesional'}
        </p>

        <div className="star-pick" role="radiogroup" aria-label="Calificación">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              type="button"
              key={n}
              role="radio"
              aria-checked={puntos === n}
              aria-label={`${n} ${n === 1 ? 'estrella' : 'estrellas'}`}
              className={n <= puntos ? 'on' : ''}
              onClick={() => setPuntos(n)}
            >
              ★
            </button>
          ))}
        </div>

        <div className="field">
          <label htmlFor="c-com">Comentario (opcional)</label>
          <textarea id="c-com" rows={3} value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="¿Llegó a tiempo? ¿Quedó bien el trabajo?" />
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Ahora no</button>
          <button type="submit" className="btn btn-primary" disabled={!puntos || ocupado}>
            {ocupado ? 'Enviando…' : 'Enviar calificación'}
          </button>
        </div>
      </form>
    </div>
  )
}