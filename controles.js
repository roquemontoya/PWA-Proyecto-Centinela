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
    
    // Cargar bomberos activos en el desplegable
    const selectRealizo = document.getElementById('input-realizo');
    
    if (selectRealizo.options.length <= 1) {
        const { data, error } = await clienteSupabase
            .from('Bomberos')
            .select('Bombero, Estado')
            .order('Bombero', { ascending: true });

        if (!error && data) {
            selectRealizo.innerHTML = '<option value="" disabled>Selecciona un inspector</option>';
            data.forEach(b => {
                if ((b.Estado || '').toLowerCase() === 'activo') {
                    const option = document.createElement('option');
                    option.value = b.Bombero;
                    option.textContent = b.Bombero;
                    selectRealizo.appendChild(option);
                }
            });
        }
    }
    
    // Autoseleccionar al inspector guardado en localStorage
    const inspectorGuardado = localStorage.getItem('centinela_inspector');
    if (inspectorGuardado) {
        selectRealizo.value = inspectorGuardado;
        if (selectRealizo.value !== inspectorGuardado) {
            const option = document.createElement('option');
            option.value = inspectorGuardado;
            option.textContent = inspectorGuardado + ' (Logueado)';
            selectRealizo.appendChild(option);
            selectRealizo.value = inspectorGuardado;
        }
    }
    
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