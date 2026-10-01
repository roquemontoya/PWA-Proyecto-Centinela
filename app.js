// ==========================================
// MÓDULO PRINCIPAL: Orquestador (app.js)
// ==========================================

import { cargarModuloMapa } from './mapas.js';
import { cargarModuloBomberos } from './bomberos.js';
import { abrirControlHidrante, guardarControlHidrante, cambiarTipoControl, verificarDetalleLlave } from './controlesHidrantes.js';
import { abrirControlExtintor, guardarControlExtintor } from './controlesExtintores.js';
import { verificarEstadoControl, cerrarFormularioControl } from './controlesBase.js';

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

// Enrutador global para abrir el formulario según la tabla
window.abrirFormularioControl = function(tabla, dbId, idElemento) {
    const tablaLower = tabla.toLowerCase();
    if (tablaLower === 'hidrantes') {
        abrirControlHidrante(dbId, idElemento);
    } else if (tablaLower === 'extintores' || tablaLower === 'extintor') {
        abrirControlExtintor(dbId, idElemento);
    } else {
        alert(`Módulo de control para ${tabla} aún no implementado.`);
    }
};

// Enrutador global para guardar según la tabla activa
window.guardarControl = function(event) {
    const tabla = document.getElementById('input-tabla').value.toLowerCase();
    if (tabla === 'hidrantes') {
        guardarControlHidrante(event);
    } else if (tabla === 'extintores' || tabla === 'extintor') {
        guardarControlExtintor(event);
    }
};

// Exponer funciones auxiliares al objeto global window
window.cambiarTipoControl = cambiarTipoControl;
window.verificarDetalleLlave = verificarDetalleLlave;
window.verificarEstadoControl = verificarEstadoControl;
window.cerrarFormularioControl = cerrarFormularioControl;