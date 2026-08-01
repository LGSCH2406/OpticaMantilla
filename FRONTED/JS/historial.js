// ==========================================================================
// MÓDULO DE HISTORIAL DE ACCIONES - ÓPTICA MANTILLA
// Registro centralizado de todas las acciones del sistema
// Solo accesible por administradores
// ==========================================================================

let historialListener = null;
let historialAlmacen = {};

// ==========================================================================
// REFERENCIA A FIREBASE
// ==========================================================================

function obtenerReferenciaHistorial() {
    try {
        if (typeof db !== 'undefined' && db) {
            return db.ref('historial');
        }
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            return firebase.database().ref('historial');
        }
    } catch (e) {
        console.error("Error al inicializar la referencia de historial:", e);
    }
    return null;
}

// ==========================================================================
// FUNCIÓN PRINCIPAL PARA REGISTRAR ACCIONES
// ==========================================================================

function registrarAccionHistorial(tipo, descripcion, datos = {}, modulo = 'general') {
    const refHistorial = obtenerReferenciaHistorial();
    if (!refHistorial) {
        console.warn('⚠️ No se pudo registrar acción en historial: Firebase no disponible');
        return;
    }

    const usuarioLogueado = JSON.parse(sessionStorage.getItem('usuarioLogueado') || '{}');
    const nombreUsuario = usuarioLogueado.nombre || 'Sistema';
    const emailUsuario = usuarioLogueado.email || 'sistema@optica.com';
    const rolUsuario = usuarioLogueado.rol || 'sistema';

    const entradaHistorial = {
        tipo: tipo,
        modulo: modulo,
        descripcion: descripcion,
        datos: datos,
        usuario: nombreUsuario,
        email: emailUsuario,
        rol: rolUsuario,
        fecha: new Date().toISOString(),
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    refHistorial.push(entradaHistorial)
        .then(() => {
            console.log(`📝 Acción registrada en historial: ${tipo} - ${descripcion}`);
        })
        .catch((error) => {
            console.error('❌ Error al registrar acción en historial:', error);
        });
}

// ==========================================================================
// CARGAR MÓDULO DE HISTORIAL (SOLO ADMIN)
// ==========================================================================

function cargarModuloHistorial() {
    const contenedor = document.getElementById('contenidoDinamico');
    if (!contenedor) return;

    const usuarioLogueado = JSON.parse(sessionStorage.getItem('usuarioLogueado') || '{}');
    const esAdmin = usuarioLogueado.rol === 'admin' || usuarioLogueado.rol === 'administrador';

    if (!esAdmin) {
        contenedor.innerHTML = `
            <div class="animate__animated animate__fadeIn">
                <div class="alert alert-danger d-flex align-items-center" role="alert">
                    <i class="bi bi-shield-lock fs-3 me-3"></i>
                    <div>
                        <h5 class="alert-heading fw-bold mb-1">Acceso Denegado</h5>
                        <p class="mb-0">No tienes permisos para acceder al historial de acciones. Solo los administradores pueden ver esta sección.</p>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    if (typeof resaltarItemMenu === 'function') resaltarItemMenu('nav-historial');

    contenedor.innerHTML = `
        <div class="animate__animated animate__fadeIn">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 class="fw-bold mb-1 text-dark">
                        <i class="bi bi-clock-history text-primary me-2"></i>Historial de Acciones
                    </h2>
                    <p class="text-muted mb-0">Registro completo de todas las acciones realizadas en el sistema.</p>
                </div>
                <div>
                    <button class="btn btn-outline-secondary btn-sm" onclick="cargarModuloHistorial()">
                        <i class="bi bi-arrow-clockwise me-1"></i> Recargar
                    </button>
                    <button class="btn btn-outline-danger btn-sm ms-1" onclick="limpiarFiltrosHistorial()">
                        <i class="bi bi-eraser me-1"></i> Limpiar Filtros
                    </button>
                </div>
            </div>

            <!-- Filtros -->
            <div class="card border-0 shadow-sm p-3 mb-4 bg-white">
                <div class="row g-3">
                    <div class="col-12 col-md-4">
                        <div class="input-group">
                            <span class="input-group-text bg-light"><i class="bi bi-search"></i></span>
                            <input type="text" id="buscadorHistorial" class="form-control" placeholder="Buscar por descripción, usuario..." oninput="filtrarHistorial()">
                        </div>
                    </div>
                    <div class="col-6 col-md-3">
                        <select id="filtroTipoHistorial" class="form-select" onchange="filtrarHistorial()">
                            <option value="">Todos los tipos</option>
                            <option value="venta">💵 Ventas</option>
                            <option value="cambio">🔄 Cambios</option>
                            <option value="edicion">✏️ Ediciones</option>
                            <option value="eliminacion">🗑️ Eliminaciones</option>
                            <option value="apertura_caja">💰 Apertura de Caja</option>
                            <option value="cierre_caja">🔒 Cierre de Caja</option>
                            <option value="gasto">📊 Gastos</option>
                            <option value="usuario">👤 Usuarios</option>
                            <option value="cliente">👥 Clientes</option>
                            <option value="producto">📦 Productos</option>
                            <option value="cita">📅 Citas</option>
                        </select>
                    </div>
                    <div class="col-6 col-md-2">
                        <select id="filtroModuloHistorial" class="form-select" onchange="filtrarHistorial()">
                            <option value="">Todos los módulos</option>
                            <option value="ventas">Ventas</option>
                            <option value="clientes">Clientes</option>
                            <option value="inventario">Inventario</option>
                            <option value="citas">Citas</option>
                            <option value="usuarios">Usuarios</option>
                            <option value="gastos">Gastos</option>
                            <option value="caja">Caja</option>
                            <option value="general">General</option>
                        </select>
                    </div>
                    <div class="col-6 col-md-2">
                        <input type="date" id="filtroFechaHistorial" class="form-control" onchange="filtrarHistorial()">
                    </div>
                </div>
            </div>

            <!-- Tabla de Historial -->
            <div class="card border-0 shadow-sm p-0 bg-white">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0">
                        <thead class="table-light sticky-top" style="z-index: 1;">
                            <tr>
                                <th style="min-width: 140px;">Fecha/Hora</th>
                                <th style="min-width: 100px;">Usuario</th>
                                <th style="min-width: 120px;">Tipo</th>
                                <th style="min-width: 200px;">Descripción</th>
                                <th style="min-width: 100px;">Módulo</th>
                                <th style="min-width: 80px;" class="text-center">Detalle</th>
                            </tr>
                        </thead>
                        <tbody id="tablaHistorialBody">
                            <tr>
                                <td colspan="6" class="text-center text-muted py-4">
                                    <div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                                    Cargando historial...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="mt-3 text-muted small" id="contadorHistorial">Mostrando 0 registros</div>
        </div>

        <!-- MODAL DETALLE DE ACCIÓN -->
        <div class="modal fade" id="modalDetalleHistorial" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content border-0 shadow" style="border-radius: 12px;">
                    <div class="modal-header border-0 bg-light py-3" style="border-radius: 12px 12px 0 0;">
                        <h5 class="modal-title fw-bold text-dark">
                            <i class="bi bi-file-text text-primary me-2"></i> Detalle de Acción
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-4" id="contenidoDetalleHistorial">
                    </div>
                </div>
            </div>
        </div>
    `;

    escucharHistorialEnTiempoReal();
}

// ==========================================================================
// ESCUCHAR HISTORIAL EN TIEMPO REAL
// ==========================================================================

function escucharHistorialEnTiempoReal() {
    const refHistorial = obtenerReferenciaHistorial();
    if (!refHistorial) {
        const tbody = document.getElementById('tablaHistorialBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-danger py-4">
                        <i class="bi bi-exclamation-triangle fs-3 d-block mb-2"></i>
                        No se pudo conectar con Firebase para cargar el historial.
                    </td>
                </tr>
            `;
        }
        return;
    }

    if (historialListener) {
        refHistorial.off('value', historialListener);
    }

    historialListener = refHistorial.orderByChild('timestamp').limitToLast(500).on('value', (snapshot) => {
        historialAlmacen = snapshot.val() || {};
        renderizarTablaHistorial(historialAlmacen);
    }, (error) => {
        console.error('❌ Error al cargar historial:', error);
    });
}

