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

export async function cargarModuloMapa(moduloKey, contenedor) {
    const config = MAPEO_MODULOS[moduloKey] || { tabla: moduloKey, bucket: `Fotos${moduloKey}`, nombreLegible: moduloKey };
    
    // Configuración de pantalla completa para el contenedor dinámico
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

    // Inyectar el div del mapa ocupando el 100% del contenedor
    contenedor.innerHTML = `<div id="mapa-modulo" style="width: 100%; height: 100%;"></div>`;

    if (mapaActivo) {
        mapaActivo.remove();
        mapaActivo = null;
    }

    // Coordenadas iniciales por defecto (Córdoba)
    let centroLat = -31.4168;
    let centroLon = -64.1834;

    mapaActivo = L.map('mapa-modulo', {
        zoomControl: true
    }).setView([centroLat, centroLon], 17);

    // Capa satelital ESRI World Imagery
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 22
    }).addTo(mapaActivo);

    let bounds = [];

    // Procesar elementos y pines (gotas)
    (data || []).forEach(item => {
        let lat = null;
        let lon = null;

        if (item.WKT && typeof item.WKT === 'string' && item.WKT.includes('POINT')) {
            try {
                const coordsStr = item.WKT.replace('POINT (', '').replace(')', '').trim();
                const partes = coordsStr.split(/\s+/);
                if (partes.length >= 2) {
                    lon = parseFloat(partes[0]);
                    lat = parseFloat(partes[1]);
                }
            } catch (e) {
                console.error("Error parseando WKT:", item.WKT);
            }
        }

        if (lat && lon && !isNaN(lat) && !isNaN(lon)) {
            bounds.push([lat, lon]);

            let colorPin = '#22c55e'; // Verde (Operativo)
            let estadoTexto = item.EstadoReferencia || 'Operativo';
            
            const estLower = String(estadoTexto).toLowerCase();
            if (estLower.includes('observado')) {
                colorPin = '#eab308'; // Amarillo
            } else if (estLower.includes('anomalo') || estLower.includes('anómalo') || estLower.includes('no operativo')) {
                colorPin = '#ef4444'; // Rojo
            }

            // Marcador personalizado (gota)
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

    // Forzar actualización de tamaño y salto automático (zoom y centrado en los pines)
    setTimeout(() => {
        if (mapaActivo) {
            mapaActivo.invalidateSize();
            if (bounds.length > 0) {
                mapaActivo.fitBounds(bounds, { padding: [50, 50], maxZoom: 19 });
            }
        }
    }, 100);
}