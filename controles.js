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

            if (b.Bombero.toLowerCase() === inspectorPreseleccionado.toLowerCase()) {
                tarjeta.click();
            }
        });

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
    
    // Botón de submit a estado de carga
    const btnSubmit = document.querySelector('button[type="submit"]');
    const textoOriginal = btnSubmit.innerText;
    btnSubmit.innerText = 'Subiendo...';
    btnSubmit.disabled = true;
    
    // Captura de datos básicos
    const dbId = document.getElementById('input-id-db').value;
    const idch = document.getElementById('input-idch').value;
    const tipoControl = document.getElementById('input-tipocontrol').value;
    const realizo = document.getElementById('input-realizo').value;
    const estado = document.getElementById('input-estado').value;
    const observacion = document.getElementById('input-observacion').value;
    const fotoInput = document.getElementById('input-foto').files[0];

    // Componentes Físicos
    const gabinete = document.getElementById('input-gabinete').value;
    const pintura = document.getElementById('input-pintura').value;
    const limpieza = document.getElementById('input-limpieza').value;
    const engrasado = document.getElementById('input-engrasado').value;

    if (!realizo) {
        alert('Por favor selecciona un inspector haciendo clic en su foto.');
        btnSubmit.innerText = textoOriginal;
        btnSubmit.disabled = false;
        return;
    }

    let fotoUrl = null;

    // 1. SUBIR FOTO AL BUCKET CORRECTO (Minúsculas y con guion)
    if (fotoInput) {
        // Genera un nombre de archivo único limpiando espacios
        const nombreArchivo = `${Date.now()}_${fotoInput.name.replace(/\s+/g, '_')}`;
        
        const { data: uploadData, error: uploadError } = await clienteSupabase.storage
            .from('fotos-controles') 
            .upload(nombreArchivo, fotoInput);

        if (uploadError) {
            alert('Error al subir la foto a Supabase: ' + uploadError.message);
            btnSubmit.innerText = textoOriginal;
            btnSubmit.disabled = false;
            return;
        }

        const { data: urlData } = clienteSupabase.storage
            .from('fotos-controles')
            .getPublicUrl(nombreArchivo);

        fotoUrl = urlData.publicUrl;
    }

    // Calcular el mes actual en texto para la columna CONTROLMENSUAL
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const mesActual = meses[new Date().getMonth()];
    const fechaHoy = new Date().toISOString().split('T')[0];

    // 2. MAPEO EXACTO HACIA LA TABLA "Controles_H"
    const registroNuevo = {
        "ID": dbId,
        "IDCH": idch,
        "TipoControl": tipoControl,
        "Realizo": realizo,
        "Controlrealizado": realizo,
        "CONTROLMENSUAL": mesActual,
        "ESTADO": estado.toUpperCase(),
        "LlaveAlimentacion": document.getElementById('input-llavealimentacion').value,
        "DetalleLlaveAlimentacion": document.getElementById('input-detalle-alimentacion').value || null,
        "LlaveTeatroDerecho": document.getElementById('input-llaveteatroderecho').value,
        "DetalleTDerecho": document.getElementById('input-detalle-teatroderecho').value || null,
        "LlaveTeatroIzquierdo": document.getElementById('input-llaveteatroizquierdo').value,
        "DetalleTIzquierdo": document.getElementById('input-detalle-teatroizquierdo').value || null,
        "Gabinete": gabinete,
        "Pintura": pintura,
        "Limpieza": limpieza,
        "Engrasado": engrasado,
        "Observacion": observacion || null,
        "Foto": fotoUrl,
        "FechaFoto": fechaHoy
    };

    // Si es un control Anual, añadimos los campos específicos a la inserción
    if (tipoControl === 'Anual' || tipoControl === 'A Solicitud') {
        registroNuevo["PRUEBAANUAL"] = document.getElementById('input-fechapruebaanual').value || null;
        registroNuevo["PruebaAprobada"] = document.getElementById('input-pruebaaprobada').value || null;
        registroNuevo["MovAgua"] = document.getElementById('input-movagua').value || null;
    }

    const { error: insertError } = await clienteSupabase
        .from('Controles_H')
        .insert([registroNuevo]);

    if (insertError) {
        alert('Error al guardar los datos en la tabla: ' + insertError.message);
        btnSubmit.innerText = textoOriginal;
        btnSubmit.disabled = false;
        return;
    }

    // Guardar el inspector para la próxima vez
    localStorage.setItem('centinela_inspector', realizo);

    alert('Control guardado exitosamente.');
    
    // Restaurar botón y cerrar
    btnSubmit.innerText = textoOriginal;
    btnSubmit.disabled = false;
    cerrarFormularioControl();
}