'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Search, Star, MapPin, ShieldCheck, Wrench,
  Zap, Laptop, Smartphone, Paintbrush, KeyRound,
  Sparkles, Refrigerator, Droplet, Clock, CheckCircle2,
  PlusCircle, UserCheck, DollarSign, ClockCheck,
  ChevronRight, Briefcase, Heart, Users, Timer
} from 'lucide-react';

const especialidades = [
  { id: '1', nombre: 'Plomeros', icon: Droplet, gradient: 'from-sky-400 to-blue-500', glow: 'shadow-[0_0_20px_rgba(56,189,248,0.3)]' },
  { id: '2', nombre: 'Electricistas', icon: Zap, gradient: 'from-[#F4A261] to-[#2A9D8F]', glow: 'shadow-[0_0_20px_rgba(245,158,11,0.3)]' },
  { id: '3', nombre: 'Técnicos PC', icon: Laptop, gradient: 'from-slate-400 to-zinc-500', glow: 'shadow-[0_0_20px_rgba(113,113,122,0.3)]' },
  { id: '4', nombre: 'Celulares', icon: Smartphone, gradient: 'from-violet-400 to-fuchsia-500', glow: 'shadow-[0_0_20px_rgba(167,139,250,0.3)]' },
  { id: '5', nombre: 'Carpinteros', icon: Wrench, gradient: 'from-orange-400 to-amber-600', glow: 'shadow-[0_0_20px_rgba(245,158,11,0.3)]' },
  { id: '6', nombre: 'Pintores', icon: Paintbrush, gradient: 'from-rose-400 to-pink-500', glow: 'shadow-[0_0_20px_rgba(244,63,94,0.3)]' },
  { id: '7', nombre: 'Cerrajeros', icon: KeyRound, gradient: 'from-stone-400 to-neutral-500', glow: 'shadow-[0_0_20px_rgba(120,113,108,0.3)]' },
  { id: '8', nombre: 'Electrodomésticos', icon: Refrigerator, gradient: 'from-cyan-400 to-teal-500', glow: 'shadow-[0_0_20px_rgba(45,212,191,0.3)]' },
  { id: '9', nombre: 'Limpieza', icon: Sparkles, gradient: 'from-emerald-400 to-green-500', glow: 'shadow-[0_0_20px_rgba(52,211,153,0.3)]' },
];

const municipiosZMG = ['Todas las zonas', 'Guadalajara', 'Zapopan', 'Tonalá', 'Tlaquepaque'];

const trabajadoresMock = [
  {
    id: 't1',
    nombre: 'Gonzalo Ramírez',
    especialidad: 'Plomero e Instalador',
    techId: '#P-0742',
    municipio: 'Tonalá / Zapopan',
    experiencia: '8 años exp.',
    calificacion: 4.9,
    resenasCount: 47,
    precioAprox: '$350 - $500 MXN',
    distancia: '3.2 km',
    disponibilidad: 'Disponible Hoy',
    verificado: true,
    online: true,
    foto: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=250&q=80',
    fotosTrabajos: [
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=200&q=80',
      'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=200&q=80'
    ]
  },
  {
    id: 't2',
    nombre: 'Martín Silva',
    especialidad: 'Técnico en Computación',
    techId: '#T-1193',
    municipio: 'Guadalajara (Providencia)',
    experiencia: '5 años exp.',
    calificacion: 4.8,
    resenasCount: 62,
    precioAprox: '$300 - $600 MXN',
    distancia: '5.1 km',
    disponibilidad: 'Agenda abierta mañana',
    verificado: true,
    online: true,
    foto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
    fotosTrabajos: [
      'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=200&q=80'
    ]
  }
];

const statsHero = [
  { icon: Users, value: '12,847', label: 'Profesionales activos' },
  { icon: Star, value: '4.8', label: 'Calificación promedio' },
  { icon: Timer, value: '15 min', label: 'Respuesta promedio' },
];

// Fondo ambiental suave y cálido
const AmbientBackground = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden bg-[#F8FAF7]">
    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#2A9D8F]/5 rounded-full blur-[120px] animate-pulse-slow" />
    <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#2A9D8F]/5 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
    <div className="absolute top-[40%] left-[40%] w-[40%] h-[40%] bg-rose-500/5 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '4s' }} />
  </div>
);

