export default function LoginPage() {
  return (
    <>
      <div id="login-page">
        <h1>Iniciar sesión</h1>
      </div>
      <div id="login-form">
        <input type="text" placeholder="Usuario" />
        <input type="password" placeholder="Contraseña" />
        <a>¿Olvidaste tu contraseña?</a>
        <button>Iniciar sesión</button> 
      </div>
    </>
  );
}