// 1. Credenciales de Supabase
const supabaseUrl = 'https://zgzhudcdxoentmfgdncf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpnemh1ZGNkeG9lbnRtZmdkbmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2OTU4MzgsImV4cCI6MjEwMDI3MTgzOH0.f1_BZa7BjMxRSc74WIK4A3NwjhBJM9sCjEGe_KpztLg';

const clienteSupabase = window.supabase.createClient(supabaseUrl, supabaseKey);

let mapa = null;

// Control del menú lateral (hamburguesa)
function toggleMenu() {
    const drawer = document.getElementById('side-menu');
    const overlay = document.getElementById('drawer-overlay');
    if (drawer && overlay) {
        drawer.classList.toggle('open');
        overlay.classList.toggle('active');
    }
}

// Volver al Home principal
function irInicio() {
    const mainContent = document.getElementById('main-content');
    const vistaDinamica = document.getElementById('vista-dinamica');
    
    if (mainContent) mainContent.style.display = 'grid';
    if (vistaDinamica) vistaDinamica.style.display = 'none';
    
    const drawer = document.getElementById('side-menu');
    if (drawer && drawer.classList.contains('open')) {
        toggleMenu();
    }
}

// Cargar dinámicamente el mapa y los datos de cada módulo
async function cargarModulo(moduloKey) {
    // Cerrar menú lateral si está abierto
    const drawer = document.getElementById('side-menu');
    if (drawer && drawer.classList.contains('open')) {
        toggleMenu();
    }

    const tablasSupabase = {
        'hidrantes': 'hidrantes',
        'extintores': 'Extintores',
        'ecas': 'ecas',
        'valvulas': 'Valvulas',
        'vecas': 'vecas',
        'pecas': 'pecas',
        'bomberos': 'Bomberos', 
        'ipp': 'ipp'
    };

    const nombreTabla = tablasSupabase[moduloKey] || moduloKey;

    const mainContent = document.getElementById('main-content');
    const contenedor = document.getElementById('vista-dinamica');

    if (mainContent) mainContent.style.display = 'none';
    if (contenedor) {
        contenedor.style.display = 'block';
        contenedor.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding: 0 10px;">
                <h2 style="margin: 0; color: #fff; text-transform: uppercase; font-size: 16px;">Módulo: ${moduloKey}</h2>
                <button onclick="irInicio()" style="background:#333; color:#fff; border:none; padding:8px 15px; border-radius:5px; cursor:pointer; font-weight:bold;">← Volver</button>
            </div>
            <div id="mapa-modulo" style="width: 100%; height: 450px; border-radius: 8px;"></div>
        `;
    }

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
        if (contenedor) {
            contenedor.innerHTML += `
                <div style="background: #2a1215; border: 1px solid #ef4444; color: #fca5a5; padding: 15px; border-radius: 8px; margin: 15px;">
                    <strong>Aviso de Base de Datos:</strong> La tabla <code>${nombreTabla}</code> aún no existe en Supabase o no tiene permisos públicos configurados.<br>
                    <small>Error técnico: ${error.message}</small>
                </div>`;
        }
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

                        // LÓGICA DE COLORES DE PINES REQUERIDA:
                        // Operativo = Verde (#22c55e)
                        // Observado = Amarillo (#eab308)
                        // Anómalo = Rojo (#ef4444)
                        let colorPin = '#22c55e'; 
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

        if (pinesValidos === 0 && contenedor) {
            contenedor.innerHTML += `<p style="color: #fbbf24; margin: 15px;">Se conectó a '${nombreTabla}', pero no se pudieron interpretar las coordenadas de la columna Ubicacion.</p>`;
        }
    } else if (contenedor) {
        contenedor.innerHTML += `<p style="color: #94a3b8; margin: 15px;">La tabla '${nombreTabla}' está conectada correctamente pero no contiene registros todavía.</p>`;
    }
}

// ==========================================
// MÓDULO DE NUEVO CONTROL E HISTORIAL
// ==========================================

function cambiarTipoControl() {
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

// Activar o desactivar campos de detalle según si la llave es "No conforme"
function verificarDetalleLlave(tipo) {
    const select = document.getElementById(`input-llave${tipo}`);
    const contenedor = document.getElementById(`div-detalle-${tipo}`);
    const inputDetalle = document.getElementById(`input-detalle-${tipo}`);

    if (select.value === 'No conforme') {
        contenedor.style.display = 'block';
        inputDetalle.setAttribute('required', 'true');
    } else {
        contenedor.style.display = 'none';
        inputDetalle.removeAttribute('required');
        inputDetalle.value = ''; // Limpiar si cambia de opinión
    }
}

function abrirFormularioControl(tabla, dbId, idElemento) {
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

    // Resetear detalles de llaves ocultándolos al abrir
    ['alimentacion', 'teatroderecho', 'teatroizquierdo'].forEach(tipo => {
        document.getElementById(`div-detalle-${tipo}`).style.display = 'none';
        document.getElementById(`input-detalle-${tipo}`).removeAttribute('required');
        document.getElementById(`input-detalle-${tipo}`).value = '';
    });

    if (modal) modal.style.display = 'flex';
}

function cerrarFormularioControl() {
    const modal = document.getElementById('modal-control');
    if (modal) modal.style.display = 'none';
    const form = document.getElementById('form-nuevo-control');
    if (form) form.reset();
}

async function guardarControl(event) {
    event.preventDefault();

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

    // Objeto mapeado exactamente con las columnas SQL de Supabase (incluyendo detalles condicionales)
    const datosRegistro = {
        ID: parseInt(dbId) || null,
        IDCH: idch,
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
}