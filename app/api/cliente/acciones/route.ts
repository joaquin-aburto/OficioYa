import { NextResponse } from 'next/server'
import prisma from '../../../lib/prisma'
import { COMISION_PORCENTAJE } from '../../../lib/comision'

// POST /api/cliente/acciones
// Body: { usuarioId, accion, ...datos }
// TODO: igual que en el dashboard, toma usuarioId de la sesión cuando la tengas.

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status })

const METODOS = ['Tarjeta', 'Efectivo', 'Transferencia'] as const

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

  // Fotos del problema: solo URLs de tu bucket, máximo 5
  const fotos: string[] = Array.isArray(body.fotos)
    ? body.fotos
        .filter(
          (u: unknown): u is string =>
            typeof u === 'string' &&
            u.startsWith(
              'https://jqhlnwusmwtqxxvtitht.supabase.co/storage/v1/object/public/ImagesOficioYa/OficioYa/Problemas/'
            )
        )
        .slice(0, 5)
    : []

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
      fotos, // ← aquí van las fotos
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

      /* ---------------------------------------------------------- */
      // El cliente elige cómo va a pagar (cuando el trabajo ya está terminado).
      // Crea el pago la primera vez; mientras siga Pendiente puede cambiar de método.
      case 'elegirMetodoPago': {
        const solicitudId = Number(body.solicitudId)
        const metodoPago = body.metodoPago
        if (!METODOS.includes(metodoPago)) return fail('Elige una forma de pago válida.')

        const sol = await prisma.solicitud.findUnique({
          where: { id: solicitudId },
          include: {
            pago: { select: { id: true, estado: true } },
            cotizaciones: { where: { estado: 'Aceptada' }, select: { monto: true } },
          },
        })
        if (!sol) return fail('Solicitud no encontrada.', 404)
        if (sol.clienteId !== usuarioId) return fail('No autorizado.', 403)
        if (!['Terminada', 'Calificada'].includes(sol.estado) || !sol.trabajadorAsignadoId) {
          return fail('Podrás elegir cómo pagar cuando el profesional termine el trabajo.', 409)
        }
        const trabajadorId = sol.trabajadorAsignadoId

        const aviso = {
          destinatarioTipo: 'Trabajador' as const,
          destinatarioId: trabajadorId,
          tipo: 'Pago' as const,
          mensaje: `El cliente pagará con ${String(metodoPago).toLowerCase()} la solicitud #${solicitudId}. Confirma cuando lo recibas.`,
        }

        if (sol.pago) {
          if (sol.pago.estado !== 'Pendiente') return fail('Este pago ya fue confirmado.', 409)
          await prisma.$transaction([
            prisma.pago.update({ where: { id: sol.pago.id }, data: { metodoPago } }),
            prisma.notificacion.create({ data: aviso }),
          ])
        } else {
          const cot = sol.cotizaciones[0]
          if (!cot) return fail('No encontramos la cotización aceptada de este trabajo.', 409)
          const montoTotal = Number(cot.monto)
          const montoComision = Math.round(montoTotal * COMISION_PORCENTAJE) / 100
          await prisma.$transaction([
            prisma.pago.create({
              data: {
                solicitudId,
                clienteId: usuarioId,
                trabajadorId,
                montoTotal,
                metodoPago,
                comision: { create: { porcentajeAplicado: COMISION_PORCENTAJE, montoComision } },
              },
            }),
            prisma.notificacion.create({ data: aviso }),
          ])
        }
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