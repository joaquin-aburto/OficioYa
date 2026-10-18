import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Cliente de Supabase para uso EXCLUSIVO en rutas de servidor (app/api/**).
// Usa la "service role key", que puede escribir en cualquier bucket sin
// depender de políticas RLS.
//
// ADVERTENCIA: nunca importes este archivo desde un componente 'use client',
// nunca expongas SUPABASE_SERVICE_ROLE_KEY en una variable NEXT_PUBLIC_*, y
// nunca la pegues en código que vaya al navegador. Quien tenga esta llave
// puede leer y escribir cualquier cosa en tu proyecto de Supabase.

let cliente: SupabaseClient | null = null

// Se crea la primera vez que se pide (no al importar el archivo), así una
// variable faltante solo afecta a quien realmente sube una foto, y el error
// dice exactamente qué falta.
export function getSupabaseAdmin(): SupabaseClient {
  if (cliente) return cliente

  const supabaseUrl = process.env.SUPABASE_URL?.trim()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  const faltantes = [
    !supabaseUrl && 'SUPABASE_URL',
    !serviceRoleKey && 'SUPABASE_SERVICE_ROLE_KEY',
  ].filter(Boolean)

  if (faltantes.length > 0) {
    console.error(`Faltan variables de entorno: ${faltantes.join(', ')}. Agrégalas al .env y reinicia el servidor.`)
    throw new Error('El almacenamiento de fotos no está configurado.')
  }

  cliente = createClient(supabaseUrl!, serviceRoleKey!, {
    auth: { persistSession: false },
  })
  return cliente
}