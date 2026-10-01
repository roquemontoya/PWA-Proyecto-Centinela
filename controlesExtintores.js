// ==========================================
// MÓDULO: Controles de Extintores (Estrictamente CSV y Lógica de Reemplazo)
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

    // Consultar datos actuales del extintor (Padre)
    const { data: extData } = await clienteSupabase
        .from('Extintores')
        .select('*')
        .eq('id', dbId)
        .single();

    renderizarFormularioExtintorHTML(extData || {});
    await cargarBomberosEnModal();
    
    // Ocultar bloques innecesarios globales del modal
    const bloqueAnomalia = document.getElementById('bloque-anomalia');
    if (bloqueAnomalia) bloqueAnomalia.style.display = 'none';

    const bloqueAnual = document.getElementById('bloque-anual');
    if (bloqueAnual) bloqueAnual.style.display = 'none';

    if (modal) modal.style.display = 'flex';
}

function renderizarFormularioExtintorHTML(ext) {
    const contenedorComponentes = document.getElementById('contenedor-componentes-dinamicos');
    if (!contenedorComponentes) return;

    // Limpiamos totalmente el contenedor antes de inyectar para evitar basura visual
    contenedorComponentes.innerHTML = `
        <fieldset style="border: 1px solid #38bdf8; border-radius: 5px; padding: 12px; margin-bottom: 12px; background: #182830;">
            <legend style="font-size: 13px; color: #38bdf8; padding: 0 5px; font-weight: bold;">📋 Datos de Control (Extintores)</legend>
            
            <label style="display: block; font-size: 12px; margin-top: 6px; color: #ccc;">Nombre de etiqueta:</label>
            <input type="text" id="input-nombre-etiqueta" value="${ext.NombreEtiqueta || ext.NombreDeEtiqueta || ''}" style="width: 100%; padding: 6px; margin-bottom: 8px; background: #2a2a2a; border: 1px solid #444; color: #fff; border-radius: 4px; font-size: 13px;">

            <label style="display: block; font-size: 12px; color: #ccc;">Punto GPS:</label>
            <input type="text" id="input-punto-gps" value="${ext.PuntoGPS || ''}" style="width: 100%; padding: 6px; margin-bottom: 8px; background: #2a2a2a; border: 1px solid #444; color: #fff; border-radius: 4px; font-size: 13px;">

            <label style="display: block; font-size: 12px; color: #ccc;">Sector:</label>
            <input type="text" id="input-sector" value="${ext.Sector || ''}" style="width: 100%; padding: 6px; margin-bottom: 8px; background: #2a2a2a; border: 1px solid #444; color: #fff; border-radius: 4px; font-size: 13px;">

            <label style="display: block; font-size: 12px; color: #ccc;">Ronda:</label>
            <input type="text" id="input-ronda" value="${ext.Ronda || ''}" style="width: 100%; padding: 6px; margin-bottom: 8px; background: #2a2a2a; border: 1px solid #444; color: #fff; border-radius: 4px; font-size: 13px;">

            <label style="display: block; font-size: 12px; color: #ccc;">CONTROL MENSUAL (Mes):</label>
            <input type="text" id="input-control-mensual" value="${ext.ControlMensual || ext['CONTROL MENSUAL (Mes)'] || ''}" placeholder="Ej: Septiembre" style="width: 100%; padding: 6px; margin-bottom: 8px; background: #2a2a2a; border: 1px solid #444; color: #fff; border-radius: 4px; font-size: 13px;">

            <label style="display: block; font-size: 12px; color: #ccc;">Tipo de Extintor:</label>
            <input type="text" id="input-tipo-extintor" value="${ext.TipoExtintor || ext['Tipo de Extintor'] || ''}" placeholder="Ej: CO2, PQS" style="width: 100%; padding: 6px; margin-bottom: 8px; background: #2a2a2a; border: 1px solid #444; color: #fff; border-radius: 4px; font-size: 13px;">

            <label style="display: block; font-size: 12px; color: #ccc;">Vencimiento:</label>
            <input type="text" id="input-vencimiento" value="${ext.Vencimiento || ''}" placeholder="Ej: ene-27" style="width: 100%; padding: 6px; margin-bottom: 8px; background: #2a2a2a; border: 1px solid #444; color: #fff; border-radius: 4px; font-size: 13px;">

            <label style="display: block; font-size: 12px; color: #ccc;">Prueba Hidraulica:</label>
            <input type="text" id="input-prueba-hidraulica" value="${ext.PruebaHidraulica || ext['Prueba Hidraulica'] || ''}" placeholder="Ej: 2027" style="width: 100%; padding: 6px; margin-bottom: 8px; background: #2a2a2a; border: 1px solid #444; color: #fff; border-radius: 4px; font-size: 13px;">
            
            <!-- Selector de Condición / Lógica de Reemplazo Directo -->
            <label style="display: block; font-size: 12px; margin-top: 10px; color: #22c55e; font-weight: bold;">Condición del Equipo (¿Requiere Reemplazo?):</label>
            <select id="input-condicion-extintor" onchange="toggleReemplazoExtintor()" style="width: 100%; padding: 6px; margin-bottom: 8px; background: #2a2a2a; border: 1px solid #22c55e; color: #fff; border-radius: 4px; font-size: 13px;">
                <option value="Cumple">Cumple (Operativo)</option>
                <option value="Reemplazar">No Cumple (Reemplazo Directo)</option>
            </select>

            <div id="seccion-reemplazo" style="display: none; background: #2a1515; padding: 10px; border-radius: 4px; border: 1px dashed #ef4444; margin-top: 8px;">
                <label style="display: block; font-size: 12px; color: #ff8888; font-weight: bold;">Nueva Etiqueta / ID del Equipo de Reemplazo:</label>
                <input type="text" id="input-nuevo-id-etiqueta" placeholder="Ej: EXT-88 (Nuevo equipo instalado)" style="width: 100%; padding: 6px; background: #1e1e1e; border: 1px solid #ef4444; color: #fff; border-radius: 4px; font-size: 12px;">
            </div>
        </fieldset>
    `;

    // Función auxiliar global para mostrar u ocultar el campo de reemplazo en el DOM
    window.toggleReemplazoExtintor = function() {
        const condicion = document.getElementById('input-condicion-extintor').value;
        const seccionReemplazo = document.getElementById('seccion-reemplazo');
        if (seccionReemplazo) {
            seccionReemplazo.style.display = (condicion === 'Reemplazar') ? 'block' : 'none';
        }
    };
}

