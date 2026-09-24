import { NextResponse } from 'next/server'
import prisma from '../../../lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const correo = String(body.correo ?? '').trim().toLowerCase() 
    const contrasena = String(body.contrasena ?? '')
    if (!correo || !contrasena) {
      return NextResponse.json({ error: 'Escribe tu correo y contraseña.' }, { status: 400 })
    }

    const trabajador = await prisma.trabajador.findUnique({ where: { correo } })
    const valido =
      trabajador && trabajador.activo && (await bcrypt.compare(contrasena, trabajador.contrasenaHash))

    // Mismo mensaje para "no existe" y "contraseña incorrecta": no revela qué correos están registrados
    if (!trabajador || !valido) {
      return NextResponse.json({ error: 'Correo o contraseña incorrectos.' }, { status: 401 })
    }

    return NextResponse.json({
      message: 'Login exitoso',
      user: { id: trabajador.id, nombre: trabajador.nombre, correo: trabajador.correo },
    })
  } catch (error) {
    console.error('Error en login de trabajador:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}