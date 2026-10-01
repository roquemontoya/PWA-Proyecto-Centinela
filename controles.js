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

export function verificarEstadoControl() {
    const estado = document.getElementById('input-estado').value;
    const bloqueAnomalia = document.getElementById('bloque-anomalia');
    const razonInput = document.getElementById('input-anomalia-razon');

    if (estado === 'Anomalo') {
        bloqueAnomalia.style.display = 'block';
        razonInput.setAttribute('required', 'true');
        
        const inputFecha = document.getElementById('input-reportado-fecha');
        if (inputFecha && !inputFecha.value) {
            inputFecha.value = new Date().toISOString().split('T')[0];
        }
    } else {
        bloqueAnomalia.style.display = 'none';
        razonInput.removeAttribute('required');
        razonInput.value = '';
        document.getElementById('input-evento-numero').value = '';
        document.getElementById('input-reportado-fecha').value = '';
        document.getElementById('input-reportado-por').value = '';
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
    const selectReportado = document.getElementById('input-reportado-por');
    
    contenedorBomberos.innerHTML = '<p style="color: #aaa; font-size: 13px;">Cargando personal...</p>';
    inputRealizo.value = ''; // Reset

    if (selectReportado) {
        selectReportado.innerHTML = '<option value="">-- Seleccionar bombero --</option>';
    }

    const fallbackAvatar = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='150'><rect width='100%' height='100%' fill='%23333'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23aaa' font-family='sans-serif' font-size='12'>Sin Foto</text></svg>";

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
                fotoUrl = fallbackAvatar;
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
                <img src="${fotoUrl}" alt="${b.Bombero}" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover; margin-bottom: 4px; border: 1px solid #555;" onerror="this.src='${fallbackAvatar}'">
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

            if (selectReportado) {
                const opt = document.createElement('option');
                opt.value = b.Bombero;
                opt.textContent = b.Bombero;
                selectReportado.appendChild(opt);
            }
        });

        if (!inputRealizo.value && bomberosActivos.length > 0) {
            contenedorBomberos.firstChild.click();
        }
    }
    
    document.getElementById('input-tipocontrol').value = 'Mensual';
    cambiarTipoControl();

    document.getElementById('input-estado').value = 'Operativo';
    verificarEstadoControl();

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
    verificarEstadoControl();
}

export async function guardarControl(event) {
    event.preventDefault();
    
    const btnSubmit = document.querySelector('button[type="submit"]');
    const textoOriginal = btnSubmit.innerText;
    btnSubmit.innerText = 'Subiendo...';
    btnSubmit.disabled = true;
    
    const tablaPadre = document.getElementById('input-tabla').value;
    const dbId = document.getElementById('input-id-db').value; 
    const idch = document.getElementById('input-idch').value;
    const tipoControl = document.getElementById('input-tipocontrol').value;
    const realizo = document.getElementById('input-realizo').value;
    const estado = document.getElementById('input-estado').value; 
    const observacion = document.getElementById('input-observacion').value;
    const fotoInput = document.getElementById('input-foto').files[0];

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

    // Capturar datos de anomalía si aplica
    let razonAnomalia = null;
    let eventoNumero = null;
    let reportadoFecha = null;
    let reportadoPor = null;

    if (estado === 'Anomalo') {
        razonAnomalia = document.getElementById('input-anomalia-razon').value || null;
        eventoNumero = document.getElementById('input-evento-numero').value || null;
        reportadoFecha = document.getElementById('input-reportado-fecha').value || null;
        reportadoPor = document.getElementById('input-reportado-por').value || null;
    }

    let fotoUrl = null;

    if (fotoInput) {
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

    const ahora = new Date();
    const dia = String(ahora.getDate()).padStart(2, '0');
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const anio = ahora.getFullYear();
    const horas = String(ahora.getHours()).padStart(2, '0');
    const minutos = String(ahora.getMinutes()).padStart(2, '0');

    const idUnicoGenerado = `${dbId}_${dia}-${mes}-${anio}:${horas}:${minutos}`;

    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const mesActual = meses[ahora.getMonth()];
    const fechaHoy = ahora.toISOString().split('T')[0];

    const registroNuevo = {
        "ID": dbId,
        "IDCH": idUnicoGenerado,
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
        
        // --- CAMPOS DE ANOMALÍA ---
        "ANOMALIAS": razonAnomalia,
        "EventoNumero": eventoNumero ? Number(eventoNumero) : null,
        "ReportadoFecha": reportadoFecha,
        "ReportadoPor": reportadoPor,

        "Foto": fotoUrl,
        "FechaFoto": fechaHoy
    };

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

    // ========================================================
    // ACTUALIZACIÓN EN LA TABLA PADRE
    // ========================================================
    const { error: updateError } = await clienteSupabase
        .from(tablaPadre)
        .update({ EstadoReferencia: estado }) 
        .eq('id', dbId);

    if (updateError) {
        console.error("Error al actualizar la tabla padre:", updateError);
    }

    localStorage.setItem('centinela_inspector', realizo);
    
    btnSubmit.innerText = textoOriginal;
    btnSubmit.disabled = false;
    cerrarFormularioControl();

    // ========================================================
    // RECARGAR MAPA
    // ========================================================
    if (typeof window.cargarModulo === 'function') {
        window.cargarModulo(tablaPadre);
    } else {
        window.location.reload();
    }
}