export default function HomePage() {
  const [zonaSel, setZonaSel] = useState('Todas las zonas');
  const [especialidadSel, setEspecialidadSel] = useState<string | null>(null);
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAF7] font-sans pb-16 sm:pb-24 text-[#17212B] selection:bg-[#2A9D8F]/30 selection:text-amber-100 relative overflow-x-hidden">
      <AmbientBackground />

      <style jsx global>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        .animate-pulse-slow { animation: pulse-slow 8s ease-in-out infinite; }
        .font-display { font-family: 'Inter', system-ui, sans-serif; letter-spacing: -0.01em; }
      `}</style>

      {/* ===== Header responsivo ===== */}
      <header className="relative bg-[#F8FAF7]/85 backdrop-blur-2xl border-b border-[#D5E4E1]/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-5">

          {/* Fila 1: Logo + botón publicar (solo móvil) */}
          <div className="flex items-center justify-between gap-3 md:shrink-0 order-1">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-[#2A9D8F] rounded-xl blur-lg opacity-20" />
                <div className="relative w-10 h-10 bg-gradient-to-br from-[#F4A261] to-[#2A9D8F] rounded-xl flex items-center justify-center shadow-lg shadow-[#2A9D8F]/20">
                  <Briefcase className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-display font-bold text-xl text-[#17212B]">
                  OFICIO<span className="text-[#F4A261]">YA</span>
                </span>
                <span className="text-[10px] font-medium text-[#58727A] tracking-wide mt-0.5 hidden sm:block">Servicios de confianza</span>
              </div>
            </motion.div>

            {/* Botón publicar compacto para móvil */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="md:hidden p-2.5 rounded-xl bg-gradient-to-r from-[#2A9D8F] to-[#0F4C5C] text-white shadow-lg shadow-[#2A9D8F]/20"
              aria-label="Publicar servicio"
            >
              <PlusCircle className="w-5 h-5" />
            </motion.button>
          </div>

          {/* Buscador: fila propia en móvil, centrado en desktop */}
          <div className="relative w-full md:flex-1 md:max-w-md lg:max-w-xl group order-2">
            <div className="absolute -inset-[1px] bg-gradient-to-r from-[#2A9D8F]/20 via-[#2A9D8F]/20 to-[#2A9D8F]/20 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity blur-sm" />
            <div className="relative flex items-center bg-white/80 backdrop-blur-xl rounded-2xl border border-[#D5E4E1] group-focus-within:border-[#2A9D8F]/40 transition-colors">
              <Search className="ml-4 w-5 h-5 text-[#58727A] group-focus-within:text-[#F4A261] transition-colors shrink-0" />
              <input
                type="text"
                placeholder='Buscar servicio... Ej. "Fuga de agua en Zapopan"'
                className="w-full bg-transparent text-[#17212B] placeholder-stone-600 pl-3 pr-4 py-3 text-sm font-medium focus:outline-none"
              />
            </div>
          </div>

          {/* Acciones desktop */}
          <div className="hidden md:flex items-center gap-3 shrink-0 order-3">
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md border border-[#D5E4E1] px-3 py-2 rounded-xl hover:border-[#A9C8C2] transition-colors">
              <MapPin className="w-4 h-4 text-[#F4A261] shrink-0" />
              <select
                value={zonaSel}
                onChange={(e) => setZonaSel(e.target.value)}
                className="bg-transparent font-medium text-xs text-[#36515A] focus:outline-none cursor-pointer max-w-[130px]"
              >
                {municipiosZMG.map(m => <option key={m} value={m} className="bg-white text-[#36515A]">{m}</option>)}
              </select>
            </div>

            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              className="relative bg-gradient-to-r from-[#2A9D8F] to-[#0F4C5C] text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-[#2A9D8F]/20 hover:shadow-[#2A9D8F]/30 transition-all whitespace-nowrap"
            >
              <span className="flex items-center gap-2">
                <PlusCircle className="w-4 h-4" />
                Publicar Servicio
              </span>
            </motion.button>
          </div>

          {/* Selector de zona para móvil / tablet */}
          <div className="md:hidden order-4 flex items-center gap-2 bg-white/80 backdrop-blur-md border border-[#D5E4E1] px-3 py-2.5 rounded-xl">
            <MapPin className="w-4 h-4 text-[#F4A261] shrink-0" />
            <select
              value={zonaSel}
              onChange={(e) => setZonaSel(e.target.value)}
              className="w-full bg-transparent font-medium text-xs text-[#36515A] focus:outline-none cursor-pointer"
            >
              {municipiosZMG.map(m => <option key={m} value={m} className="bg-white text-[#36515A]">{m}</option>)}
            </select>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 space-y-14 sm:space-y-20">

        {/* ===== Hero ===== */}
        <section className="relative rounded-3xl p-6 sm:p-10 lg:p-14 overflow-hidden border border-[#D5E4E1]/60 bg-gradient-to-br from-stone-900/50 via-stone-900/30 to-[#110f0d]/50 backdrop-blur-sm">
          <div className="relative z-10 grid lg:grid-cols-[1fr_auto] gap-10 lg:gap-14 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-3xl"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-2 bg-[#2A9D8F]/10 backdrop-blur-md border border-[#2A9D8F]/20 px-4 py-1.5 rounded-full mb-6"
              >
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shrink-0" />
                <span className="font-medium text-[11px] sm:text-xs tracking-wide text-amber-300 text-left">
                  Disponible en Guadalajara, Zapopan, Tonalá y Tlaquepaque
                </span>
              </motion.div>

              <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl tracking-tight mb-5 sm:mb-6 leading-[1.1] text-[#17212B]">
                Soluciones expertas <br className="hidden sm:block" />
                <span className="bg-gradient-to-r from-amber-300 via-orange-300 to-rose-300 bg-clip-text text-transparent">
                  a tu alcance
                </span>
              </h1>

              <p className="text-[#49636B] text-base sm:text-lg lg:text-xl leading-relaxed mb-8 sm:mb-10 max-w-2xl font-light">
                Conectamos tus necesidades con <span className="text-[#17212B] font-medium">profesionales verificados</span> cerca de ti.
                Sin intermediarios, precios transparentes y respuesta inmediata.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {[
                  { icon: UserCheck, title: 'Identidad Verificada', desc: 'Profesionales con identidad y antecedentes validados', color: 'text-[#F4A261]', bg: 'bg-[#2A9D8F]/10' },
                  { icon: DollarSign, title: 'Precio Transparente', desc: 'Cotizaciones claras antes de iniciar el trabajo', color: 'text-orange-400', bg: 'bg-[#2A9D8F]/10' },
                  { icon: ClockCheck, title: 'Respuesta Inmediata', desc: 'Atención y agendamiento en menos de 15 minutos', color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
                ].map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + idx * 0.1 }}
                    whileHover={{ y: -4 }}
                    className="group bg-white/40 backdrop-blur-sm border border-[#D5E4E1]/60 p-4 sm:p-5 rounded-2xl hover:border-[#A9C8C2] transition-all"
                  >
                    <div className={`inline-flex p-2.5 rounded-xl ${item.bg} ${item.color} mb-3 group-hover:scale-110 transition-transform`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <h4 className="font-semibold text-[#17212B] text-sm mb-1.5">{item.title}</h4>
                    <p className="text-xs text-[#58727A] leading-relaxed">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Panel de estadísticas (solo pantallas grandes, balancea el hero) */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="hidden lg:flex flex-col gap-3 w-64"
            >
              {statsHero.map((s, idx) => (
                <div key={idx} className="bg-white/50 border border-[#D5E4E1] rounded-2xl p-4 flex items-center gap-3 hover:border-[#A9C8C2] transition-colors">
                  <div className="p-2.5 rounded-xl bg-[#2A9D8F]/10 text-[#F4A261] shrink-0">
                    <s.icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-[#17212B] text-lg leading-tight">{s.value}</div>
                    <div className="text-[11px] text-[#58727A] truncate">{s.label}</div>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ===== Especialidades: GRID responsivo (sin cortes) ===== */}
        <section className="space-y-6">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#17212B] tracking-tight">Especialidades Disponibles</h2>
            <p className="text-[#58727A] text-sm mt-1">Encuentra al profesional ideal para tu proyecto</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {especialidades.map((esp, idx) => {
              const Icon = esp.icon;
              const isSelected = especialidadSel === esp.id;
              const isLast = idx === especialidades.length - 1;
              return (
                <motion.button
                  key={esp.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setEspecialidadSel(isSelected ? null : esp.id)}
                  className={`relative group flex flex-col items-center justify-center gap-2.5 sm:flex-row sm:justify-start sm:gap-3 w-full px-4 py-4 sm:px-5 sm:py-3.5 rounded-2xl border transition-all duration-300 ${isLast ? 'col-span-2 sm:col-span-1' : ''
                    } ${isSelected
                      ? 'bg-[#E8F1EF] border-[#2A9D8F]/50 shadow-lg shadow-[#2A9D8F]/10'
                      : 'bg-white/40 border-[#D5E4E1] hover:border-[#A9C8C2] hover:bg-[#E8F1EF]/60'
                    }`}
                >
                  <div className={`relative p-2.5 sm:p-2 rounded-xl sm:rounded-lg bg-gradient-to-br ${esp.gradient} ${esp.glow} transition-transform group-hover:scale-105 shrink-0`}>
                    <Icon className="w-5 h-5 sm:w-4 sm:h-4 text-white" />
                  </div>
                  <span className="font-semibold text-sm text-[#17212B] text-center sm:text-left leading-tight">
                    {esp.nombre}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* ===== Trabajadores ===== */}
        <section className="space-y-6">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#17212B] tracking-tight">Profesionales Destacados</h2>
            <p className="text-[#58727A] text-sm mt-1">Los mejor calificados en tu zona</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {trabajadoresMock.map((t, idx) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -4 }}
                className="relative group"
              >
                <div className="absolute -inset-[1px] bg-gradient-to-br from-[#F4A261]/20 via-orange-400/20 to-rose-400/20 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity blur-sm" />

                <div className="relative h-full bg-white/60 backdrop-blur-xl rounded-3xl p-5 sm:p-6 border border-[#D5E4E1] group-hover:border-[#A9C8C2] transition-all overflow-hidden flex flex-col">
                  <div className="absolute top-4 right-4 font-mono text-[10px] font-medium text-stone-600">
                    {t.techId}
                  </div>

                  <div className="flex gap-4 items-start mb-5 pr-16 sm:pr-0">
                    <div className="relative shrink-0">
                      <img
                        src={t.foto}
                        alt={t.nombre}
                        className="relative w-16 h-16 rounded-2xl object-cover ring-2 ring-stone-800"
                      />
                      {t.online && (
                        <div className="absolute -bottom-1 -right-1 flex items-center gap-1 bg-emerald-500 text-white text-[9px] font-semibold px-2 py-0.5 rounded-full ring-2 ring-stone-900 whitespace-nowrap">
                          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                          En línea
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 pt-1">
                      <h3 className="font-semibold text-lg text-[#17212B] truncate mb-1 group-hover:text-[#F4A261] transition-colors">
                        {t.nombre}
                      </h3>
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <span className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-[#E8F1EF] text-[#36515A] border border-[#A9C8C2]">
                          {t.especialidad}
                        </span>
                        {t.verificado && (
                          <div className="flex items-center gap-1 text-[10px] font-semibold text-[#F4A261] bg-[#2A9D8F]/10 border border-[#2A9D8F]/20 px-2 py-1 rounded-md">
                            <CheckCircle2 className="w-3 h-3" />
                            Verificado
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1.5 bg-[#E8F1EF]/60 border border-[#A9C8C2]/50 px-2.5 py-1.5 rounded-lg">
                          <Star className="w-3.5 h-3.5 fill-[#F4A261] text-[#F4A261]" />
                          <span className="font-semibold text-[#F4A261] text-xs">{t.calificacion}</span>
                          <span className="text-[10px] text-[#58727A]">({t.resenasCount})</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[#49636B] text-xs">
                          <Briefcase className="w-3.5 h-3.5" />
                          <span>{t.experiencia}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-stone-950/40 backdrop-blur-sm border border-[#D5E4E1]/60 p-4 rounded-2xl mb-5">
                    <div className="flex items-center gap-3 text-[#49636B] min-w-0">
                      <div className="p-2 rounded-lg bg-[#E8F1EF]/80 shrink-0">
                        <MapPin className="w-4 h-4 text-[#F4A261]" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-medium text-stone-600 uppercase tracking-wider">Zona</div>
                        <span className="text-xs font-medium text-[#36515A] truncate block">{t.municipio}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[#49636B] min-w-0">
                      <div className="p-2 rounded-lg bg-[#E8F1EF]/80 shrink-0">
                        <Clock className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-medium text-stone-600 uppercase tracking-wider">Estado</div>
                        <span className="text-xs font-medium text-[#36515A] truncate block">{t.disponibilidad}</span>
                      </div>
                    </div>
                  </div>

                  {t.fotosTrabajos.length > 0 && (
                    <div className="mb-5">
                      <div className="text-[10px] font-medium text-stone-600 uppercase tracking-wider mb-2">Trabajos recientes</div>
                      <div className="flex gap-2 flex-wrap">
                        {t.fotosTrabajos.map((fotoUrl, imgIdx) => (
                          <motion.div
                            key={imgIdx}
                            whileHover={{ scale: 1.05 }}
                            className="relative overflow-hidden rounded-xl border border-[#D5E4E1]"
                          >
                            <img
                              src={fotoUrl}
                              alt="Trabajo realizado"
                              className="w-16 h-16 sm:w-20 sm:h-20 object-cover hover:opacity-90 transition-opacity"
                            />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pie de tarjeta: se apila en móvil */}
                  <div className="mt-auto pt-4 border-t border-[#D5E4E1] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <div className="text-[10px] font-medium text-stone-600 uppercase tracking-wider mb-0.5">Costo estimado</div>
                      <div className="font-bold text-[#17212B] text-lg whitespace-nowrap">
                        {t.precioAprox}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex-1 sm:flex-none flex items-center justify-center bg-[#E8F1EF] hover:bg-stone-700 border border-[#A9C8C2] text-[#36515A] font-medium text-xs px-4 py-2.5 rounded-xl transition-all whitespace-nowrap"
                      >
                        Ver Perfil
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02, y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-gradient-to-r from-[#2A9D8F] to-[#0F4C5C] text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-[#2A9D8F]/20 hover:shadow-[#2A9D8F]/30 transition-all whitespace-nowrap"
                      >
                        Solicitar
                        <ChevronRight className="w-3.5 h-3.5" />
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ===== CTA ===== */}
        <section className="relative rounded-3xl overflow-hidden border border-[#D5E4E1] p-8 sm:p-12 lg:p-16 text-center bg-gradient-to-br from-[#2A9D8F]/5 via-[#2A9D8F]/5 to-rose-500/5 backdrop-blur-sm">
          <div className="relative z-10 max-w-2xl mx-auto">
            <div className="inline-flex p-3 rounded-2xl bg-[#2A9D8F]/10 text-[#F4A261] mb-6">
              <Heart className="w-6 h-6" />
            </div>
            <h2 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-[#17212B] mb-4 tracking-tight">
              ¿Eres un profesional independiente?
            </h2>
            <p className="text-[#49636B] text-base sm:text-lg mb-8 leading-relaxed">
              Únete a la red de oficios más confiable de la zona.
              Aumenta tus ingresos conectando con clientes que valoran tu trabajo.
            </p>
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto bg-gradient-to-r from-[#2A9D8F] to-[#0F4C5C] text-white font-semibold text-sm px-8 py-4 rounded-xl shadow-lg shadow-[#2A9D8F]/20 hover:shadow-[#2A9D8F]/30 transition-all"
            >
              Registrarme como Profesional
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </div>
        </section>

        {/* ===== Footer ===== */}
        <footer className="border-t border-[#D5E4E1]/60 pt-8 sm:pt-10 pb-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-600 text-center sm:text-left">
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <span className="font-semibold text-[#58727A]">OFICIOYA</span>
              <span>·</span>
              <span>© 2026 Todos los derechos reservados</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                Sistema operativo
              </span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
