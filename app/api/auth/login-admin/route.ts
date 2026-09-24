import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

// POST /api/auth/login-admin
// No existe una tabla "Admin" en el esquema de Prisma, así que este login
// compara contra variables de entorno. Es un punto de partida, NO una
// solución final: antes de producción reemplázalo por una tabla Admin real
// (con su propio hash por persona) o por un proveedor de autenticación.
//
// Variables que debes definir en tu .env:
//   ADMIN_CORREO=admin@oficioya.com
//   ADMIN_CONTRASENA_HASH=  ← genera con: node -e "console.log(require('bcryptjs').hashSync('tu-contraseña', 10))"
//
// Si no defines ADMIN_CONTRASENA_HASH, como respaldo temporal se acepta
// ADMIN_CONTRASENA en texto plano (solo para desarrollo local).

export async function POST(req: Request) {
  try {
    const { correo, contrasena } = await req.json()
    if (!correo || !contrasena) {
      return NextResponse.json({ error: 'Escribe tu correo y contraseña.' }, { status: 400 })
    }

    const correoAdmin = process.env.ADMIN_CORREO
    const hashAdmin = process.env.ADMIN_CONTRASENA_HASH
    const contrasenaPlanaAdmin = process.env.ADMIN_CONTRASENA

    if (!correoAdmin || (!hashAdmin && !contrasenaPlanaAdmin)) {
      console.error('Faltan variables de entorno ADMIN_CORREO / ADMIN_CONTRASENA_HASH')
      return NextResponse.json({ error: 'El acceso de administrador no está configurado.' }, { status: 500 })
    }

    const correoOk = String(correo).trim().toLowerCase() === correoAdmin.trim().toLowerCase()
    const contrasenaOk = hashAdmin
      ? await bcrypt.compare(contrasena, hashAdmin)
      : contrasena === contrasenaPlanaAdmin

    // Mismo mensaje para "correo no existe" y "contraseña incorrecta"
    if (!correoOk || !contrasenaOk) {
      return NextResponse.json({ error: 'Correo o contraseña incorrectos.' }, { status: 401 })
    }

    return NextResponse.json({ message: 'Login exitoso', user: { correo: correoAdmin, nombre: 'Administrador' } })
  } catch (error) {
    console.error('Error en login de administrador:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}