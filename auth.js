// ==========================================
// MÓDULO: Autenticación / Login (Corregido)
// ==========================================

import { clienteSupabase } from './supabaseClient.js';

export function verificarSesion() {
    const usuarioLogueado = localStorage.getItem('centinela_usuario');
    if (usuarioLogueado) {
        mostrarInterfazApp();
    } else {
        document.getElementById('login-screen').style.display = 'flex';
    }
}

export async function iniciarSesion() {
    const usuarioInput = document.getElementById('login-usuario').value.trim();
    const passwordInput = document.getElementById('login-password').value.trim();
    const errorMsg = document.getElementById('login-error');

    if (!usuarioInput) {
        errorMsg.innerText = 'Por favor ingresa tu nombre';
        errorMsg.style.display = 'block';
        return;
    }

    // Validación provisional: Clave genérica "1234"
    if (passwordInput !== '1234') {
        errorMsg.innerText = 'Contraseña incorrecta (Usa 1234)';
        errorMsg.style.display = 'block';
        return;
    }

    try {
        // Verificamos que el usuario exista en la tabla Bomberos de Supabase
        const { data, error } = await clienteSupabase
            .from('Bomberos')
            .select('Bombero')
            .ilike('Bombero', `%${usuarioInput}%`)
            .limit(1);

        if (error || !data || data.length === 0) {
            errorMsg.innerText = 'El bombero no existe en la base de datos';
            errorMsg.style.display = 'block';
            return;
        }

        // Nombre exacto registrado en la base de datos
        const nombreOficial = data[0].Bombero;

        // Guardamos la sesión y el inspector
        localStorage.setItem('centinela_usuario', nombreOficial);
        localStorage.setItem('centinela_inspector', nombreOficial);
        
        errorMsg.style.display = 'none';
        document.getElementById('login-usuario').value = '';
        document.getElementById('login-password').value = '';
        
        mostrarInterfazApp();

    } catch (err) {
        console.error('Error de red al autenticar:', err);
        errorMsg.innerText = 'Error de conexión con Supabase';
        errorMsg.style.display = 'block';
    }
}

export function cerrarSesion() {
    localStorage.removeItem('centinela_usuario');
    
    ocultarInterfazApp();
    document.getElementById('login-screen').style.display = 'flex';

    const drawer = document.getElementById('side-menu');
    const overlay = document.getElementById('drawer-overlay');
    if (drawer) drawer.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
}

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