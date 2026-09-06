import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    console.log("📩 Recibiendo petición de login...");

    const body = await req.json();
    console.log("📦 Datos recibidos:", body);

    const { correo, contrasena } = body;

    console.log("🔍 Buscando usuario con correo:", correo);
    const user = await prisma.usuario.findUnique({ where: { correo } });
    console.log("👤 Resultado de búsqueda:", user);

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    console.log("Hash guardado en BD:", user.contrasenaHash);

    const valid = await bcrypt.compare(contrasena, user.contrasenaHash);
    console.log("✅ Resultado de comparación:", valid);

    if (!valid) {
      return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
    }

    console.log("🎉 Login exitoso para usuario:", user.id);
    return NextResponse.json({ message: 'Login exitoso', user });
  } catch (error: any) {
    console.error("💥 Error interno del servidor:", error);

    // Devuelve el detalle del error para depuración
    return NextResponse.json(
      { error: 'Error interno del servidor', detalle: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}
