import { createClient } from '@supabase/supabase-js'

// Cliente para el NAVEGADOR: usa la llave pública (publishable),
// así que solo puede hacer lo que permitan las políticas de Storage.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
)
