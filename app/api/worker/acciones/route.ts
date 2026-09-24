import { NextResponse } from 'next/server'
import prisma from '../../../lib/prisma'
import { COMISION_PORCENTAJE } from '../../../lib/comision'

// POST /api/trabajador/acciones
// Body: { trabajadorId, accion, ...datos }
// TODO: toma trabajadorId de la sesión cuando la tengas.

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status })

const DIAS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'] as const
const METODOS = ['Tarjeta', 'Efectivo', 'Transferencia'] as const
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const trabajadorId = Number(body.trabajadorId)
    if (!Number.isInteger(trabajadorId) || trabajadorId <= 0) return fail('trabajadorId inválido')

    switch (body.accion) {
      /* ---------------------------------------------------------- */
      case 'enviarCotizacion': {
        const solicitudId = Number(body.solicitudId)
        const monto = Number(body.monto)
        if (!(monto > 0)) return fail('Escribe un monto mayor a $0.')
        if (monto > 1_000_000) return fail('El monto es demasiado alto.')

        const sol = await prisma.solicitud.findUnique({ where: { id: solicitudId } })
        if (!sol) return fail('Solicitud no encontrada.', 404)
        if (!['Pendiente', 'Cotizada'].includes(sol.estado)) {
          return fail('Esta solicitud ya no acepta cotizaciones.', 409)
        }

        const tieneOficio = await prisma.trabajadorEspecialidad.findUnique({
          where: { trabajadorId_especialidadId: { trabajadorId, especialidadId: sol.especialidadId } },
        })
        if (!tieneOficio) return fail('Esta solicitud no corresponde a tus oficios.', 403)

        const yaCotizo = await prisma.cotizacion.findFirst({ where: { solicitudId, trabajadorId } })
        if (yaCotizo) return fail('Ya enviaste una cotización para esta solicitud.', 409)

        await prisma.$transaction([
          prisma.cotizacion.create({
            data: {
              solicitudId,
              trabajadorId,
              monto,
              comentario: body.comentario?.toString().trim() || null,
            },
          }),
          prisma.solicitud.update({ where: { id: solicitudId }, data: { estado: 'Cotizada' } }),
          prisma.notificacion.create({
            data: {
              destinatarioTipo: 'Usuario',
              destinatarioId: sol.clienteId,
              tipo: 'Cotizacion',
              mensaje: `Recibiste una nueva cotización para tu solicitud #${solicitudId}.`,
            },
          }),
        ])
        return NextResponse.json({ ok: true })
      }

      /* ---------------------------------------------------------- */
      case 'iniciarTrabajo': {
        const solicitudId = Number(body.solicitudId)
        const sol = await prisma.solicitud.findUnique({ where: { id: solicitudId } })
        if (!sol || sol.trabajadorAsignadoId !== trabajadorId) return fail('Trabajo no encontrado.', 404)
        if (sol.estado !== 'Aceptada') return fail('Este trabajo no está listo para iniciar.', 409)

        await prisma.$transaction([
          prisma.solicitud.update({ where: { id: solicitudId }, data: { estado: 'EnCurso' } }),
          prisma.notificacion.create({
            data: {
              destinatarioTipo: 'Usuario',
              destinatarioId: sol.clienteId,
              tipo: 'General',
              mensaje: `Tu profesional ya inició el trabajo de la solicitud #${solicitudId}.`,
            },
          }),
        ])
        return NextResponse.json({ ok: true })
      }

      /* ---------------------------------------------------------- */
      case 'terminarTrabajo': {
        const solicitudId = Number(body.solicitudId)
        const metodoPago = body.metodoPago
        if (!METODOS.includes(metodoPago)) return fail('Elige cómo te pagó el cliente.')

        const sol = await prisma.solicitud.findUnique({
          where: { id: solicitudId },
          include: {
            pago: { select: { id: true } },
            cotizaciones: { where: { trabajadorId, estado: 'Aceptada' }, select: { monto: true } },
          },
        })
        if (!sol || sol.trabajadorAsignadoId !== trabajadorId) return fail('Trabajo no encontrado.', 404)
        if (sol.estado !== 'EnCurso') return fail('Solo puedes terminar trabajos que están en curso.', 409)
        if (sol.pago) return fail('Este trabajo ya tiene un pago registrado.', 409)
        if (!sol.cotizaciones[0]) return fail('No encontramos la cotización aceptada de este trabajo.', 409)

        const montoTotal = Number(sol.cotizaciones[0].monto)
        const montoComision = Math.round(montoTotal * COMISION_PORCENTAJE) / 100

        await prisma.$transaction([
          prisma.solicitud.update({ where: { id: solicitudId }, data: { estado: 'Terminada' } }),
          prisma.pago.create({
            data: {
              solicitudId,
              clienteId: sol.clienteId,
              trabajadorId,
              montoTotal,
              metodoPago,
              comision: { create: { porcentajeAplicado: COMISION_PORCENTAJE, montoComision } },
            },
          }),
          prisma.notificacion.create({
            data: {
              destinatarioTipo: 'Usuario',
              destinatarioId: sol.clienteId,
              tipo: 'Calificacion',
              mensaje: `Tu solicitud #${solicitudId} está terminada. ¡Cuéntanos cómo te fue!`,
            },
          }),
        ])
        return NextResponse.json({ ok: true })
      }

      /* ---------------------------------------------------------- */
      case 'confirmarCobro': {
        const pagoId = Number(body.pagoId)
        const pago = await prisma.pago.findUnique({ where: { id: pagoId } })
        if (!pago || pago.trabajadorId !== trabajadorId) return fail('Pago no encontrado.', 404)
        if (pago.estado !== 'Pendiente') return fail('Este pago ya fue confirmado.', 409)

        await prisma.$transaction([
          prisma.pago.update({ where: { id: pagoId }, data: { estado: 'Completado' } }),
          prisma.notificacion.create({
            data: {
              destinatarioTipo: 'Usuario',
              destinatarioId: pago.clienteId,
              tipo: 'Pago',
              mensaje: `Se confirmó el pago de tu solicitud #${pago.solicitudId}. ¡Gracias!`,
            },
          }),
        ])
        return NextResponse.json({ ok: true })
      }

      /* ---------------------------------------------------------- */
      case 'guardarDisponibilidad': {
        const bloques: { diaSemana: string; horaInicio: string; horaFin: string }[] = body.bloques ?? []
        for (const b of bloques) {
          if (!DIAS.includes(b.diaSemana as (typeof DIAS)[number])) return fail('Día no válido.')
          if (!HORA.test(b.horaInicio) || !HORA.test(b.horaFin)) return fail('Horario no válido.')
          if (b.horaInicio >= b.horaFin) return fail(`En ${b.diaSemana}, la hora de salida debe ser después de la de entrada.`)
        }
        await prisma.$transaction([
          prisma.disponibilidad.deleteMany({ where: { trabajadorId } }),
          prisma.disponibilidad.createMany({
            data: bloques.map((b) => ({
              trabajadorId,
              diaSemana: b.diaSemana as (typeof DIAS)[number],
              horaInicio: b.horaInicio,
              horaFin: b.horaFin,
            })),
          }),
        ])
        return NextResponse.json({ ok: true })
      }

      /* ---------------------------------------------------------- */
      case 'guardarServicio': {
        const especialidadId = Number(body.especialidadId)
        const nombre = String(body.nombre ?? '').trim()
        const precioBase = Number(body.precioBase)
        if (!nombre) return fail('Ponle un nombre al servicio.')
        if (!(precioBase > 0)) return fail('Escribe un precio mayor a $0.')

        const tieneOficio = await prisma.trabajadorEspecialidad.findUnique({
          where: { trabajadorId_especialidadId: { trabajadorId, especialidadId } },
        })
        if (!tieneOficio) return fail('Elige uno de tus oficios.', 403)

        const datos = {
          especialidadId,
          nombre,
          descripcion: body.descripcion?.toString().trim() || null,
          precioBase,
        }

        if (body.servicioId) {
          const existente = await prisma.servicio.findUnique({ where: { id: Number(body.servicioId) } })
          if (!existente || existente.trabajadorId !== trabajadorId) return fail('Servicio no encontrado.', 404)
          await prisma.servicio.update({ where: { id: existente.id }, data: datos })
        } else {
          await prisma.servicio.create({ data: { ...datos, trabajadorId } })
        }
        return NextResponse.json({ ok: true })
      }

      /* ---------------------------------------------------------- */
      case 'alternarServicio': {
        const servicio = await prisma.servicio.findUnique({ where: { id: Number(body.servicioId) } })
        if (!servicio || servicio.trabajadorId !== trabajadorId) return fail('Servicio no encontrado.', 404)
        await prisma.servicio.update({ where: { id: servicio.id }, data: { activo: !servicio.activo } })
        return NextResponse.json({ ok: true })
      }

      default:
        return fail('Acción no reconocida.')
    }
  } catch (error) {
    console.error('Error en acciones trabajador:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}