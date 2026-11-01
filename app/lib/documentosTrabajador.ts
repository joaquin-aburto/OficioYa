import { randomUUID } from 'crypto'
import { getSupabaseAdmin } from './supabaseAdmin'

// Nombre EXACTO del bucket en Supabase Storage.
const BUCKET = 'ImagesOficioYa'
const CARPETA = 'OficioYa/DocumentosTrabajadores'

// Carpeta dentro del bucket ('' = raíz del bucket).
// Si en realidad DocumentosTrabajadores es una CARPETA dentro de ImagesOficioYa
// (como OficioYa/Foto-worker), usa:
//   const BUCKET = 'ImagesOficioYa'
//   const CARPETA = 'OficioYa/DocumentosTrabajadores'


export const MAX_DOCS = 5
export const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

/** Devuelve un mensaje de error, o null si todo está bien. */
export async function validarPdfs(files: File[]): Promise<string | null> {
  if (files.length === 0) return 'Sube al menos un PDF que avale tu experiencia.'
  if (files.length > MAX_DOCS) return `Máximo ${MAX_DOCS} documentos.`

  for (const f of files) {
    if (f.size > MAX_BYTES) return `"${f.name}" pesa más de 10 MB.`
    if (f.type !== 'application/pdf') return `"${f.name}" no es un PDF.`
    // Verifica que realmente sea un PDF y no solo la extensión
    const inicio = new TextDecoder().decode(await f.slice(0, 5).arrayBuffer())
    if (inicio !== '%PDF-') return `"${f.name}" no es un PDF válido.`
  }
  return null
}

/** Sube los PDFs al bucket y devuelve lo que hay que guardar en la base de datos. */
export async function subirPdfs(trabajadorId: number, files: File[]) {
  const supabase = getSupabaseAdmin()
  const subidos: { nombreArchivo: string; ruta: string; tamano: number }[] = []

  for (const f of files) {
    const nombre = `${trabajadorId}/${randomUUID()}.pdf`
    const ruta = CARPETA ? `${CARPETA}/${nombre}` : nombre

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(ruta, Buffer.from(await f.arrayBuffer()), {
        contentType: 'application/pdf',
        upsert: false,
      })
    if (error) {
      console.error('Error al subir documento a Supabase:', error)
      throw new Error(error.message)
    }
    subidos.push({ nombreArchivo: f.name, ruta, tamano: f.size })
  }
  return subidos
}

/** Para que un admin vea un documento (si el bucket es privado). Dura 5 minutos. */
export async function urlFirmadaDocumento(ruta: string) {
  const { data, error } = await getSupabaseAdmin().storage.from(BUCKET).createSignedUrl(ruta, 300)
  if (error) throw new Error(error.message)
  return data.signedUrl
}