// ==========================================
// MÓDULO: Autenticación / Login
// ==========================================

export function verificarSesion() {
    const usuarioLogueado = localStorage.getItem('centinela_usuario');
    if (usuarioLogueado) {
        mostrarInterfazApp();
    } else {
        document.getElementById('login-screen').style.display = 'flex';
    }
}

export function iniciarSesion() {
    const usuarioInput = document.getElementById('login-usuario').value.trim();
    const passwordInput = document.getElementById('login-password').value.trim();

    // Validamos que ingrese un nombre y que la contraseña sea "1234" (o la que tú elijas)
    if (usuarioInput !== '' && passwordInput === '1234') {
        // Guardamos la sesión
        localStorage.setItem('centinela_usuario', usuarioInput);
        
        // Guardamos también el nombre para que autocomplete el campo "Inspector" en los controles
        localStorage.setItem('centinela_inspector', usuarioInput);
        
        document.getElementById('login-error').style.display = 'none';
        document.getElementById('login-usuario').value = '';
        document.getElementById('login-password').value = '';
        
        mostrarInterfazApp();
    } else {
        document.getElementById('login-error').style.display = 'block';
    }
}

export function cerrarSesion() {
    // Borramos los datos locales
    localStorage.removeItem('centinela_usuario');
    
    // Ocultamos la app y mostramos el login de nuevo
    ocultarInterfazApp();
    document.getElementById('login-screen').style.display = 'flex';

    // Cerramos el menú lateral si estaba abierto
    const drawer = document.getElementById('side-menu');
    const overlay = document.getElementById('drawer-overlay');
    if (drawer) drawer.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
}

// Funciones internas para manipular los elementos de la pantalla
function mostrarInterfazApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-header').style.display = 'flex';
    document.getElementById('main-content').style.display = 'grid';
    document.getElementById('app-footer').style.display = 'flex';
}

function ocultarInterfazApp() {
    document.getElementById('app-header').style.display = 'none';
    document.getElementById('main-content').style.display = 'none';
    document.getElementById('vista-dinamica').style.display = 'none';
    document.getElementById('app-footer').style.display = 'none';
}