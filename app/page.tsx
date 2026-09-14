"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const LOGO_URL =
  "https://jqhlnwusmwtqxxvtitht.supabase.co/storage/v1/object/public/ImagesOficioYa/OficioYa/Logo/LogoOficioYa-auth.jpg";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      setIsAuthenticated(true);
      router.push("/dashboard");
    } else {
      setIsAuthenticated(false);
    }
  }, [router]);

  if (isAuthenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAF7]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0F4C5C] border-t-transparent" />
          <p className="text-sm font-medium text-[#52616B]">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#F8FAF7] p-4 font-sans text-[#17212B]">
      <main className="flex w-full max-w-2xl flex-col items-center justify-center gap-8 rounded-2xl border border-slate-100 bg-white p-8 shadow-md sm:p-12">
        <div className="flex min-h-12 items-center justify-center">
          <img
            src={LOGO_URL}
            alt="OficioYa"
            className="h-12 w-auto object-contain"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        </div>

        <div className="flex flex-col items-center gap-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#E4F3EF] px-3 py-1 text-xs font-semibold text-[#247A70]">
            <span className="h-2 w-2 rounded-full bg-[#2A9D8F]" />
            Técnicos verificados en la zona de Metropoltana de Guadalajara
          </div>
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-[#17212B] sm:text-4xl">
            Encuentra al profesional ideal para cualquier reparación
          </h1>
          <p className="max-w-md text-base leading-relaxed text-[#52616B]">
            Conectamos clientes con plomeros, electricistas, cerrajeros y técnicos capacitados cerca de ti en cuestión de minutos.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Link className="flex h-12 items-center justify-center rounded-lg bg-[#0F4C5C] px-8 font-semibold text-white shadow-sm transition-all hover:bg-[#0A3945] active:scale-[0.98]" href="/auth/login">
            Iniciar Sesión
          </Link>
          <Link className="flex h-12 items-center justify-center rounded-lg border border-[#DCEBE6] bg-white px-8 font-semibold text-[#17212B] transition-all hover:border-[#B9D8D0] hover:bg-[#F1F8F5] active:scale-[0.98]" href="auth/register">
            Registrarse
          </Link>
        </div>
      </main>
    </div>
  );
}
