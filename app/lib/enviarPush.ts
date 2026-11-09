import * as webpush from 'web-push'
import { prisma } from '../lib/prisma'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function enviarPush(
  usuarioId: number,
  payload: { title: string; body: string; url?: string; tag?: string }
) {
  const subs = await prisma.suscripcionPush.findMany({ where: { usuarioId } })
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload)
        )
      } catch (err: any) {
        // 404/410 = suscripción expirada: se limpia
        if (err.statusCode === 404 || err.statusCode === 410) {
          await prisma.suscripcionPush.delete({ where: { endpoint: s.endpoint } })
        }
      }
    })
  )
}