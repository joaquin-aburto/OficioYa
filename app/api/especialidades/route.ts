import { NextResponse } from 'next/server'
import prisma from '../../lib/prisma'

// GET /api/especialidades → lista de oficios (para elegir al registrarse como trabajador)
export async function GET() {
  try {
    const especialidades = await prisma.especialidad.findMany({
      orderBy: { nombre: 'asc' },
      select: { id: true, nombre: true, icono: true },
    })
    return NextResponse.json({ especialidades })
  } catch (error) {
    console.error('Error al listar especialidades:', error)
    return NextResponse.json({ error: 'No pudimos cargar los oficios.' }, { status: 500 })
  }
}