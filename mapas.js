// ==========================================
// MÓDULO: Mapas y Geolocalización (Leaflet)
// ==========================================

import { clienteSupabase } from './supabaseClient.js';
import { abrirFormularioControl } from './controles.js';

let mapaActivo = null;

export async function cargarModuloMapa(moduloKey, contenedor) {
    const nombreTabla = moduloKey.charAt(0).toUpperCase() + moduloKey.slice(1);
    
    contenedor.innerHTML = '<div style="padding: 40px; text-align: center; color: #fff; font-family: Arial;">Cargando mapa y elementos de ' + nombreTabla + '...</div>';

    // 1. Consultar datos en Supabase
    const { data, error } = await clienteSupabase
        .from(nombreTabla)
        .select('*');

    if (error) {
        contenedor.innerHTML = `<div style="padding: 20px; color: #ef4444; text-align: center;">Error al cargar datos: ${error.message}</div>`;
        return;
    }

    // 2. Preparar contenedor del mapa
    contenedor.innerHTML = '<div id="mapa-leaflet" style="width: 100%; height: calc(100vh - 60px);"></div>';

    // Destruir mapa anterior si existe para evitar conflictos
    if (mapaActivo) {
        mapaActivo.remove();
        mapaActivo = null;
    }

    // Coordenadas por defecto (Centro de operaciones / Córdoba)
    let centroLat = -31.4201;
    let centroLng = -64.1888;
    let zoomInicial = 15;

    // Buscar el primer elemento con coordenadas válidas para centrar el mapa
    if (data && data.length > 0) {
        for (let item of data) {
            const coords = extraerCoordenadas(item);
            if (coords) {
                centroLat = coords[0];
                centroLng = coords[1];
                break;
            }
        }
    }

    // Inicializar Leaflet
    mapaActivo = L.map('mapa-leaflet').setView([centroLat, centroLng], zoomInicial);

    // Capa base de mapas
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© Centinela 2.0'
    }).addTo(mapaActivo);

    if (!data || data.length === 0) {
        return;
    }

    // 3. Renderizar marcadores con foto y estado
    data.forEach(item => {
        const coords = extraerCoordenadas(item);
        if (!coords) return;

        let estado = (item.Estado || 'Operativo').toLowerCase();
        let colorPin = '#22c55e'; // Verde por defecto (Operativo)
        let textoEstado = 'Operativo';

        if (estado.includes('observado')) {
            colorPin = '#eab308'; // Amarillo (Observado)
            textoEstado = 'Observado';
        } else if (estado.includes('anomalo') || estado.includes('anómalo') || estado.includes('no operativo')) {
            colorPin = '#ef4444'; // Rojo (Anómalo)
            textoEstado = 'Anómalo';
        }

        // Crear marcador circular con el color correspondiente al estado
        const marker = L.circleMarker(coords, {
            radius: 9,
            fillColor: colorPin,
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.85
        }).addTo(mapaActivo);

        // Procesar URL de la foto del hidrante/elemento
        let fotoUrl = item.Foto || item.FotoHidrante || '';
        if (fotoUrl && !fotoUrl.startsWith('http')) {
            const bucketName = `Fotos${nombreTabla}`.replace(/\s+/g, '');
            fotoUrl = `https://zgzhudcdxoentmfgdncf.supabase.co/storage/v1/object/public/${bucketName}/${fotoUrl}`;
        }

        const fotoHtml = fotoUrl ? `<img src="${fotoUrl}" alt="Foto Elemento" style="width: 100%; height: 110px; object-fit: cover; border-radius: 6px; margin-bottom: 6px; border: 1px solid #444;" onerror="this.style.display='none'">` : '';

        // Pastilla visual de estado
        const pastillaHtml = `<span style="background: ${colorPin}; color: ${colorPin === '#eab308' ? '#000' : (colorPin === '#22c55e' ? '#000' : '#fff')}; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; display: inline-block;">${textoEstado}</span>`;

        const idElemento = item.Etiqueta || item.Idch || item.Nombre || item.id;

        const popupContent = `
            <div style="font-family: Arial, sans-serif; color: #222; max-width: 220px; line-height: 1.3;">
                ${fotoHtml}
                <div style="font-weight: bold; font-size: 13px; margin-bottom: 4px; color: #111;">ID / Etiqueta: ${idElemento}</div>
                <div style="font-size: 12px; margin-bottom: 6px; color: #555;">Sector: ${item.Sector || 'N/D'}</div>
                <div style="font-size: 12px; margin-bottom: 10px; display: flex; align-items: center; gap: 5px;">
                    Estado: ${pastillaHtml}
                </div>
                <button onclick="window.abrirFormularioControl('${nombreTabla}', '${item.id}', '${idElemento.replace(/'/g, "\\'")}')" style="background: #22c55e; color: #000; border: none; padding: 7px 12px; border-radius: 5px; font-weight: bold; cursor: pointer; width: 100%; font-size: 12px; text-align: center;">Nuevo Control</button>
            </div>
        `;

        marker.bindPopup(popupContent);
    });
}

function extraerCoordenadas(item) {
    if (item.Latitud !== undefined && item.Longitud !== undefined && item.Latitud !== null && item.Longitud !== null) {
        const lat = parseFloat(item.Latitud);
        const lng = parseFloat(item.Longitud);
        if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
    }
    if (item.lat !== undefined && item.lng !== undefined) {
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lng);
        if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
    }
    const geom = item.Ubicacion || item.geom || item.coordenadas || '';
    if (typeof geom === 'string' && geom.includes('POINT')) {
        const match = geom.match(/\(([^)]+)\)/);
        if (match && match[1]) {
            const partes = match[1].trim().split(/\s+/);
            if (partes.length >= 2) {
                const lng = parseFloat(partes[0]);
                const lat = parseFloat(partes[1]);
                if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
            }
        }
    }
    return null;
}