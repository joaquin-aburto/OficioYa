const especialidades = [
  { id: 1, nombre: "Plomero" },
  { id: 2, nombre: "Electricista" },
  { id: 3, nombre: "Carpintero" },
  { id: 4, nombre: "Pintor" },
];

export default function BuscarServicioPage() {
  return (
    <div id="buscar-servicio-page">
      <h1>¿Qué necesitás?</h1>

      <input type="text" placeholder="Buscar especialidad o servicio..." />

      <div id="lista-especialidades">
        {especialidades.map((especialidad) => (
          <div key={especialidad.id} className="card-especialidad">
            <p>{especialidad.nombre}</p>
            <a href={`/buscar-servicio/${especialidad.id}`}>Ver oficios</a>
          </div>
        ))}
      </div>
    </div>
  );
}