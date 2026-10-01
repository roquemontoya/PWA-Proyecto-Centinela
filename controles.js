export async function abrirFormularioControl(tabla, dbId, idElemento) {
    const modal = document.getElementById('modal-control');
    const titulo = document.getElementById('modal-titulo-elemento');
    
    document.getElementById('input-id-db').value = dbId;
    document.getElementById('input-idch').value = idElemento;
    document.getElementById('input-tabla').value = tabla;
    if (titulo) titulo.innerText = `Control para: ${idElemento}`;
    
    // === NUEVA LÓGICA HÍBRIDA: Cargar bomberos activos ===
    const selectRealizo = document.getElementById('input-realizo');
    
    // Solo cargamos la lista si aún no se hizo en esta sesión (ahorra datos móviles)
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
    
    // Autoseleccionar al inspector logueado
    const inspectorGuardado = localStorage.getItem('centinela_inspector');
    if (inspectorGuardado) {
        selectRealizo.value = inspectorGuardado;
        
        // Fallback: Si el usuario logueado no está en la lista de activos, lo agregamos temporalmente
        if (selectRealizo.value !== inspectorGuardado) {
            const option = document.createElement('option');
            option.value = inspectorGuardado;
            option.textContent = inspectorGuardado + ' (Logueado)';
            selectRealizo.appendChild(option);
            selectRealizo.value = inspectorGuardado;
        }
    }
    // ========================================================
    
    document.getElementById('input-tipocontrol').value = 'Mensual';
    cambiarTipoControl();

    ['alimentacion', 'teatroderecho', 'teatroizquierdo'].forEach(tipo => {
        document.getElementById(`div-detalle-${tipo}`).style.display = 'none';
        document.getElementById(`input-detalle-${tipo}`).removeAttribute('required');
        document.getElementById(`input-detalle-${tipo}`).value = '';
    });

    if (modal) modal.style.display = 'flex';
}