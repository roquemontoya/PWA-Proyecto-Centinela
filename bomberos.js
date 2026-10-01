
// ==========================================
// MÓDULO: Personal / Bomberos
// ==========================================

import { clienteSupabase } from './supabaseClient.js';

export async function cargarModuloBomberos(contenedor) {
    contenedor.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding: 0 10px;">
            <h2 style="margin: 0; color: #fff; text-transform: uppercase; font-size: 16px;">Módulo: Personal de Bomberos</h2>
            <button onclick="irInicio()" style="background:#333; color:#fff; border:none; padding:8px 15px; border-radius:5px; cursor:pointer; font-weight:bold;">← Volver</button>
        </div>
        <div id="grid-bomberos" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 15px; padding: 10px;">
            <p style="color: #aaa;">Cargando personal...</p>
        </div>
    `;

    const { data, error } = await clienteSupabase
        .from('Bomberos')
        .select('*')
        .order('Bombero', { ascending: true });

    const gridContainer = document.getElementById('grid-bomberos');

    if (error) {
        gridContainer.innerHTML = `<p style="color: #ef4444;">Error al cargar bomberos: ${error.message}</p>`;
        return;
    }

    if (data && data.length > 0) {
        gridContainer.innerHTML = ''; // Limpiar texto de carga
        data.forEach(b => {
            const esActivo = (b.Estado || '').toLowerCase() === 'activo';
            const colorEstado = esActivo ? '#22c55e' : '#ef4444';
            const textoEstado = esActivo ? 'ACTIVO' : 'INACTIVO';

            // Manejo de URL de foto por si viene relativa o absoluta del bucket
            let fotoUrl = b.Foto;[cite: 4]
            if (fotoUrl && !fotoUrl.startsWith('http')) {
                fotoUrl = `https://zgzhudcdxoentmfgdncf.supabase.co/storage/v1/object/public/FotosBomberos/${fotoUrl}`;
            }
            if (!fotoUrl) {
                fotoUrl = 'https://via.placeholder.com/150?text=Sin+Foto';
            }

            const tarjeta = document.createElement('div');
            tarjeta.style.cssText = `
                background: #1e1e1e; border: 1px solid #333; border-radius: 8px; 
                padding: 12px; text-align: center; display: flex; flex-direction: column; 
                align-items: center; justify-content: space-between; box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            `;

            tarjeta.innerHTML = `
                <img src="${fotoUrl}" alt="${b.Bombero}" style="width: 90px; height: 90px; border-radius: 50%; object-fit: cover; border: 2px solid #444; margin-bottom: 10px;" onerror="this.src='https://via.placeholder.com/150?text=Error+Foto'">
                <h3 style="color: #fff; font-size: 14px; margin: 0 0 8px 0; font-weight: 600;">${b.Bombero}</h3>
                <span style="background: ${colorEstado}22; color: ${colorEstado}; border: 1px solid ${colorEstado}; font-size: 11px; font-weight: bold; padding: 3px 8px; border-radius: 12px; text-transform: uppercase;">
                    ${textoEstado}
                </span>
            `;
            gridContainer.appendChild(tarjeta);
        });
    } else {
        gridContainer.innerHTML = `<p style="color: #aaa;">No se encontraron registros en la tabla Bomberos.</p>`;
    }
}