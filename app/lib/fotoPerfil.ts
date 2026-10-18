import { randomUUID } from 'crypto'
import { getSupabaseAdmin } from './supabaseAdmin'

// Debe ser exactamente el nombre de tu bucket en Supabase Storage
const BUCKET = 'ImagesOficioYa'

// Coincide con las rutas que ya usas en el dashboard de Supabase:
// .../buckets/ImagesOficioYa?path=OficioYa%2FFoto-worker
// .../buckets/ImagesOficioYa?path=OficioYa%2FFoto-user
const CARPETA: Record<'cliente' | 'trabajador', string> = {
  cliente: 'OficioYa/Foto-user',
  trabajador: 'OficioYa/Foto-worker',
}

// Fotos que se usan cuando la persona no sube ninguna al registrarse.
// TODO: sube una imagen a cada una de esas dos carpetas (por ejemplo desde
// el mismo panel de Supabase que me pasaste) con estos nombres exactos, o
// cambia el nombre de archivo aquí para que coincida con el que subas.
const FOTO_DEFAULT: Record<'cliente' | 'trabajador', string> = {
  cliente: `https://jqhlnwusmwtqxxvtitht.supabase.co/storage/v1/object/public/${BUCKET}/OficioYa/Foto-user/default.png`,
  trabajador: `https://jqhlnwusmwtqxxvtitht.supabase.co/storage/v1/object/public/${BUCKET}/OficioYa/Foto-worker/default.png`,
}

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp']
const TAMANO_MAXIMO = 5 * 1024 * 1024 // 5 MB

function extensionDe(tipoMime: string) {
  if (tipoMime === 'image/png') return 'png'
  if (tipoMime === 'image/webp') return 'webp'
  return 'jpg'
}

/**
 * Sube una foto de perfil a Supabase Storage y devuelve su URL pública.
 * Si no se sube ninguna foto (archivo es null/vacío), devuelve la foto
 * por defecto de ese tipo de cuenta.
 *
 * Lanza un Error con un mensaje ya listo para mostrar al usuario si el
 * archivo no es válido o si falla la subida.
 */
export async function subirFotoPerfil(
  tipo: 'cliente' | 'trabajador',
  archivo: File | null
): Promise<string> {
  if (!archivo || archivo.size === 0) {
    return FOTO_DEFAULT[tipo]
  }

  if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
    throw new Error('La foto debe ser JPG, PNG o WEBP.')
  }
  if (archivo.size > TAMANO_MAXIMO) {
    throw new Error('La foto no puede pesar más de 5 MB.')
  }

  const ruta = `${CARPETA[tipo]}/${randomUUID()}.${extensionDe(archivo.type)}`
  const buffer = Buffer.from(await archivo.arrayBuffer())

  const supabaseAdmin = getSupabaseAdmin()
  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(ruta, buffer, { contentType: archivo.type, upsert: false })

  if (error) {
    console.error('Error al subir foto de perfil a Supabase:', error)
    throw new Error('No pudimos subir tu foto. Intenta con otra imagen.')
  }

  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(ruta)
  return data.publicUrl
}