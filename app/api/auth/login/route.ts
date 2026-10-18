import { NextResponse } from 'next/server'
import prisma from '../../../lib/prisma'
import bcrypt from 'bcryptjs'



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
    if (correoAdmin && correo === correoAdmin) {
      const hashAdmin = process.env.ADMIN_CONTRASENA_HASH
      const contrasenaPlanaAdmin = process.env.ADMIN_CONTRASENA

      if (!hashAdmin && !contrasenaPlanaAdmin) {
        console.error('Faltan variables de entorno ADMIN_CONTRASENA_HASH / ADMIN_CONTRASENA')
        return NextResponse.json({ error: 'El acceso de administrador no está configurado.' }, { status: 500 })
      }
      // Un hash de bcrypt válido siempre mide 60 caracteres y empieza con $2a$, $2b$ o $2y$.
      // Si no cumple esto, seguro se corrompió al copiarlo (el $ se interpretó en una terminal).
      if (hashAdmin && !/^\$2[aby]\$\d{2}\$.{53}$/.test(hashAdmin)) {
        console.error(
          `ADMIN_CONTRASENA_HASH no tiene formato de bcrypt válido (longitud ${hashAdmin.length}, debe ser 60). ` +
            'Vuelve a generarlo y pégalo directo en el .env, sin pasarlo por una terminal.'
        )
        return NextResponse.json({ error: 'El acceso de administrador no está configurado correctamente.' }, { status: 500 })
      }

      const ok = hashAdmin ? await bcrypt.compare(contrasena, hashAdmin) : contrasena === contrasenaPlanaAdmin
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