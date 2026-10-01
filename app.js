// ==========================================
// MÓDULO PRINCIPAL: Orquestador (app.js)
// ==========================================

import { cargarModuloMapa } from './mapas.js';
import { cargarModuloBomberos } from './bomberos.js';
import { 
    cambiarTipoControl, 
    verificarDetalleLlave, 
    verificarEstadoControl,
    abrirFormularioControl, 
    cerrarFormularioControl, 
    guardarControl 
} from './controles.js';

// Control del menú lateral (hamburguesa)
window.toggleMenu = function() {
    const drawer = document.getElementById('side-menu');
    const overlay = document.getElementById('drawer-overlay');
    if (drawer && overlay) {
        drawer.classList.toggle('open');
        overlay.classList.toggle('active');
    }
};

// Volver al Home principal
window.irInicio = function() {
    const mainContent = document.getElementById('main-content');
    const vistaDinamica = document.getElementById('vista-dinamica');
    
    if (mainContent) mainContent.style.display = 'grid';
    if (vistaDinamica) vistaDinamica.style.display = 'none';
    
    const drawer = document.getElementById('side-menu');
    if (drawer && drawer.classList.contains('open')) {
        window.toggleMenu();
    }
};

// Orquestador principal de módulos al hacer clic en los botones
window.cargarModulo = async function(moduloKey) {
    const drawer = document.getElementById('side-menu');
    if (drawer && drawer.classList.contains('open')) {
        window.toggleMenu();
    }

    const mainContent = document.getElementById('main-content');
    const contenedor = document.getElementById('vista-dinamica');

    if (mainContent) mainContent.style.display = 'none';
    if (contenedor) {
        contenedor.style.display = 'block';
    }

    if (moduloKey === 'bomberos') {
        await cargarModuloBomberos(contenedor);
    } else {
        await cargarModuloMapa(moduloKey, contenedor);
    }
};

// Exponer funciones de controles al objeto global window para el HTML
window.cambiarTipoControl = cambiarTipoControl;
window.verificarDetalleLlave = verificarDetalleLlave;
window.verificarEstadoControl = verificarEstadoControl;
window.abrirFormularioControl = abrirFormularioControl;
window.cerrarFormularioControl = cerrarFormularioControl;
window.guardarControl = guardarControl;