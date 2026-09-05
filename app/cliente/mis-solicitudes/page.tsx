const solicitudes = [
  { id: 1, especialidad: "Plomero", estado: "pendiente", fecha: "2026-09-01" },
  { id: 2, especialidad: "Electricista", estado: "en_curso", fecha: "2026-08-28" },
  { id: 3, especialidad: "Pintor", estado: "terminada", fecha: "2026-08-15" },
];

export default function MisSolicitudesPage() {
  return (
    <div id="mis-solicitudes-page">
      <h1>Mis solicitudes</h1>

      <div id="lista-solicitudes">
        {solicitudes.map((solicitud) => (
          <div key={solicitud.id} className="card-solicitud">
            <p><strong>{solicitud.especialidad}</strong></p>
            <p>Estado: {solicitud.estado}</p>
            <p>Fecha: {solicitud.fecha}</p>
          </div>
        ))}
      </div>
    </div>
  );
}