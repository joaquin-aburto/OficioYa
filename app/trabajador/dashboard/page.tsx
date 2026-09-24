'use client'

import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
// Reutiliza los estilos base del panel del cliente + los extras del trabajador
import '../../cliente/dashboard/dashboard.css'
import './trabajador.css'

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

type Urgencia = 'Normal' | 'Urgente'
type Dia = 'Lunes' | 'Martes' | 'Miercoles' | 'Jueves' | 'Viernes' | 'Sabado' | 'Domingo'
type Metodo = 'Tarjeta' | 'Efectivo' | 'Transferencia'

type Oficio = { id: number; nombre: string; icono: string | null }
type Lead = {
  id: number
  descripcion: string
  urgencia: Urgencia
  fechaCreacion: string
  fechaDeseada: string | null
  especialidad: Oficio
  direccion: { colonia: string | null; ciudad: string | null }
  clienteNombre: string
  totalCotizaciones: number
}
type MiCotizacion = {
  id: number
  monto: number
  comentario: string | null
  estado: 'Enviada' | 'Aceptada' | 'Rechazada'
  fechaEnvio: string
  solicitud: { id: number; descripcion: string; urgencia: Urgencia; estado: string; especialidad: { nombre: string } }
}
type Trabajo = {
  id: number
  descripcion: string
  urgencia: Urgencia
  estado: 'Aceptada' | 'EnCurso' | 'Terminada'
  fechaDeseada: string | null
  especialidad: Oficio
  cliente: { nombre: string; telefono: string | null }
  direccion: { alias: string | null; calle: string; colonia: string | null; ciudad: string | null; referencias: string | null }
  monto: number | null
  pago: { id: number; estado: string; metodoPago: Metodo } | null
}
type Pago = {
  id: number
  montoTotal: number
  comision: number
  neto: number
  metodoPago: Metodo
  estado: 'Pendiente' | 'Completado' | 'Fallido'
  fechaPago: string
  especialidad: string
}
type Resena = { id: number; puntuacion: number; comentario: string | null; fecha: string; clienteNombre: string }
type Servicio = {
  id: number
  nombre: string
  descripcion: string | null
  precioBase: number
  activo: boolean
  especialidad: { id: number; nombre: string }
}
type Bloque = { diaSemana: Dia; horaInicio: string; horaFin: string }
type Notificacion = { id: number; tipo: string; mensaje: string; leido: boolean; fechaCreacion: string }

type Data = {
  trabajador: {
    id: number
    nombre: string
    fotoPerfil: string | null
    descripcion: string | null
    anosExperiencia: number | null
    verificado: boolean
  }
  especialidades: Oficio[]
  comisionPorcentaje: number
  resumen: {
    ingresosMes: number
    porCobrar: number
    trabajosCompletados: number
    calificacion: number | null
    totalResenas: number
  }
  leads: Lead[]
  cotizaciones: MiCotizacion[]
  trabajos: Trabajo[]
  pagos: Pago[]
  resenas: Resena[]
  servicios: Servicio[]
  disponibilidad: Bloque[]
  notificaciones: Notificacion[]
}

/* ------------------------------------------------------------------ */
/* Constantes y utilidades                                             */
/* ------------------------------------------------------------------ */

// Debe coincidir con lo que guardes en el login de trabajador
const STORAGE_KEY = 'oficioya_trabajador'

const DIAS: { id: Dia; label: string }[] = [
  { id: 'Lunes', label: 'Lunes' },
  { id: 'Martes', label: 'Martes' },
  { id: 'Miercoles', label: 'Miércoles' },
  { id: 'Jueves', label: 'Jueves' },
  { id: 'Viernes', label: 'Viernes' },
  { id: 'Sabado', label: 'Sábado' },
  { id: 'Domingo', label: 'Domingo' },
]

type Horario = Record<Dia, { activo: boolean; inicio: string; fin: string }>

function horarioDesde(bloques: Bloque[]): Horario {
  const h = {} as Horario
  DIAS.forEach(({ id }) => {
    const b = bloques.find((x) => x.diaSemana === id)
    h[id] = b
      ? { activo: true, inicio: b.horaInicio, fin: b.horaFin }
      : { activo: false, inicio: '09:00', fin: '18:00' }
  })
  return h
}

