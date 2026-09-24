import { NextResponse } from 'next/server'
import prisma from '../../../lib/prisma'
import bcrypt from 'bcryptjs'

// POST /api/auth/register
// Body: { tipo: 'cliente' | 'trabajador', nombre, correo, telefono?, contrasena,
//         // solo trabajador:
//         especialidadIds: number[], anosExperiencia?, descripcion? }

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status })

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const tipo = body.tipo === 'trabajador' ? 'trabajador' : body.tipo === 'cliente' ? 'cliente' : null
    if (!tipo) return fail('Elige si te registras como cliente o como profesional.')

    const nombre = String(body.nombre ?? '').trim()
    const correo = String(body.correo ?? '').trim().toLowerCase()
    const contrasena = String(body.contrasena ?? '')
    const telefonoDigitos = String(body.telefono ?? '').replace(/\D/g, '')

    if (nombre.length < 2) return fail('Escribe tu nombre.')
    if (!CORREO.test(correo)) return fail('Escribe un correo válido.')
    if (contrasena.length < 8) return fail('La contraseña debe tener al menos 8 caracteres.')
    if (telefonoDigitos && (telefonoDigitos.length < 10 || telefonoDigitos.length > 15)) {
      return fail('El teléfono debe tener al menos 10 dígitos.')
    }
    const telefono = telefonoDigitos || null

    const contrasenaHash = await bcrypt.hash(contrasena, 10)

    /* ------------------------------ Cliente ------------------------------ */
    if (tipo === 'cliente') {
      const existe = await prisma.usuario.findUnique({ where: { correo } })
      if (existe) return fail('Este correo ya está registrado como cliente.', 409)

      const usuario = await prisma.usuario.create({
        data: { nombre, correo, telefono, contrasenaHash },
        select: { id: true, nombre: true, correo: true },
      })
      return NextResponse.json(
        { message: 'Cuenta creada', user: { ...usuario, tipo } },
        { status: 201 }
      )
    }

    /* ----------------------------- Trabajador ----------------------------- */
    const ids: number[] = Array.from(
      new Set(
        (Array.isArray(body.especialidadIds) ? body.especialidadIds : [])
          .map((n: unknown) => Number(n))
          .filter((n: number) => Number.isInteger(n) && n > 0)
      )
    )
    if (ids.length === 0) return fail('Elige al menos un oficio para poder recibir solicitudes.')

    const validas = await prisma.especialidad.count({ where: { id: { in: ids } } })
    if (validas !== ids.length) return fail('Alguno de los oficios elegidos no es válido.')

    let anosExperiencia: number | null = null
    if (body.anosExperiencia !== undefined && body.anosExperiencia !== null && body.anosExperiencia !== '') {
      const n = Number(body.anosExperiencia)
      if (!Number.isInteger(n) || n < 0 || n > 60) return fail('Los años de experiencia deben ser un número entre 0 y 60.')
      anosExperiencia = n
    }
    const descripcion = String(body.descripcion ?? '').trim().slice(0, 500) || null

    const existe = await prisma.trabajador.findUnique({ where: { correo } })
    if (existe) return fail('Este correo ya está registrado como profesional.', 409)

    const trabajador = await prisma.trabajador.create({
      data: {
        nombre,
        correo,
        telefono,
        contrasenaHash,
        anosExperiencia,
        descripcion,
        // verificado queda en false hasta que lo revises
        especialidades: { create: ids.map((especialidadId) => ({ especialidadId })) },
      },
      select: { id: true, nombre: true, correo: true },
    })

    return NextResponse.json(
      { message: 'Cuenta creada', user: { ...trabajador, tipo } },
      { status: 201 }
    )
  } catch (error) {
    // Por si dos registros con el mismo correo llegan al mismo tiempo
    if ((error as { code?: string })?.code === 'P2002') {
      return fail('Este correo ya está registrado.', 409)
    }
    console.error('Error en registro:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}