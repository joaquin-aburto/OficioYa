import { NextResponse } from 'next/server'
import prisma from '../../../lib/prisma'

// POST /api/admin/acciones
// Body: { accion, ...datos }
// TODO: protege esta ruta con la sesión real de administrador antes de producción.

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status })

export async function POST(req: Request) {
  try {
    const body = await req.json()

    switch (body.accion) {
      /* ---------------------------------------------------------- */
      case 'verificarTrabajador': {
        const trabajadorId = Number(body.trabajadorId)
        const trabajador = await prisma.trabajador.findUnique({ where: { id: trabajadorId } })
        if (!trabajador) return fail('Trabajador no encontrado.', 404)
        if (trabajador.verificado) return fail('Este trabajador ya está verificado.', 409)

        await prisma.$transaction([
          prisma.trabajador.update({ where: { id: trabajadorId }, data: { verificado: true } }),
          prisma.notificacion.create({
            data: {
              destinatarioTipo: 'Trabajador',
              destinatarioId: trabajadorId,
              tipo: 'General',
              mensaje: '¡Tu perfil fue verificado! Ahora apareces como profesional verificado ante los clientes.',
            },
          }),
        ])
        return NextResponse.json({ ok: true })
      }

      /* ---------------------------------------------------------- */
      // No hay un estado "Rechazado" en el esquema: rechazar desactiva la
      // cuenta (activo = false) para que no reciba solicitudes ni pueda
      // entrar a su panel, y le avisamos con el motivo.
      case 'rechazarTrabajador': {
        const trabajadorId = Number(body.trabajadorId)
        const motivo = String(body.motivo ?? '').trim()
        if (!motivo) return fail('Escribe el motivo para que el trabajador pueda corregirlo.')

        const trabajador = await prisma.trabajador.findUnique({ where: { id: trabajadorId } })
        if (!trabajador) return fail('Trabajador no encontrado.', 404)
        if (trabajador.verificado) return fail('Este trabajador ya está verificado; usa "Suspender" en vez de rechazar.', 409)

        await prisma.$transaction([
          prisma.trabajador.update({ where: { id: trabajadorId }, data: { activo: false } }),
          prisma.notificacion.create({
            data: {
              destinatarioTipo: 'Trabajador',
              destinatarioId: trabajadorId,
              tipo: 'General',
              mensaje: `No pudimos verificar tu perfil: ${motivo}. Contáctanos para corregirlo y volver a intentarlo.`,
            },
          }),
        ])
        return NextResponse.json({ ok: true })
      }

      /* ---------------------------------------------------------- */
      case 'alternarActivoTrabajador': {
        const trabajadorId = Number(body.trabajadorId)
        const trabajador = await prisma.trabajador.findUnique({ where: { id: trabajadorId } })
        if (!trabajador) return fail('Trabajador no encontrado.', 404)

        const activo = !trabajador.activo
        await prisma.$transaction([
          prisma.trabajador.update({ where: { id: trabajadorId }, data: { activo } }),
          prisma.notificacion.create({
            data: {
              destinatarioTipo: 'Trabajador',
              destinatarioId: trabajadorId,
              tipo: 'General',
              mensaje: activo
                ? 'Tu cuenta fue reactivada. Ya puedes recibir solicitudes de nuevo.'
                : 'Tu cuenta fue suspendida. Contáctanos si crees que fue un error.',
            },
          }),
        ])
        return NextResponse.json({ ok: true, activo })
      }

      default:
        return fail('Acción no reconocida.')
    }
  } catch (error) {
    console.error('Error en acciones admin:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}