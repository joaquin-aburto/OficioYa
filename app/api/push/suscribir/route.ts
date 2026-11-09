import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

export async function POST(req: Request) {
  const { usuarioId, suscripcion } = await req.json()
  const { endpoint, keys } = suscripcion ?? {}
  if (!usuarioId || !endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  }
  await prisma.suscripcionPush.upsert({
    where: { endpoint },
    update: { usuarioId, p256dh: keys.p256dh, auth: keys.auth },
    create: { usuarioId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const { endpoint } = await req.json()
  await prisma.suscripcionPush.deleteMany({ where: { endpoint } })
  return NextResponse.json({ ok: true })
}