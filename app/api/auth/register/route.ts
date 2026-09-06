import { NextResponse } from "next/server";
import prisma from '../../../lib/prisma';
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { nombre, correo, telefono, contrasena } = await req.json();

    if (!nombre || !correo || !contrasena) {
      return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
    }

    // Verificar si ya existe el correo
    const existingUser = await prisma.usuario.findUnique({ where: { correo } });
    if (existingUser) {
      return NextResponse.json({ error: "El correo ya está registrado" }, { status: 409 });
    }

    // Generar hash de la contraseña
    const contrasenaHash = await bcrypt.hash(contrasena, 10);

    // Crear usuario
    const newUser = await prisma.usuario.create({
      data: {
        nombre,
        correo,
        telefono,
        contrasenaHash,
      },
    });

    return NextResponse.json({ message: "Usuario registrado con éxito", user: newUser });
  } catch (error: any) {
    console.error("💥 Error en registro:", error);
    return NextResponse.json({ error: "Error interno del servidor", detalle: error.message }, { status: 500 });
  }
}
