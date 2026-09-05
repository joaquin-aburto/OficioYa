export default function DashboardPage() {
  return (
    <div id="dashboard-page">
      <h1>Hola, Joaquin el papi</h1>
      <p>Bienvenido de nuevo a OficioYa</p>

      <div id="resumen">
        <div className="card">
          <h3>Solicitudes activas</h3>
          <p>2</p>
        </div>
        <div className="card">
          <h3>Solicitudes completadas</h3>
          <p>5</p>
        </div>
      </div>

      <div id="accesos-rapidos">
        <a href="/buscar-servicio">Buscar un servicio</a>
        <a href="/mis-solicitudes">Ver mis solicitudes</a>
      </div>
    </div>
  );
}