const EMOJI_OFICIO: [string, string][] = [
  ['plom', '🚰'], ['electr', '💡'], ['cerraj', '🔑'], ['pint', '🎨'], ['carpint', '🪚'],
  ['alba', '🧱'], ['aire', '❄️'], ['jardin', '🌿'], ['limp', '🧽'], ['herr', '⚙️'],
]
const quitarAcentos = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
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

const ESTADO_TRABAJO: Record<string, string> = {
  Aceptada: 'Por iniciar',
  EnCurso: 'En curso',
  Terminada: 'Terminado, esperando calificación',
}

/* ------------------------------------------------------------------ */
/* Piezas pequeñas                                                     */
/* ------------------------------------------------------------------ */

const ICONOS: Record<string, ReactNode> = {
  home: <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10" />,
  inbox: <path d="M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />,
  tool: <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />,
  quote: <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />,
  wallet: <path d="M20 12V8H6a2 2 0 0 1 0-4h12v4M4 6v12a2 2 0 0 0 2 2h14v-4M18 12a2 2 0 0 0 0 4h4v-4z" />,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />,
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
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONOS[name]}
    </svg>
  )
}

function Avatar({ nombre, foto, size = 40 }: { nombre: string; foto: string | null; size?: number }) {
  const iniciales = nombre.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
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

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

export default function TrabajadorDashboardPage() {
  const router = useRouter()

  const [trabajadorId, setTrabajadorId] = useState<number | null>(null)
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)
  const [ocupado, setOcupado] = useState(false)
  const [toast, setToast] = useState('')

  const [cotizando, setCotizando] = useState<Lead | null>(null)
  const [terminando, setTerminando] = useState<Trabajo | null>(null)
  const [editandoServicio, setEditandoServicio] = useState<Servicio | 'nuevo' | null>(null)
  const [filtroLeads, setFiltroLeads] = useState<'todas' | 'urgentes'>('todas')

  const [horario, setHorario] = useState<Horario>(() => horarioDesde([]))
  const [horarioSucio, setHorarioSucio] = useState(false)

  /* --- sesión mínima (localStorage). Reemplázala por cookie/sesión real --- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const id = raw ? Number(JSON.parse(raw).id) : NaN
      if (!id) {
        router.replace('/auth/login')
        return
      }
      setTrabajadorId(id)
    } catch {
      router.replace('/auth/login')
    }
  }, [router])

  const cargar = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/worker/dashboard?trabajadorId=${id}`, { cache: 'no-store' })
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
    if (trabajadorId) cargar(trabajadorId)
  }, [trabajadorId, cargar])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 3500)
    return () => clearTimeout(t)
  }, [toast])

  // El horario solo se reinicia cuando cambia lo que hay guardado
  const dispKey = JSON.stringify(data?.disponibilidad ?? [])
  useEffect(() => {
    setHorario(horarioDesde(data?.disponibilidad ?? []))
    setHorarioSucio(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispKey])

  async function ejecutar(body: Record<string, unknown>, exito: string): Promise<boolean> {
    if (!trabajadorId) return false
    setOcupado(true)
    try {
      const res = await fetch('/api/worker/acciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trabajadorId, ...body }),
      })
      const json = await res.json()
      if (!res.ok) {
        setToast(json.error || 'No se pudo completar la acción.')
        return false
      }
      setToast(exito)
      await cargar(trabajadorId)
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

  function cambiarDia(dia: Dia, cambios: Partial<Horario[Dia]>) {
    setHorario((h) => ({ ...h, [dia]: { ...h[dia], ...cambios } }))
    setHorarioSucio(true)
  }

  function guardarHorario() {
    const bloques = DIAS.filter(({ id }) => horario[id].activo).map(({ id }) => ({
      diaSemana: id,
      horaInicio: horario[id].inicio,
      horaFin: horario[id].fin,
    }))
    ejecutar({ accion: 'guardarDisponibilidad', bloques }, 'Horario guardado.')
  }

  /* --- datos derivados --- */
  const leads = data?.leads ?? []
  const urgentes = useMemo(() => leads.filter((l) => l.urgencia === 'Urgente'), [leads])
  const leadsVisibles = filtroLeads === 'urgentes' ? urgentes : leads
  const cotizacionesEnEspera = (data?.cotizaciones ?? []).filter((c) => c.estado === 'Enviada').length
  const trabajosActivos = (data?.trabajos ?? []).filter((t) => t.estado !== 'Terminada')
  const trabajosCerrados = (data?.trabajos ?? []).filter((t) => t.estado === 'Terminada')
  const noLeidas = (data?.notificaciones ?? []).filter((n) => !n.leido).length

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
        <button className="btn btn-primary" onClick={() => trabajadorId && cargar(trabajadorId)}>
          Reintentar
        </button>
      </div>
    )
  }

  const { trabajador, resumen } = data
  const primerNombre = trabajador.nombre.split(' ')[0]

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
          <a href="#nuevas">
            <Icon name="inbox" /> Solicitudes nuevas
            {leads.length > 0 && <b className="pill">{leads.length}</b>}
          </a>
          <a href="#trabajos"><Icon name="tool" /> Mis trabajos</a>
          <a href="#cotizaciones"><Icon name="quote" /> Mis cotizaciones</a>
          <a href="#ingresos"><Icon name="wallet" /> Ingresos</a>
          <a href="#agenda"><Icon name="calendar" /> Mi horario</a>
          <a href="#servicios"><Icon name="plus" /> Mis servicios</a>
          <a href="#resenas"><Icon name="star" /> Reseñas</a>
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
            <a href="#avisos" className="bell" aria-label={`Avisos, ${noLeidas} sin leer`}>
              <Icon name="bell" />
              {noLeidas > 0 && <b className="pill pill-alert">{noLeidas}</b>}
            </a>
            <Avatar nombre={trabajador.nombre} foto={trabajador.fotoPerfil} size={38} />
          </div>
        </header>

        {!trabajador.verificado && (
          <div className="banner" role="note">
            <Icon name="shield" size={20} />
            <p>
              <strong>Tu perfil está en revisión.</strong> Mientras se verifica puedes cotizar, pero los clientes
              ven primero a los profesionales verificados.
            </p>
          </div>
        )}

        {/* Hero */}
        <section className="hero hero-split" id="inicio" aria-labelledby="hero-title">
          <div>
            <h1 id="hero-title">
              {leads.length > 0
                ? `Hay ${leads.length} ${leads.length === 1 ? 'solicitud nueva' : 'solicitudes nuevas'} para tus oficios`
                : 'No hay solicitudes nuevas por ahora'}
            </h1>
            <p className="hero-sub">
              {urgentes.length > 0
                ? `${urgentes.length} ${urgentes.length === 1 ? 'es urgente' : 'son urgentes'}: quien cotiza primero suele quedarse con el trabajo.`
                : leads.length > 0
                  ? 'Cotiza rápido y con un precio claro para destacar entre los demás profesionales.'
                  : 'Te avisaremos en cuanto un cliente publique un problema de los oficios que atiendes.'}
            </p>
            <div className="hero-actions">
              {leads.length > 0 && (
                <a href="#nuevas" className="btn btn-accent">Ver solicitudes</a>
              )}
              <div className="oficios-mini" aria-label="Tus oficios">
                {data.especialidades.map((e) => (
                  <span key={e.id} className="oficio-tag">
                    {emojiDe(e.nombre, e.icono)} {e.nombre}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="ganancias" aria-label="Tus ingresos">
            <p className="ganancias-label">Ingresos netos de este mes</p>
            <p className="ganancias-monto">{dinero(resumen.ingresosMes)}</p>
            <p className="ganancias-sub">
              {resumen.porCobrar > 0 ? `${dinero(resumen.porCobrar)} por cobrar` : 'Nada pendiente por cobrar'}
            </p>
          </div>
        </section>

        {/* Resumen */}
        <section className="stats" aria-label="Resumen de tu actividad">
          <div className={`stat ${urgentes.length ? 'stat-hot' : ''}`}>
            <strong>{leads.length}</strong>
            <span>{leads.length === 1 ? 'solicitud nueva' : 'solicitudes nuevas'}</span>
          </div>
          <div className="stat">
            <strong>{cotizacionesEnEspera}</strong>
            <span>{cotizacionesEnEspera === 1 ? 'cotización en espera' : 'cotizaciones en espera'}</span>
          </div>
          <div className={`stat ${trabajosActivos.length ? 'stat-hot' : ''}`}>
            <strong>{trabajosActivos.length}</strong>
            <span>{trabajosActivos.length === 1 ? 'trabajo activo' : 'trabajos activos'}</span>
          </div>
          <div className="stat">
            <strong>{resumen.calificacion !== null ? resumen.calificacion.toFixed(1) : '—'}</strong>
            <span>
              {resumen.totalResenas > 0
                ? `calificación (${resumen.totalResenas})`
                : 'sin calificaciones aún'}
            </span>
          </div>
        </section>

        <div className="cols">
          <div className="col-main">
            {/* Solicitudes nuevas */}
            <section id="nuevas" className="block" aria-labelledby="t-nuevas">
              <div className="block-head">
                <h2 id="t-nuevas">Solicitudes nuevas</h2>
                <div className="tabs" role="tablist">
                  <button role="tab" aria-selected={filtroLeads === 'todas'} className={filtroLeads === 'todas' ? 'on' : ''} onClick={() => setFiltroLeads('todas')}>
                    Todas ({leads.length})
                  </button>
                  <button role="tab" aria-selected={filtroLeads === 'urgentes'} className={filtroLeads === 'urgentes' ? 'on' : ''} onClick={() => setFiltroLeads('urgentes')}>
                    Urgentes ({urgentes.length})
                  </button>
                </div>
              </div>

              {leadsVisibles.length === 0 ? (
                <p className="vacio">
                  {data.especialidades.length === 0
                    ? 'Aún no tienes oficios asignados a tu perfil, por eso no te llegan solicitudes.'
                    : 'No hay solicitudes abiertas de tus oficios en este momento. Aquí aparecerán apenas llegue una.'}
                </p>
              ) : (
                <ul className="lead-list">
                  {leadsVisibles.map((l) => (
                    <li key={l.id} className={`lead ${l.urgencia === 'Urgente' ? 'lead-urgente' : ''}`}>
                      <div className="lead-top">
                        <span className="sol-emoji" aria-hidden="true">{emojiDe(l.especialidad.nombre, l.especialidad.icono)}</span>
                        <div className="sol-title">
                          <h3>{l.especialidad.nombre}</h3>
                          <p className="muted small">
                            {l.clienteNombre} · {hace(l.fechaCreacion)}
                            {l.fechaDeseada ? ` · lo quiere para el ${fechaCorta(l.fechaDeseada)}` : ''}
                          </p>
                        </div>
                        {l.urgencia === 'Urgente' && <span className="tag tag-urgente">Urgente</span>}
                      </div>

                      <p className="sol-desc">{l.descripcion}</p>

                      <p className="muted small sol-dir">
                        <Icon name="pin" size={14} />
                        {[l.direccion.colonia, l.direccion.ciudad].filter(Boolean).join(', ') || 'Ubicación por confirmar'}
                        <span className="dot-sep" aria-hidden="true" />
                        {l.totalCotizaciones === 0
                          ? 'Nadie ha cotizado aún'
                          : `${l.totalCotizaciones} ${l.totalCotizaciones === 1 ? 'cotización' : 'cotizaciones'} enviadas`}
                      </p>

                      <button className="btn btn-primary btn-block" onClick={() => setCotizando(l)}>
                        Enviar cotización
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Mis trabajos */}
            <section id="trabajos" className="block" aria-labelledby="t-trab">
              <div className="block-head"><h2 id="t-trab">Mis trabajos</h2></div>

              {trabajosActivos.length + trabajosCerrados.length === 0 ? (
                <p className="vacio">
                  Cuando un cliente acepte tu cotización, el trabajo aparecerá aquí con la dirección exacta y su teléfono.
                </p>
              ) : (
                <ul className="sol-list">
                  {[...trabajosActivos, ...trabajosCerrados].map((t) => {
                    const direccion = [t.direccion.calle, t.direccion.colonia, t.direccion.ciudad].filter(Boolean).join(', ')
                    return (
                      <li key={t.id} className="sol">
                        <div className="sol-top">
                          <span className="sol-emoji" aria-hidden="true">{emojiDe(t.especialidad.nombre, t.especialidad.icono)}</span>
                          <div className="sol-title">
                            <h3>{t.especialidad.nombre}</h3>
                            <p className="muted small">
                              #{t.id} · {t.cliente.nombre}
                              {t.fechaDeseada ? ` · para el ${fechaCorta(t.fechaDeseada)}` : ''}
                            </p>
                          </div>
                          {t.urgencia === 'Urgente' && <span className="tag tag-urgente">Urgente</span>}
                        </div>

                        <p className="sol-desc">{t.descripcion}</p>

                        <p className="sol-estado">
                          <strong>{ESTADO_TRABAJO[t.estado]}</strong>
                          {t.monto !== null && <span className="monto-inline">{dinero(t.monto)}</span>}
                        </p>

                        <p className="muted small sol-dir">
                          <Icon name="pin" size={14} /> {direccion}
                        </p>
                        {t.direccion.referencias && <p className="muted small">Referencias: {t.direccion.referencias}</p>}

                        <div className="trabajo-links">
                          <a
                            className="btn btn-ghost btn-sm"
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Icon name="pin" size={14} /> Abrir mapa
                          </a>
                          {t.cliente.telefono && (
                            <a className="btn btn-ghost btn-sm" href={`tel:${t.cliente.telefono}`}>
                              <Icon name="phone" size={14} /> Llamar
                            </a>
                          )}
                        </div>

                        {t.estado === 'Aceptada' && (
                          <button
                            className="btn btn-primary"
                            disabled={ocupado}
                            onClick={() => ejecutar({ accion: 'iniciarTrabajo', solicitudId: t.id }, 'Trabajo iniciado. Avisamos al cliente.')}
                          >
                            Iniciar trabajo
                          </button>
                        )}
                        {t.estado === 'EnCurso' && (
                          <button className="btn btn-accent" onClick={() => setTerminando(t)}>
                            Marcar como terminado
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            {/* Mis cotizaciones */}
            <section id="cotizaciones" className="block" aria-labelledby="t-cot">
              <div className="block-head"><h2 id="t-cot">Mis cotizaciones</h2></div>
              {data.cotizaciones.length === 0 ? (
                <p className="vacio">Todavía no has enviado cotizaciones. Empieza con una solicitud nueva.</p>
              ) : (
                <ul className="fila-list">
                  {data.cotizaciones.map((c) => (
                    <li key={c.id} className="fila">
                      <div className="fila-main">
                        <strong>{c.solicitud.especialidad.nombre}</strong>
                        <span className="muted small">
                          #{c.solicitud.id} · enviada {hace(c.fechaEnvio)}
                        </span>
                        <span className="fila-desc">{c.solicitud.descripcion}</span>
                      </div>
                      <div className="fila-side">
                        <strong>{dinero(c.monto)}</strong>
                        <span className={`tag ${c.estado === 'Aceptada' ? 'tag-ok' : c.estado === 'Rechazada' ? 'tag-off' : 'tag-hot'}`}>
                          {c.estado === 'Enviada' ? 'En espera' : c.estado === 'Aceptada' ? 'Aceptada' : 'No elegida'}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Ingresos */}
            <section id="ingresos" className="block" aria-labelledby="t-ing">
              <div className="block-head">
                <h2 id="t-ing">Ingresos</h2>
                <span className="muted small">OficioYa retiene {data.comisionPorcentaje}% de cada servicio</span>
              </div>
              {data.pagos.length === 0 ? (
                <p className="vacio">Al terminar tu primer trabajo, el cobro aparecerá aquí.</p>
              ) : (
                <ul className="fila-list">
                  {data.pagos.map((p) => (
                    <li key={p.id} className="fila">
                      <div className="fila-main">
                        <strong>{p.especialidad}</strong>
                        <span className="muted small">
                          {fechaCorta(p.fechaPago)} · {p.metodoPago} · total {dinero(p.montoTotal)} − comisión {dinero(p.comision)}
                        </span>
                      </div>
                      <div className="fila-side">
                        <strong>{dinero(p.neto)}</strong>
                        {p.estado === 'Pendiente' ? (
                          <button
                            className="btn btn-accent btn-sm"
                            disabled={ocupado}
                            onClick={() => ejecutar({ accion: 'confirmarCobro', pagoId: p.id }, 'Cobro confirmado.')}
                          >
                            Ya me pagaron
                          </button>
                        ) : (
                          <span className={`tag ${p.estado === 'Completado' ? 'tag-ok' : 'tag-urgente'}`}>
                            {p.estado === 'Completado' ? 'Cobrado' : 'Fallido'}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Horario */}
            <section id="agenda" className="block" aria-labelledby="t-agenda">
              <div className="block-head">
                <h2 id="t-agenda">Mi horario</h2>
                {horarioSucio && (
                  <button className="btn btn-primary btn-sm" disabled={ocupado} onClick={guardarHorario}>
                    Guardar horario
                  </button>
                )}
              </div>
              <ul className="horario">
                {DIAS.map(({ id, label }) => {
                  const d = horario[id]
                  return (
                    <li key={id} className={d.activo ? 'on' : ''}>
                      <label className="horario-dia">
                        <input
                          type="checkbox"
                          checked={d.activo}
                          onChange={(e) => cambiarDia(id, { activo: e.target.checked })}
                        />
                        {label}
                      </label>
                      {d.activo ? (
                        <div className="horario-horas">
                          <input type="time" aria-label={`${label}: entrada`} value={d.inicio} onChange={(e) => cambiarDia(id, { inicio: e.target.value })} />
                          <span aria-hidden="true">a</span>
                          <input type="time" aria-label={`${label}: salida`} value={d.fin} onChange={(e) => cambiarDia(id, { fin: e.target.value })} />
                        </div>
                      ) : (
                        <span className="muted small">No disponible</span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>

            {/* Servicios */}
            <section id="servicios" className="block" aria-labelledby="t-serv">
              <div className="block-head">
                <h2 id="t-serv">Mis servicios y precios</h2>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditandoServicio('nuevo')} disabled={data.especialidades.length === 0}>
                  <Icon name="plus" size={14} /> Agregar servicio
                </button>
              </div>
              {data.servicios.length === 0 ? (
                <p className="vacio">
                  Agrega los servicios que ofreces con su precio base. Te sirven de referencia al cotizar y los clientes los ven en tu perfil.
                </p>
              ) : (
                <ul className="fila-list">
                  {data.servicios.map((s) => (
                    <li key={s.id} className={`fila ${s.activo ? '' : 'fila-off'}`}>
                      <div className="fila-main">
                        <strong>{s.nombre}</strong>
                        <span className="muted small">{s.especialidad.nombre}</span>
                        {s.descripcion && <span className="fila-desc">{s.descripcion}</span>}
                      </div>
                      <div className="fila-side">
                        <strong>Desde {dinero(s.precioBase)}</strong>
                        <div className="fila-btns">
                          <button className="btn btn-ghost btn-sm" onClick={() => setEditandoServicio(s)}>Editar</button>
                          <button
                            className="btn btn-ghost btn-sm"
                            disabled={ocupado}
                            onClick={() => ejecutar({ accion: 'alternarServicio', servicioId: s.id }, s.activo ? 'Servicio pausado.' : 'Servicio activado.')}
                          >
                            {s.activo ? 'Pausar' : 'Activar'}
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Reseñas */}
            <section id="resenas" className="block" aria-labelledby="t-res">
              <div className="block-head">
                <h2 id="t-res">Lo que dicen tus clientes</h2>
                <Estrellas valor={resumen.calificacion} total={resumen.totalResenas} />
              </div>
              {data.resenas.length === 0 ? (
                <p className="vacio">Tus primeras reseñas aparecerán aquí cuando termines trabajos.</p>
              ) : (
                <ul className="resena-list">
                  {data.resenas.map((r) => (
                    <li key={r.id} className="resena">
                      <div className="resena-head">
                        <span className="rating-star" aria-label={`${r.puntuacion} de 5`}>
                          {'★'.repeat(r.puntuacion)}
                          <span className="star-off">{'★'.repeat(5 - r.puntuacion)}</span>
                        </span>
                        <span className="muted small">{r.clienteNombre} · {fechaCorta(r.fecha)}</span>
                      </div>
                      {r.comentario && <p>{r.comentario}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* ----------------------------- Columna lateral ----------------------------- */}
          <aside className="col-side">
            <section className="block block-side" aria-labelledby="t-perfil">
              <div className="block-head"><h2 id="t-perfil">Tu perfil</h2></div>
              <div className="perfil">
                <Avatar nombre={trabajador.nombre} foto={trabajador.fotoPerfil} size={52} />
                <div>
                  <strong>{trabajador.nombre}</strong>
                  <p className="small">
                    {trabajador.verificado ? (
                      <span className="verif"><Icon name="shield" size={14} /> Verificado</span>
                    ) : (
                      <span className="muted">En revisión</span>
                    )}
                  </p>
                </div>
              </div>
              <p className="muted small perfil-datos">
                {trabajador.anosExperiencia ? `${trabajador.anosExperiencia} años de experiencia · ` : ''}
                {resumen.trabajosCompletados} {resumen.trabajosCompletados === 1 ? 'trabajo terminado' : 'trabajos terminados'}
              </p>
              {trabajador.descripcion && <p className="perfil-desc">{trabajador.descripcion}</p>}
            </section>

            <section id="avisos" className="block block-side" aria-labelledby="t-not">
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
          </aside>
        </div>
      </div>

      {/* ----------------------------- Modales ----------------------------- */}
      {cotizando && (
        <CotizarModal
          lead={cotizando}
          servicios={data.servicios.filter((s) => s.activo && s.especialidad.id === cotizando.especialidad.id)}
          ocupado={ocupado}
          onClose={() => setCotizando(null)}
          onSubmit={async (monto, comentario) => {
            const ok = await ejecutar(
              { accion: 'enviarCotizacion', solicitudId: cotizando.id, monto, comentario },
              'Cotización enviada. Te avisaremos cuando el cliente responda.'
            )
            if (ok) setCotizando(null)
          }}
        />
      )}

      {terminando && (
        <TerminarModal
          trabajo={terminando}
          comision={data.comisionPorcentaje}
          ocupado={ocupado}
          onClose={() => setTerminando(null)}
          onSubmit={async (metodoPago) => {
            const ok = await ejecutar(
              { accion: 'terminarTrabajo', solicitudId: terminando.id, metodoPago },
              'Trabajo terminado. Confirma el cobro cuando recibas el pago.'
            )
            if (ok) setTerminando(null)
          }}
        />
      )}

      {editandoServicio && (
        <ServicioModal
          servicio={editandoServicio === 'nuevo' ? null : editandoServicio}
          oficios={data.especialidades}
          ocupado={ocupado}
          onClose={() => setEditandoServicio(null)}
          onSubmit={async (payload) => {
            const ok = await ejecutar({ accion: 'guardarServicio', ...payload }, 'Servicio guardado.')
            if (ok) setEditandoServicio(null)
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
/* Base de modal                                                       */
/* ------------------------------------------------------------------ */

function ModalBase({
  titulo,
  onClose,
  onSubmit,
  small,
  children,
}: {
  titulo: string
  onClose: () => void
  onSubmit: (e: FormEvent) => void
  small?: boolean
  children: ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className={`modal ${small ? 'modal-sm' : ''}`} role="dialog" aria-modal="true" aria-label={titulo} onSubmit={onSubmit}>
        <div className="modal-head">
          <h2>{titulo}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <Icon name="close" />
          </button>
        </div>
        {children}
      </form>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Modal: cotizar                                                      */
/* ------------------------------------------------------------------ */

function CotizarModal({
  lead,
  servicios,
  ocupado,
  onClose,
  onSubmit,
}: {
  lead: Lead
  servicios: Servicio[]
  ocupado: boolean
  onClose: () => void
  onSubmit: (monto: number, comentario: string) => void
}) {
  const [monto, setMonto] = useState('')
  const [comentario, setComentario] = useState('')
  const [aviso, setAviso] = useState('')

  function enviar(e: FormEvent) {
    e.preventDefault()
    const n = Number(monto)
    if (!(n > 0)) return setAviso('Escribe el monto total que cobrarías por este trabajo.')
    setAviso('')
    onSubmit(n, comentario)
  }

  return (
    <ModalBase titulo="Enviar cotización" onClose={onClose} onSubmit={enviar}>
      <div className="resumen-lead">
        <strong>
          {emojiDe(lead.especialidad.nombre, lead.especialidad.icono)} {lead.especialidad.nombre}
          {lead.urgencia === 'Urgente' && <span className="tag tag-urgente"> Urgente</span>}
        </strong>
        <p>{lead.descripcion}</p>
      </div>

      <div className="field">
        <label htmlFor="q-monto">Monto total (MXN)</label>
        <input
          id="q-monto"
          type="number"
          inputMode="decimal"
          min="1"
          step="1"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          placeholder="Ej. 850"
        />
        {servicios.length > 0 && (
          <div className="chips" aria-label="Usar un precio base">
            {servicios.map((s) => (
              <button type="button" key={s.id} onClick={() => setMonto(String(s.precioBase))}>
                {s.nombre}: {dinero(s.precioBase)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="field">
        <label htmlFor="q-com">Mensaje para el cliente (opcional)</label>
        <textarea
          id="q-com"
          rows={3}
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="Qué incluye el precio, si llevas materiales, cuándo puedes ir…"
        />
      </div>

      <p className="muted small">El cliente verá tu nombre, tu calificación y este monto. No podrás editarla después de enviarla.</p>

      {aviso && <p className="form-aviso" role="alert">{aviso}</p>}

      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={ocupado}>
          {ocupado ? 'Enviando…' : 'Enviar cotización'}
        </button>
      </div>
    </ModalBase>
  )
}

/* ------------------------------------------------------------------ */
/* Modal: terminar trabajo                                             */
/* ------------------------------------------------------------------ */

function TerminarModal({
  trabajo,
  comision,
  ocupado,
  onClose,
  onSubmit,
}: {
  trabajo: Trabajo
  comision: number
  ocupado: boolean
  onClose: () => void
  onSubmit: (metodo: Metodo) => void
}) {
  const [metodo, setMetodo] = useState<Metodo>('Efectivo')
  const total = trabajo.monto ?? 0
  const retenido = Math.round(total * comision) / 100

  return (
    <ModalBase
      titulo="Marcar como terminado"
      small
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(metodo)
      }}
    >
      <p className="muted">
        {trabajo.especialidad.nombre} para {trabajo.cliente.nombre} · solicitud #{trabajo.id}
      </p>

      <div className="field">
        <label htmlFor="t-metodo">¿Cómo te paga el cliente?</label>
        <select id="t-metodo" value={metodo} onChange={(e) => setMetodo(e.target.value as Metodo)}>
          <option value="Efectivo">Efectivo</option>
          <option value="Transferencia">Transferencia</option>
          <option value="Tarjeta">Tarjeta</option>
        </select>
      </div>

      <dl className="desglose">
        <div><dt>Total del servicio</dt><dd>{dinero(total)}</dd></div>
        <div><dt>Comisión OficioYa ({comision}%)</dt><dd>− {dinero(retenido)}</dd></div>
        <div className="desglose-total"><dt>Tú recibes</dt><dd>{dinero(total - retenido)}</dd></div>
      </dl>

      <p className="muted small">Al terminar, avisamos al cliente para que califique tu trabajo.</p>

      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Todavía no</button>
        <button type="submit" className="btn btn-primary" disabled={ocupado}>
          {ocupado ? 'Guardando…' : 'Terminar trabajo'}
        </button>
      </div>
    </ModalBase>
  )
}

/* ------------------------------------------------------------------ */
/* Modal: servicio                                                     */
/* ------------------------------------------------------------------ */

function ServicioModal({
  servicio,
  oficios,
  ocupado,
  onClose,
  onSubmit,
}: {
  servicio: Servicio | null
  oficios: Oficio[]
  ocupado: boolean
  onClose: () => void
  onSubmit: (payload: Record<string, unknown>) => void
}) {
  const [especialidadId, setEspecialidadId] = useState(String(servicio?.especialidad.id ?? oficios[0]?.id ?? ''))
  const [nombre, setNombre] = useState(servicio?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(servicio?.descripcion ?? '')
  const [precio, setPrecio] = useState(servicio ? String(servicio.precioBase) : '')
  const [aviso, setAviso] = useState('')

  function enviar(e: FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return setAviso('Ponle un nombre al servicio.')
    if (!(Number(precio) > 0)) return setAviso('Escribe un precio mayor a $0.')
    setAviso('')
    onSubmit({
      servicioId: servicio?.id,
      especialidadId: Number(especialidadId),
      nombre,
      descripcion,
      precioBase: Number(precio),
    })
  }

  return (
    <ModalBase titulo={servicio ? 'Editar servicio' : 'Nuevo servicio'} onClose={onClose} onSubmit={enviar}>
      <div className="field">
        <label htmlFor="s-oficio">Oficio</label>
        <select id="s-oficio" value={especialidadId} onChange={(e) => setEspecialidadId(e.target.value)}>
          {oficios.map((o) => (
            <option key={o.id} value={o.id}>{o.nombre}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="s-nombre">Nombre del servicio</label>
        <input id="s-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Reparación de fuga en lavabo" />
      </div>
      <div className="field">
        <label htmlFor="s-precio">Precio desde (MXN)</label>
        <input id="s-precio" type="number" inputMode="decimal" min="1" step="1" value={precio} onChange={(e) => setPrecio(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="s-desc">Qué incluye (opcional)</label>
        <textarea id="s-desc" rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
      </div>

      {aviso && <p className="form-aviso" role="alert">{aviso}</p>}

      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={ocupado}>
          {ocupado ? 'Guardando…' : 'Guardar servicio'}
        </button>
      </div>
    </ModalBase>
  )
}