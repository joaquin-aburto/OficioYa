import { NextResponse } from 'next/server'
import prisma from '../../../lib/prisma'
import { subirFotoPerfil } from '../../../lib/fotoPerfil'
import bcrypt from 'bcryptjs'


const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status })

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const campo = (nombre: string) => String(form.get(nombre) ?? '').trim()

    const tipo = campo('tipo') === 'trabajador' ? 'trabajador' : campo('tipo') === 'cliente' ? 'cliente' : null
    if (!tipo) return fail('Elige si te registras como cliente o como profesional.')

    const nombre = campo('nombre')
    const correo = campo('correo').toLowerCase()
    const contrasena = String(form.get('contrasena') ?? '')
    const telefonoDigitos = campo('telefono').replace(/\D/g, '')

    if (nombre.length < 2) return fail('Escribe tu nombre.')
    if (!CORREO.test(correo)) return fail('Escribe un correo válido.')
    if (contrasena.length < 8) return fail('La contraseña debe tener al menos 8 caracteres.')
    if (telefonoDigitos && (telefonoDigitos.length < 10 || telefonoDigitos.length > 15)) {
      return fail('El teléfono debe tener al menos 10 dígitos.')
    }
    const telefono = telefonoDigitos || null

    // El archivo es opcional: si no viene, form.get devuelve null y
    // subirFotoPerfil usa la foto por defecto de ese tipo de cuenta.
    const archivo = form.get('archivo')
    let fotoPerfil: string
    try {
      fotoPerfil = await subirFotoPerfil(tipo, archivo instanceof File ? archivo : null)
    } catch (e) {
      return fail(e instanceof Error ? e.message : 'No pudimos subir tu foto.')
    }

    const contrasenaHash = await bcrypt.hash(contrasena, 10)

    /* ------------------------------ Cliente ------------------------------ */
    if (tipo === 'cliente') {
      const existe = await prisma.usuario.findUnique({ where: { correo } })
      if (existe) return fail('Este correo ya está registrado como cliente.', 409)

      const usuario = await prisma.usuario.create({
        data: { nombre, correo, telefono, contrasenaHash, fotoPerfil },
        select: { id: true, nombre: true, correo: true },
      })
      return NextResponse.json(
        { message: 'Cuenta creada', user: { ...usuario, tipo } },
        { status: 201 }
      )
    }

    /* ----------------------------- Trabajador ----------------------------- */
    let especialidadIdsCrudo: unknown[] = []
    try {
      especialidadIdsCrudo = JSON.parse(campo('especialidadIds') || '[]')
    } catch {
      return fail('Elige al menos un oficio para poder recibir solicitudes.')
    }
    const ids: number[] = Array.from(
      new Set(
        (Array.isArray(especialidadIdsCrudo) ? especialidadIdsCrudo : [])
          .map((n) => Number(n))
          .filter((n) => Number.isInteger(n) && n > 0)
      )
    )
    if (ids.length === 0) return fail('Elige al menos un oficio para poder recibir solicitudes.')

    const validas = await prisma.especialidad.count({ where: { id: { in: ids } } })
    if (validas !== ids.length) return fail('Alguno de los oficios elegidos no es válido.')

    let anosExperiencia: number | null = null
    const anosCrudo = campo('anosExperiencia')
    if (anosCrudo !== '') {
      const n = Number(anosCrudo)
      if (!Number.isInteger(n) || n < 0 || n > 60) return fail('Los años de experiencia deben ser un número entre 0 y 60.')
      anosExperiencia = n
    }
    const descripcion = campo('descripcion').slice(0, 500) || null

    const existe = await prisma.trabajador.findUnique({ where: { correo } })
    if (existe) return fail('Este correo ya está registrado como profesional.', 409)

    const trabajador = await prisma.trabajador.create({
      data: {
        nombre,
        correo,
        telefono,
        contrasenaHash,
        fotoPerfil,
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