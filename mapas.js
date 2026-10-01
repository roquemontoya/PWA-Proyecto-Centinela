// ==========================================
// MÓDULO: Mapas y Geolocalización (Leaflet)
// ==========================================

import { clienteSupabase } from './supabaseClient.js';
// Asegúrate de que abrirFormularioControl se importe si lo vas a usar, 
// aunque en tu HTML se llama desde window.abrirFormularioControl
import { abrirFormularioControl } from './controles.js';

const MAPEO_MODULOS = {
    'hidrantes': { tabla: 'hidrantes', bucket: 'FotosHidrantes', nombreLegible: 'Hidrantes' },
    'extintores': { tabla: 'extintores', bucket: 'FotosExtintores', nombreLegible: 'Extintores' },
    'ecas': { tabla: 'ecas', bucket: 'FotosEcas', nombreLegible: 'ECAS' },
    'valvulas': { tabla: 'valvulas', bucket: 'FotosValvulas', nombreLegible: 'Válvulas' },
    'vecas': { tabla: 'vecas', bucket: 'FotosVecas', nombreLegible: 'VECAS' },
    'pecas': { tabla: 'pecas', bucket: 'FotosPecas', nombreLegible: 'PECAS' },
    'ipp': { tabla: 'ipp', bucket: 'FotosIpp', nombreLegible: 'IPP' },
    'bomberos': { tabla: 'Bomberos', bucket: 'FotosBomberos', nombreLegible: 'Personal / Bomberos' }
};

let mapaActivo = null;

export async function cargarModuloMapa(moduloKey, contenedor) {
    const config = MAPEO_MODULOS[moduloKey] || { tabla: moduloKey, bucket: `Fotos${moduloKey}`, nombreLegible: moduloKey };
    
    // =========================================================================
    // CORRECCIÓN 1: Forzar pantalla completa real anulando el CSS
    // =========================================================================
    contenedor.style.width = '100%';
    contenedor.style.maxWidth = '100%'; // ESTO SOLUCIONA EL ESPACIO NEGRO (sobrescribe los 800px)
    contenedor.style.height = 'calc(100vh - 125px)'; // Ajustado para que quepa entre el header y el footer verde
    contenedor.style.margin = '0';
    contenedor.style.padding = '0';
    contenedor.style.display = 'block';

    contenedor.innerHTML = `<div style="padding: 40px; text-align: center; color: #fff; font-family: Arial;">Cargando mapa satelital de ${config.nombreLegible}...</div>`;

    const { data, error } = await clienteSupabase
        .from(config.tabla)
        .select('*');

    if (error) {
        contenedor.innerHTML = `<div style="padding: 20px; color: #ef4444; text-align: center; font-family: Arial;">Error al cargar datos (${config.tabla}): ${error.message}</div>`;
        return;
    }

    // El z-index: 1 asegura que los controles del mapa no queden por encima de tus modales o menús
    contenedor.innerHTML = '<div id="mapa-leaflet" style="width: 100%; height: 100%; z-index: 1;"></div>';

    if (mapaActivo) {
        mapaActivo.remove();
        mapaActivo = null;
    }

    mapaActivo = L.map('mapa-leaflet', {
        zoomControl: true
    }).setView([-31.4201, -64.1888], 15);

    // Capa satelital (Estilo Google Maps / Vista Aérea)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-eGIS, and GIS User Community'
    }).addTo(mapaActivo);

    if (!data || data.length === 0) {
        return;
    }

    let arrayCoordenadas = [];

    data.forEach(item => {
        const coords = extraerCoordenadas(item);
        if (!coords) return;

        arrayCoordenadas.push(coords);

        let estado = (item.Estado || 'Operativo').toLowerCase();
        let colorPin = '#22c55e'; // Verde (Operativo)
        let textoEstado = 'Operativo';

        if (estado.includes('observado')) {
            colorPin = '#eab308'; // Amarillo (Observado)
            textoEstado = 'Observado';
        } else if (estado.includes('anomalo') || estado.includes('anómalo') || estado.includes('no operativo')) {
            colorPin = '#ef4444'; // Rojo (Anómalo)
            textoEstado = 'Anómalo';
        }

        // Crear ícono personalizado en forma de "gota" idéntico a Google Maps
        const svgPin = `
            <svg viewBox="0 0 24 24" width="34" height="34" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 3px 4px rgba(0,0,0,0.6));">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${colorPin}" stroke="#ffffff" stroke-width="2"/>
                <circle cx="12" cy="9" r="3.5" fill="#ffffff"/>
            </svg>
        `;

        const iconoGota = L.divIcon({
            className: 'custom-google-pin',
            html: svgPin,
            iconSize: [34, 34],
            iconAnchor: [17, 34],
            popupAnchor: [0, -34]
        });

        const marker = L.marker(coords, { icon: iconoGota }).addTo(mapaActivo);

        let fotoUrl = item.Foto || item.FotoHidrante || '';
        if (fotoUrl && !fotoUrl.startsWith('http')) {
            fotoUrl = `https://zgzhudcdxoentmfgdncf.supabase.co/storage/v1/object/public/${config.bucket}/${fotoUrl}`;
        }

        const fotoHtml = fotoUrl ? `<img src="${fotoUrl}" alt="Foto Elemento" style="width: 100%; height: 110px; object-fit: cover; border-radius: 6px; margin-bottom: 6px; border: 1px solid #444;" onerror="this.style.display='none'">` : '';

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
                <button onclick="window.abrirFormularioControl('${config.tabla}', '${item.id}', '${idElemento.replace(/'/g, "\\'")}')" style="background: #22c55e; color: #000; border: none; padding: 7px 12px; border-radius: 5px; font-weight: bold; cursor: pointer; width: 100%; font-size: 12px; text-align: center;">Nuevo Control</button>
            </div>
        `;

        marker.bindPopup(popupContent);
    });

    // =========================================================================
    // CORRECCIÓN 2 y 3: Invalidar tamaño para forzar renderizado y auto-salto
    // =========================================================================
    setTimeout(() => {
        if (mapaActivo) {
            // Le dice a Leaflet que recalcule el ancho real de la pantalla
            mapaActivo.invalidateSize();
            
            // Salto automático exacto (`fitBounds`) a las coordenadas reales
            if (arrayCoordenadas.length > 0) {
                const bounds = L.latLngBounds(arrayCoordenadas);
                mapaActivo.fitBounds(bounds, { padding: [50, 50], maxZoom: 18 });
            }
        }
    }, 250); // Un pequeño retraso asegura que el HTML ya pintó el contenedor al 100%
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