'use client'

import { useEffect, useState } from 'react'

type Doc = {
  id: number
  nombreArchivo: string
  tamano: number
  fechaSubida: string
  url: string
}

const formatoTamano = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`

export default function DocumentosModal({
  trabajador,
  onClose,
}: {
  trabajador: { id: number; nombre: string }
  onClose: () => void
}) {
  const [docs, setDocs] = useState<Doc[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let vivo = true
    fetch(`/api/admin/documentos?trabajadorId=${trabajador.id}`, { cache: 'no-store' })
      .then(async (r) => {
        const json = await r.json()
        if (!r.ok) throw new Error(json.error)
        if (vivo) setDocs(json.documentos ?? [])
      })
      .catch(() => vivo && setError('No pudimos cargar los documentos. Intenta de nuevo.'))
    return () => {
      vivo = false
    }
  }, [trabajador.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-sm" role="dialog" aria-modal="true" aria-labelledby="docs-title">
        <div className="modal-head">
          <h2 id="docs-title">Documentos de {trabajador.nombre}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>

        {docs === null && !error && <p className="muted small">Cargando documentos…</p>}
        {error && <p className="form-aviso" role="alert">{error}</p>}
        {docs?.length === 0 && (
          <p className="vacio">Este trabajador no subió documentos.</p>
        )}

        {docs && docs.length > 0 && (
          <ul className="fila-list">
            {docs.map((d) => (
              <li key={d.id} className="fila">
                <div className="fila-main">
                  <strong>{d.nombreArchivo}</strong>
                  <span className="muted small">{formatoTamano(d.tamano)}</span>
                </div>
                <div className="fila-side">
                  <a className="btn btn-ghost btn-sm" href={d.url} target="_blank" rel="noopener noreferrer">
                    Abrir PDF
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}

        {docs && docs.length > 0 && (
          <p className="muted small">Los enlaces expiran a los 5 minutos. Si dejan de abrir, cierra y vuelve a abrir esta ventana.</p>
        )}
      </div>
    </div>
  )
}