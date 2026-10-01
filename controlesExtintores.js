// ==========================================
// MÓDULO: Controles de Extintores
// ==========================================

import { clienteSupabase } from './supabaseClient.js';
import { cargarBomberosEnModal, cerrarFormularioControl, subirFotoStorage } from './controlesBase.js';

export async function abrirControlExtintor(dbId, idElemento) {
    const modal = document.getElementById('modal-control');
    const titulo = document.getElementById('modal-titulo-elemento');
    
    document.getElementById('input-id-db').value = dbId;
    document.getElementById('input-idch').value = idElemento;
    document.getElementById('input-tabla').value = 'Extintores';
    if (titulo) titulo.innerText = `Control Extintor: ${idElemento}`;

    // Consultar datos actuales del extintor (Padre) para precargar los campos del CSV
    const { data: extData } = await clienteSupabase
        .from('Extintores')
        .select('*')
        .eq('id', dbId)
        .single();

    renderizarFormularioExtintorHTML(extData || {});

    await cargarBomberosEnModal();
    
    const tipoControlSelect = document.getElementById('input-tipocontrol');
    if (tipoControlSelect) tipoControlSelect.value = 'Mensual';

    const estadoSelect = document.getElementById('input-estado');
    if (estadoSelect) estadoSelect.value = 'Operativo';

    // Ocultar cualquier bloque de anomalía heredado
    const bloqueAnomalia = document.getElementById('bloque-anomalia');
    if (bloqueAnomalia) bloqueAnomalia.style.display = 'none';

    if (modal) modal.style.display = 'flex';
}

function renderizarFormularioExtintorHTML(ext) {
    const contenedorComponentes = document.getElementById('contenedor-componentes-dinamicos');
    if (!contenedorComponentes) return;

    contenedorComponentes.innerHTML = `
        <!-- DATOS DEL EXTRACTO CSV / PADRE -->
        <fieldset style="border: 1px solid #38bdf8; border-radius: 5px; padding: 10px; margin-bottom: 12px; background: #182830;">
            <legend style="font-size: 13px; color: #38bdf8; padding: 0 5px;">📋 Datos del Extintor (Registro)</legend>
            
            <label style="display: block; font-size: 12px; margin-top: 5px; color: #ccc;">Tipo de Extintor:</label>
            <input type="text" id="input-tipo-extintor" value="${ext.TipoExtintor || ''}" style="width: 100%; padding: 6px; margin-bottom: 8px; background: #2a2a2a; border: 1px solid #444; color: #fff; border-radius: 4px; font-size: 13px;">

            <label style="display: block; font-size: 12px; color: #ccc;">Vencimiento (Carga):</label>
            <input type="text" id="input-vencimiento-extintor" value="${ext.Vencimiento || ''}" placeholder="Ej: ene-27" style="width: 100%; padding: 6px; margin-bottom: 8px; background: #2a2a2a; border: 1px solid #444; color: #fff; border-radius: 4px; font-size: 13px;">

            <label style="display: block; font-size: 12px; color: #ccc;">Prueba Hidráulica (Año):</label>
            <input type="text" id="input-ph-extintor" value="${ext.PruebaHidraulica || ''}" placeholder="Ej: 2027" style="width: 100%; padding: 6px; background: #2a2a2a; border: 1px solid #444; color: #fff; border-radius: 4px; font-size: 13px;">
        </fieldset>

        <!-- VERIFICACIÓN TÉCNICA -->
        <fieldset style="border: 1px solid #444; border-radius: 5px; padding: 10px; margin-bottom: 12px;">
            <legend style="font-size: 13px; color: #ef4444; padding: 0 5px;">🧯 Verificación en Campo</legend>
            
            <label style="display: block; font-size: 13px; margin-top: 5px;">Manómetro / Presión:</label>
            <select id="input-manometro" required style="width: 100%; padding: 6px; margin-bottom: 8px; background: #2a2a2a; border: 1px solid #444; color: #fff; border-radius: 4px;">
                <option value="Conforme">Conforme</option>
                <option value="No conforme">No conforme</option>
                <option value="No posee">No posee (CO2)</option>
            </select>

            <label style="display: block; font-size: 13px;">Precinto de Seguridad:</label>
            <select id="input-precinto" required style="width: 100%; padding: 6px; margin-bottom: 8px; background: #2a2a2a; border: 1px solid #444; color: #fff; border-radius: 4px;">
                <option value="Conforme">Conforme</option>
                <option value="No conforme">No conforme</option>
            </select>

            <label style="display: block; font-size: 13px;">Manguera y Boquilla / Tobera:</label>
            <select id="input-manguera" required style="width: 100%; padding: 6px; margin-bottom: 8px; background: #2a2a2a; border: 1px solid #444; color: #fff; border-radius: 4px;">
                <option value="Conforme">Conforme</option>
                <option value="No conforme">No conforme</option>
                <option value="No posee">No posee</option>
            </select>

            <label style="display: block; font-size: 13px;">Soporte / Gabinete / Colgador:</label>
            <select id="input-soporte" required style="width: 100%; padding: 6px; background: #2a2a2a; border: 1px solid #444; color: #fff; border-radius: 4px;">
                <option value="Conforme">Conforme</option>
                <option value="No conforme">No conforme</option>
            </select>
        </fieldset>
    `;
}

