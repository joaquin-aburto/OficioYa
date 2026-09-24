import { NextResponse } from 'next/server'
import prisma from '../../../lib/prisma'
import { COMISION_PORCENTAJE } from '../../../lib/comision'

// GET /api/trabajador/dashboard?trabajadorId=1
// TODO: cuando tengas sesión (cookie httpOnly), toma el id de la sesión y no del query string.
export async function GET(req: Request) {
  try {
    const id = Number(new URL(req.url).searchParams.get('trabajadorId'))
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'trabajadorId inválido' }, { status: 400 })
    }

    const trabajador = await prisma.trabajador.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        fotoPerfil: true,
        descripcion: true,
        anosExperiencia: true,
        verificado: true,
        especialidades: {
          select: { especialidad: { select: { id: true, nombre: true, icono: true } } },
        },
      },
    })
    if (!trabajador) {
      return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 })
    }

    const especialidades = trabajador.especialidades.map((e) => e.especialidad)
    const espIds = especialidades.map((e) => e.id)

    const inicioMes = new Date()
    inicioMes.setDate(1)
    inicioMes.setHours(0, 0, 0, 0)

    const [
      leads,
      cotizaciones,
      trabajos,
      pagos,
      resenas,
      notas,
      servicios,
      disponibilidad,
      notificaciones,
      ingresosBrutos,
      comisionesMes,
      porCobrarBruto,
      comisionesPendientes,
      completados,
    ] = await Promise.all([
      // Solicitudes abiertas de mis oficios a las que todavía no cotizo
      prisma.solicitud.findMany({
        where: {
          estado: { in: ['Pendiente', 'Cotizada'] },
          especialidadId: { in: espIds },
          cotizaciones: { none: { trabajadorId: id } },
        },
        orderBy: [{ urgencia: 'desc' }, { fechaCreacion: 'desc' }],
        take: 30,
        include: {
          especialidad: { select: { id: true, nombre: true, icono: true } },
          direccion: { select: { colonia: true, ciudad: true } },
          cliente: { select: { nombre: true } },
          _count: { select: { cotizaciones: true } },
        },
      }),
      prisma.cotizacion.findMany({
        where: { trabajadorId: id },
        orderBy: { fechaEnvio: 'desc' },
        take: 30,
        include: {
          solicitud: {
            select: {
              id: true,
              descripcion: true,
              urgencia: true,
              estado: true,
              especialidad: { select: { nombre: true } },
            },
          },
        },
      }),
      // Trabajos que me asignaron
      prisma.solicitud.findMany({
        where: { trabajadorAsignadoId: id, estado: { in: ['Aceptada', 'EnCurso', 'Terminada'] } },
        orderBy: { fechaActualizacion: 'desc' },
        include: {
          especialidad: { select: { id: true, nombre: true, icono: true } },
          cliente: { select: { nombre: true, telefono: true } },
          direccion: {
            select: { alias: true, calle: true, colonia: true, ciudad: true, referencias: true },
          },
          cotizaciones: { where: { trabajadorId: id, estado: 'Aceptada' }, select: { monto: true } },
          pago: { select: { id: true, estado: true, metodoPago: true } },
        },
      }),
      prisma.pago.findMany({
        where: { trabajadorId: id },
        orderBy: { fechaPago: 'desc' },
        take: 15,
        include: {
          comision: true,
          solicitud: { select: { especialidad: { select: { nombre: true } } } },
        },
      }),
      prisma.calificacion.findMany({
        where: { trabajadorId: id },
        orderBy: { fecha: 'desc' },
        take: 6,
        include: { cliente: { select: { nombre: true } } },
      }),
      prisma.calificacion.aggregate({
        where: { trabajadorId: id },
        _avg: { puntuacion: true },
        _count: { puntuacion: true },
      }),
      prisma.servicio.findMany({
        where: { trabajadorId: id },
        orderBy: { id: 'asc' },
        include: { especialidad: { select: { id: true, nombre: true } } },
      }),
      prisma.disponibilidad.findMany({
        where: { trabajadorId: id },
        select: { diaSemana: true, horaInicio: true, horaFin: true },
      }),
      prisma.notificacion.findMany({
        where: { destinatarioTipo: 'Trabajador', destinatarioId: id },
        orderBy: { fechaCreacion: 'desc' },
        take: 8,
      }),
      // Ingresos del mes (cobros confirmados)
      prisma.pago.aggregate({
        where: { trabajadorId: id, estado: 'Completado', fechaPago: { gte: inicioMes } },
        _sum: { montoTotal: true },
      }),
      prisma.comision.aggregate({
        where: { pago: { trabajadorId: id, estado: 'Completado', fechaPago: { gte: inicioMes } } },
        _sum: { montoComision: true },
      }),
      // Por cobrar
      prisma.pago.aggregate({
        where: { trabajadorId: id, estado: 'Pendiente' },
        _sum: { montoTotal: true },
      }),
      prisma.comision.aggregate({
        where: { pago: { trabajadorId: id, estado: 'Pendiente' } },
        _sum: { montoComision: true },
      }),
      prisma.solicitud.count({
        where: { trabajadorAsignadoId: id, estado: { in: ['Terminada', 'Calificada'] } },
      }),
    ])

    const num = (d: unknown) => Number(d ?? 0)

    return NextResponse.json({
      trabajador: {
        id: trabajador.id,
        nombre: trabajador.nombre,
        fotoPerfil: trabajador.fotoPerfil,
        descripcion: trabajador.descripcion,
        anosExperiencia: trabajador.anosExperiencia,
        verificado: trabajador.verificado,
      },
      especialidades,
      comisionPorcentaje: COMISION_PORCENTAJE,
      resumen: {
        ingresosMes: num(ingresosBrutos._sum.montoTotal) - num(comisionesMes._sum.montoComision),
        porCobrar: num(porCobrarBruto._sum.montoTotal) - num(comisionesPendientes._sum.montoComision),
        trabajosCompletados: completados,
        calificacion: notas._avg.puntuacion,
        totalResenas: notas._count.puntuacion,
      },
      leads: leads.map((s) => ({
        id: s.id,
        descripcion: s.descripcion,
        urgencia: s.urgencia,
        fechaCreacion: s.fechaCreacion,
        fechaDeseada: s.fechaDeseada,
        especialidad: s.especialidad,
        // La dirección exacta solo se muestra cuando el cliente acepta tu cotización
        direccion: s.direccion,
        clienteNombre: s.cliente.nombre.split(' ')[0],
        totalCotizaciones: s._count.cotizaciones,
      })),
      cotizaciones: cotizaciones.map((c) => ({
        id: c.id,
        monto: num(c.monto),
        comentario: c.comentario,
        estado: c.estado,
        fechaEnvio: c.fechaEnvio,
        solicitud: c.solicitud,
      })),
      trabajos: trabajos.map((s) => ({
        id: s.id,
        descripcion: s.descripcion,
        urgencia: s.urgencia,
        estado: s.estado,
        fechaDeseada: s.fechaDeseada,
        especialidad: s.especialidad,
        cliente: s.cliente,
        direccion: s.direccion,
        monto: s.cotizaciones[0] ? num(s.cotizaciones[0].monto) : null,
        pago: s.pago,
      })),
      pagos: pagos.map((p) => {
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
        }
      }),
      resenas: resenas.map((r) => ({
        id: r.id,
        puntuacion: r.puntuacion,
        comentario: r.comentario,
        fecha: r.fecha,
        clienteNombre: r.cliente.nombre.split(' ')[0],
      })),
      servicios: servicios.map((s) => ({
        id: s.id,
        nombre: s.nombre,
        descripcion: s.descripcion,
        precioBase: num(s.precioBase),
        activo: s.activo,
        especialidad: s.especialidad,
      })),
      disponibilidad,
      notificaciones,
    })
  } catch (error) {
    console.error('Error en dashboard trabajador:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}