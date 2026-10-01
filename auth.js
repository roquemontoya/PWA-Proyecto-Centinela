// ==========================================
// MÓDULO: Autenticación / Login (Directo y Seguro)
// ==========================================

export function verificarSesion() {
    const usuarioLogueado = localStorage.getItem('centinela_usuario');
    const loginScreen = document.getElementById('login-screen');
    
    if (usuarioLogueado && loginScreen) {
        mostrarInterfazApp();
    } else if (loginScreen) {
        loginScreen.style.display = 'flex';
    }
}

export function iniciarSesion() {
    const usuarioInput = document.getElementById('login-usuario').value.trim();
    const passwordInput = document.getElementById('login-password').value.trim();
    const errorMsg = document.getElementById('login-error');

    if (!usuarioInput) {
        errorMsg.innerText = 'Por favor ingresa tu nombre';
        errorMsg.style.display = 'block';
        return;
    }

    // Contraseña provisional de acceso
    if (passwordInput !== '1234') {
        errorMsg.innerText = 'Contraseña incorrecta (Usa 1234)';
        errorMsg.style.display = 'block';
        return;
    }

    // Guardamos la sesión y el inspector automáticamente
    localStorage.setItem('centinela_usuario', usuarioInput);
    localStorage.setItem('centinela_inspector', usuarioInput);
    
    errorMsg.style.display = 'none';
    document.getElementById('login-usuario').value = '';
    document.getElementById('login-password').value = '';
    
    mostrarInterfazApp();
}

export function cerrarSesion() {
    localStorage.removeItem('centinela_usuario');
    
    ocultarInterfazApp();
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) loginScreen.style.display = 'flex';

    const drawer = document.getElementById('side-menu');
    const overlay = document.getElementById('drawer-overlay');
    if (drawer) drawer.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
}

function mostrarInterfazApp() {
    const login = document.getElementById('login-screen');
    const header = document.getElementById('app-header');
    const main = document.getElementById('main-content');
    const footer = document.getElementById('app-footer');

    if (login) login.style.display = 'none';
    if (header) header.style.display = 'flex';
    if (main) main.style.display = 'grid';
    if (footer) footer.style.display = 'flex';
}

function ocultarInterfazApp() {
    const header = document.getElementById('app-header');
    const main = document.getElementById('main-content');
    const vista = document.getElementById('vista-dinamica');
    const footer = document.getElementById('app-footer');

    if (header) header.style.display = 'none';
    if (main) main.style.display = 'none';
    if (vista) vista.style.display = 'none';
    if (footer) footer.style.display = 'none';
}