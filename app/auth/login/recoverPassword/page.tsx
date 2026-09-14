"use client";

import { useState } from "react";
import Link from "next/link";
import "./site.css";

export default function ForgotPasswordPage() {
  const [correo, setCorreo] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMensaje(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo }),
      });

      const data = await res.json();

      if (res.ok) {
        setMensaje({
          tipo: "exito",
          texto: data.message || "Hemos enviado un código de verificación a tu correo.",
        });
      } else {
        setMensaje({
          tipo: "error",
          texto: data.error || "Ocurrió un error al enviar el código.",
        });
      }
    } catch (error) {
      setMensaje({
        tipo: "error",
        texto: "Error de conexión con el servidor.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="forgot-container">
      <main className="forgot-card">
        <div className="forgot-header">
          <h1 className="forgot-title">¿Olvidaste tu contraseña?</h1>
          <p className="forgot-subtitle">
            Ingresa tu correo registrado y te enviaremos un código para restablecer tu contraseña en OficioYa.
          </p>
        </div>

        {mensaje && (
          <div
            className={`message-banner ${
              mensaje.tipo === "exito" ? "message-success" : "message-error"
            }`}
          >
            {mensaje.texto}
          </div>
        )}

        <form onSubmit={handleSubmit} className="forgot-form">
          <div className="form-group">
            <label htmlFor="correo" className="form-label">
              Correo electrónico
            </label>
            <input
              id="correo"
              type="email"
              required
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="ejemplo@correo.com"
              className="form-input"
            />
          </div>

          <button type="submit" disabled={loading} className="forgot-button">
            {loading ? "Enviando código..." : "Enviar código de verificación"}
          </button>
        </form>

        <div className="forgot-footer">
          <Link href="/auth/login" className="back-link">
            ← Volver a Iniciar Sesión
          </Link>
        </div>
      </main>
    </div>
  );
}