import { NextResponse } from 'next/server'
import prisma from '../../../lib/prisma'
import { urlFirmadaDocumento } from '../../../lib/documentosTrabajador'

// GET /api/admin/documentos?trabajadorId=12
// Devuelve los PDFs que subió un trabajador, cada uno con un enlace temporal (5 min).
//
// ⚠️ TODO IMPORTANTE: esta ruta entrega documentos personales. Antes de publicar la app,
// verifica aquí que quien llama sea un admin con una sesión real (cookie httpOnly),
// no solo el localStorage del navegador.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const trabajadorId = Number(searchParams.get('trabajadorId'))
    if (!Number.isInteger(trabajadorId) || trabajadorId <= 0) {
      return NextResponse.json({ error: 'Trabajador no válido.' }, { status: 400 })
    }

    const docs = await prisma.documentoTrabajador.findMany({
      where: { trabajadorId },
      orderBy: { fechaSubida: 'asc' },
    })

    const documentos = await Promise.all(
      docs.map(async (d) => ({
        id: d.id,
        nombreArchivo: d.nombreArchivo,
        tamano: d.tamano,
        fechaSubida: d.fechaSubida,
        url: await urlFirmadaDocumento(d.ruta),
      }))
    )

    return NextResponse.json({ documentos }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Error al listar documentos:', error)
    return NextResponse.json({ error: 'No pudimos cargar los documentos.' }, { status: 500 })
  }
}