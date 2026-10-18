
'use client'

import { supabase } from './supabaseClient'

const BUCKET = 'ImagesOficioYa'
const CARPETA = 'OficioYa/Problemas'
const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp']
const TAMANO_MAXIMO = 5 * 1024 * 1024 
export const MAX_FOTOS = 5

export function validarFoto(archivo: File): string | null {
  if (!TIPOS_PERMITIDOS.includes(archivo.type)) return 'La foto debe ser JPG, PNG o WEBP.'
  if (archivo.size > TAMANO_MAXIMO) return 'Cada foto puede pesar máximo 5 MB.'
  return null
}

function extensionDe(tipoMime: string) {
  if (tipoMime === 'image/png') return 'png'
  if (tipoMime === 'image/webp') return 'webp'
  return 'jpg'
}



export async function subirFotosProblema(archivos: File[]): Promise<string[]> {
  const urls: string[] = []
  for (const archivo of archivos) {
    const ruta = `${CARPETA}/${crypto.randomUUID()}.${extensionDe(archivo.type)}`
    const { error } = await supabase.storage.from(BUCKET).upload(ruta, archivo, {
      contentType: archivo.type,
      upsert: false,
    })
    if (error) {
      console.error('Error al subir foto del problema:', error)
      throw new Error('No pudimos subir una de las fotos. Intenta de nuevo.')
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(ruta)
    urls.push(data.publicUrl)
  }
  return urls
}