export async function guardarControlExtintor(event) {
    event.preventDefault();
    
    const btnSubmit = document.querySelector('button[type="submit"]');
    const textoOriginal = btnSubmit.innerText;
    btnSubmit.innerText = 'Subiendo...';
    btnSubmit.disabled = true;
    
    const dbId = document.getElementById('input-id-db').value; 
    const tipoControl = document.getElementById('input-tipocontrol').value;
    const realizo = document.getElementById('input-realizo').value;
    const estado = document.getElementById('input-estado').value; 
    const observacion = document.getElementById('input-observacion').value;
    const fotoInput = document.getElementById('input-foto').files[0];

    const tipoExtintorVal = document.getElementById('input-tipo-extintor').value;
    const vencimientoVal = document.getElementById('input-vencimiento-extintor').value;
    const phVal = document.getElementById('input-ph-extintor').value;

    if (!realizo) {
        alert('Por favor selecciona un inspector haciendo clic en su foto.');
        btnSubmit.innerText = textoOriginal;
        btnSubmit.disabled = false;
        return;
    }

    try {
        const fotoUrl = await subirFotoStorage(fotoInput);

        const ahora = new Date();
        const dia = String(ahora.getDate()).padStart(2, '0');
        const mes = String(ahora.getMonth() + 1).padStart(2, '0');
        const anio = ahora.getFullYear();
        const horas = String(ahora.getHours()).padStart(2, '0');
        const minutos = String(ahora.getMinutes()).padStart(2, '0');

        const idUnicoGenerado = `${dbId}_EXT_${dia}-${mes}-${anio}:${horas}:${minutos}`;
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const mesActual = meses[ahora.getMonth()];
        const fechaHoy = ahora.toISOString().split('T')[0];

        // Registro limpio para la tabla hija Controles_E (usando id_extintor)
        const registroNuevo = {
            "id_extintor": Number(dbId),
            "IDCE": idUnicoGenerado,
            "TipoControl": tipoControl,
            "Realizo": realizo,
            "Controlrealizado": realizo,
            "CONTROLMENSUAL": mesActual,
            "ESTADO": estado.toUpperCase(),
            "TipoExtintorControl": tipoExtintorVal,
            "VencimientoControl": vencimientoVal,
            "PruebaHidraulicaControl": phVal,
            "Manometro": document.getElementById('input-manometro').value,
            "Precinto": document.getElementById('input-precinto').value,
            "MangueraBoquilla": document.getElementById('input-manguera').value,
            "SoporteGabinete": document.getElementById('input-soporte').value,
            "Observacion": observacion || null,
            "Foto": fotoUrl,
            "FechaFoto": fechaHoy
        };

        const { error: insertError } = await clienteSupabase
            .from('Controles_E')
            .insert([registroNuevo]);

        if (insertError) throw new Error(insertError.message);

        // Actualizar los datos estáticos del Padre (Extintores) y su EstadoReferencia
        const { error: updateError } = await clienteSupabase
            .from('Extintores')
            .update({ 
                TipoExtintor: tipoExtintorVal,
                Vencimiento: vencimientoVal,
                PruebaHidraulica: phVal,
                EstadoReferencia: estado 
            }) 
            .eq('id', dbId);

        if (updateError) console.error("Error al actualizar la tabla padre Extintores:", updateError);

        localStorage.setItem('centinela_inspector', realizo);
        btnSubmit.innerText = textoOriginal;
        btnSubmit.disabled = false;
        cerrarFormularioControl();

        window.cargarModulo('extintores');

    } catch (err) {
        alert('Error al guardar el control de extintor: ' + err.message);
        btnSubmit.innerText = textoOriginal;
        btnSubmit.disabled = false;
    }
}