// ==========================================
// MÓDULO: Controles y Formularios
// ==========================================

import { clienteSupabase } from './supabaseClient.js';

export function cambiarTipoControl() {
    const tipo = document.getElementById('input-tipocontrol').value;
    const bloqueAnual = document.getElementById('bloque-anual');
    
    if (tipo === 'Anual' || tipo === 'A Solicitud') {
        bloqueAnual.style.display = 'block';
        document.getElementById('input-fechapruebaanual').setAttribute('required', 'true');
    } else {
        bloqueAnual.style.display = 'none';
        document.getElementById('input-fechapruebaanual').removeAttribute('required');
    }
}

export function verificarDetalleLlave(tipo) {
    const valor = document.getElementById(`input-llave${tipo}`).value;
    const divDetalle = document.getElementById(`div-detalle-${tipo}`);
    const inputDetalle = document.getElementById(`input-detalle-${tipo}`);

    if (valor === 'No conforme') {
        divDetalle.style.display = 'block';
        inputDetalle.setAttribute('required', 'true');
    } else {
        divDetalle.style.display = 'none';
        inputDetalle.removeAttribute('required');
        inputDetalle.value = '';
    }
}

export async function abrirFormularioControl(tabla, dbId, idElemento) {
    const modal = document.getElementById('modal-control');
    const titulo = document.getElementById('modal-titulo-elemento');
    
    document.getElementById('input-id-db').value = dbId;
    document.getElementById('input-idch').value = idElemento;
    document.getElementById('input-tabla').value = tabla;
    if (titulo) titulo.innerText = `Control para: ${idElemento}`;
    
    // === CARGAR TARJETAS VISUALES DE BOMBEROS ACTIVOS ===
    const contenedorBomberos = document.getElementById('grid-seleccion-bombero');
    const inputRealizo = document.getElementById('input-realizo');
    
    contenedorBomberos.innerHTML = '<p style="color: #aaa; font-size: 13px;">Cargando personal...</p>';
    inputRealizo.value = ''; // Reset

    const { data, error } = await clienteSupabase
        .from('Bomberos')
        .select('*')
        .order('Bombero', { ascending: true });

    if (error || !data) {
        contenedorBomberos.innerHTML = '<p style="color: #ef4444; font-size: 13px;">Error al cargar personal</p>';
    } else {
        contenedorBomberos.innerHTML = '';
        const bomberosActivos = data.filter(b => (b.Estado || '').toLowerCase() === 'activo');
        
        let inspectorPreseleccionado = localStorage.getItem('centinela_inspector') || '';

        bomberosActivos.forEach(b => {
            let fotoUrl = b.Foto;
            if (fotoUrl && !fotoUrl.startsWith('http')) {
                fotoUrl = `https://zgzhudcdxoentmfgdncf.supabase.co/storage/v1/object/public/FotosBomberos/${fotoUrl}`;
            }
            if (!fotoUrl) {
                fotoUrl = 'https://via.placeholder.com/150?text=Sin+Foto';
            }

            const tarjeta = document.createElement('div');
            tarjeta.className = 'tarjeta-bombero-select';
            tarjeta.dataset.nombre = b.Bombero;
            tarjeta.style.cssText = `
                min-width: 80px; max-width: 80px; background: #2a2a2a; border: 2px solid #444; 
                border-radius: 8px; padding: 8px 4px; text-align: center; cursor: pointer; 
                flex-shrink: 0; transition: all 0.2s ease;
            `;

            tarjeta.innerHTML = `
                <img src="${fotoUrl}" alt="${b.Bombero}" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover; margin-bottom: 4px; border: 1px solid #555;" onerror="this.src='https://via.placeholder.com/150?text=Error'">
                <div style="font-size: 11px; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${b.Bombero}">${b.Bombero.split(' ')[0]}</div>
            `;

            // Evento al hacer clic en la tarjeta del bombero
            tarjeta.onclick = function() {
                document.querySelectorAll('.tarjeta-bombero-select').forEach(t => {
                    t.style.background = '#2a2a2a';
                    t.style.borderColor = '#444';
                });
                tarjeta.style.background = '#22c55e22';
                tarjeta.style.borderColor = '#22c55e';
                inputRealizo.value = b.Bombero;
            };

            contenedorBomberos.appendChild(tarjeta);

            // Autoseleccionar si coincide con el usuario guardado previamente
            if (b.Bombero.toLowerCase() === inspectorPreseleccionado.toLowerCase()) {
                tarjeta.click();
            }
        });

        // Si hay elementos pero ninguno coincidió exactamente, seleccionamos el primero por defecto
        if (!inputRealizo.value && bomberosActivos.length > 0) {
            contenedorBomberos.firstChild.click();
        }
    }
    // ======================================================
    
    document.getElementById('input-tipocontrol').value = 'Mensual';
    cambiarTipoControl();

    ['alimentacion', 'teatroderecho', 'teatroizquierdo'].forEach(tipo => {
        document.getElementById(`div-detalle-${tipo}`).style.display = 'none';
        document.getElementById(`input-detalle-${tipo}`).removeAttribute('required');
        document.getElementById(`input-detalle-${tipo}`).value = '';
    });

    if (modal) modal.style.display = 'flex';
}

export function cerrarFormularioControl() {
    const modal = document.getElementById('modal-control');
    if (modal) modal.style.display = 'none';
    const form = document.getElementById('form-nuevo-control');
    if (form) form.reset();
}

export async function guardarControl(event) {
    event.preventDefault();
    
    const dbId = document.getElementById('input-id-db').value;
    const idch = document.getElementById('input-idch').value;
    const tabla = document.getElementById('input-tabla').value;
    const tipoControl = document.getElementById('input-tipocontrol').value;
    const realizo = document.getElementById('input-realizo').value;
    const estado = document.getElementById('input-estado').value;
    const observacion = document.getElementById('input-observacion').value;
    const fotoInput = document.getElementById('input-foto').files[0];

    if (!realizo) {
        alert('Por favor selecciona un inspector haciendo clic en su foto.');
        return;
    }

    let fotoUrl = '';

    if (fotoInput) {
        const nombreArchivo = `${Date.now()}_${fotoInput.name}`;
        const { data: uploadData, error: uploadError } = await clienteSupabase.storage
            .from('FotosControles')
            .upload(nombreArchivo, fotoInput);

        if (uploadError) {
            alert('Error al subir la foto: ' + uploadError.message);
            return;
        }

        const { data: urlData } = clienteSupabase.storage
            .from('FotosControles')
            .getPublicUrl(nombreArchivo);

        fotoUrl = urlData.publicUrl;
    }

    alert('Control guardado exitosamente.');
    cerrarFormularioControl();
}