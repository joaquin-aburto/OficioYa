'use client'

import { FormEvent, ReactNode, useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
// Reutiliza los estilos base del panel del cliente + los extras del admin
import '../../cliente/dashboard/dashboard.css'
import './admin.css'

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

type Oficio = { id: number; nombre: string }
type Metodo = 'Tarjeta' | 'Efectivo' | 'Transferencia'
type EstadoPago = 'Pendiente' | 'Completado' | 'Fallido'

type Pendiente = {
  id: number
  nombre: string
  correo: string
  telefono: string | null
  fotoPerfil: string | null
  descripcion: string | null
  anosExperiencia: number | null
  fechaRegistro: string
  especialidades: Oficio[]
}
type Verificado = {
  id: number
  nombre: string
  correo: string
  fotoPerfil: string | null
  activo: boolean
  anosExperiencia: number | null
  trabajosCompletados: number
  especialidades: Oficio[]
  calificacion: number | null
  totalResenas: number
}
type PagoFila = {
  id: number
  montoTotal: number
  comision: number
  neto: number
  metodoPago: Metodo
  estado: EstadoPago
  fechaPago: string
  especialidad: string
  cliente: string
  trabajador: string
}
type Data = {
  comisiones: { esteMes: number; mesPasado: number; historico: number; pendiente: number }
  totales: { clientes: number; trabajadores: number; porVerificar: number; solicitudes: number }
  solicitudesPorEstado: Record<string, number>
  pendientesVerificacion: Pendiente[]
  trabajadoresVerificados: Verificado[]
  pagosRecientes: PagoFila[]
}

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = 'oficioya_admin'

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
function variacion(actual: number, anterior: number): { texto: string; positiva: boolean } | null {
  if (anterior <= 0) return null
  const pct = Math.round(((actual - anterior) / anterior) * 100)
  return { texto: `${pct >= 0 ? '+' : ''}${pct}% vs. mes pasado`, positiva: pct >= 0 }
}

const ESTADO_SOLICITUD_LABEL: Record<string, string> = {
  Pendiente: 'Pendientes',
  Cotizada: 'Cotizadas',
  Aceptada: 'Aceptadas',
  EnCurso: 'En curso',
  Terminada: 'Terminadas',
  Cancelada: 'Canceladas',
  Rechazada: 'Rechazadas',
  Calificada: 'Calificadas',
}

/* ------------------------------------------------------------------ */
/* Piezas pequeñas                                                     */
/* ------------------------------------------------------------------ */

const ICONOS: Record<string, ReactNode> = {
  home: <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10" />,
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4" />,
  users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  wallet: <path d="M20 12V8H6a2 2 0 0 1 0-4h12v4M4 6v12a2 2 0 0 0 2 2h14v-4M18 12a2 2 0 0 0 0 4h4v-4z" />,
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  out: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  close: <path d="M18 6L6 18M6 6l12 12" />,
  phone: <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.4-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />,
  up: <path d="M18 15l-6-6-6 6" />,
  down: <path d="M6 9l6 6 6-6" />,
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
  if (valor === null) return <span className="rating rating-nuevo">Sin reseñas</span>
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

export default function AdminDashboardPage() {
  const router = useRouter()

  const [autorizado, setAutorizado] = useState(false)
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)
  const [ocupado, setOcupado] = useState(false)
  const [toast, setToast] = useState('')

  const [rechazando, setRechazando] = useState<Pendiente | null>(null)
  const [verTrabajador, setVerTrabajador] = useState<Pendiente | null>(null)
  const [filtroVerificados, setFiltroVerificados] = useState('')

  /* --- sesión mínima (localStorage). Reemplázala por cookie/sesión real --- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        router.replace('/admin/login')
        return
      }
      setAutorizado(true)
    } catch {
      router.replace('/admin/login')
    }
  }, [router])

  const cargar = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/dashboard', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setData(json)
      setError('')
    } catch {
      setError('No pudimos cargar el panel. Revisa tu conexión e intenta de nuevo.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    if (autorizado) cargar()
  }, [autorizado, cargar])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 3500)
    return () => clearTimeout(t)
  }, [toast])

  async function ejecutar(body: Record<string, unknown>, exito: string): Promise<boolean> {
    setOcupado(true)
    try {
      const res = await fetch('/api/admin/acciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) {
        setToast(json.error || 'No se pudo completar la acción.')
        return false
      }
      setToast(exito)
      await cargar()
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
    router.push('/admin/login')
  }

  const verificadosFiltrados = useMemo(() => {
    const lista = data?.trabajadoresVerificados ?? []
    const q = filtroVerificados.trim().toLowerCase()
    if (!q) return lista
    return lista.filter(
      (t) => t.nombre.toLowerCase().includes(q) || t.especialidades.some((e) => e.nombre.toLowerCase().includes(q))
    )
  }, [data, filtroVerificados])

  if (!autorizado) return null

  if (cargando) {
    return (
      <div className="dash-estado" role="status">
        <span className="spinner" aria-hidden="true" />
        Cargando el panel…
      </div>
    )
  }
  if (error || !data) {
    return (
      <div className="dash-estado">
        <p>{error || 'Algo salió mal.'}</p>
        <button className="btn btn-primary" onClick={cargar}>Reintentar</button>
      </div>
    )
  }

  const { comisiones, totales, solicitudesPorEstado, pendientesVerificacion, pagosRecientes } = data
  const varMes = variacion(comisiones.esteMes, comisiones.mesPasado)

  return (
    <div className="dash">
      {/* ----------------------------- Barra lateral ----------------------------- */}
      <aside className="side">
        <div className="side-brand">
          <span className="admin-icon" aria-hidden="true">🛡️</span>
          <span>OficioYa Admin</span>
        </div>

        <nav className="side-nav" aria-label="Secciones">
          <a href="#inicio"><Icon name="home" /> Inicio</a>
          <a href="#verificacion">
            <Icon name="shield" /> Por verificar
            {pendientesVerificacion.length > 0 && <b className="pill">{pendientesVerificacion.length}</b>}
          </a>
          <a href="#trabajadores"><Icon name="users" /> Trabajadores</a>
          <a href="#comisiones"><Icon name="wallet" /> Comisiones</a>
          <a href="#solicitudes"><Icon name="list" /> Solicitudes</a>
        </nav>

        <button className="side-out" onClick={cerrarSesion}>
          <Icon name="out" /> Cerrar sesión
        </button>
      </aside>

      {/* ----------------------------- Contenido ----------------------------- */}
      <div className="main" id="inicio">
        <header className="top">
          <p className="top-hello">Panel de administración</p>
        </header>

        {/* Resumen de comisiones */}
        <section id="comisiones" className="admin-hero" aria-labelledby="hero-title">
          <div className="admin-hero-main">
            <p className="admin-hero-label">Comisiones de este mes</p>
            <h1 id="hero-title">{dinero(comisiones.esteMes)}</h1>
            {varMes && (
              <p className={`admin-hero-var ${varMes.positiva ? 'up' : 'down'}`}>
                <Icon name={varMes.positiva ? 'up' : 'down'} size={14} /> {varMes.texto}
              </p>
            )}
          </div>
          <div className="admin-hero-mini">
            <div>
              <span>Histórico</span>
              <strong>{dinero(comisiones.historico)}</strong>
            </div>
            <div>
              <span>Por cobrar (pagos pendientes)</span>
              <strong>{dinero(comisiones.pendiente)}</strong>
            </div>
          </div>
        </section>

        {/* Estadísticas generales */}
        <section className="stats" aria-label="Resumen general">
          <div className="stat">
            <strong>{totales.clientes}</strong>
            <span>clientes registrados</span>
          </div>
          <div className="stat">
            <strong>{totales.trabajadores}</strong>
            <span>trabajadores registrados</span>
          </div>
          <div className={`stat ${totales.porVerificar ? 'stat-hot' : ''}`}>
            <strong>{totales.porVerificar}</strong>
            <span>{totales.porVerificar === 1 ? 'por verificar' : 'por verificar'}</span>
          </div>
          <div className="stat">
            <strong>{totales.solicitudes}</strong>
            <span>solicitudes totales</span>
          </div>
        </section>

        <div className="cols">
          <div className="col-main">
            {/* Verificación de trabajadores */}
            <section id="verificacion" className="block" aria-labelledby="t-ver">
              <div className="block-head"><h2 id="t-ver">Trabajadores por verificar</h2></div>

              {pendientesVerificacion.length === 0 ? (
                <p className="vacio">No hay trabajadores esperando verificación. Buen trabajo.</p>
              ) : (
                <ul className="pend-list">
                  {pendientesVerificacion.map((t) => (
                    <li key={t.id} className="pend">
                      <div className="pend-head">
                        <Avatar nombre={t.nombre} foto={t.fotoPerfil} size={48} />
                        <div>
                          <p className="pend-name">{t.nombre}</p>
                          <p className="muted small">
                            Registrado {hace(t.fechaRegistro)}
                            {t.anosExperiencia ? ` · ${t.anosExperiencia} años de experiencia` : ''}
                          </p>
                        </div>
                      </div>

                      <p className="pend-esp">{t.especialidades.map((e) => e.nombre).join(', ') || 'Sin oficios'}</p>
                      {t.descripcion && <p className="pend-desc">{t.descripcion}</p>}

                      <div className="pend-contacto">
                        <span>{t.correo}</span>
                        {t.telefono && <span>{t.telefono}</span>}
                      </div>

                      <div className="pend-actions">
                        <button
                          className="btn btn-primary"
                          disabled={ocupado}
                          onClick={() => ejecutar({ accion: 'verificarTrabajador', trabajadorId: t.id }, `${t.nombre} fue verificado.`)}
                        >
                          <Icon name="shield" size={16} /> Verificar
                        </button>
                        <button className="btn btn-ghost" onClick={() => setRechazando(t)}>
                          Rechazar
                        </button>
                        {t.telefono && (
                          <a className="btn btn-ghost btn-sm" href={`tel:${t.telefono}`}>
                            <Icon name="phone" size={14} /> Llamar
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Trabajadores verificados */}
            <section id="trabajadores" className="block" aria-labelledby="t-trab">
              <div className="block-head">
                <h2 id="t-trab">Trabajadores verificados</h2>
                <input
                  className="admin-search"
                  type="search"
                  value={filtroVerificados}
                  onChange={(e) => setFiltroVerificados(e.target.value)}
                  placeholder="Buscar por nombre u oficio…"
                  aria-label="Buscar trabajadores verificados"
                />
              </div>

              {verificadosFiltrados.length === 0 ? (
                <p className="vacio">
                  {data.trabajadoresVerificados.length === 0
                    ? 'Todavía no hay trabajadores verificados.'
                    : 'No hay resultados para esa búsqueda.'}
                </p>
              ) : (
                <ul className="admin-table" role="table" aria-label="Trabajadores verificados">
                  <li className="admin-row admin-row-head" role="row">
                    <span role="columnheader">Trabajador</span>
                    <span role="columnheader">Oficios</span>
                    <span role="columnheader">Calificación</span>
                    <span role="columnheader">Trabajos</span>
                    <span role="columnheader">Estado</span>
                  </li>
                  {verificadosFiltrados.map((t) => (
                    <li key={t.id} className="admin-row" role="row">
                      <span className="admin-cell-who" role="cell">
                        <Avatar nombre={t.nombre} foto={t.fotoPerfil} size={32} />
                        {t.nombre}
                      </span>
                      <span className="muted small" role="cell">{t.especialidades.map((e) => e.nombre).join(', ') || '—'}</span>
                      <span role="cell"><Estrellas valor={t.calificacion} total={t.totalResenas} /></span>
                      <span role="cell">{t.trabajosCompletados}</span>
                      <span role="cell">
                        <button
                          className={`toggle ${t.activo ? 'on' : ''}`}
                          disabled={ocupado}
                          aria-pressed={t.activo}
                          onClick={() =>
                            ejecutar(
                              { accion: 'alternarActivoTrabajador', trabajadorId: t.id },
                              t.activo ? `${t.nombre} fue suspendido.` : `${t.nombre} fue reactivado.`
                            )
                          }
                        >
                          {t.activo ? 'Activo' : 'Suspendido'}
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Solicitudes por estado */}
            <section id="solicitudes" className="block" aria-labelledby="t-sol">
              <div className="block-head"><h2 id="t-sol">Solicitudes por estado</h2></div>
              <ul className="estado-grid">
                {Object.entries(ESTADO_SOLICITUD_LABEL).map(([clave, label]) => (
                  <li key={clave}>
                    <strong>{solicitudesPorEstado[clave] ?? 0}</strong>
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Pagos recientes */}
            <section className="block" aria-labelledby="t-pagos">
              <div className="block-head"><h2 id="t-pagos">Pagos recientes</h2></div>
              {pagosRecientes.length === 0 ? (
                <p className="vacio">Todavía no hay pagos registrados.</p>
              ) : (
                <ul className="fila-list">
                  {pagosRecientes.map((p) => (
                    <li key={p.id} className="fila">
                      <div className="fila-main">
                        <strong>{p.especialidad}</strong>
                        <span className="muted small">
                          {p.trabajador} → {p.cliente} · {fechaCorta(p.fechaPago)} · {p.metodoPago}
                        </span>
                      </div>
                      <div className="fila-side">
                        <strong>{dinero(p.montoTotal)}</strong>
                        <span className="muted small">comisión {dinero(p.comision)}</span>
                        <span className={`tag ${p.estado === 'Completado' ? 'tag-ok' : p.estado === 'Pendiente' ? 'tag-hot' : 'tag-urgente'}`}>
                          {p.estado === 'Completado' ? 'Cobrado' : p.estado === 'Pendiente' ? 'Pendiente' : 'Fallido'}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>

      {/* ----------------------------- Modales ----------------------------- */}
      {rechazando && (
        <RechazarModal
          trabajador={rechazando}
          ocupado={ocupado}
          onClose={() => setRechazando(null)}
          onSubmit={async (motivo) => {
            const ok = await ejecutar(
              { accion: 'rechazarTrabajador', trabajadorId: rechazando.id, motivo },
              `Se rechazó el perfil de ${rechazando.nombre}.`
            )
            if (ok) setRechazando(null)
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
/* Modal: rechazar trabajador                                          */
/* ------------------------------------------------------------------ */

function RechazarModal({
  trabajador,
  ocupado,
  onClose,
  onSubmit,
}: {
  trabajador: Pendiente
  ocupado: boolean
  onClose: () => void
  onSubmit: (motivo: string) => void
}) {
  const [motivo, setMotivo] = useState('')
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function enviar(e: FormEvent) {
    e.preventDefault()
    if (motivo.trim().length < 5) return setAviso('Escribe el motivo para que el trabajador pueda corregirlo.')
    setAviso('')
    onSubmit(motivo.trim())
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal modal-sm" role="dialog" aria-modal="true" aria-labelledby="r-title" onSubmit={enviar}>
        <div className="modal-head">
          <h2 id="r-title">Rechazar a {trabajador.nombre}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <Icon name="close" />
          </button>
        </div>

        <p className="muted small">
          Su cuenta quedará suspendida y le avisaremos el motivo para que pueda corregirlo y volver a solicitar verificación.
        </p>

        <div className="field">
          <label htmlFor="r-motivo">Motivo del rechazo</label>
          <textarea
            id="r-motivo"
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej. Los documentos no coinciden con el nombre registrado"
          />
        </div>

        {aviso && <p className="form-aviso" role="alert">{aviso}</p>}

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={ocupado}>
            {ocupado ? 'Enviando…' : 'Rechazar y avisar'}
          </button>
        </div>
      </form>
    </div>
  )
}