// ==========================================================================
// RENDERIZAR TABLA DE HISTORIAL
// ==========================================================================

function renderizarTablaHistorial(historial) {
    const tbody = document.getElementById('tablaHistorialBody');
    const contadorEl = document.getElementById('contadorHistorial');
    if (!tbody) return;

    const entradas = Object.entries(historial);
    
    if (entradas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted py-4">
                    <i class="bi bi-inbox fs-3 d-block mb-2 text-secondary"></i>
                    No hay acciones registradas en el historial.
                </td>
            </tr>
        `;
        if (contadorEl) contadorEl.textContent = 'Mostrando 0 registros';
        return;
    }

    entradas.sort((a, b) => {
        const ta = a[1].timestamp || 0;
        const tb = b[1].timestamp || 0;
        return tb - ta;
    });

    let html = '';
    let contador = 0;

    entradas.forEach(([key, entrada]) => {
        contador++;
        
        const fecha = entrada.fecha ? new Date(entrada.fecha) : new Date();
        const fechaStr = fecha.toLocaleDateString('es-PE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        const iconosTipo = {
            'venta': '💵',
            'cambio': '🔄',
            'edicion': '✏️',
            'eliminacion': '🗑️',
            'apertura_caja': '💰',
            'cierre_caja': '🔒',
            'gasto': '📊',
            'usuario': '👤',
            'cliente': '👥',
            'producto': '📦',
            'cita': '📅'
        };
        const icono = iconosTipo[entrada.tipo] || '📌';

        const coloresTipo = {
            'venta': 'text-success',
            'cambio': 'text-warning',
            'edicion': 'text-primary',
            'eliminacion': 'text-danger',
            'apertura_caja': 'text-success',
            'cierre_caja': 'text-danger',
            'gasto': 'text-danger',
            'usuario': 'text-info',
            'cliente': 'text-primary',
            'producto': 'text-secondary',
            'cita': 'text-info'
        };
        const colorTipo = coloresTipo[entrada.tipo] || 'text-dark';

        const badgeModulo = {
            'ventas': 'bg-primary',
            'clientes': 'bg-info',
            'inventario': 'bg-secondary',
            'citas': 'bg-success',
            'usuarios': 'bg-dark',
            'gastos': 'bg-danger',
            'caja': 'bg-warning text-dark',
            'general': 'bg-light text-dark'
        };
        const claseModulo = badgeModulo[entrada.modulo] || 'bg-secondary';

        const descripcionCorta = entrada.descripcion.length > 60 
            ? entrada.descripcion.substring(0, 60) + '...' 
            : entrada.descripcion;

        html += `
            <tr class="fila-historial" data-key="${key}">
                <td class="text-muted small">${fechaStr}</td>
                <td>
                    <span class="fw-medium text-dark">${entrada.usuario || 'Sistema'}</span>
                    <br><span class="text-muted small">${entrada.rol || ''}</span>
                </td>
                <td>
                    <span class="${colorTipo} fw-bold">
                        ${icono} ${entrada.tipo ? entrada.tipo.charAt(0).toUpperCase() + entrada.tipo.slice(1) : 'N/A'}
                    </span>
                </td>
                <td>
                    <span class="text-dark" title="${entrada.descripcion}">${descripcionCorta}</span>
                </td>
                <td>
                    <span class="badge ${claseModulo}">${entrada.modulo || 'general'}</span>
                </td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary border-0" onclick="verDetalleHistorial('${key}')" title="Ver Detalle">
                        <i class="bi bi-eye-fill"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    if (contadorEl) contadorEl.textContent = `Mostrando ${contador} registros`;
}

// ==========================================================================
// FILTRAR HISTORIAL
// ==========================================================================

function filtrarHistorial() {
    const termino = document.getElementById('buscadorHistorial').value.toLowerCase().trim();
    const tipoFiltro = document.getElementById('filtroTipoHistorial').value;
    const moduloFiltro = document.getElementById('filtroModuloHistorial').value;
    const fechaFiltro = document.getElementById('filtroFechaHistorial').value;

    const filas = document.querySelectorAll('#tablaHistorialBody tr.fila-historial');
    let contador = 0;

    filas.forEach(fila => {
        const textoFila = fila.innerText.toLowerCase();
        const tipo = fila.querySelector('td:nth-child(3)')?.innerText.toLowerCase() || '';
        const modulo = fila.querySelector('td:nth-child(5)')?.innerText.toLowerCase() || '';
        const fecha = fila.querySelector('td:nth-child(1)')?.innerText || '';

        const coincideTexto = textoFila.includes(termino);
        const coincideTipo = !tipoFiltro || tipo.includes(tipoFiltro);
        const coincideModulo = !moduloFiltro || modulo.includes(moduloFiltro);
        
        let coincideFecha = true;
        if (fechaFiltro) {
            const fechaPartes = fecha.split(' ')[0].split('/');
            if (fechaPartes.length === 3) {
                const fechaFormateada = `${fechaPartes[2]}-${fechaPartes[1]}-${fechaPartes[0]}`;
                coincideFecha = fechaFormateada === fechaFiltro;
            }
        }

        if (coincideTexto && coincideTipo && coincideModulo && coincideFecha) {
            fila.classList.remove('d-none');
            contador++;
        } else {
            fila.classList.add('d-none');
        }
    });

    const contadorEl = document.getElementById('contadorHistorial');
    if (contadorEl) contadorEl.textContent = `Mostrando ${contador} registros`;
}

function limpiarFiltrosHistorial() {
    document.getElementById('buscadorHistorial').value = '';
    document.getElementById('filtroTipoHistorial').value = '';
    document.getElementById('filtroModuloHistorial').value = '';
    document.getElementById('filtroFechaHistorial').value = '';
    filtrarHistorial();
}

// ==========================================================================
// VER DETALLE DE ACCIÓN EN MODAL
// ==========================================================================

function verDetalleHistorial(key) {
    const entrada = historialAlmacen[key];
    if (!entrada) return;

    const contenedor = document.getElementById('contenidoDetalleHistorial');
    if (!contenedor) return;

    const fecha = entrada.fecha ? new Date(entrada.fecha) : new Date();
    const fechaStr = fecha.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    let datosHtml = '';
    if (entrada.datos && Object.keys(entrada.datos).length > 0) {
        datosHtml = `
            <div class="mt-3">
                <h6 class="fw-bold text-dark mb-2">📋 Datos Adicionales</h6>
                <div class="bg-light p-3 rounded" style="max-height: 200px; overflow-y: auto;">
                    <pre class="mb-0 small" style="white-space: pre-wrap; word-break: break-all;">${JSON.stringify(entrada.datos, null, 2)}</pre>
                </div>
            </div>
        `;
    }

    contenedor.innerHTML = `
        <div class="row g-3">
            <div class="col-md-6">
                <div class="bg-light p-2 rounded">
                    <span class="text-muted small d-block">🔖 Tipo de Acción</span>
                    <span class="fw-bold text-dark">${entrada.tipo || 'N/A'}</span>
                </div>
            </div>
            <div class="col-md-6">
                <div class="bg-light p-2 rounded">
                    <span class="text-muted small d-block">📂 Módulo</span>
                    <span class="fw-bold text-dark">${entrada.modulo || 'general'}</span>
                </div>
            </div>
            <div class="col-md-6">
                <div class="bg-light p-2 rounded">
                    <span class="text-muted small d-block">👤 Usuario</span>
                    <span class="fw-bold text-dark">${entrada.usuario || 'Sistema'}</span>
                </div>
            </div>
            <div class="col-md-6">
                <div class="bg-light p-2 rounded">
                    <span class="text-muted small d-block">📧 Email</span>
                    <span class="fw-bold text-dark">${entrada.email || 'N/A'}</span>
                </div>
            </div>
            <div class="col-md-6">
                <div class="bg-light p-2 rounded">
                    <span class="text-muted small d-block">🎯 Rol</span>
                    <span class="fw-bold text-dark">${entrada.rol || 'N/A'}</span>
                </div>
            </div>
            <div class="col-md-6">
                <div class="bg-light p-2 rounded">
                    <span class="text-muted small d-block">🕐 Fecha y Hora</span>
                    <span class="fw-bold text-dark">${fechaStr}</span>
                </div>
            </div>
            <div class="col-12">
                <div class="bg-light p-2 rounded">
                    <span class="text-muted small d-block">📝 Descripción</span>
                    <span class="fw-bold text-dark">${entrada.descripcion || 'Sin descripción'}</span>
                </div>
            </div>
            ${datosHtml}
        </div>
    `;

    const modalElement = document.getElementById('modalDetalleHistorial');
    const modalInstance = new bootstrap.Modal(modalElement);
    modalInstance.show();
}

window.registrarAccionHistorial = registrarAccionHistorial;

console.log('✅ Módulo historial.js cargado correctamente');