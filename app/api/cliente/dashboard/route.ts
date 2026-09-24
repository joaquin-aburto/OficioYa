import { NextResponse } from 'next/server'
import prisma from '../../../lib/prisma'

// GET /api/cliente/dashboard?usuarioId=1
// TODO: cuando tengas sesión (cookie httpOnly), lee el usuarioId de la sesión
// y no del query string, para que nadie pueda ver datos de otro cliente.
export async function GET(req: Request) {
  try {
    const usuarioId = Number(new URL(req.url).searchParams.get('usuarioId'))
    if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
      return NextResponse.json({ error: 'usuarioId inválido' }, { status: 400 })
    }

    const [usuario, solicitudes, direcciones, especialidades, notificaciones, candidatos] =
      await Promise.all([
        prisma.usuario.findUnique({
          where: { id: usuarioId },
          select: { id: true, nombre: true, fotoPerfil: true },
        }),
        prisma.solicitud.findMany({
          where: { clienteId: usuarioId },
          orderBy: { fechaCreacion: 'desc' },
          take: 30,
          include: {
            especialidad: { select: { id: true, nombre: true, icono: true } },
            direccion: { select: { alias: true, calle: true, colonia: true } },
            trabajadorAsignado: {
              select: { id: true, nombre: true, fotoPerfil: true, telefono: true },
            },
            cotizaciones: {
              orderBy: { fechaEnvio: 'desc' },
              include: {
                trabajador: {
                  select: { id: true, nombre: true, fotoPerfil: true, verificado: true },
                },
              },
            },
            calificacion: { select: { id: true } },
          },
        }),
        prisma.direccion.findMany({
          where: { usuarioId },
          select: { id: true, alias: true, calle: true, colonia: true, ciudad: true },
        }),
        prisma.especialidad.findMany({
          orderBy: { nombre: 'asc' },
          select: { id: true, nombre: true, descripcion: true, icono: true },
        }),
        prisma.notificacion.findMany({
          where: { destinatarioTipo: 'Usuario', destinatarioId: usuarioId },
          orderBy: { fechaCreacion: 'desc' },
          take: 8,
        }),
        prisma.trabajador.findMany({
          where: { activo: true, verificado: true },
          take: 24,
          include: {
            especialidades: {
              include: { especialidad: { select: { id: true, nombre: true } } },
            },
            servicios: { where: { activo: true }, select: { precioBase: true } },
          },
        }),
      ])

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Promedio de calificaciones de todos los trabajadores que aparecen en pantalla
    const idsTrabajadores = new Set<number>(candidatos.map((t) => t.id))
    solicitudes.forEach((s) => s.cotizaciones.forEach((c) => idsTrabajadores.add(c.trabajadorId)))

    const promedios = await prisma.calificacion.groupBy({
      by: ['trabajadorId'],
      where: { trabajadorId: { in: Array.from(idsTrabajadores) } },
      _avg: { puntuacion: true },
      _count: { puntuacion: true },
    })
    const ratingDe = (id: number) => {
      const r = promedios.find((p) => p.trabajadorId === id)
      return {
        calificacion: r?._avg.puntuacion ?? null,
        totalResenas: r?._count.puntuacion ?? 0,
      }
    }

    const profesionales = candidatos
      .map((t) => {
        const precios = t.servicios.map((s) => Number(s.precioBase))
        return {
          id: t.id,
          nombre: t.nombre,
          fotoPerfil: t.fotoPerfil,
          descripcion: t.descripcion,
          anosExperiencia: t.anosExperiencia,
          verificado: t.verificado,
          especialidades: t.especialidades.map((e) => e.especialidad),
          precioDesde: precios.length ? Math.min(...precios) : null,
          ...ratingDe(t.id),
        }
      })
      .sort(
        (a, b) =>
          (b.calificacion ?? 0) - (a.calificacion ?? 0) ||
          (b.anosExperiencia ?? 0) - (a.anosExperiencia ?? 0)
      )
      .slice(0, 12)

    const solicitudesOut = solicitudes.map((s) => ({
      id: s.id,
      descripcion: s.descripcion,
      urgencia: s.urgencia,
      estado: s.estado,
      fechaCreacion: s.fechaCreacion,
      fechaDeseada: s.fechaDeseada,
      especialidad: s.especialidad,
      direccion: s.direccion,
      trabajadorAsignado: s.trabajadorAsignado,
      yaCalificada: Boolean(s.calificacion),
      cotizaciones: s.cotizaciones.map((c) => ({
        id: c.id,
        solicitudId: c.solicitudId,
        monto: Number(c.monto),
        comentario: c.comentario,
        estado: c.estado,
        fechaEnvio: c.fechaEnvio,
        trabajador: { ...c.trabajador, ...ratingDe(c.trabajadorId) },
      })),
    }))

    return NextResponse.json({
      usuario,
      solicitudes: solicitudesOut,
      direcciones,
      especialidades,
      notificaciones,
      profesionales,
    })
  } catch (error) {
    console.error('Error en dashboard cliente:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}