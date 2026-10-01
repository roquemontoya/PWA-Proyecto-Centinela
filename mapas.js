// ==========================================
// MÓDULO: Mapas (Leaflet y Pines de Red)
// ==========================================

import { clienteSupabase } from './supabaseClient.js';

let mapa = null;

export async function cargarModuloMapa(moduloKey, contenedor) {
    const tablasSupabase = {
        'hidrantes': 'hidrantes',
        'extintores': 'Extintores',
        'ecas': 'ecas',
        'valvulas': 'Valvulas',
        'vecas': 'vecas',
        'pecas': 'pecas',
        'ipp': 'ipp'
    };

    const nombreTabla = tablasSupabase[moduloKey] || moduloKey;

    contenedor.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding: 0 10px;">
            <h2 style="margin: 0; color: #fff; text-transform: uppercase; font-size: 16px;">Módulo: ${moduloKey}</h2>
            <button onclick="irInicio()" style="background:#333; color:#fff; border:none; padding:8px 15px; border-radius:5px; cursor:pointer; font-weight:bold;">← Volver</button>
        </div>
        <div id="mapa-modulo" style="width: 100%; height: 450px; border-radius: 8px;"></div>
    `;

    if (mapa) {
        mapa.remove();
        mapa = null;
    }

    mapa = L.map('mapa-modulo').setView([-31.416, -64.183], 15);
    
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Tiles © Esri'
    }).addTo(mapa);

    const { data, error } = await clienteSupabase
        .from(nombreTabla)
        .select('*');

    if (error) {
        console.error(`Error al cargar la tabla ${nombreTabla}:`, error);
        contenedor.innerHTML += `
            <div style="background: #2a1215; border: 1px solid #ef4444; color: #fca5a5; padding: 15px; border-radius: 8px; margin: 15px;">
                <strong>Aviso de Base de Datos:</strong> La tabla <code>${nombreTabla}</code> aún no existe en Supabase o no tiene permisos públicos configurados.<br>
                <small>Error técnico: ${error.message}</small>
            </div>`;
        return;
    }

    let limitesPuntos = [];

    if (data && data.length > 0) {
        let pinesValidos = 0;

        data.forEach(item => {
            if (item.Ubicacion) {
                const partes = item.Ubicacion.split(',');
                
                if (partes.length >= 2) {
                    const lat = parseFloat(partes[0].trim());
                    const lng = parseFloat(partes[1].trim());

                    if (!isNaN(lat) && !isNaN(lng)) {
                        pinesValidos++;
                        limitesPuntos.push([lat, lng]);

                        // Asignación de colores según estado
                        let colorPin = '#22c55e'; // Verde por defecto (Operativo)
                        const estado = (item.EstadoReferencia || item.estado || '').toLowerCase();
                        
                        if (estado.includes('observado')) {
                            colorPin = '#eab308'; // Amarillo
                        } else if (estado.includes('anómalo') || estado.includes('anomalo') || estado.includes('critico') || estado.includes('crítico')) {
                            colorPin = '#ef4444'; // Rojo
                        }

                        const marcador = L.circleMarker([lat, lng], {
                            radius: 10,
                            fillColor: colorPin,
                            color: '#000',
                            weight: 1,
                            opacity: 1,
                            fillOpacity: 0.8
                        }).addTo(mapa);

                        const dbId = item.id;
                        const identificador = item.Etiqueta || item.id || 'Elemento';
                        
                        marcador.bindPopup(`
                            <div style="color: #333; font-family: Arial, sans-serif;">
                                <b>Etiqueta / ID:</b> ${identificador}<br>
                                <b>Sector:</b> ${item.Sector || 'N/A'}<br>
                                <button onclick="abrirFormularioControl('${nombreTabla}', '${dbId}', '${identificador}')" style="margin-top:8px; padding:6px 12px; background:#22c55e; color:#000; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">Nuevo Control</button>
                            </div>
                        `);
                    }
                }
            }
        });

        if (limitesPuntos.length > 0) {
            mapa.fitBounds(limitesPuntos, { padding: [50, 50] });
        }

        if (pinesValidos === 0) {
            contenedor.innerHTML += `<p style="color: #fbbf24; margin: 15px;">Se conectó a '${nombreTabla}', pero no se pudieron interpretar las coordenadas de la columna Ubicacion.</p>`;
        }
    } else {
        contenedor.innerHTML += `<p style="color: #94a3b8; margin: 15px;">La tabla '${nombreTabla}' está conectada correctamente pero no contiene registros todavía.</p>`;
    }
}