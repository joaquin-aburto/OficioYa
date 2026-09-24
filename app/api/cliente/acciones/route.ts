import { NextResponse } from 'next/server'
import prisma from '../../../lib/prisma'

// POST /api/cliente/acciones
// Body: { usuarioId, accion, ...datos }
// TODO: igual que en el dashboard, toma usuarioId de la sesión cuando la tengas.

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status })

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const usuarioId = Number(body.usuarioId)
    if (!Number.isInteger(usuarioId) || usuarioId <= 0) return fail('usuarioId inválido')

    switch (body.accion) {
      /* ---------------------------------------------------------- */
      case 'crearSolicitud': {
        const especialidadId = Number(body.especialidadId)
        const descripcion = String(body.descripcion ?? '').trim()
        const urgencia = body.urgencia === 'Urgente' ? 'Urgente' : 'Normal'

        if (!especialidadId) return fail('Elige el tipo de oficio.')
        if (descripcion.length < 10) return fail('Cuéntanos un poco más del problema (mínimo 10 caracteres).')

        // Dirección existente o nueva
        let direccionId = Number(body.direccionId)
        if (!direccionId) {
          const nueva = body.direccionNueva
          if (!nueva?.calle?.trim()) return fail('Agrega la dirección donde se necesita el servicio.')
          const creada = await prisma.direccion.create({
            data: {
              usuarioId,
              alias: nueva.alias?.trim() || 'Casa',
              calle: nueva.calle.trim(),
              colonia: nueva.colonia?.trim() || null,
              ciudad: nueva.ciudad?.trim() || null,
            },
          })
          direccionId = creada.id
        } else {
          const dir = await prisma.direccion.findFirst({ where: { id: direccionId, usuarioId } })
          if (!dir) return fail('Dirección no válida.', 403)
        }

        const solicitud = await prisma.solicitud.create({
          data: {
            clienteId: usuarioId,
            direccionId,
            especialidadId,
            descripcion,
            urgencia,
            fechaDeseada: body.fechaDeseada ? new Date(body.fechaDeseada) : null,
          },
        })

        // Avisar a los trabajadores de esa especialidad
        const trabajadores = await prisma.trabajadorEspecialidad.findMany({
          where: { especialidadId, trabajador: { activo: true } },
          select: { trabajadorId: true },
        })
        if (trabajadores.length) {
          await prisma.notificacion.createMany({
            data: trabajadores.map((t) => ({
              destinatarioTipo: 'Trabajador' as const,
              destinatarioId: t.trabajadorId,
              tipo: 'NuevaSolicitud' as const,
              mensaje:
                urgencia === 'Urgente'
                  ? `Solicitud urgente #${solicitud.id}: ${descripcion.slice(0, 80)}`
                  : `Nueva solicitud #${solicitud.id}: ${descripcion.slice(0, 80)}`,
            })),
          })
        }

        return NextResponse.json({ ok: true, solicitudId: solicitud.id, avisados: trabajadores.length })
      }

      /* ---------------------------------------------------------- */
      case 'aceptarCotizacion':
      case 'rechazarCotizacion': {
        const cotizacionId = Number(body.cotizacionId)
        const cot = await prisma.cotizacion.findUnique({
          where: { id: cotizacionId },
          include: { solicitud: true },
        })
        if (!cot) return fail('Cotización no encontrada.', 404)
        if (cot.solicitud.clienteId !== usuarioId) return fail('No autorizado.', 403)
        if (cot.estado !== 'Enviada') return fail('Esta cotización ya fue respondida.', 409)

        if (body.accion === 'aceptarCotizacion') {
          await prisma.$transaction([
            prisma.cotizacion.update({ where: { id: cot.id }, data: { estado: 'Aceptada' } }),
            prisma.cotizacion.updateMany({
              where: { solicitudId: cot.solicitudId, id: { not: cot.id }, estado: 'Enviada' },
              data: { estado: 'Rechazada' },
            }),
            prisma.solicitud.update({
              where: { id: cot.solicitudId },
              data: { estado: 'Aceptada', trabajadorAsignadoId: cot.trabajadorId },
            }),
            prisma.notificacion.create({
              data: {
                destinatarioTipo: 'Trabajador',
                destinatarioId: cot.trabajadorId,
                tipo: 'Cotizacion',
                mensaje: `Aceptaron tu cotización de la solicitud #${cot.solicitudId}.`,
              },
            }),
          ])
        } else {
          await prisma.$transaction([
            prisma.cotizacion.update({ where: { id: cot.id }, data: { estado: 'Rechazada' } }),
            prisma.notificacion.create({
              data: {
                destinatarioTipo: 'Trabajador',
                destinatarioId: cot.trabajadorId,
                tipo: 'Cotizacion',
                mensaje: `Tu cotización de la solicitud #${cot.solicitudId} no fue elegida.`,
              },
            }),
          ])
        }
        return NextResponse.json({ ok: true })
      }

      /* ---------------------------------------------------------- */
      case 'cancelarSolicitud': {
        const solicitudId = Number(body.solicitudId)
        const sol = await prisma.solicitud.findUnique({ where: { id: solicitudId } })
        if (!sol) return fail('Solicitud no encontrada.', 404)
        if (sol.clienteId !== usuarioId) return fail('No autorizado.', 403)
        if (!['Pendiente', 'Cotizada'].includes(sol.estado)) {
          return fail('Solo puedes cancelar solicitudes que aún no tienen profesional confirmado.', 409)
        }
        await prisma.$transaction([
          prisma.solicitud.update({ where: { id: sol.id }, data: { estado: 'Cancelada' } }),
          prisma.cotizacion.updateMany({
            where: { solicitudId: sol.id, estado: 'Enviada' },
            data: { estado: 'Rechazada' },
          }),
        ])
        return NextResponse.json({ ok: true })
      }

      /* ---------------------------------------------------------- */
      case 'calificar': {
        const solicitudId = Number(body.solicitudId)
        const puntuacion = Number(body.puntuacion)
        if (!Number.isInteger(puntuacion) || puntuacion < 1 || puntuacion > 5) {
          return fail('La calificación debe ser de 1 a 5.')
        }
        const sol = await prisma.solicitud.findUnique({ where: { id: solicitudId } })
        if (!sol) return fail('Solicitud no encontrada.', 404)
        if (sol.clienteId !== usuarioId) return fail('No autorizado.', 403)
        if (sol.estado !== 'Terminada' || !sol.trabajadorAsignadoId) {
          return fail('Solo puedes calificar servicios terminados.', 409)
        }
        await prisma.$transaction([
          prisma.calificacion.create({
            data: {
              solicitudId: sol.id,
              clienteId: usuarioId,
              trabajadorId: sol.trabajadorAsignadoId,
              puntuacion,
              comentario: body.comentario?.toString().trim() || null,
            },
          }),
          prisma.solicitud.update({ where: { id: sol.id }, data: { estado: 'Calificada' } }),
          prisma.notificacion.create({
            data: {
              destinatarioTipo: 'Trabajador',
              destinatarioId: sol.trabajadorAsignadoId,
              tipo: 'Calificacion',
              mensaje: `Recibiste ${puntuacion} de 5 estrellas en la solicitud #${sol.id}.`,
            },
          }),
        ])
        return NextResponse.json({ ok: true })
      }

      default:
        return fail('Acción no reconocida.')
    }
  } catch (error) {
    console.error('Error en acciones cliente:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}