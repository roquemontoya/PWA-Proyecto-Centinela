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

    // Diccionario exacto con tus tablas reales de Supabase
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

    // Si ya existía un mapa anterior, lo borramos limpiamente para evitar conflictos
    if (mapa) {
        mapa.remove();
        mapa = null;
    }

    // Inicializamos el mapa con una vista temporal (se reajustará automáticamente al leer los puntos)
    mapa = L.map('mapa-modulo').setView([-31.416, -64.183], 15);
    
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Tiles © Esri'
    }).addTo(mapa);

    // Consultar datos en Supabase usando la tabla correcta
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

    // Array para almacenar las coordenadas de todos los puntos válidos y hacer zoom automático
    let limitesPuntos = [];

    // Dibujar los pines en el mapa si hay registros
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
                        limitesPuntos.push([lat, lng]); // Guardamos la coordenada para los límites

                        let colorPin = 'green';
                        const estado = (item.EstadoReferencia || item.estado || '').toLowerCase();
                        
                        if (estado.includes('observado')) colorPin = 'orange';
                        if (estado.includes('anómalo') || estado.includes('anomalo') || estado.includes('critico') || estado.includes('crítico')) colorPin = 'red';

                        const marcador = L.circleMarker([lat, lng], {
                            radius: 10,
                            fillColor: colorPin,
                            color: '#000',
                            weight: 1,
                            opacity: 1,
                            fillOpacity: 0.8
                        }).addTo(mapa);

                        const identificador = item.Etiqueta || item.id || 'Elemento';
                        
                        marcador.bindPopup(`
                            <div style="color: #333; font-family: Arial, sans-serif;">
                                <b>Etiqueta / ID:</b> ${identificador}<br>
                                <b>Sector:</b> ${item.Sector || 'N/A'}<br>
                                <button onclick="abrirFormularioControl('${nombreTabla}', '${identificador}')" style="margin-top:8px; padding:6px 12px; background:#22c55e; color:#000; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">Nuevo Control</button>
                            </div>
                        `);
                    }
                }
            }
        });

        // Si encontramos puntos válidos, hacemos que el mapa haga zoom y se centre exactamente en ellos
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

// Abrir el formulario y precargar el último inspector guardado en el navegador
function abrirFormularioControl(tabla, idElemento) {
    const modal = document.getElementById('modal-control');
    const titulo = document.getElementById('modal-titulo-elemento');
    
    document.getElementById('input-idch').value = idElemento;
    document.getElementById('input-tabla').value = tabla;
    if (titulo) titulo.innerText = `Control para: ${idElemento}`;
    
    // Recuperar el nombre del inspector de la memoria local si existe
    const inspectorGuardado = localStorage.getItem('centinela_inspector');
    if (inspectorGuardado) {
        document.getElementById('input-realizo').value = inspectorGuardado;
    }
    
    if (modal) modal.style.display = 'flex';
}

function cerrarFormularioControl() {
    const modal = document.getElementById('modal-control');
    if (modal) modal.style.display = 'none';
}

// Procesar imagen, aplicar jerarquía y registrar control en Supabase
async function guardarControl(event) {
    event.preventDefault();

    const idch = document.getElementById('input-idch').value;
    const tabla = document.getElementById('input-tabla').value;
    const realizo = document.getElementById('input-realizo').value;
    const estado = document.getElementById('input-estado').value;
    const observacion = document.getElementById('input-observacion').value;
    const archivoInput = document.getElementById('input-foto');
    
    // Guardar el nombre del inspector en la memoria local del dispositivo
    localStorage.setItem('centinela_inspector', realizo);

    let fotoUrlFinal = null;
    const fechaActual = new Date().toISOString();

    // 1. Subir la imagen de forma ordenada usando la jerarquía: [modulo]/[idch]/[timestamp].jpg
    if (archivoInput.files && archivoInput.files[0]) {
        const archivo = archivoInput.files[0];
        const rutaCarpeta = `${tabla.toLowerCase()}/${idch}`;
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
    }

    // 2. Insertar el registro histórico en la tabla 'Controles_H'
    const { error: insertError } = await clienteSupabase
        .from('Controles_H')
        .insert([
            {
                IDCH: idch,
                Realizo: realizo,
                ESTADO: estado,
                Observacion: observacion,
                Foto: fotoUrlFinal,
                FechaFoto: fotoUrlFinal ? fechaActual : null,
                PRUEBAANUAL: fechaActual.split('T')[0]
            }
        ]);

    if (insertError) {
        alert('Error al guardar el control en la base de datos: ' + insertError.message);
        console.error(insertError);
        return;
    }

    alert('¡Control registrado e imagen almacenada con éxito!');
    cerrarFormularioControl();
}