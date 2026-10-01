// ==========================================
// MÓDULO: Mapas y Geolocalización (Leaflet)
// ==========================================

import { clienteSupabase } from './supabaseClient.js';

const MAPEO_MODULOS = {
    'hidrantes': { tabla: 'hidrantes', bucket: 'FotosHidrantes', nombreLegible: 'Hidrantes' },
    'extintores': { tabla: 'Extintores', bucket: 'FotosExtintores', nombreLegible: 'Extintores' },
    'ecas': { tabla: 'ecas', bucket: 'FotosEcas', nombreLegible: 'ECAS' },
    'valvulas': { tabla: 'valvulas', bucket: 'FotosValvulas', nombreLegible: 'Válvulas' },
    'vecas': { tabla: 'vecas', bucket: 'FotosVecas', nombreLegible: 'VECAS' },
    'pecas': { tabla: 'pecas', bucket: 'FotosPecas', nombreLegible: 'PECAS' },
    'ipp': { tabla: 'ipp', bucket: 'FotosIpp', nombreLegible: 'IPP' },
    'bomberos': { tabla: 'Bomberos', bucket: 'FotosBomberos', nombreLegible: 'Personal / Bomberos' }
};

let mapaActivo = null;

// Función todoterreno para encontrar coordenadas sin importar cómo se llame la columna
function extraerCoordenadas(item) {
    let lat = null;
    let lng = null;
    let puntoString = null;

    // Buscamos dinámicamente en todas las propiedades de la fila
    const keys = Object.keys(item);
    for (let key of keys) {
        const k = key.toLowerCase();
        
        if (k === 'latitud' || k === 'lat') lat = parseFloat(item[key]);
        if (k === 'longitud' || k === 'lng' || k === 'lon' || k === 'long') lng = parseFloat(item[key]);
        if (k === 'ubicacion' || k === 'ubicación' || k === 'geom' || k === 'coordenadas' || k === 'coordenada' || k === 'wkt') {
            puntoString = item[key];
        }
    }

    // 1. Si encontró columnas separadas de lat y lng
    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
        return [lat, lng];
    }

    // 2. Si encontró un string tipo WKT o "lat, lng"
    if (typeof puntoString === 'string') {
        // Formato MyMaps WKT: POINT (lon lat)
        const matchPoint = puntoString.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
        if (matchPoint) {
            const pLng = parseFloat(matchPoint[1]);
            const pLat = parseFloat(matchPoint[2]);
            if (!isNaN(pLat) && !isNaN(pLng)) return [pLat, pLng];
        }

        // Formato clásico: "-31.41, -64.18"
        const matchComa = puntoString.match(/([-\d.]+)\s*,\s*([-\d.]+)/);
        if (matchComa) {
            const val1 = parseFloat(matchComa[1]);
            const val2 = parseFloat(matchComa[2]);
            if (!isNaN(val1) && !isNaN(val2)) {
                return Math.abs(val1) > 90 ? [val2, val1] : [val1, val2];
            }
        }
    }
    return null; // Si no hay coordenadas válidas
}

export async function cargarModuloMapa(moduloKey, contenedor) {
    const config = MAPEO_MODULOS[moduloKey] || { tabla: moduloKey, bucket: `Fotos${moduloKey}`, nombreLegible: moduloKey };
    
    // Configuración de pantalla completa
    contenedor.style.width = '100%';
    contenedor.style.maxWidth = '100%'; 
    contenedor.style.height = 'calc(100vh - 65px)'.trim(); 
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

    // Inyectar el div del mapa
    contenedor.innerHTML = `<div id="mapa-modulo" style="width: 100%; height: 100%;"></div>`;

    if (mapaActivo) {
        mapaActivo.remove();
        mapaActivo = null;
    }

    let centroLat = -31.4168;
    let centroLon = -64.1834;

    mapaActivo = L.map('mapa-modulo', {
        zoomControl: true
    }).setView([centroLat, centroLon], 17);

    // Capa satelital ESRI
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 22
    }).addTo(mapaActivo);

    let bounds = [];

    // Procesar elementos y pines usando la función todoterreno
    (data || []).forEach(item => {
        const coords = extraerCoordenadas(item);
        
        if (coords) {
            const lat = coords[0];
            const lon = coords[1];
            bounds.push([lat, lon]);

            let colorPin = '#22c55e'; // Verde
            let estadoTexto = item.EstadoReferencia || item.Estado || 'Operativo';
            
            const estLower = String(estadoTexto).toLowerCase();
            if (estLower.includes('observado')) {
                colorPin = '#eab308'; // Amarillo
            } else if (estLower.includes('anomalo') || estLower.includes('anómalo') || estLower.includes('no operativo')) {
                colorPin = '#ef4444'; // Rojo
            }

            const iconoPin = L.divIcon({
                className: 'custom-pin',
                html: `<div style="background-color: ${colorPin}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 8px rgba(0,0,0,0.9);"></div>`,
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            });

            const marker = L.marker([lat, lon], { icon: iconoPin }).addTo(mapaActivo);

            let idElemento = item.NombreEtiqueta || item.Nombre || item.nombre || `Elemento #${item.id}`;
            let pastillaHtml = `<span style="background: ${colorPin}; color: #000; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 11px;">${estadoTexto.toUpperCase()}</span>`;

            const popupContent = `
                <div style="font-family: Arial, sans-serif; color: #333; min-width: 180px;">
                    <div style="font-weight: bold; font-size: 13px; margin-bottom: 4px; color: #111;">${idElemento}</div>
                    <div style="font-size: 12px; margin-bottom: 6px; color: #555;">Sector: ${item.Sector || 'N/D'}</div>
                    <div style="font-size: 12px; margin-bottom: 10px; display: flex; align-items: center; gap: 5px;">
                        Estado: ${pastillaHtml}
                    </div>
                    <button onclick="window.abrirFormularioControl('${config.tabla}', '${item.id}', '${idElemento.replace(/'/g, "\\'")}')" style="background: #22c55e; color: #000; border: none; padding: 7px 12px; border-radius: 5px; font-weight: bold; cursor: pointer; width: 100%; font-size: 12px; text-align: center;">Nuevo Control</button>
                </div>
            `;

            marker.bindPopup(popupContent);
        }
    });

    // Forzar redibujo y salto automático de zoom (con 200ms extra de margen de seguridad para Leaflet)
    setTimeout(() => {
        if (mapaActivo) {
            mapaActivo.invalidateSize();
            if (bounds.length > 0) {
                mapaActivo.fitBounds(bounds, { padding: [50, 50], maxZoom: 19 });
            }
        }
    }, 200);
}