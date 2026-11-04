'use client'

import {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import '../login/login.css' // mismos estilos base que el login
import './register.css' // extras del registro
import './oficios-docs.css' // oficios y documentos
import './register-mejoras.css' // NUEVO: scroll corregido + autocompletado + años de experiencia

type Tipo = 'cliente' | 'trabajador'
type Oficio = { id: number; nombre: string }

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

// Debe coincidir con los límites que valida app/lib/fotoPerfil.ts en el servidor
const TIPOS_FOTO_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp']
const TAMANO_MAXIMO_FOTO = 5 * 1024 * 1024 // 5 MB

// Debe coincidir con app/lib/documentosTrabajador.ts en el servidor
const MAX_DOCS = 5
const TAMANO_MAXIMO_DOC = 10 * 1024 * 1024 // 10 MB

// Años de experiencia
const MAX_ANOS = 60
const ANOS_RAPIDOS: { valor: number; etiqueta: string }[] = [
  { valor: 0, etiqueta: 'Menos de 1' },
  { valor: 1, etiqueta: '1' },
  { valor: 3, etiqueta: '3' },
  { valor: 5, etiqueta: '5' },
  { valor: 10, etiqueta: '10' },
  { valor: 20, etiqueta: '20+' },
]

// Quita acentos y mayúsculas para que "plomeria" encuentre "Plomería"
const normalizar = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

const formatoTamano = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`

export default function RegisterPage() {
  const router = useRouter()

  const [tipo, setTipo] = useState<Tipo>('cliente')
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [telefono, setTelefono] = useState('')
  const [contrasena, setContrasena] = useState('')

  // Foto de perfil (opcional para clientes, obligatoria para profesionales)
  const [foto, setFoto] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const inputFotoRef = useRef<HTMLInputElement>(null)

  // Solo profesionales
  const [oficios, setOficios] = useState<Oficio[] | null>(null)
  const [errorOficios, setErrorOficios] = useState(false)
  const [intento, setIntento] = useState(0)
  const [seleccion, setSeleccion] = useState<number[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [anos, setAnos] = useState('')
  const [descripcion, setDescripcion] = useState('')

  // Autocompletado de oficios
  const [abierto, setAbierto] = useState(false)
  const [activo, setActivo] = useState(0)
  const comboRef = useRef<HTMLDivElement>(null)
  const listaRef = useRef<HTMLUListElement>(null)

  // Documentos PDF que avalan la experiencia (obligatorios para profesionales)
  const [documentos, setDocumentos] = useState<File[]>([])
  const inputDocsRef = useRef<HTMLInputElement>(null)

  const [mensaje, setMensaje] = useState('')
  const [cargando, setCargando] = useState(false)
  const mensajeRef = useRef<HTMLParagraphElement>(null)

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

  // Libera la URL de vista previa cuando cambia la foto o se cierra la página
  useEffect(() => {
    return () => {
      if (fotoPreview) URL.revokeObjectURL(fotoPreview)
    }
  }, [fotoPreview])

  // Cierra el desplegable de oficios al hacer clic fuera
  useEffect(() => {
    function fuera(e: MouseEvent) {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', fuera)
    return () => document.removeEventListener('mousedown', fuera)
  }, [])

  // Cuando aparece un mensaje de error, lo lleva a la vista
  useEffect(() => {
    if (mensaje) mensajeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [mensaje])

  // Sugerencias: sin los ya elegidos, y primero los que empiezan con lo escrito
  const sugerencias = useMemo(() => {
    if (!oficios) return []
    const q = normalizar(busqueda.trim())
    const disponibles = oficios.filter(
      (o) => !seleccion.includes(o.id) && (!q || normalizar(o.nombre).includes(q)),
    )
    if (!q) return disponibles
    return [...disponibles].sort((a, b) => {
      const aIni = normalizar(a.nombre).startsWith(q) ? 0 : 1
      const bIni = normalizar(b.nombre).startsWith(q) ? 0 : 1
      return aIni - bIni
    })
  }, [oficios, busqueda, seleccion])

  // Mantiene visible la opción resaltada al navegar con el teclado
  useEffect(() => {
    if (!abierto) return
    const lista = listaRef.current
    const el = lista?.children[activo] as HTMLElement | undefined
    if (!lista || !el) return
    if (el.offsetTop < lista.scrollTop) {
      lista.scrollTop = el.offsetTop
    } else if (el.offsetTop + el.offsetHeight > lista.scrollTop + lista.clientHeight) {
      lista.scrollTop = el.offsetTop + el.offsetHeight - lista.clientHeight
    }
  }, [activo, abierto])

  const oficiosElegidos = oficios?.filter((o) => seleccion.includes(o.id)) ?? []

  function quitarOficio(id: number) {
    setSeleccion((s) => s.filter((x) => x !== id))
  }

  function elegirOficio(id: number) {
    setSeleccion((s) => (s.includes(id) ? s : [...s, id]))
    setBusqueda('')
    setActivo(0)
    setAbierto(true) // se queda abierto para agregar otro rápido
  }

  function teclasBuscador(e: KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setAbierto(true)
        setActivo((i) => Math.min(i + 1, Math.max(sugerencias.length - 1, 0)))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActivo((i) => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault() // nunca envía el formulario desde aquí
        if (abierto && sugerencias[activo]) elegirOficio(sugerencias[activo].id)
        break
      case 'Escape':
        setAbierto(false)
        break
      case 'Tab':
        setAbierto(false)
        break
      case 'Backspace':
        if (busqueda === '' && seleccion.length > 0) {
          setSeleccion((s) => s.slice(0, -1))
        }
        break
    }
  }

  // Años de experiencia
  function cambiarAnos(delta: number) {
    const actual = anos === '' ? 0 : Number(anos)
    setAnos(String(Math.min(MAX_ANOS, Math.max(0, actual + delta))))
  }

  function escribirAnos(e: ChangeEvent<HTMLInputElement>) {
    const limpio = e.target.value.replace(/\D/g, '').slice(0, 2)
    setAnos(limpio === '' ? '' : String(Math.min(MAX_ANOS, Number(limpio))))
  }

  function elegirFoto(event: ChangeEvent<HTMLInputElement>) {
    const archivo = event.target.files?.[0]
    event.target.value = '' // permite volver a elegir el mismo archivo

    if (!archivo) return
    if (!TIPOS_FOTO_PERMITIDOS.includes(archivo.type)) {
      setMensaje('La foto debe ser JPG, PNG o WEBP.')
      return
    }
    if (archivo.size > TAMANO_MAXIMO_FOTO) {
      setMensaje('La foto no puede pesar más de 5 MB.')
      return
    }

    setMensaje('')
    if (fotoPreview) URL.revokeObjectURL(fotoPreview)
    setFoto(archivo)
    setFotoPreview(URL.createObjectURL(archivo))
  }

  function quitarFoto() {
    if (fotoPreview) URL.revokeObjectURL(fotoPreview)
    setFoto(null)
    setFotoPreview(null)
  }

  function elegirDocumentos(event: ChangeEvent<HTMLInputElement>) {
    const nuevos = Array.from(event.target.files ?? [])
    event.target.value = ''

    let error = ''
    const validos: File[] = []
    for (const f of nuevos) {
      if (f.type !== 'application/pdf') {
        error = `"${f.name}" no es un PDF.`
        continue
      }
      if (f.size > TAMANO_MAXIMO_DOC) {
        error = `"${f.name}" pesa más de 10 MB.`
        continue
      }
      if (documentos.some((d) => d.name === f.name && d.size === f.size)) continue
      validos.push(f)
    }

    const total = [...documentos, ...validos]
    if (total.length > MAX_DOCS) error = `Máximo ${MAX_DOCS} documentos.`
    setDocumentos(total.slice(0, MAX_DOCS))
    setMensaje(error)
  }

  function quitarDocumento(indice: number) {
    setDocumentos((d) => d.filter((_, i) => i !== indice))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMensaje('')

    if (contrasena.length < 8) return setMensaje('La contraseña debe tener al menos 8 caracteres.')
    if (tipo === 'trabajador' && !foto) {
      return setMensaje('Sube una foto de perfil para registrarte como profesional.')
    }
    if (tipo === 'trabajador' && seleccion.length === 0) {
      return setMensaje('Elige al menos un oficio para poder recibir solicitudes.')
    }
    if (tipo === 'trabajador' && documentos.length === 0) {
      return setMensaje('Sube al menos un PDF que avale tu experiencia.')
    }

    setCargando(true)
    try {
      const datos = new FormData()
      datos.set('tipo', tipo)
      datos.set('nombre', nombre)
      datos.set('correo', correo)
      datos.set('telefono', telefono)
      datos.set('contrasena', contrasena)
      if (foto) datos.set('archivo', foto) // si no se eligió foto, el servidor usa la de por defecto
      if (tipo === 'trabajador') {
        datos.set('especialidadIds', JSON.stringify(seleccion))
        datos.set('anosExperiencia', anos)
        datos.set('descripcion', descripcion)
        documentos.forEach((d) => datos.append('documentos', d))
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        body: datos, // sin header Content-Type: el navegador arma el multipart solo
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
  const anosNum = anos === '' ? null : Number(anos)

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

        {/* Foto de perfil: obligatoria para profesionales, opcional para clientes */}
        <div className="foto-picker">
          <button
            type="button"
            className="foto-circulo"
            onClick={() => inputFotoRef.current?.click()}
            aria-label={fotoPreview ? 'Cambiar foto de perfil' : 'Agregar foto de perfil'}
          >
            {fotoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fotoPreview} alt="" className="foto-preview" />
            ) : (
              <span className="foto-placeholder" aria-hidden="true">📷</span>
            )}
          </button>
          <input
            ref={inputFotoRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={elegirFoto}
            className="sr-only-input"
            aria-hidden="true"
            tabIndex={-1}
          />
          <div className="foto-texto">
            <p className="foto-titulo">
              Foto de perfil {esTrabajador ? '(obligatoria)' : '(opcional)'}
            </p>
            <p className="foto-ayuda">
              {fotoPreview
                ? 'Así te van a ver.'
                : esTrabajador
                  ? 'Los clientes confían más en perfiles con foto real.'
                  : 'Si no subes una, te asignamos una por defecto. Puedes cambiarla luego.'}
            </p>
            <div className="foto-botones">
              <button type="button" className="reg-link" onClick={() => inputFotoRef.current?.click()}>
                {fotoPreview ? 'Cambiar foto' : 'Elegir foto'}
              </button>
              {fotoPreview && (
                <button type="button" className="reg-link reg-link-quitar" onClick={quitarFoto}>
                  Quitar
                </button>
              )}
            </div>
          </div>
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

          <label htmlFor="telefono">
            Teléfono {esTrabajador ? '(los clientes te llamarán a este número)' : '(opcional)'}
          </label>
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
              {/* ───────── Oficios con autocompletado ───────── */}
              <fieldset className="oficio-fieldset">
                <legend>¿Qué oficios ofreces?</legend>

                {oficiosElegidos.length > 0 && (
                  <div className="oficio-tags" aria-live="polite">
                    {oficiosElegidos.map((o) => (
                      <button
                        type="button"
                        key={o.id}
                        className="oficio-tag"
                        onClick={() => quitarOficio(o.id)}
                        aria-label={`Quitar ${o.nombre}`}
                      >
                        {o.nombre} <span aria-hidden="true">×</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="oficio-combo" ref={comboRef}>
                  <input
                    type="text"
                    className="oficio-buscador"
                    value={busqueda}
                    onChange={(e) => {
                      setBusqueda(e.target.value)
                      setAbierto(true)
                      setActivo(0)
                    }}
                    onFocus={() => setAbierto(true)}
                    onKeyDown={teclasBuscador}
                    placeholder={
                      oficiosElegidos.length > 0
                        ? 'Agrega otro oficio…'
                        : 'Escribe tu oficio (ej. plomería, electricidad)'
                    }
                    role="combobox"
                    aria-label="Buscar oficio"
                    aria-expanded={abierto}
                    aria-controls="oficio-sugerencias"
                    aria-autocomplete="list"
                    aria-activedescendant={
                      abierto && sugerencias[activo] ? `oficio-op-${sugerencias[activo].id}` : undefined
                    }
                    autoComplete="off"
                    disabled={oficios === null && !errorOficios}
                  />
                  <span className="oficio-flecha" aria-hidden="true">⌄</span>

                  {abierto && oficios && (
                    <ul className="oficio-dropdown" id="oficio-sugerencias" role="listbox" ref={listaRef}>
                      {sugerencias.length > 0 ? (
                        sugerencias.map((o, i) => (
                          <li
                            key={o.id}
                            id={`oficio-op-${o.id}`}
                            role="option"
                            aria-selected={i === activo}
                            className={`oficio-opcion ${i === activo ? 'activa' : ''}`}
                            onMouseEnter={() => setActivo(i)}
                            onMouseDown={(e) => {
                              e.preventDefault() // evita que el input pierda el foco
                              elegirOficio(o.id)
                            }}
                          >
                            <span>{o.nombre}</span>
                            <span className="oficio-mas" aria-hidden="true">+ Agregar</span>
                          </li>
                        ))
                      ) : (
                        <li className="oficio-vacio" role="presentation">
                          {oficios.length === 0
                            ? 'Todavía no hay oficios registrados.'
                            : busqueda.trim()
                              ? `No encontramos “${busqueda.trim()}”. Prueba con otra palabra.`
                              : 'Ya elegiste todos los oficios disponibles.'}
                        </li>
                      )}
                    </ul>
                  )}
                </div>

                {oficios === null && !errorOficios && <p className="reg-hint">Cargando oficios…</p>}
                {errorOficios && (
                  <p className="reg-hint reg-hint-error">
                    No pudimos cargar los oficios.{' '}
                    <button
                      type="button"
                      className="reg-link"
                      onClick={() => {
                        setErrorOficios(false)
                        setIntento((n) => n + 1)
                      }}
                    >
                      Reintentar
                    </button>
                  </p>
                )}
                <p className="reg-hint">
                  {seleccion.length === 0
                    ? 'Escribe y elige de la lista. Puedes agregar varios oficios.'
                    : `${seleccion.length} ${seleccion.length === 1 ? 'oficio elegido' : 'oficios elegidos'}.`}
                </p>
              </fieldset>

              {/* ───────── Documentos ───────── */}
              <div className="docs-bloque">
                <p className="docs-titulo">Documentos que avalen tu experiencia</p>
                <p className="foto-ayuda">
                  Constancias, certificados, cartas de recomendación o cursos. Solo PDF, máximo 10 MB cada
                  uno (hasta {MAX_DOCS}).
                </p>

                <input
                  ref={inputDocsRef}
                  type="file"
                  accept="application/pdf"
                  multiple
                  onChange={elegirDocumentos}
                  className="sr-only-input"
                  aria-hidden="true"
                  tabIndex={-1}
                />

                <button
                  type="button"
                  className="docs-subir"
                  onClick={() => inputDocsRef.current?.click()}
                  disabled={documentos.length >= MAX_DOCS}
                >
                  {documentos.length === 0 ? 'Subir PDF' : 'Agregar otro PDF'}
                </button>

                {documentos.length > 0 && (
                  <ul className="docs-lista">
                    {documentos.map((d, i) => (
                      <li key={`${d.name}-${d.size}`}>
                        <span className="docs-nombre">{d.name}</span>
                        <span className="docs-peso">{formatoTamano(d.size)}</span>
                        <button
                          type="button"
                          className="reg-link reg-link-quitar"
                          onClick={() => quitarDocumento(i)}
                        >
                          Quitar
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* ───────── Años de experiencia (contador + atajos) ───────── */}
              <div className="anos-bloque" role="group" aria-labelledby="anos-titulo">
                <p className="docs-titulo" id="anos-titulo">Años de experiencia (opcional)</p>

                <div className="anos-stepper">
                  <button
                    type="button"
                    className="anos-btn"
                    onClick={() => cambiarAnos(-1)}
                    disabled={anosNum === null || anosNum <= 0}
                    aria-label="Restar un año"
                  >
                    −
                  </button>

                  <div className="anos-valor">
                    <input
                      id="anos"
                      name="anos"
                      className="anos-input"
                      type="text"
                      inputMode="numeric"
                      value={anos}
                      onChange={escribirAnos}
                      placeholder="0"
                      aria-label="Años de experiencia"
                      autoComplete="off"
                    />
                    <span className="anos-unidad">
                      {anosNum === 1 ? 'año' : 'años'}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="anos-btn"
                    onClick={() => cambiarAnos(1)}
                    disabled={anosNum !== null && anosNum >= MAX_ANOS}
                    aria-label="Sumar un año"
                  >
                    +
                  </button>
                </div>

                <div className="anos-chips">
                  {ANOS_RAPIDOS.map((a) => (
                    <button
                      type="button"
                      key={a.valor}
                      className={`anos-chip ${anos === String(a.valor) ? 'on' : ''}`}
                      onClick={() => setAnos(String(a.valor))}
                      aria-pressed={anos === String(a.valor)}
                    >
                      {a.etiqueta}
                    </button>
                  ))}
                </div>
              </div>

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

        {mensaje && (
          <p className="login-message" role="alert" ref={mensajeRef}>
            {mensaje}
          </p>
        )}

        {esTrabajador && (
          <p className="reg-hint reg-verif">
            Revisaremos tus documentos para darte la insignia de <strong>verificado</strong>. Mientras tanto ya puedes cotizar.
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