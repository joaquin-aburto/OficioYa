export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <nav>
        <a href="/dashboard">Inicio</a>
        <a href="/buscar-servicio">Buscar servicio</a>
        <a href="/mis-solicitudes">Mis solicitudes</a>
      </nav>
      <main>{children}</main>
    </div>
  );
}