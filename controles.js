// ==========================================
// MÓDULO: Controles e Inspección (Modal y Guardado)
// ==========================================

import { clienteSupabase } from './supabaseClient.js';

export function cambiarTipoControl() {
    const tipo = document.getElementById('input-tipocontrol').value;
    const bloqueAnual = document.getElementById('bloque-anual');
    const inputFechaPrueba = document.getElementById('input-fechapruebaanual');
    const inputFechaMensual = document.getElementById('input-fechapruebamensual');

    if (tipo === 'Anual' || tipo === 'A Solicitud') {
        bloqueAnual.style.display = 'block';
        inputFechaPrueba.setAttribute('required', 'true');
        inputFechaMensual.setAttribute('required', 'true');
    } else {
        bloqueAnual.style.display = 'none';
        inputFechaPrueba.removeAttribute('required');
        inputFechaMensual.removeAttribute('required');
    }
}

export function verificarDetalleLlave(tipo) {
    const select = document.getElementById(`input-llave${tipo}`);
    const contenedor = document.getElementById(`div-detalle-${tipo}`);
    const inputDetalle = document.getElementById(`input-detalle-${tipo}`);

    if (select.value === 'No conforme') {
        contenedor.style.display = 'block';
        inputDetalle.setAttribute('required', 'true');
    } else {
        contenedor.style.display = 'none';
        inputDetalle.removeAttribute('required');
        inputDetalle.value = '';
    }
}

export function abrirFormularioControl(tabla, dbId, idElemento) {
    const modal = document.getElementById('modal-control');
    const titulo = document.getElementById('modal-titulo-elemento');
    
    document.getElementById('input-id-db').value = dbId;
    document.getElementById('input-idch').value = idElemento;
    document.getElementById('input-tabla').value = tabla;
    if (titulo) titulo.innerText = `Control para: ${idElemento}`;
    
    const inspectorGuardado = localStorage.getItem('centinela_inspector');
    if (inspectorGuardado) {
        document.getElementById('input-realizo').value = inspectorGuardado;
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

    try {
        const dbId = document.getElementById('input-id-db').value;
        const idch = document.getElementById('input-idch').value;
        const tabla = document.getElementById('input-tabla').value;
        const tipoControl = document.getElementById('input-tipocontrol').value;
        const realizo = document.getElementById('input-realizo').value;
        const estado = document.getElementById('input-estado').value;
        const observacion = document.getElementById('input-observacion').value;
        
        const llaveAlimentacion = document.getElementById('input-llavealimentacion').value;
        const detalleAlimentacion = document.getElementById('input-detalle-alimentacion').value;

        const llaveTeatroDerecho = document.getElementById('input-llaveteatroderecho').value;
        const detalleTDerecho = document.getElementById('input-detalle-teatroderecho').value;

        const llaveTeatroIzquierdo = document.getElementById('input-llaveteatroizquierdo').value;
        const detalleTIzquierdo = document.getElementById('input-detalle-teatroizquierdo').value;

        const gabinete = document.getElementById('input-gabinete').value;
        const pintura = document.getElementById('input-pintura').value;
        const limpieza = document.getElementById('input-limpieza').value;
        const engrasado = document.getElementById('input-engrasado').value;

        const archivoInput = document.getElementById('input-foto');
        
        if (!archivoInput.files || !archivoInput.files[0]) {
            alert('La foto de auditoría es obligatoria.');
            return;
        }

        localStorage.setItem('centinela_inspector', realizo);

        const mesesAnio = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        const fechaDispositivo = new Date();
        const mesActual = mesesAnio[fechaDispositivo.getMonth()];
        const fechaIsoString = fechaDispositivo.toISOString();
        const fechaSimple = fechaIsoString.split('T')[0];

        let fechaPruebaAnualVal = null;
        let pruebaAprobadaVal = null;
        let movAguaVal = null;
        let fechaPruebaMensualVal = null;
        let controlMensualVal = null;

        if (tipoControl === 'Mensual') {
            controlMensualVal = mesActual;
        } else {
            fechaPruebaAnualVal = document.getElementById('input-fechapruebaanual').value;
            pruebaAprobadaVal = document.getElementById('input-pruebaaprobada').value;
            movAguaVal = document.getElementById('input-movagua').value;
            fechaPruebaMensualVal = document.getElementById('input-fechapruebamensual').value;
        }

        let fotoUrlFinal = null;

        const idchLimpio = idch
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9-_]/g, "_");

        const archivo = archivoInput.files[0];
        const rutaCarpeta = `${tabla.toLowerCase()}/${idchLimpio}`;
        const nombreArchivo = `${Date.now()}.jpg`;
        const rutaCompleta = `${rutaCarpeta}/${nombreArchivo}`;

        const { error: uploadError } = await clienteSupabase.storage
            .from('fotos-controles')
            .upload(rutaCompleta, archivo);

        if (uploadError) {
            alert('Error al subir la imagen: ' + uploadError.message);
            return;
        }

        const { data: publicURL } = clienteSupabase.storage
            .from('fotos-controles')
            .getPublicUrl(rutaCompleta);

        fotoUrlFinal = publicURL.publicUrl;

        const idControlUnico = `${dbId}_${Date.now()}`;

        const datosRegistro = {
            ID: parseInt(dbId) || null,
            IDCH: idControlUnico,
            TipoControl: tipoControl,
            CONTROLMENSUAL: controlMensualVal,
            Controlrealizado: realizo,
            Realizo: realizo,
            ESTADO: estado.toUpperCase(),
            LlaveAlimentacion: llaveAlimentacion,
            DetalleLlaveAlimentacion: llaveAlimentacion === 'No conforme' ? detalleAlimentacion : null,
            LlaveTeatroDerecho: llaveTeatroDerecho,
            DetalleTDerecho: llaveTeatroDerecho === 'No conforme' ? detalleTDerecho : null,
            LlaveTeatroIzquierdo: llaveTeatroIzquierdo,
            DetalleTIzquierdo: llaveTeatroIzquierdo === 'No conforme' ? detalleTIzquierdo : null,
            Gabinete: gabinete,
            Pintura: pintura,
            Limpieza: limpieza,
            Engrasado: engrasado,
            Observacion: observacion,
            PRUEBAANUAL: fechaPruebaAnualVal,
            PruebaAprobada: pruebaAprobadaVal,
            MovAgua: movAguaVal,
            PlaningPruebaMes: fechaPruebaMensualVal,
            Foto: fotoUrlFinal,
            FechaFoto: fechaSimple
        };

        const { error: insertError } = await clienteSupabase
            .from('Controles_H')
            .insert([datosRegistro]);

        if (insertError) {
            alert('Error al guardar el control en la base de datos: ' + insertError.message);
            console.error(insertError);
            return;
        }

        alert('¡Control jerárquico registrado y foto guardada con éxito!');
        cerrarFormularioControl();

    } catch (err) {
        alert('Error crítico capturado: ' + err.message);
        console.error(err);
    }
}