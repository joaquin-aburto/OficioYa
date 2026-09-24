import { NextResponse } from 'next/server'
import prisma from '../../../lib/prisma'
import bcrypt from 'bcryptjs'

// POST /api/auth/login
// Un solo formulario de correo + contraseña para los tres tipos de cuenta.
// Prueba en este orden: administrador (variables de entorno) → cliente →
// trabajador, y responde cuál tipo de cuenta encontró en "tipo".
//
// Nota: como Usuario y Trabajador son tablas separadas, en teoría el mismo
// correo podría existir en ambas con contraseñas distintas. Por eso no basta
// con buscar el correo: se prueba la contraseña contra cada tabla hasta que
// una haga match.

const MENSAJE_GENERICO = 'Correo o contraseña incorrectos.'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const correo = String(body.correo ?? '').trim().toLowerCase()
    const contrasena = String(body.contrasena ?? '')

    if (!correo || !contrasena) {
      return NextResponse.json({ error: 'Escribe tu correo y contraseña.' }, { status: 400 })
    }

    /* -------------------------------- Admin -------------------------------- */
    const correoAdmin = process.env.ADMIN_CORREO?.trim().toLowerCase()
    console.log('[debug admin] ADMIN_CORREO leído:', JSON.stringify(correoAdmin))
    console.log('[debug admin] correo escrito en el form:', JSON.stringify(correo))
    if (correoAdmin && correo === correoAdmin) {
      const hashAdmin = process.env.ADMIN_CONTRASENA_HASH
      const contrasenaPlanaAdmin = process.env.ADMIN_CONTRASENA

      console.log('[debug admin] hashAdmin definido:', Boolean(hashAdmin))
      console.log('[debug admin] hashAdmin (primeros 10 chars):', hashAdmin?.slice(0, 10))
      console.log('[debug admin] hashAdmin longitud:', hashAdmin?.length, '(debe ser 60)')
      console.log('[debug admin] contrasena escrita en el form:', JSON.stringify(contrasena))

      if (!hashAdmin && !contrasenaPlanaAdmin) {
        console.error('Faltan variables de entorno ADMIN_CONTRASENA_HASH / ADMIN_CONTRASENA')
        return NextResponse.json({ error: 'El acceso de administrador no está configurado.' }, { status: 500 })
      }

      const ok = hashAdmin ? await bcrypt.compare(contrasena, hashAdmin) : contrasena === contrasenaPlanaAdmin
      console.log('[debug admin] resultado de bcrypt.compare:', ok)
      if (!ok) return NextResponse.json({ error: MENSAJE_GENERICO }, { status: 401 })

      return NextResponse.json({
        message: 'Login exitoso',
        tipo: 'admin',
        user: { correo: correoAdmin, nombre: 'Administrador' },
      })
    }

    /* ------------------------------- Cliente ------------------------------- */
    const usuario = await prisma.usuario.findUnique({ where: { correo } })
    if (usuario && usuario.activo && (await bcrypt.compare(contrasena, usuario.contrasenaHash))) {
      return NextResponse.json({
        message: 'Login exitoso',
        tipo: 'cliente',
        user: { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo },
      })
    }

    /* ------------------------------ Trabajador ------------------------------ */
    const trabajador = await prisma.trabajador.findUnique({ where: { correo } })
    if (trabajador && trabajador.activo && (await bcrypt.compare(contrasena, trabajador.contrasenaHash))) {
      return NextResponse.json({
        message: 'Login exitoso',
        tipo: 'trabajador',
        user: { id: trabajador.id, nombre: trabajador.nombre, correo: trabajador.correo },
      })
    }

    // No revela si el correo existe o no, ni en cuál tabla, para no filtrar información
    return NextResponse.json({ error: MENSAJE_GENERICO }, { status: 401 })
  } catch (error) {
    console.error('Error en login:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}