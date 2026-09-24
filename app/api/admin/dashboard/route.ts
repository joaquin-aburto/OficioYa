import { NextResponse } from 'next/server'
import prisma from '../../../lib/prisma'

// GET /api/admin/dashboard
// TODO: cuando tengas sesión real de administrador (cookie httpOnly), protege
// esta ruta verificando esa sesión en el servidor antes de responder.
export async function GET() {
  try {
    const ahora = new Date()
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
    const inicioMesPasado = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1)

    const [
      comisionMes,
      comisionMesPasado,
      comisionHistorica,
      comisionPendiente,
      pendientesVerificacion,
      verificados,
      pagosRecientes,
      totales,
      solicitudesPorEstado,
    ] = await Promise.all([
      prisma.comision.aggregate({
        where: { pago: { estado: 'Completado', fechaPago: { gte: inicioMes } } },
        _sum: { montoComision: true },
      }),
      prisma.comision.aggregate({
        where: { pago: { estado: 'Completado', fechaPago: { gte: inicioMesPasado, lt: inicioMes } } },
        _sum: { montoComision: true },
      }),
      prisma.comision.aggregate({
        where: { pago: { estado: 'Completado' } },
        _sum: { montoComision: true },
      }),
      prisma.comision.aggregate({
        where: { pago: { estado: 'Pendiente' } },
        _sum: { montoComision: true },
      }),
      prisma.trabajador.findMany({
        where: { verificado: false, activo: true },
        orderBy: { fechaRegistro: 'asc' },
        include: {
          especialidades: { include: { especialidad: { select: { id: true, nombre: true } } } },
        },
      }),
      prisma.trabajador.findMany({
        where: { verificado: true },
        orderBy: { fechaRegistro: 'desc' },
        take: 40,
        include: {
          especialidades: { include: { especialidad: { select: { id: true, nombre: true } } } },
          _count: {
            select: {
              solicitudes: { where: { estado: { in: ['Terminada', 'Calificada'] } } },
            },
          },
        },
      }),
      prisma.pago.findMany({
        orderBy: { fechaPago: 'desc' },
        take: 25,
        include: {
          comision: true,
          cliente: { select: { nombre: true } },
          trabajador: { select: { nombre: true } },
          solicitud: { select: { especialidad: { select: { nombre: true } } } },
        },
      }),
      Promise.all([
        prisma.usuario.count(),
        prisma.trabajador.count(),
        prisma.trabajador.count({ where: { verificado: false, activo: true } }),
        prisma.solicitud.count(),
      ]),
      prisma.solicitud.groupBy({ by: ['estado'], _count: { estado: true } }),
    ])

    const num = (d: unknown) => Number(d ?? 0)
    const [totalClientes, totalTrabajadores, totalPorVerificar, totalSolicitudes] = totales

    // Calificación promedio de cada trabajador verificado
    const ids = verificados.map((t) => t.id)
    const promedios = ids.length
      ? await prisma.calificacion.groupBy({
          by: ['trabajadorId'],
          where: { trabajadorId: { in: ids } },
          _avg: { puntuacion: true },
          _count: { puntuacion: true },
        })
      : []
    const ratingDe = (id: number) => {
      const r = promedios.find((p) => p.trabajadorId === id)
      return { calificacion: r?._avg.puntuacion ?? null, totalResenas: r?._count.puntuacion ?? 0 }
    }

    return NextResponse.json({
      comisiones: {
        esteMes: num(comisionMes._sum.montoComision),
        mesPasado: num(comisionMesPasado._sum.montoComision),
        historico: num(comisionHistorica._sum.montoComision),
        pendiente: num(comisionPendiente._sum.montoComision),
      },
      totales: {
        clientes: totalClientes,
        trabajadores: totalTrabajadores,
        porVerificar: totalPorVerificar,
        solicitudes: totalSolicitudes,
      },
      solicitudesPorEstado: Object.fromEntries(
        solicitudesPorEstado.map((s) => [s.estado, s._count.estado])
      ),
      pendientesVerificacion: pendientesVerificacion.map((t) => ({
        id: t.id,
        nombre: t.nombre,
        correo: t.correo,
        telefono: t.telefono,
        fotoPerfil: t.fotoPerfil,
        descripcion: t.descripcion,
        anosExperiencia: t.anosExperiencia,
        fechaRegistro: t.fechaRegistro,
        especialidades: t.especialidades.map((e) => e.especialidad),
      })),
      trabajadoresVerificados: verificados.map((t) => ({
        id: t.id,
        nombre: t.nombre,
        correo: t.correo,
        fotoPerfil: t.fotoPerfil,
        activo: t.activo,
        anosExperiencia: t.anosExperiencia,
        trabajosCompletados: t._count.solicitudes,
        especialidades: t.especialidades.map((e) => e.especialidad),
        ...ratingDe(t.id),
      })),
      pagosRecientes: pagosRecientes.map((p) => {
        const comision = num(p.comision?.montoComision)
        return {
          id: p.id,
          montoTotal: num(p.montoTotal),
          comision,
          neto: num(p.montoTotal) - comision,
          metodoPago: p.metodoPago,
          estado: p.estado,
          fechaPago: p.fechaPago,
          especialidad: p.solicitud.especialidad.nombre,
          cliente: p.cliente.nombre,
          trabajador: p.trabajador.nombre,
        }
      }),
    })
  } catch (error) {
    console.error('Error en dashboard admin:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}