export async function guardarControlExtintor(event) {
    event.preventDefault();
    
    const btnSubmit = document.querySelector('button[type="submit"]');
    const textoOriginal = btnSubmit.innerText;
    btnSubmit.innerText = 'Guardando...';
    btnSubmit.disabled = true;
    
    const dbId = document.getElementById('input-id-db').value; 
    const realizo = document.getElementById('input-realizo').value; 
    const observacion = document.getElementById('input-observacion').value;
    const fotoInput = document.getElementById('input-foto').files[0];
    const condicion = document.getElementById('input-condicion-extintor').value;
    const nuevoIdEtiqueta = document.getElementById('input-nuevo-id-etiqueta') ? document.getElementById('input-nuevo-id-etiqueta').value : '';

    if (!realizo) {
        alert('Por favor selecciona un inspector haciendo clic en su foto.');
        btnSubmit.innerText = textoOriginal;
        btnSubmit.disabled = false;
        return;
    }

    try {
        const fotoUrl = await subirFotoStorage(fotoInput);
        const fechaHoy = new Date().toISOString().split('T')[0];

        const nombreEtiquetaVal = document.getElementById('input-nombre-etiqueta').value;
        const puntoGpsVal = document.getElementById('input-punto-gps').value;
        const sectorVal = document.getElementById('input-sector').value;
        const rondaVal = document.getElementById('input-ronda').value;
        const controlMensualVal = document.getElementById('input-control-mensual').value;
        const tipoExtintorVal = document.getElementById('input-tipo-extintor').value;
        const vencimientoVal = document.getElementById('input-vencimiento').value;
        const pruebaHidraulicaVal = document.getElementById('input-prueba-hidraulica').value;

        // Armar observación según si hubo reemplazo o no
        let observacionFinal = observacion || '';
        let estadoRef = 'Operativo';

        if (condicion === 'Reemplazar') {
            estadoRef = 'Anómalo';
            observacionFinal = `[REEMPLAZADO] Equipo dado de baja e instalado nuevo reemplazo (${nuevoIdEtiqueta || 'Sin ID'}). ${observacionFinal}`.trim();
        }

        // 1. Insertar registro en la tabla hija Controles_E
        const registroNuevo = {
            "id_extintor": Number(dbId),
            "NombreEtiqueta": nombreEtiquetaVal || null,
            "PuntoGPS": puntoGpsVal || null,
            "Sector": sectorVal || null,
            "Ronda": rondaVal || null,
            "CONTROLMENSUAL": controlMensualVal || null,
            "ControlRealizadoPor": realizo,
            "TipoExtintor": tipoExtintorVal || null,
            "Vencimiento": vencimientoVal || null,
            "PruebaHidraulica": pruebaHidraulicaVal || null,
            "Observacion": observacionFinal,
            "Foto": fotoUrl,
            "FechaFoto": fechaHoy
        };

        const { error: insertError } = await clienteSupabase
            .from('Controles_E')
            .insert([registroNuevo]);

        if (insertError) throw new Error(insertError.message);

        // 2. Actualizar la tabla padre Extintores (Aplicando lógica de reemplazo si aplica)
        const datosActualizacionPadre = {
            NombreEtiqueta: (condicion === 'Reemplazar' && nuevoIdEtiqueta) ? nuevoIdEtiqueta : nombreEtiquetaVal,
            PuntoGPS: puntoGpsVal,
            Sector: sectorVal,
            Ronda: rondaVal,
            TipoExtintor: tipoExtintorVal,
            Vencimiento: vencimientoVal,
            PruebaHidraulica: pruebaHidraulicaVal,
            EstadoReferencia: estadoRef
        };

        const { error: updateError } = await clienteSupabase
            .from('Extintores')
            .update(datosActualizacionPadre) 
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